"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData, DividendFrequency } from '@/lib/types';
import { format, addMonths, addDays, isBefore, parseISO, startOfDay } from 'date-fns';

const STORAGE_KEY_TX = 'dividendwise_transactions';
const STORAGE_KEY_ADJ = 'dividendwise_adjustments';

export function usePortfolio() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, Record<number, { date?: string; amount?: number }>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedTx = localStorage.getItem(STORAGE_KEY_TX);
    const savedAdj = localStorage.getItem(STORAGE_KEY_ADJ);
    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedAdj) setManualAdjustments(JSON.parse(savedAdj));
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEY_ADJ, JSON.stringify(manualAdjustments));
    }
  }, [transactions, manualAdjustments, isLoaded]);

  const positions = useMemo(() => {
    const posMap: Record<string, { 
      shares: number, 
      totalCost: number, 
      ticker: string,
      dividendAmount: number,
      frequency: DividendFrequency,
      nextExDate: string
    }> = {};

    transactions.forEach(tx => {
      const ticker = (tx.ticker || "").toUpperCase();
      if (!ticker) return;

      if (!posMap[ticker]) {
        posMap[ticker] = { 
          shares: 0, 
          totalCost: 0, 
          ticker: ticker,
          dividendAmount: 0,
          frequency: 'quarterly',
          nextExDate: format(new Date(), 'yyyy-MM-dd')
        };
      }

      const p = posMap[ticker];
      const txShares = Number(tx.shares) || 0;
      const txAmount = Number(tx.totalAmount) || 0;

      if (tx.type === 'buy') {
        p.shares += txShares;
        p.totalCost += txAmount;
        // Update dividend info from the latest buy
        if (tx.dividendAmount !== undefined) p.dividendAmount = Number(tx.dividendAmount) || 0;
        if (tx.frequency !== undefined) p.frequency = tx.frequency;
        if (tx.nextExDate !== undefined) p.nextExDate = tx.nextExDate;
      } else if (tx.type === 'sell') {
        const avgCost = p.shares > 0 ? p.totalCost / p.shares : 0;
        p.shares -= txShares;
        p.totalCost -= (txShares * avgCost);
      } else if (tx.type === 'dividend') {
        // Optional update of dividend info from payout logs
        if (tx.dividendAmount !== undefined) p.dividendAmount = Number(tx.dividendAmount) || 0;
      }
    });

    return Object.values(posMap)
      .filter(p => p.shares > 0)
      .map(p => ({
        id: p.ticker,
        ticker: p.ticker,
        shares: Number(p.shares.toFixed(4)),
        totalCost: Number(p.totalCost.toFixed(2)),
        averagePrice: p.shares > 0 ? Number((p.totalCost / p.shares).toFixed(4)) : 0,
        dividendAmount: p.dividendAmount,
        frequency: p.frequency,
        nextExDate: p.nextExDate,
        manualAdjustments: manualAdjustments[p.ticker] || {}
      })) as PortfolioPosition[];
  }, [transactions, manualAdjustments]);

  const addTransaction = useCallback((tx: Omit<TransactionRecord, 'id'>) => {
    const uniqueId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ticker = tx.ticker.toUpperCase();
    
    setTransactions(prev => {
      const newTx = { ...tx, id: uniqueId, ticker };
      return [...prev, newTx];
    });

    // If it's a new buy, we reset specific calendar adjustments for this stock to start fresh
    if (tx.type === 'buy') {
      setManualAdjustments(prev => {
        const next = { ...prev };
        delete next[ticker];
        return next;
      });
    }
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateManualAdjustment = useCallback((ticker: string, index: number, updates: { date?: string; amount?: number }) => {
    setManualAdjustments(prev => {
      const stockAdjs = prev[ticker] || {};
      return {
        ...prev,
        [ticker]: {
          ...stockAdjs,
          [index]: { ...stockAdjs[index], ...updates }
        }
      };
    });
  }, []);

  const importData = useCallback((data: { transactions: TransactionRecord[], manualAdjustments?: any }) => {
    if (data.transactions) setTransactions(data.transactions);
    if (data.manualAdjustments) setManualAdjustments(data.manualAdjustments);
  }, []);

  const getAllDividends = useCallback(() => {
    const allDivs: DividendData[] = [];
    
    // 1. Add historical actual dividend payouts from transactions
    transactions.forEach(tx => {
      if (tx.type === 'dividend') {
        const exDateStr = tx.nextExDate || tx.date;
        allDivs.push({
          ticker: tx.ticker,
          exDate: exDateStr,
          recordDate: exDateStr,
          payoutDate: tx.date,
          amountPerShare: Number(tx.price) || 0, 
          totalAmount: Number(tx.totalAmount) || 0,
          sharesAtTime: Number(tx.shares) || 0,
          index: -1,
          status: 'edited'
        });
      }
    });

    // 2. Project future dividends based on current positions
    positions.forEach(pos => {
      const baseDate = parseISO(pos.nextExDate);
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
            exDate = parseISO(adjustment.date);
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

        // Logic: Only shares owned BEFORE ex-dividend date qualify
        const sharesAtDate = transactions
          .filter(tx => tx.ticker === pos.ticker && isBefore(parseISO(tx.date), startOfDay(parseISO(exDateStr))))
          .reduce((sum, tx) => {
            const txS = Number(tx.shares) || 0;
            if (tx.type === 'buy') return sum + txS;
            if (tx.type === 'sell') return sum - txS;
            return sum;
          }, 0);

        if (sharesAtDate > 0) {
          allDivs.push({
            ticker: pos.ticker,
            exDate: exDateStr,
            recordDate: exDateStr,
            payoutDate: format(payoutDate, 'yyyy-MM-dd'),
            amountPerShare: amountPerShare,
            totalAmount: Number((sharesAtDate * amountPerShare).toFixed(2)),
            sharesAtTime: sharesAtDate,
            index: i,
            status: status
          });
        }
      }
    });

    // Sort by Ex-Date and remove duplicates if any (ticker+date collision)
    const seen = new Set();
    return allDivs.filter(div => {
      const key = `${div.ticker}-${div.exDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime());
  }, [positions, transactions]);

  return {
    positions,
    transactions,
    manualAdjustments,
    addTransaction,
    deleteTransaction,
    updateManualAdjustment,
    getAllDividends,
    importData,
    isLoaded
  };
}
