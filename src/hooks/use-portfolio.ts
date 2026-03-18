"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData, DividendFrequency } from '@/lib/types';
import { INITIAL_TRANSACTIONS } from '@/lib/mock-data';
import { format, addMonths, addDays, isBefore, parseISO } from 'date-fns';

export function usePortfolio() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, Record<number, { date?: string; amount?: number }>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTransactions = localStorage.getItem('dw_transactions_v8');
    const savedAdjustments = localStorage.getItem('dw_adjustments_v8');
    
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
      localStorage.setItem('dw_transactions_v8', JSON.stringify(transactions));
      localStorage.setItem('dw_adjustments_v8', JSON.stringify(manualAdjustments));
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
        if (tx.dividendAmount !== undefined) p.dividendAmount = tx.dividendAmount;
        if (tx.frequency !== undefined) p.frequency = tx.frequency;
        if (tx.nextExDate !== undefined) p.nextExDate = tx.nextExDate;
      } else if (tx.type === 'sell') {
        const avgCost = p.shares > 0 ? p.totalCost / p.shares : 0;
        p.shares -= tx.shares;
        p.totalCost -= (tx.shares * avgCost);
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
    
    // 1. Add Actual Recorded Dividend Payouts from History
    transactions.forEach(tx => {
      if (tx.type === 'dividend') {
        const exDate = tx.nextExDate || tx.date;
        allDivs.push({
          ticker: tx.ticker,
          exDate: exDate,
          recordDate: exDate,
          payoutDate: tx.date,
          amountPerShare: tx.price, // For dividend tx, price is used as amount per share
          totalAmount: tx.totalAmount,
          sharesAtTime: tx.shares,
          index: -1,
          status: 'edited'
        });
      }
    });

    // 2. Generate Projections based on current positions and history
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
        } else {
          const diff = i - lastAnchorIndex;
          exDate = pos.frequency === 'semi-monthly' 
            ? addDays(currentAnchorDate, diff * daysStep)
            : addMonths(currentAnchorDate, diff * monthsStep);
          amountPerShare = currentAmount;
          if (i === 0) status = 'base';
        }

        const payoutDate = addDays(exDate, 10);
        const exDateStr = format(exDate, 'yyyy-MM-dd');

        // QUALIFICATION LOGIC: Shares must exist BEFORE the ex-dividend date (exclusive)
        const sharesAtDate = transactions
          .filter(tx => tx.ticker === pos.ticker && isBefore(parseISO(tx.date), parseISO(exDateStr)))
          .reduce((sum, tx) => {
            if (tx.type === 'buy') return sum + tx.shares;
            if (tx.type === 'sell') return sum - tx.shares;
            return sum;
          }, 0);

        if (sharesAtDate > 0) {
          allDivs.push({
            ticker: pos.ticker,
            exDate: exDateStr,
            recordDate: exDateStr,
            payoutDate: format(payoutDate, 'yyyy-MM-dd'),
            amountPerShare: amountPerShare,
            totalAmount: sharesAtDate * amountPerShare,
            sharesAtTime: sharesAtDate,
            index: i,
            status: status
          });
        }
      }
    });

    const seen = new Set();
    const uniqueDivs = allDivs.filter(div => {
      const key = `${div.ticker}-${div.exDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueDivs.sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime());
  }, [positions, transactions]);

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
