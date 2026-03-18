"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData, DividendFrequency } from '@/lib/types';
import { format, addMonths, addDays, isBefore, parseISO, startOfDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';

export function usePortfolio() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, Record<number, { date?: string; amount?: number }>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Subscribe to Firestore for real-time server-side persistence
  useEffect(() => {
    // 1. Listen for Transactions
    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'asc'));
    const unsubscribeTx = onSnapshot(qTransactions, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TransactionRecord));
      setTransactions(txData);
      setIsLoaded(true);
    });

    // 2. Listen for Adjustments
    const unsubscribeAdj = onSnapshot(collection(db, 'adjustments'), (snapshot) => {
      const adjData: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        adjData[doc.id] = doc.data().adjustments || {};
      });
      setManualAdjustments(adjData);
    });

    return () => {
      unsubscribeTx();
      unsubscribeAdj();
    };
  }, []);

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
        if (tx.dividendAmount !== undefined) p.dividendAmount = Number(tx.dividendAmount) || 0;
        if (tx.frequency !== undefined) p.frequency = tx.frequency;
        if (tx.nextExDate !== undefined) p.nextExDate = tx.nextExDate;
      } else if (tx.type === 'sell') {
        const avgCost = p.shares > 0 ? p.totalCost / p.shares : 0;
        p.shares -= txShares;
        p.totalCost -= (txShares * avgCost);
      } else if (tx.type === 'dividend') {
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

  const addTransaction = useCallback(async (tx: Omit<TransactionRecord, 'id'>) => {
    const uniqueId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ticker = tx.ticker.toUpperCase();
    
    // If it's a new buy, we reset specific calendar adjustments for this stock to start fresh
    if (tx.type === 'buy') {
      await deleteDoc(doc(db, 'adjustments', ticker));
    }

    await setDoc(doc(db, 'transactions', uniqueId), {
      ...tx,
      ticker,
      shares: Number(tx.shares) || 0,
      price: Number(tx.price) || 0,
      totalAmount: Number(tx.totalAmount) || 0,
      dividendAmount: tx.dividendAmount !== undefined ? Number(tx.dividendAmount) || 0 : undefined
    });
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
  }, []);

  const updateManualAdjustment = useCallback(async (ticker: string, index: number, updates: { date?: string; amount?: number }) => {
    const currentAdjustments = manualAdjustments[ticker] || {};
    const updated = {
      ...currentAdjustments,
      [index]: { ...(currentAdjustments[index] || {}), ...updates }
    };
    
    await setDoc(doc(db, 'adjustments', ticker), { adjustments: updated });
  }, [manualAdjustments]);

  const importData = useCallback(async (data: { transactions: TransactionRecord[], manualAdjustments?: any }) => {
    const batch = writeBatch(db);

    if (data.transactions) {
      data.transactions.forEach(tx => {
        const id = tx.id || `t_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        batch.set(doc(db, 'transactions', id), {
          ...tx,
          shares: Number(tx.shares) || 0,
          price: Number(tx.price) || 0,
          totalAmount: Number(tx.totalAmount) || 0
        });
      });
    }

    if (data.manualAdjustments) {
      Object.entries(data.manualAdjustments).forEach(([ticker, adjs]) => {
        batch.set(doc(db, 'adjustments', ticker), { adjustments: adjs });
      });
    }

    await batch.commit();
  }, []);

  const getAllDividends = useCallback(() => {
    const allDivs: DividendData[] = [];
    
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
