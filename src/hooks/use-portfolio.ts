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
    const savedPositions = localStorage.getItem('dw_positions_v5');
    const savedTransactions = localStorage.getItem('dw_transactions_v5');
    
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
      localStorage.setItem('dw_positions_v5', JSON.stringify(positions));
      localStorage.setItem('dw_transactions_v5', JSON.stringify(transactions));
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
        // If nextExDate or dividendAmount is updated from Portfolio page, clear all individual calendar overrides
        const shouldReset = updatedFields.nextExDate !== undefined || updatedFields.dividendAmount !== undefined;
        const nextAdjustments = shouldReset ? {} : p.manualAdjustments;
        return { ...p, ...updatedFields, manualAdjustments: nextAdjustments };
      }
      return p;
    }));
  }, []);

  const updateManualAdjustment = useCallback((posId: string, index: number, updates: { date?: string; amount?: number }) => {
    setPositions(prev => prev.map(p => {
      if (p.id === posId) {
        const current = p.manualAdjustments?.[index] || {};
        return {
          ...p,
          manualAdjustments: {
            ...(p.manualAdjustments || {}),
            [index]: { ...current, ...updates }
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
      const baseAmount = pos.dividendAmount;
      
      let iterations = 0;
      let monthsStep = 0;
      let daysStep = 0;

      if (pos.frequency === 'monthly') { iterations = 12; monthsStep = 1; }
      else if (pos.frequency === 'quarterly') { iterations = 4; monthsStep = 3; }
      else if (pos.frequency === 'annually') { iterations = 1; monthsStep = 12; }
      else if (pos.frequency === 'semi-monthly') { iterations = 24; daysStep = 15; }

      let currentAnchorDate = baseDate;
      let currentAmount = baseAmount;
      let lastAnchorIndex = 0;

      for (let i = 0; i < iterations; i++) {
        let exDate: Date;
        let amountPerShare: number;
        let status: 'base' | 'edited' | 'projected' = 'projected';

        const adjustment = pos.manualAdjustments?.[i];

        // 1. Handle overrides and shifts
        if (adjustment) {
          if (adjustment.date) {
            exDate = new Date(adjustment.date);
            currentAnchorDate = exDate;
          } else {
            const diff = i - lastAnchorIndex;
            exDate = pos.frequency === 'semi-monthly' 
              ? addDays(currentAnchorDate, diff * daysStep)
              : addMonths(currentAnchorDate, diff * monthsStep);
          }

          if (adjustment.amount !== undefined) {
            amountPerShare = adjustment.amount;
            currentAmount = amountPerShare;
          } else {
            amountPerShare = currentAmount;
          }

          status = 'edited';
          lastAnchorIndex = i;
        } 
        // 2. Standard projections relative to last anchor
        else {
          const diff = i - lastAnchorIndex;
          if (pos.frequency === 'semi-monthly') {
            exDate = addDays(currentAnchorDate, diff * daysStep);
          } else {
            exDate = addMonths(currentAnchorDate, diff * monthsStep);
          }
          
          amountPerShare = currentAmount;
          
          if (i === 0) status = 'base';
          else status = 'projected';
        }

        const payoutDate = addDays(exDate, 10);
        
        allDivs.push({
          ticker: pos.ticker,
          exDate: format(exDate, 'yyyy-MM-dd'),
          recordDate: format(exDate, 'yyyy-MM-dd'),
          payoutDate: format(payoutDate, 'yyyy-MM-dd'),
          amountPerShare: amountPerShare,
          totalAmount: pos.shares * amountPerShare,
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
