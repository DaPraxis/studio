
'use server';

import yahooFinance from 'yahoo-finance2';
import { DividendData } from '@/lib/types';
import { format, subYears } from 'date-fns';

export async function getTickerFinancials(ticker: string) {
  try {
    // 1. Fetch current quote for price and yield
    const quote = await yahooFinance.quote(ticker);
    
    // 2. Fetch dividend events for the last 2 years
    const period1 = subYears(new Date(), 2);
    const dividends = await yahooFinance.historical(ticker, {
      period1,
      events: 'div',
    });

    if (!dividends || !Array.isArray(dividends)) {
      return {
        ticker,
        price: quote.regularMarketPrice,
        currency: quote.currency,
        dividendYield: quote.trailingAnnualDividendYield ? (quote.trailingAnnualDividendYield * 100).toFixed(2) : 'N/A',
        dividendHistory: [],
      };
    }

    const dividendHistory: DividendData[] = dividends.map((d: any) => ({
      ticker: ticker,
      exDate: format(new Date(d.date), 'yyyy-MM-dd'),
      recordDate: format(new Date(d.date), 'yyyy-MM-dd'),
      payoutDate: format(new Date(d.date), 'yyyy-MM-dd'),
      amountPerShare: d.dividends,
      yield: quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : undefined,
    })).sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());

    return {
      ticker: ticker,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      dividendYield: quote.trailingAnnualDividendYield ? (quote.trailingAnnualDividendYield * 100).toFixed(2) : 'N/A',
      dividendHistory: dividendHistory,
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    // Return a basic object so the hook knows the attempt was made
    return {
      ticker,
      price: 0,
      currency: 'USD',
      dividendYield: 'N/A',
      dividendHistory: []
    };
  }
}
