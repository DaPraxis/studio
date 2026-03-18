
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

  // Fetch Live Data for Tickers in Parallel
  useEffect(() => {
    let isCancelled = false;

    async function fetchAllTickerData() {
      if (!isLoaded || positions.length === 0) return;
      
      // Filter out tickers we already have in the map
      const tickersToFetch = [...new Set(positions.map(p => p.ticker))]
        .filter(t => !dividendMap[t]);

      if (tickersToFetch.length === 0) return;

      setIsFetchingData(true);
      try {
        // Fetch all missing tickers in parallel for better performance
        const results = await Promise.all(
          tickersToFetch.map(ticker => getTickerFinancials(ticker))
        );

        if (isCancelled) return;

        setDividendMap(prev => {
          const next = { ...prev };
          results.forEach((data, index) => {
            const ticker = tickersToFetch[index];
            if (data && data.dividendHistory) {
              next[ticker] = data.dividendHistory;
            } else {
              // Mark as empty array to avoid re-fetching failed ones in this session
              next[ticker] = [];
            }
          });
          return next;
        });
      } catch (error) {
        console.error("Critical error in portfolio data fetch:", error);
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
    const position: PortfolioPosition = { ...newPos, id };
    
    setPositions(prev => [...prev, position]);
    
    const transaction: TransactionRecord = {
      id: `t_${Date.now()}`,
      ticker: newPos.ticker,
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
      const divs = dividendMap[pos.ticker] || [];
      divs.forEach(d => {
        allDivs.push({
          ...d,
          totalAmount: pos.shares * d.amountPerShare,
          sharesAtTime: pos.shares
        });
      });
    });
    // Sort by payout date descending (latest first)
    return allDivs.sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime());
  }, [positions, dividendMap]);

  const getTickerData = useCallback((ticker: string) => {
    return dividendMap[ticker] || [];
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
