import { PriceUpdate } from './market';

export const MARKET_EVENTS = {
  subscribe: 'subscribe',
  unsubscribe: 'unsubscribe',
  priceUpdate: 'price:update',
} as const;

export interface SubscribePayload {
  symbol: string;
}

export interface UnsubscribePayload {
  symbol: string;
}

export interface ServerToClientEvents {
  'price:update': (tick: PriceUpdate) => void;
}

export interface ClientToServerEvents {
  subscribe: (payload: SubscribePayload) => void;
  unsubscribe: (payload: UnsubscribePayload) => void;
}
