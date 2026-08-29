import { Ticker } from '@trading-dashboard/contracts';

export const TICKER_SEED: Ticker[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: 'equity',
    currency: 'USD',
    lastPrice: 214.32,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    assetClass: 'equity',
    currency: 'USD',
    lastPrice: 251.18,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetClass: 'equity',
    currency: 'USD',
    lastPrice: 428.9,
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    assetClass: 'crypto',
    currency: 'USD',
    lastPrice: 63450.12,
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    assetClass: 'crypto',
    currency: 'USD',
    lastPrice: 2485.67,
  },
];
