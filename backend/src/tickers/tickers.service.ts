import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HistoricalPricePoint, Ticker } from '@trading-dashboard/contracts';
import { buildHistory } from './price-history';
import { TICKER_SEED } from './ticker-seed';

@Injectable()
export class TickersService {
  private readonly tickers = TICKER_SEED;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  list(): Ticker[] {
    return this.tickers;
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
