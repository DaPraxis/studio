"use client"

import { useState, useEffect, useCallback } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData } from '@/lib/types';
import { INITIAL_POSITIONS, INITIAL_TRANSACTIONS } from '@/lib/mock-data';
import { format } from 'date-fns';
import { getTickerFinancials } from '@/app/actions/financials';

export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [dividendMap, setDividendMap] = useState<Record<string, DividendData[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  // Initial Load from LocalStorage
  useEffect(() => {
    const savedPositions = localStorage.getItem('dw_positions');
    const savedTransactions = localStorage.getItem('dw_transactions');
    
    if (savedPositions && savedTransactions) {
      setPositions(JSON.parse(savedPositions));
      setTransactions(JSON.parse(savedTransactions));
    } else {
      setPositions(INITIAL_POSITIONS);
      setTransactions(INITIAL_TRANSACTIONS);
    }
    setIsLoaded(true);
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dw_positions', JSON.stringify(positions));
      localStorage.setItem('dw_transactions', JSON.stringify(transactions));
    }
  }, [positions, transactions, isLoaded]);

  // Fetch Live Data for Tickers
  useEffect(() => {
    let isCancelled = false;

    async function fetchAllTickerData() {
      if (!isLoaded || positions.length === 0) return;
      
      // Get unique tickers
      const allTickers = [...new Set(positions.map(p => p.ticker.toUpperCase()))];
      
      // Only fetch tickers we don't have data for in the current session
      const tickersToFetch = allTickers.filter(t => !dividendMap[t]);

      if (tickersToFetch.length === 0) return;

      setIsFetchingData(true);
      
      try {
        // Fetch tickers sequentially or in small batches to avoid Yahoo rate limits
        // Sequential is safer for reliability with multiple suffixes
        for (const ticker of tickersToFetch) {
          if (isCancelled) break;
          
          const data = await getTickerFinancials(ticker);
          
          if (isCancelled) break;

          setDividendMap(prev => ({
            ...prev,
            [ticker]: data?.dividendHistory || [],
            // Also map the resolved symbol if it was different (e.g. YTSL -> YTSL.NE)
            ...(data?.ticker && data.ticker !== ticker ? { [data.ticker]: data.dividendHistory || [] } : {})
          }));
        }
      } catch (error) {
        console.error("Portfolio data fetch failed:", error);
      } finally {
        if (!isCancelled) {
          setIsFetchingData(false);
        }
      }
    }

    fetchAllTickerData();

    return () => {
      isCancelled = true;
    };
  }, [positions, isLoaded, dividendMap]);

  const addPosition = useCallback((newPos: Omit<PortfolioPosition, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const ticker = newPos.ticker.toUpperCase();
    const position: PortfolioPosition = { ...newPos, ticker, id };
    
    setPositions(prev => [...prev, position]);
    
    const transaction: TransactionRecord = {
      id: `t_${Date.now()}`,
      ticker: ticker,
      type: 'buy',
      date: format(new Date(), 'yyyy-MM-dd'),
      shares: newPos.shares,
      price: newPos.purchasePrice,
      totalAmount: newPos.shares * newPos.purchasePrice
    };
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  const updatePosition = useCallback((id: string, updatedFields: Partial<PortfolioPosition>) => {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  }, []);

  const deletePosition = useCallback((id: string) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    setPositions(prev => prev.filter(p => p.id !== id));
    
    const transaction: TransactionRecord = {
      id: `t_${Date.now()}`,
      ticker: pos.ticker,
      type: 'sell',
      date: format(new Date(), 'yyyy-MM-dd'),
      shares: pos.shares,
      price: 0,
      totalAmount: 0
    };
    setTransactions(prev => [transaction, ...prev]);
  }, [positions]);

  const getAllDividends = useCallback(() => {
    const allDivs: Array<DividendData & { totalAmount: number; sharesAtTime: number }> = [];
    positions.forEach(pos => {
      // Try both the original and resolved tickers in the map
      const divs = dividendMap[pos.ticker.toUpperCase()] || [];
      divs.forEach(d => {
        allDivs.push({
          ...d,
          totalAmount: pos.shares * d.amountPerShare,
          sharesAtTime: pos.shares
        });
      });
    });
    return allDivs.sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime());
  }, [positions, dividendMap]);

  const getTickerData = useCallback((ticker: string) => {
    return dividendMap[ticker.toUpperCase()] || [];
  }, [dividendMap]);

  return {
    positions,
    transactions,
    addPosition,
    updatePosition,
    deletePosition,
    getAllDividends,
    getTickerData,
    isLoaded,
    isFetchingData
  };
}
