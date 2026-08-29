// Timestamps are epoch milliseconds everywhere on the wire.

export type AssetClass = 'equity' | 'crypto';

export interface Ticker {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  lastPrice: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface HistoricalPricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
