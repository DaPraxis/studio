"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData, DividendFrequency } from '@/lib/types';
import { INITIAL_TRANSACTIONS } from '@/lib/mock-data';
import { format, addMonths, addDays, isAfter } from 'date-fns';

export function usePortfolio() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, Record<number, { date?: string; amount?: number }>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTransactions = localStorage.getItem('dw_transactions_v7');
    const savedAdjustments = localStorage.getItem('dw_adjustments_v7');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
    }

    if (savedAdjustments) {
      setManualAdjustments(JSON.parse(savedAdjustments));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dw_transactions_v7', JSON.stringify(transactions));
      localStorage.setItem('dw_adjustments_v7', JSON.stringify(manualAdjustments));
    }
  }, [transactions, manualAdjustments, isLoaded]);

  // Derive Positions from Transactions
  const positions = useMemo(() => {
    const posMap: Record<string, { 
      shares: number, 
      totalCost: number, 
      ticker: string,
      dividendAmount: number,
      frequency: DividendFrequency,
      nextExDate: string
    }> = {};

    // Sort transactions by date to ensure dividend info updates correctly
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTx.forEach(tx => {
      if (!posMap[tx.ticker]) {
        posMap[tx.ticker] = { 
          shares: 0, 
          totalCost: 0, 
          ticker: tx.ticker,
          dividendAmount: 0,
          frequency: 'quarterly',
          nextExDate: format(new Date(), 'yyyy-MM-dd')
        };
      }

      const p = posMap[tx.ticker];

      if (tx.type === 'buy') {
        p.shares += tx.shares;
        p.totalCost += tx.totalAmount;
        // Update dividend settings if provided in the buy log
        if (tx.dividendAmount !== undefined) p.dividendAmount = tx.dividendAmount;
        if (tx.frequency !== undefined) p.frequency = tx.frequency;
        if (tx.nextExDate !== undefined) {
          p.nextExDate = tx.nextExDate;
          // When nextExDate is updated via a transaction, we should technically clear adjustments,
          // but for this MVP we'll let the user manage that.
        }
      } else if (tx.type === 'sell') {
        const avgCost = p.shares > 0 ? p.totalCost / p.shares : 0;
        p.shares -= tx.shares;
        p.totalCost -= (tx.shares * avgCost); // Remove proportional cost
      } else if (tx.type === 'dividend') {
        if (tx.dividendAmount !== undefined) p.dividendAmount = tx.dividendAmount;
      }
    });

    return Object.values(posMap)
      .filter(p => p.shares > 0)
      .map(p => ({
        id: p.ticker,
        ticker: p.ticker,
        shares: p.shares,
        totalCost: p.totalCost,
        averagePrice: p.shares > 0 ? p.totalCost / p.shares : 0,
        dividendAmount: p.dividendAmount,
        frequency: p.frequency,
        nextExDate: p.nextExDate,
        manualAdjustments: manualAdjustments[p.ticker] || {}
      })) as PortfolioPosition[];
  }, [transactions, manualAdjustments]);

  const addTransaction = useCallback((tx: Omit<TransactionRecord, 'id'>) => {
    const transaction: TransactionRecord = {
      ...tx,
      id: `t_${Date.now()}`,
      ticker: tx.ticker.toUpperCase()
    };
    setTransactions(prev => [...prev, transaction]);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateManualAdjustment = useCallback((ticker: string, index: number, updates: { date?: string; amount?: number }) => {
    setManualAdjustments(prev => {
      const tickerAdjustments = prev[ticker] || {};
      const current = tickerAdjustments[index] || {};
      return {
        ...prev,
        [ticker]: {
          ...tickerAdjustments,
          [index]: { ...current, ...updates }
        }
      };
    });
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
    addTransaction,
    deleteTransaction,
    updateManualAdjustment,
    getAllDividends,
    isLoaded
  };
}
