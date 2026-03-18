
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Initial Load
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
    async function fetchAllTickerData() {
      if (!isLoaded || positions.length === 0) return;
      
      setIsFetchingData(true);
      const newDividendMap: Record<string, DividendData[]> = { ...dividendMap };
      let changed = false;

      for (const pos of positions) {
        if (!newDividendMap[pos.ticker]) {
          const data = await getTickerFinancials(pos.ticker);
          if (data) {
            newDividendMap[pos.ticker] = data.dividendHistory;
            changed = true;
          }
        }
      }

      if (changed) {
        setDividendMap(newDividendMap);
      }
      setIsFetchingData(false);
    }

    fetchAllTickerData();
  }, [positions, isLoaded]);

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
    // Sort by payout date descending
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
