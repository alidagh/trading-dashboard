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

// The feed publishes a price this often, and history is just the entries it kept.
export const PRICE_INTERVAL_MS = 2000;

export const HISTORY_INTERVALS = ['1m', '5m', '30m', '1h'] as const;

export type HistoryInterval = (typeof HISTORY_INTERVALS)[number];

export const INTERVAL_MS: Record<HistoryInterval, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
};
