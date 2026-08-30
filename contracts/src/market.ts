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

export const HISTORY_INTERVALS = ['1m', '30m', '1h', '6h', '1d'] as const;

export type HistoryInterval = (typeof HISTORY_INTERVALS)[number];

export const INTERVAL_MS: Record<HistoryInterval, number> = {
  '1m': 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};
