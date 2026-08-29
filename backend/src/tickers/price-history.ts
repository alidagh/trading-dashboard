import { HistoricalPricePoint, Ticker } from '@trading-dashboard/contracts';

const HISTORY_LENGTH = 120;
const ONE_MINUTE = 60 * 1000;

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildHistory(
  ticker: Ticker,
  endsAt: number,
): HistoricalPricePoint[] {
  const history: HistoricalPricePoint[] = [];

  const volatility =
    ticker.assetClass === 'crypto'
      ? ticker.lastPrice * 0.01
      : ticker.lastPrice * 0.003;

  let previousClose =
    ticker.lastPrice - Math.sin(HISTORY_LENGTH / 8) * volatility;

  for (let i = 0; i < HISTORY_LENGTH; i++) {
    const remaining = HISTORY_LENGTH - 1 - i;

    let close =
      ticker.lastPrice + Math.sin((i + ticker.symbol.length) / 8) * volatility;

    // Keep the final point in sync with the current ticker price
    if (i === HISTORY_LENGTH - 1) {
      close = ticker.lastPrice;
    }

    const open = previousClose;

    const candleRange = volatility * 0.15;

    const high = Math.max(open, close) + candleRange;
    const low = Math.min(open, close) - candleRange;

    history.push({
      timestamp: endsAt - remaining * ONE_MINUTE,
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume: Math.round(1000 + Math.abs(Math.sin(i / 4)) * 500),
    });

    previousClose = close;
  }

  return history;
}

