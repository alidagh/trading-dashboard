import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  HistoricalPricePoint,
  HistoryInterval,
  INTERVAL_MS,
  PRICE_INTERVAL_MS,
  PriceUpdate,
  Ticker,
} from '@trading-dashboard/contracts';
import seedrandom from 'seedrandom';
import {
  BUFFER_SIZE,
  nextPrice,
  pricePoint,
  seedHistory,
} from './price-history';
import { TICKER_SEED } from './ticker-seed';

@Injectable()
export class TickersService {
  private readonly tickers = TICKER_SEED;
  private readonly walks = new Map<string, seedrandom.PRNG>();
  private readonly history = new Map<string, HistoricalPricePoint[]>();

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

  advanceAll(): PriceUpdate[] {
    const now = Date.now();

    return this.tickers.map((ticker) => {
      const open = ticker.lastPrice;
      const price = this.advance(ticker.symbol) ?? open;

      // Seeded up to the previous slot so this push becomes the newest entry.
      const buffer = this.bufferFor(ticker.symbol, now - PRICE_INTERVAL_MS);
      const previous = buffer.at(-1);
      const at = previous ? previous.timestamp + PRICE_INTERVAL_MS : now;

      buffer.push(pricePoint(ticker, open, price, at));
      if (buffer.length > BUFFER_SIZE) {
        buffer.shift();
      }

      return { symbol: ticker.symbol, price, timestamp: at };
    });
  }

  private bufferFor(symbol: string, endsAt: number): HistoricalPricePoint[] {
    let buffer = this.history.get(symbol);

    if (!buffer) {
      const ticker = this.findBySymbol(symbol);
      buffer = ticker ? seedHistory(ticker, endsAt) : [];
      this.history.set(symbol, buffer);
    }

    return buffer;
  }

  findBySymbol(symbol: string): Ticker | undefined {
    const wanted = symbol.toUpperCase();
    return this.tickers.find((ticker) => ticker.symbol === wanted);
  }

  async historyFor(
    symbol: string,
    interval: HistoryInterval = '1m',
  ): Promise<HistoricalPricePoint[] | undefined> {
    const ticker = this.findBySymbol(symbol);
    if (!ticker) {
      return undefined;
    }

    const key = `history:${ticker.symbol}:${interval}`;
    const cached = await this.cache.get<HistoricalPricePoint[]>(key);

    if (cached) {
      console.log(`[cache] hit ${key}`);
      return cached;
    }

    console.log(`[cache] miss ${key}, slicing buffer`);
    const wanted = INTERVAL_MS[interval] / PRICE_INTERVAL_MS;
    const points = this.bufferFor(ticker.symbol, Date.now()).slice(-wanted);
    await this.cache.set(key, points);

    return points;
  }
}
