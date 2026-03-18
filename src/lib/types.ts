export type TransactionType = 'buy' | 'sell' | 'dividend';

export interface PortfolioPosition {
  id: string;
  ticker: string;
  shares: number;
  purchaseDate: string;
  purchasePrice: number;
}

export interface DividendData {
  ticker: string;
  exDate: string;
  recordDate: string;
  payoutDate: string;
  amountPerShare: number;
  yield?: number;
}

export interface TransactionRecord {
  id: string;
  ticker: string;
  type: TransactionType;
  date: string;
  shares: number;
  price: number;
  totalAmount: number;
}

export interface PortfolioSummary {
  totalValue: number;
  annualDividend: number;
  yieldOnCost: number;
  upcomingPayoutsCount: number;
}