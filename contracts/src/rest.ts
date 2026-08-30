import { HistoricalPricePoint, HistoryInterval, Ticker } from './market';

export type TickerListResponse = Ticker[];

export interface TickerHistoryResponse {
  symbol: string;
  interval: HistoryInterval;
  points: HistoricalPricePoint[];
}
