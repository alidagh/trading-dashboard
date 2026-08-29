import { Injectable } from '@nestjs/common';
import { HistoricalPricePoint, Ticker } from '@trading-dashboard/contracts';
import { buildHistory } from './price-history';
import { TICKER_SEED } from './ticker-seed';

@Injectable()
export class TickersService {
  private readonly tickers = TICKER_SEED;
  private readonly history = new Map<string, HistoricalPricePoint[]>();

  constructor() {
    const generatedAt = Date.now();
    for (const ticker of this.tickers) {
      this.history.set(ticker.symbol, buildHistory(ticker, generatedAt));
    }
  }

  list(): Ticker[] {
    return this.tickers;
  }

  findBySymbol(symbol: string): Ticker | undefined {
    const wanted = symbol.toUpperCase();
    return this.tickers.find((ticker) => ticker.symbol === wanted);
  }

  historyFor(symbol: string): HistoricalPricePoint[] | undefined {
    return this.history.get(symbol.toUpperCase());
  }
}
