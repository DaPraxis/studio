'use server';

import yahooFinance from 'yahoo-finance2';
import { DividendData } from '@/lib/types';
import { format, subYears } from 'date-fns';

/**
 * Helper to wrap a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Attempts to fetch data for a ticker, trying common Canadian suffixes if the primary fails.
 */
async function fetchWithFallbacks(ticker: string) {
  const baseTicker = ticker.split('.')[0].toUpperCase();
  // Variations to try for Canadian/Generic stocks
  const variations = [
    ticker.toUpperCase(),
    `${baseTicker}.NE`, // NEO Exchange
    `${baseTicker}.TO`, // Toronto Stock Exchange
  ];

  // Remove duplicates and empty strings
  const uniqueVariations = [...new Set(variations)].filter(v => v.length > 0);

  for (const symbol of uniqueVariations) {
    try {
      // console.log(`Attempting to fetch data for: ${symbol}`);
      // 5 second timeout for the quote
      const quote = await withTimeout(
        yahooFinance.quote(symbol),
        5000,
        `Timeout fetching quote for ${symbol}`
      );
      
      if (quote && quote.regularMarketPrice !== undefined) {
        return { symbol, quote };
      }
    } catch (e) {
      // Continue to next variation if this one fails or times out
      continue;
    }
  }
  return null;
}

export async function getTickerFinancials(ticker: string) {
  try {
    const result = await fetchWithFallbacks(ticker);
    
    if (!result) {
      return {
        ticker,
        price: 0,
        currency: 'USD',
        dividendYield: 'N/A',
        dividendHistory: [],
        error: 'Ticker not found'
      };
    }

    const { symbol, quote } = result;
    
    // Fetch dividend events for the last 5 years
    // 5 second timeout for historical data
    let dividends: any[] = [];
    try {
      const period1 = subYears(new Date(), 5);
      dividends = await withTimeout(
        yahooFinance.historical(symbol, {
          period1,
          events: 'div',
        }),
        5000,
        `Timeout fetching historical data for ${symbol}`
      ) || [];
    } catch (e) {
      // If historical fails, we still have the quote (yield)
      console.warn(`Could not fetch history for ${symbol}, using quote only.`);
    }

    const dividendHistory: DividendData[] = (dividends || [])
      .filter((d: any) => d.dividends !== undefined)
      .map((d: any) => ({
        ticker: symbol,
        exDate: format(new Date(d.date), 'yyyy-MM-dd'),
        recordDate: format(new Date(d.date), 'yyyy-MM-dd'),
        payoutDate: format(new Date(d.date), 'yyyy-MM-dd'),
        amountPerShare: d.dividends,
        yield: quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : undefined,
      }))
      .sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());

    return {
      ticker: symbol,
      price: quote.regularMarketPrice || 0,
      currency: quote.currency || 'USD',
      dividendYield: quote.trailingAnnualDividendYield ? (quote.trailingAnnualDividendYield * 100).toFixed(2) : 'N/A',
      dividendHistory: dividendHistory,
    };
  } catch (error) {
    console.error(`Critical error fetching data for ${ticker}:`, error);
    return {
      ticker,
      price: 0,
      currency: 'USD',
      dividendYield: 'N/A',
      dividendHistory: []
    };
  }
}
