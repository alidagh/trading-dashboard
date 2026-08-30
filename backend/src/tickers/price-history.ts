import seedrandom from 'seedrandom';
import {
  HistoricalPricePoint,
  PRICE_INTERVAL_MS,
  Ticker,
} from '@trading-dashboard/contracts';

export const BUFFER_SIZE = 1800;

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function stepFor(ticker: Ticker): number {
  return ticker.assetClass === 'crypto' ? 0.004 : 0.0012;
}

export function nextPrice(ticker: Ticker, rng: seedrandom.PRNG): number {
  return roundPrice(ticker.lastPrice * (1 + (rng() - 0.5) * stepFor(ticker)));
}

export function pricePoint(
  ticker: Ticker,
  open: number,
  close: number,
  at: number,
): HistoricalPricePoint {
  const wick = close * stepFor(ticker) * 0.3;

  return {
    timestamp: at,
    open: roundPrice(open),
    high: roundPrice(Math.max(open, close) + wick),
    low: roundPrice(Math.min(open, close) - wick),
    close: roundPrice(close),
    volume: Math.round(500 + Math.abs(close - open) * 2000),
  };
}

// This is back dated so a chart has a full hour behind it the moment the service starts.
export function seedHistory(
  ticker: Ticker,
  endsAt: number,
): HistoricalPricePoint[] {
  const rng = seedrandom(ticker.symbol);
  const closes = [ticker.lastPrice];

  for (let i = 1; i < BUFFER_SIZE; i++) {
    const previous = closes[0];
    closes.unshift(
      roundPrice(previous * (1 + (rng() - 0.5) * stepFor(ticker))),
    );
  }

  return closes.map((close, i) =>
    pricePoint(
      ticker,
      i === 0 ? close : closes[i - 1],
      close,
      endsAt - (BUFFER_SIZE - 1 - i) * PRICE_INTERVAL_MS,
    ),
  );
}
