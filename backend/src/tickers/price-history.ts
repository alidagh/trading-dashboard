import seedrandom from 'seedrandom';
import {
  HistoricalPricePoint,
  HistoryInterval,
  INTERVAL_MS,
  Ticker,
} from '@trading-dashboard/contracts';

const CANDLES = 120;
const ONE_MINUTE = 60 * 1000;

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function stepFor(ticker: Ticker): number {
  return ticker.assetClass === 'crypto' ? 0.004 : 0.0012;
}

export function nextPrice(ticker: Ticker, rng: seedrandom.PRNG): number {
  return roundPrice(ticker.lastPrice * (1 + (rng() - 0.5) * stepFor(ticker)));
}

export function buildHistory(
  ticker: Ticker,
  endsAt: number,
  interval: HistoryInterval = '1m',
): HistoricalPricePoint[] {
  const spacing = INTERVAL_MS[interval];
  const rng = seedrandom(`${ticker.symbol}:${interval}`);

  // A longer candle covers more time, so it drifts further.
  const step = stepFor(ticker) * Math.sqrt(spacing / ONE_MINUTE);
  const latest = Math.floor(endsAt / spacing) * spacing;

  const candles: HistoricalPricePoint[] = [];

  // Built backwards from lastPrice so the newst candle matches the ticker list.
  let close = ticker.lastPrice;

  for (let i = 0; i < CANDLES; i++) {
    const open = close * (1 + (rng() - 0.5) * step);
    const wick = close * step * rng();

    candles.unshift({
      timestamp: latest - i * spacing,
      open: roundPrice(open),
      high: roundPrice(Math.max(open, close) + wick),
      low: roundPrice(Math.min(open, close) - wick),
      close: roundPrice(close),
      volume: Math.round(1000 + rng() * 1500),
    });

    close = open;
  }

  return candles;
}
