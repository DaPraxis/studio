import { PortfolioPosition, TransactionRecord } from './types';

export const INITIAL_POSITIONS: PortfolioPosition[] = [
  { 
    id: '1', 
    ticker: 'AAPL', 
    shares: 50, 
    purchaseDate: '2023-01-15', 
    purchasePrice: 145.20,
    dividendAmount: 0.25,
    frequency: 'quarterly',
    nextExDate: '2024-05-10'
  },
  { 
    id: '2', 
    ticker: 'O', 
    shares: 100, 
    purchaseDate: '2023-05-20', 
    purchasePrice: 62.15,
    dividendAmount: 0.26,
    frequency: 'monthly',
    nextExDate: '2024-05-31'
  },
  { 
    id: '3', 
    ticker: 'YSTL.TO', 
    shares: 200, 
    purchaseDate: '2024-01-10', 
    purchasePrice: 15.40,
    dividendAmount: 0.12,
    frequency: 'monthly',
    nextExDate: '2024-05-30'
  },
];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  { id: 't1', ticker: 'AAPL', type: 'buy', date: '2023-01-15', shares: 50, price: 145.20, totalAmount: 7260 },
  { id: 't2', ticker: 'O', type: 'buy', date: '2023-05-20', shares: 100, price: 62.15, totalAmount: 6215 },
  { id: 't3', ticker: 'YSTL.TO', type: 'buy', date: '2024-01-10', shares: 200, price: 15.40, totalAmount: 3080 },
];
