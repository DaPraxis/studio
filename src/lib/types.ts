export type TransactionType = 'buy' | 'sell' | 'dividend';
export type DividendFrequency = 'monthly' | 'quarterly' | 'annually' | 'semi-monthly';

export interface PortfolioPosition {
  id: string;
  ticker: string;
  shares: number;
  purchaseDate: string;
  purchasePrice: number;
  dividendAmount: number; // Per share
  frequency: DividendFrequency;
  nextExDate: string; // YYYY-MM-DD (Base Anchor)
  isManualDate?: boolean;
  manualAdjustments?: Record<number, string>; // Maps iteration index to a manually set date
}

export interface DividendData {
  ticker: string;
  exDate: string;
  recordDate: string;
  payoutDate: string;
  amountPerShare: number;
  yield?: number;
  totalAmount: number;
  sharesAtTime: number;
  index: number; // Iteration index in the projection
  status: 'base' | 'edited' | 'projected';
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
