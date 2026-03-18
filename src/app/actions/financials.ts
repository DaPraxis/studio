'use server';

import { DividendData } from '@/lib/types';

/**
 * EODHD API Key provided by user
 */
const API_KEY = '69bae56a2ef170.56740776';

/**
 * Attempts to fetch data from EODHD with a timeout.
 */
async function fetchEODHD(endpoint: string, params: Record<string, string> = {}) {
  const urlParams = new URLSearchParams({
    api_token: API_KEY,
    fmt: 'json',
    ...params
  });
  const url = `https://eodhd.com/api/${endpoint}?${urlParams.toString()}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

/**
 * Resolves a ticker to the most likely EODHD format.
 * EODHD requires {SYMBOL}.{EXCHANGE}
 */
function resolveTicker(ticker: string): string {
  const up = ticker.toUpperCase();
  if (up.includes('.')) return up;
  // Default common assumption for US stocks if no suffix
  return `${up}.US`;
}

export async function getTickerFinancials(ticker: string) {
  const symbol = resolveTicker(ticker);
  
  try {
    // 1. Fetch Real-time Price for yield calculation
    const priceData = await fetchEODHD(`real-time/${symbol}`);
    
    // 2. Fetch Dividend History
    // We fetch a broad history to map out the calendar
    const divData = await fetchEODHD(`div/${symbol}`);

    if (!divData || !Array.isArray(divData)) {
      // If we failed with .US or provided suffix, try .TO as a fallback for Canadian potential
      if (!ticker.includes('.')) {
        const fallbackSymbol = `${ticker.toUpperCase()}.TO`;
        const fallbackDiv = await fetchEODHD(`div/${fallbackSymbol}`);
        if (fallbackDiv && Array.isArray(fallbackDiv)) {
          return processResults(fallbackSymbol, fallbackDiv, await fetchEODHD(`real-time/${fallbackSymbol}`));
        }
      }
      return null;
    }

    return processResults(symbol, divData, priceData);
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

function processResults(symbol: string, divData: any[], priceData: any) {
  const currentPrice = priceData?.close || 0;
  
  const history: DividendData[] = divData.map((d: any) => ({
    ticker: symbol,
    exDate: d.date,
    recordDate: d.recordDate || d.date,
    payoutDate: d.paymentDate || d.date,
    amountPerShare: d.value,
    yield: currentPrice > 0 ? (d.value * 4 / currentPrice) * 100 : undefined, // Annualized estimate
  })).sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());

  return {
    ticker: symbol,
    price: currentPrice,
    currency: priceData?.currency || 'USD',
    dividendYield: currentPrice > 0 && history.length > 0 ? (history[0].yield?.toFixed(2)) : 'N/A',
    dividendHistory: history,
    updatedAt: Date.now()
  };
}
