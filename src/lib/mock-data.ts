import { PortfolioPosition, DividendData, TransactionRecord } from './types';
import { addDays, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const INITIAL_POSITIONS: PortfolioPosition[] = [
  { id: '1', ticker: 'AAPL', shares: 50, purchaseDate: '2023-01-15', purchasePrice: 145.20 },
  { id: '2', ticker: 'MSFT', shares: 20, purchaseDate: '2022-11-10', purchasePrice: 240.50 },
  { id: '3', ticker: 'O', shares: 100, purchaseDate: '2023-05-20', purchasePrice: 62.15 },
  { id: '4', ticker: 'SCHD', shares: 150, purchaseDate: '2023-03-05', purchasePrice: 72.80 },
];

export const MOCK_DIVIDENDS: Record<string, DividendData[]> = {
  'AAPL': [
    { ticker: 'AAPL', exDate: '2024-05-10', recordDate: '2024-05-11', payoutDate: '2024-05-16', amountPerShare: 0.25, yield: 0.52 },
    { ticker: 'AAPL', exDate: '2024-02-09', recordDate: '2024-02-10', payoutDate: '2024-02-15', amountPerShare: 0.24, yield: 0.50 },
    { ticker: 'AAPL', exDate: '2023-11-10', recordDate: '2023-11-11', payoutDate: '2023-11-16', amountPerShare: 0.24, yield: 0.50 },
  ],
  'MSFT': [
    { ticker: 'MSFT', exDate: '2024-05-15', recordDate: '2024-05-16', payoutDate: '2024-06-13', amountPerShare: 0.75, yield: 0.71 },
    { ticker: 'MSFT', exDate: '2024-02-14', recordDate: '2024-02-15', payoutDate: '2024-03-14', amountPerShare: 0.75, yield: 0.71 },
  ],
  'O': [
    { ticker: 'O', exDate: '2024-04-30', recordDate: '2024-05-01', payoutDate: '2024-05-15', amountPerShare: 0.2625, yield: 5.80 },
    { ticker: 'O', exDate: '2024-03-28', recordDate: '2024-04-01', payoutDate: '2024-04-15', amountPerShare: 0.2570, yield: 5.75 },
    { ticker: 'O', exDate: '2024-05-31', recordDate: '2024-06-03', payoutDate: '2024-06-14', amountPerShare: 0.2625, yield: 5.82 },
  ],
  'SCHD': [
    { ticker: 'SCHD', exDate: '2024-03-20', recordDate: '2024-03-21', payoutDate: '2024-03-25', amountPerShare: 0.611, yield: 3.42 },
    { ticker: 'SCHD', exDate: '2024-06-21', recordDate: '2024-06-24', payoutDate: '2024-06-26', amountPerShare: 0.650, yield: 3.55 },
  ]
};

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  { id: 't1', ticker: 'AAPL', type: 'buy', date: '2023-01-15', shares: 50, price: 145.20, totalAmount: 7260 },
  { id: 't2', ticker: 'MSFT', type: 'buy', date: '2022-11-10', shares: 20, price: 240.50, totalAmount: 4810 },
  { id: 't3', ticker: 'O', type: 'buy', date: '2023-05-20', shares: 100, price: 62.15, totalAmount: 6215 },
  { id: 't4', ticker: 'SCHD', type: 'buy', date: '2023-03-05', shares: 150, price: 72.80, totalAmount: 10920 },
  { id: 't5', ticker: 'AAPL', type: 'dividend', date: '2024-02-15', shares: 50, price: 0, totalAmount: 12.00 },
];

export function getDividendsForTicker(ticker: string): DividendData[] {
  return MOCK_DIVIDENDS[ticker] || [];
}