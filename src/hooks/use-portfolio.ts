"use client"

import { useState, useEffect, useCallback } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData } from '@/lib/types';
import { INITIAL_POSITIONS, INITIAL_TRANSACTIONS, getDividendsForTicker } from '@/lib/mock-data';
import { format } from 'date-fns';

export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dw_positions', JSON.stringify(positions));
      localStorage.setItem('dw_transactions', JSON.stringify(transactions));
    }
  }, [positions, transactions, isLoaded]);

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
      price: 0, // Simplified
      totalAmount: 0 // Simplified
    };
    setTransactions(prev => [transaction, ...prev]);
  }, [positions]);

  const getAllDividends = useCallback(() => {
    const allDivs: Array<DividendData & { totalAmount: number; sharesAtTime: number }> = [];
    positions.forEach(pos => {
      const divs = getDividendsForTicker(pos.ticker);
      divs.forEach(d => {
        allDivs.push({
          ...d,
          totalAmount: pos.shares * d.amountPerShare,
          sharesAtTime: pos.shares
        });
      });
    });
    return allDivs;
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