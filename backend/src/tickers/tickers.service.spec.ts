import { Test, TestingModule } from '@nestjs/testing';
import { HISTORY_INTERVALS, INTERVAL_MS } from '@trading-dashboard/contracts';
import { CacheModule } from '@nestjs/cache-manager';
import * as priceHistory from './price-history';
import { TickersService } from './tickers.service';

const CACHE_TTL_MS = 200;

describe('TickersService', () => {
  let moduleRef: TestingModule;
  let tickers: TickersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CacheModule.register({ ttl: CACHE_TTL_MS })],
      providers: [TickersService],
    }).compile();

    tickers = moduleRef.get(TickersService);

    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists the seeded tickrs', () => {
    const symbols = tickers.list().map((ticker) => ticker.symbol);

    expect(symbols).toEqual(
      expect.arrayContaining(['AAPL', 'TSLA', 'BTC-USD']),
    );
  });

  it('looks up a ticker with any casing', () => {
    expect(tickers.findBySymbol('btc-usd')?.name).toBe('Bitcoin');
    expect(tickers.findBySymbol('AAPL')?.assetClass).toBe('equity');
  });

  it('has nothing for a symbol that was never seeded', async () => {
    expect(tickers.findBySymbol('NOPE')).toBeUndefined();
    await expect(tickers.historyFor('NOPE')).resolves.toBeUndefined();
  });

  describe('history', () => {
    it('returns candles in chronological order', async () => {
      for (const ticker of tickers.list()) {
        const points = (await tickers.historyFor(ticker.symbol)) ?? [];
        expect(points.length).toBeGreaterThan(1);

        const timestamps = points.map((candle) => candle.timestamp);
        expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
      }
    });

    it('closes on the price the ticker list reports', async () => {
      for (const ticker of tickers.list()) {
        const points = (await tickers.historyFor(ticker.symbol)) ?? [];

        expect(points.at(-1)?.close).toBe(ticker.lastPrice);
      }
    });

    it('brackets open and close with high and low', async () => {
      const points = (await tickers.historyFor('BTC-USD')) ?? [];

      for (const candle of points) {
        expect(candle.high).toBeGreaterThanOrEqual(
          Math.max(candle.open, candle.close),
        );
        expect(candle.low).toBeLessThanOrEqual(
          Math.min(candle.open, candle.close),
        );
      }
    });

    it('generates the same price on a frsh instance', async () => {
      const restarted = await Test.createTestingModule({
        imports: [CacheModule.register()],
        providers: [TickersService],
      }).compile();

      const other = restarted.get(TickersService);
      const first = await other.historyFor('AAPL');
      const second = await tickers.historyFor('AAPL');

      expect(first?.map((candle) => candle.close)).toEqual(
        second?.map((candle) => candle.close),
      );
    });
  });

  describe('intervals', () => {
    it('spaces candles by the interval it was asked for', async () => {
      for (const interval of HISTORY_INTERVALS) {
        const points = (await tickers.historyFor('AAPL', interval)) ?? [];
        const gaps = points
          .slice(1)
          .map((candle, i) => candle.timestamp - points[i].timestamp);

        expect(new Set(gaps)).toEqual(new Set([INTERVAL_MS[interval]]));
      }
    });

    it('lands every candle on an interval boundary', async () => {
      for (const interval of HISTORY_INTERVALS) {
        const points = (await tickers.historyFor('AAPL', interval)) ?? [];

        expect(
          points.every(
            (candle) => candle.timestamp % INTERVAL_MS[interval] === 0,
          ),
        ).toBe(true);
      }
    });

    it('uses the current ticker price as the latest close', async () => {
      const aapl = tickers.findBySymbol('AAPL');

      for (const interval of HISTORY_INTERVALS) {
        const points = (await tickers.historyFor('AAPL', interval)) ?? [];

        expect(points.at(-1)?.close).toBe(aapl?.lastPrice);
      }
    });

    it('draws a different series for each interval', async () => {
      const minute = (await tickers.historyFor('AAPL', '1m')) ?? [];
      const daily = (await tickers.historyFor('AAPL', '1d')) ?? [];

      expect(daily.map((candle) => candle.close)).not.toEqual(
        minute.map((candle) => candle.close),
      );
    });

    it('generates a separate price path for each interval', async () => {
      const steps = (points: { close: number }[]) =>
        points
          .slice(1)
          .map((candle, i) => Math.sign(candle.close - points[i].close));

      // BTC is priced high enough that rounding never flattens a move to zero.
      const minute = (await tickers.historyFor('BTC-USD', '1m')) ?? [];
      const daily = (await tickers.historyFor('BTC-USD', '1d')) ?? [];

      expect(steps(daily)).not.toEqual(steps(minute));
    });

    it('defaults to 1m when no interval is given', async () => {
      const fallback = (await tickers.historyFor('TSLA')) ?? [];
      const explicit = (await tickers.historyFor('TSLA', '1m')) ?? [];

      expect(fallback).toEqual(explicit);
    });
  });

  describe('cache', () => {
    it('builds a series once and serves the rest from the cache', async () => {
      const build = jest.spyOn(priceHistory, 'buildHistory');

      const first = await tickers.historyFor('AAPL');
      const second = await tickers.historyFor('AAPL');
      const third = await tickers.historyFor('aapl');

      expect(build).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
      expect(third).toEqual(first);
    });

    it('keeps a separate entry per symbol', async () => {
      const build = jest.spyOn(priceHistory, 'buildHistory');

      await tickers.historyFor('AAPL');
      await tickers.historyFor('TSLA');
      await tickers.historyFor('AAPL');
      await tickers.historyFor('TSLA');

      expect(build).toHaveBeenCalledTimes(2);
    });

    it('caches each interval separately', async () => {
      const build = jest.spyOn(priceHistory, 'buildHistory');

      await tickers.historyFor('AAPL', '1m');
      await tickers.historyFor('AAPL', '1h');
      await tickers.historyFor('AAPL', '1m');
      await tickers.historyFor('AAPL', '1h');

      expect(build).toHaveBeenCalledTimes(2);
    });

    it('never caches a symbol that is not seeded', async () => {
      const build = jest.spyOn(priceHistory, 'buildHistory');

      await tickers.historyFor('NOPE');
      await tickers.historyFor('NOPE');

      expect(build).not.toHaveBeenCalled();
    });

    it('rebuilds once the entry has expired', async () => {
      const build = jest.spyOn(priceHistory, 'buildHistory');

      await tickers.historyFor('MSFT');
      await tickers.historyFor('MSFT');
      expect(build).toHaveBeenCalledTimes(1);

      await new Promise((done) => setTimeout(done, CACHE_TTL_MS + 50));
      await tickers.historyFor('MSFT');

      expect(build).toHaveBeenCalledTimes(2);
    });
  });
});
