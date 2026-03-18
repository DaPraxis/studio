"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { PortfolioPosition, TransactionRecord, DividendData } from '@/lib/types';
import { INITIAL_POSITIONS, INITIAL_TRANSACTIONS } from '@/lib/mock-data';
import { format } from 'date-fns';
import { getTickerFinancials } from '@/app/actions/financials';

// Cache data for 7 days to conserve API quota
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; 

export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [dividendMap, setDividendMap] = useState<Record<string, { data: DividendData[], updatedAt: number }>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const fetchInProgress = useRef(false);

  // Initial Load from LocalStorage
  useEffect(() => {
    const savedPositions = localStorage.getItem('dw_positions');
    const savedTransactions = localStorage.getItem('dw_transactions');
    const savedDividends = localStorage.getItem('dw_dividend_cache');
    
    if (savedPositions && savedTransactions) {
      setPositions(JSON.parse(savedPositions));
      setTransactions(JSON.parse(savedTransactions));
    } else {
      setPositions(INITIAL_POSITIONS);
      setTransactions(INITIAL_TRANSACTIONS);
    }

    if (savedDividends) {
      setDividendMap(JSON.parse(savedDividends));
    }

    setIsLoaded(true);
  }, []);

  // Sync Positions/Transactions to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dw_positions', JSON.stringify(positions));
      localStorage.setItem('dw_transactions', JSON.stringify(transactions));
    }
  }, [positions, transactions, isLoaded]);

  // Sync Dividend Cache to LocalStorage
  useEffect(() => {
    if (isLoaded && Object.keys(dividendMap).length > 0) {
      localStorage.setItem('dw_dividend_cache', JSON.stringify(dividendMap));
    }
  }, [dividendMap, isLoaded]);

  // Fetch Live Data for Tickers (Optimized for EODHD 20/day limit)
  useEffect(() => {
    let isCancelled = false;

    async function fetchAllTickerData() {
      if (!isLoaded || positions.length === 0 || fetchInProgress.current) return;
      
      const allTickers = [...new Set(positions.map(p => p.ticker.toUpperCase()))];
      const now = Date.now();

      // Only fetch if we don't have it OR it's older than CACHE_EXPIRY
      const tickersToFetch = allTickers.filter(t => {
        const cached = dividendMap[t];
        const isStale = cached && (now - cached.updatedAt > CACHE_EXPIRY);
        return !cached || isStale;
      });

      if (tickersToFetch.length === 0) return;

      setIsFetchingData(true);
      fetchInProgress.current = true;
      
      try {
        for (const ticker of tickersToFetch) {
          if (isCancelled) break;
          
          const result = await getTickerFinancials(ticker);
          
          if (isCancelled) break;

          if (result) {
            setDividendMap(prev => ({
              ...prev,
              [ticker]: { 
                data: result.dividendHistory || [], 
                updatedAt: Date.now() 
              },
              // If the ticker was resolved to a specific exchange (e.g. YSTL -> YSTL.NE), map that too
              ...(result.ticker && result.ticker !== ticker ? { 
                [result.ticker]: { data: result.dividendHistory || [], updatedAt: Date.now() } 
              } : {})
            }));
          } else {
            // Mark as empty but "updated" so we don't spam API retries for broken symbols
            setDividendMap(prev => ({
              ...prev,
              [ticker]: { data: [], updatedAt: Date.now() }
            }));
          }
        }
      } catch (error) {
        console.error("Batch fetch failed", error);
      } finally {
        if (!isCancelled) {
          setIsFetchingData(false);
          fetchInProgress.current = false;
        }
      }
    }

    fetchAllTickerData();

    return () => {
      isCancelled = true;
      fetchInProgress.current = false;
    };
  }, [positions, isLoaded, dividendMap]);

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

  const getAllDividends = useCallback(() => {
    const allDivs: Array<DividendData & { totalAmount: number; sharesAtTime: number }> = [];
    positions.forEach(pos => {
      const ticker = pos.ticker.toUpperCase();
      const cached = dividendMap[ticker];
      const divs = cached?.data || [];
      
      divs.forEach(d => {
        allDivs.push({
          ...d,
          totalAmount: pos.shares * d.amountPerShare,
          sharesAtTime: pos.shares
        });
      });
    });
    return allDivs.sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());
  }, [positions, dividendMap]);

  const getTickerData = useCallback((ticker: string) => {
    return dividendMap[ticker.toUpperCase()]?.data || [];
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
