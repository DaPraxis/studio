
'use server';

import yahooFinance from 'yahoo-finance2';
import { DividendData } from '@/lib/types';
import { format, subYears } from 'date-fns';

export async function getTickerFinancials(ticker: string) {
  try {
    // Suppress console warnings from library for internal search redirects
    const quote = await yahooFinance.quote(ticker);
    
    // Fetch dividends for the last 2 years to ensure we have recent history
    const period1 = format(subYears(new Date(), 2), 'yyyy-MM-dd');
    const dividends = await yahooFinance.historical(ticker, {
      period1,
      events: 'div',
    });

    const dividendHistory: DividendData[] = dividends.map((d: any) => ({
      ticker: ticker,
      exDate: format(new Date(d.date), 'yyyy-MM-dd'),
      recordDate: format(new Date(d.date), 'yyyy-MM-dd'), // Approximate if missing
      payoutDate: format(new Date(d.date), 'yyyy-MM-dd'), // Approximate if missing
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
    return null;
  }
}
