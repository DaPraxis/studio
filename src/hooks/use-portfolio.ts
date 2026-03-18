"use client"

import { useState, useEffect, useCallback } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData } from '@/lib/types';
import { INITIAL_POSITIONS, INITIAL_TRANSACTIONS } from '@/lib/mock-data';
import { format, addMonths, isAfter, isBefore, addDays } from 'date-fns';

export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial Load from LocalStorage
  useEffect(() => {
    const savedPositions = localStorage.getItem('dw_positions_v2');
    const savedTransactions = localStorage.getItem('dw_transactions_v2');
    
    if (savedPositions && savedTransactions) {
      setPositions(JSON.parse(savedPositions));
      setTransactions(JSON.parse(savedTransactions));
    } else {
      setPositions(INITIAL_POSITIONS);
      setTransactions(INITIAL_TRANSACTIONS);
    }

    setIsLoaded(true);
  }, []);

  // Sync Positions/Transactions to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dw_positions_v2', JSON.stringify(positions));
      localStorage.setItem('dw_transactions_v2', JSON.stringify(transactions));
    }
  }, [positions, transactions, isLoaded]);

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

  /**
   * Projects future dividends based on manual input.
   * Generates a 12-month schedule starting from nextExDate.
   */
  const getAllDividends = useCallback(() => {
    const allDivs: Array<DividendData & { totalAmount: number; sharesAtTime: number }> = [];
    
    positions.forEach(pos => {
      const startDate = new Date(pos.nextExDate);
      let iterations = pos.frequency === 'monthly' ? 12 : pos.frequency === 'quarterly' ? 4 : 1;
      let monthsToAdd = pos.frequency === 'monthly' ? 1 : pos.frequency === 'quarterly' ? 3 : 12;

      for (let i = 0; i < iterations; i++) {
        const exDate = addMonths(startDate, i * monthsToAdd);
        // Estimated payout is 10 days after ex-date
        const payoutDate = addDays(exDate, 10);

        allDivs.push({
          ticker: pos.ticker,
          exDate: format(exDate, 'yyyy-MM-dd'),
          recordDate: format(exDate, 'yyyy-MM-dd'),
          payoutDate: format(payoutDate, 'yyyy-MM-dd'),
          amountPerShare: pos.dividendAmount,
          yield: pos.purchasePrice > 0 ? (pos.dividendAmount * (12/monthsToAdd) / pos.purchasePrice) * 100 : 0,
          totalAmount: pos.shares * pos.dividendAmount,
          sharesAtTime: pos.shares
        });
      }
    });

    return allDivs.sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime());
  }, [positions]);

  return {
    positions,
    transactions,
    addPosition,
    updatePosition,
    deletePosition,
    getAllDividends,
    isLoaded
  };
}
