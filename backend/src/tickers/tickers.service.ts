import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HistoricalPricePoint, Ticker } from '@trading-dashboard/contracts';
import seedrandom from 'seedrandom';
import { buildHistory, nextPrice } from './price-history';
import { TICKER_SEED } from './ticker-seed';

@Injectable()
export class TickersService {
  private readonly tickers = TICKER_SEED;
  private readonly walks = new Map<string, seedrandom.PRNG>();

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  list(): Ticker[] {
    return this.tickers;
  }

  // Moves a ticker one step along its walk
  advance(symbol: string): number | undefined {
    const ticker = this.findBySymbol(symbol);
    if (!ticker) {
      return undefined;
    }

    let walk = this.walks.get(ticker.symbol);
    if (!walk) {
      walk = seedrandom(`${ticker.symbol}:live`);
      this.walks.set(ticker.symbol, walk);
    }

    ticker.lastPrice = nextPrice(ticker, walk);

    return ticker.lastPrice;
  }

  findBySymbol(symbol: string): Ticker | undefined {
    const wanted = symbol.toUpperCase();
    return this.tickers.find((ticker) => ticker.symbol === wanted);
  }

  async historyFor(
    symbol: string,
  ): Promise<HistoricalPricePoint[] | undefined> {
    const ticker = this.findBySymbol(symbol);
    if (!ticker) {
      return undefined;
    }

    const key = `history:${ticker.symbol}`;
    const cached = await this.cache.get<HistoricalPricePoint[]>(key);

    if (cached) {
      console.log(`[cache] hit ${key}`);
      return cached;
    }

    console.log(`[cache] miss ${key}, building series`);
    const points = buildHistory(ticker, Date.now());
    await this.cache.set(key, points);

    return points;
  }
}
