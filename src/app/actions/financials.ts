'use server';

import yahooFinance from 'yahoo-finance2';
import { DividendData } from '@/lib/types';
import { format, subYears } from 'date-fns';

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
    baseTicker,        // Original without suffix
  ];

  // Remove duplicates
  const uniqueVariations = [...new Set(variations)];

  for (const symbol of uniqueVariations) {
    try {
      console.log(`Attempting to fetch data for: ${symbol}`);
      const quote = await yahooFinance.quote(symbol);
      
      // If we got a valid quote and it has a price, we consider this symbol valid
      if (quote && quote.regularMarketPrice !== undefined) {
        return { symbol, quote };
      }
    } catch (e) {
      // Continue to next variation
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
    
    // Fetch dividend events for the last 5 years to get a better history
    const period1 = subYears(new Date(), 5);
    const dividends = await yahooFinance.historical(symbol, {
      period1,
      events: 'div',
    });

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
