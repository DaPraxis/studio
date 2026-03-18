export type TransactionType = 'buy' | 'sell' | 'dividend';
export type DividendFrequency = 'monthly' | 'quarterly' | 'annually' | 'semi-monthly';

export interface PortfolioPosition {
  id: string;
  ticker: string;
  shares: number;
  averagePrice: number;
  totalCost: number;
  dividendAmount: number; 
  frequency: DividendFrequency;
  nextExDate: string; 
  manualAdjustments?: Record<number, { date?: string; amount?: number }>;
}

export interface DividendData {
  ticker: string;
  exDate: string;
  recordDate: string;
  payoutDate: string;
  amountPerShare: number;
  totalAmount: number;
  sharesAtTime: number;
  index: number;
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
  // Optional dividend info updated during a 'buy' or 'dividend' log
  dividendAmount?: number;
  frequency?: DividendFrequency;
  nextExDate?: string;
}
