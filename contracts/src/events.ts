import { Alert } from './alerts';
import { PriceUpdate } from './market';

export const MARKET_EVENTS = {
  subscribe: 'subscribe',
  unsubscribe: 'unsubscribe',
  priceUpdate: 'price:update',
  alertTriggered: 'alert:triggered',
} as const;

export interface SubscribePayload {
  symbol: string;
}

export interface UnsubscribePayload {
  symbol: string;
}

export interface ServerToClientEvents {
  'price:update': (tick: PriceUpdate) => void;
  'alert:triggered': (alert: Alert) => void;
}

export interface ClientToServerEvents {
  subscribe: (payload: SubscribePayload) => void;
  unsubscribe: (payload: UnsubscribePayload) => void;
}
