"use client"

import { useState, useEffect, useCallback } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData, DividendFrequency } from '@/lib/types';
import { INITIAL_POSITIONS, INITIAL_TRANSACTIONS } from '@/lib/mock-data';
import { format, addMonths, addDays, isSameDay } from 'date-fns';

export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedPositions = localStorage.getItem('dw_positions_v4');
    const savedTransactions = localStorage.getItem('dw_transactions_v4');
    
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
      localStorage.setItem('dw_positions_v4', JSON.stringify(positions));
      localStorage.setItem('dw_transactions_v4', JSON.stringify(transactions));
    }
  }, [positions, transactions, isLoaded]);

  const addPosition = useCallback((newPos: Omit<PortfolioPosition, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const ticker = newPos.ticker.toUpperCase();
    const position: PortfolioPosition = { ...newPos, ticker, id, manualAdjustments: {} };
    
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
    setPositions(prev => prev.map(p => {
      if (p.id === id) {
        // If nextExDate is updated (usually from Portfolio page), clear all manual overrides
        const nextAdjustments = updatedFields.nextExDate ? {} : p.manualAdjustments;
        return { ...p, ...updatedFields, manualAdjustments: nextAdjustments };
      }
      return p;
    }));
  }, []);

  const updateManualAdjustment = useCallback((posId: string, index: number, newDate: string) => {
    setPositions(prev => prev.map(p => {
      if (p.id === posId) {
        return {
          ...p,
          manualAdjustments: {
            ...(p.manualAdjustments || {}),
            [index]: newDate
          }
        };
      }
      return p;
    }));
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

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const getAllDividends = useCallback(() => {
    const allDivs: DividendData[] = [];
    
    positions.forEach(pos => {
      const baseDate = new Date(pos.nextExDate);
      let iterations = 0;
      let monthsStep = 0;
      let daysStep = 0;

      if (pos.frequency === 'monthly') { iterations = 12; monthsStep = 1; }
      else if (pos.frequency === 'quarterly') { iterations = 4; monthsStep = 3; }
      else if (pos.frequency === 'annually') { iterations = 1; monthsStep = 12; }
      else if (pos.frequency === 'semi-monthly') { iterations = 24; daysStep = 15; }

      let currentAnchorDate = baseDate;
      let lastAnchorIndex = 0;

      for (let i = 0; i < iterations; i++) {
        let exDate: Date;
        let status: 'base' | 'edited' | 'projected' = 'projected';

        // 1. Check if this specific occurrence is manually edited
        if (pos.manualAdjustments?.[i]) {
          exDate = new Date(pos.manualAdjustments[i]);
          status = 'edited';
          // Move the anchor for all future projections in this loop
          currentAnchorDate = exDate;
          lastAnchorIndex = i;
        } 
        // 2. Otherwise, calculate relative to the last anchor (either the base or a previous edit)
        else {
          const diff = i - lastAnchorIndex;
          if (pos.frequency === 'semi-monthly') {
            exDate = addDays(currentAnchorDate, diff * daysStep);
          } else {
            exDate = addMonths(currentAnchorDate, diff * monthsStep);
          }
          
          if (i === 0) status = 'base';
          else status = 'projected';
        }

        const payoutDate = addDays(exDate, 10);
        
        allDivs.push({
          ticker: pos.ticker,
          exDate: format(exDate, 'yyyy-MM-dd'),
          recordDate: format(exDate, 'yyyy-MM-dd'),
          payoutDate: format(payoutDate, 'yyyy-MM-dd'),
          amountPerShare: pos.dividendAmount,
          totalAmount: pos.shares * pos.dividendAmount,
          sharesAtTime: pos.shares,
          index: i,
          status: status
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
    updateManualAdjustment,
    deletePosition,
    deleteTransaction,
    getAllDividends,
    isLoaded
  };
}
