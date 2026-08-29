import { HistoricalPricePoint, Ticker } from './market';

export type TickerListResponse = Ticker[];

export interface TickerHistoryResponse {
  symbol: string;
  points: HistoricalPricePoint[];
}
