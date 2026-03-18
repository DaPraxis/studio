"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchInProgress = useRef(false);

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
      if (!isLoaded || positions.length === 0 || fetchInProgress.current) return;
      
      const allTickers = [...new Set(positions.map(p => p.ticker.toUpperCase()))];
      const tickersToFetch = allTickers.filter(t => !dividendMap[t]);

      if (tickersToFetch.length === 0) return;

      setIsFetchingData(true);
      fetchInProgress.current = true;
      
      try {
        // Fetch sequentially to stay within Yahoo rate limits and manage timeouts better
        for (const ticker of tickersToFetch) {
          if (isCancelled) break;
          
          try {
            // Set a safety timeout for the server action itself
            const data = await getTickerFinancials(ticker);
            
            if (isCancelled) break;

            if (data) {
              setDividendMap(prev => ({
                ...prev,
                [ticker]: data.dividendHistory || [],
                // Also cache under the resolved symbol if different
                ...(data.ticker && data.ticker !== ticker ? { [data.ticker]: data.dividendHistory || [] } : {})
              }));
            }
          } catch (tickerError) {
            console.error(`Error fetching data for ${ticker}:`, tickerError);
            // Mark as fetched with empty data to avoid re-retrying this session
            setDividendMap(prev => ({ ...prev, [ticker]: [] }));
          }
        }
      } catch (error) {
        console.error("Portfolio data fetch failed:", error);
      } finally {
        if (!isCancelled) {
          setIsFetchingData(false);
          fetchInProgress.current = false;
        }
      }
    }

    fetchAllTickerData();

    return () => {
      isCancelled = true;
      fetchInProgress.current = false;
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
      const divs = dividendMap[pos.ticker.toUpperCase()] || [];
      divs.forEach(d => {
        allDivs.push({
          ...d,
          totalAmount: pos.shares * d.amountPerShare,
          sharesAtTime: pos.shares
        });
      });
    });
    return allDivs.sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());
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
