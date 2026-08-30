import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import {
  HISTORY_INTERVALS,
  INTERVAL_MS,
  PRICE_INTERVAL_MS,
} from '@trading-dashboard/contracts';
import { BUFFER_SIZE } from './price-history';
import { TickersService } from './tickers.service';

const CACHE_TTL_MS = 200;

const waitPastTtl = () =>
  new Promise((done) => setTimeout(done, CACHE_TTL_MS + 50));

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
    it('returns as many entries as the window holds', async () => {
      for (const interval of HISTORY_INTERVALS) {
        const points = (await tickers.historyFor('AAPL', interval)) ?? [];

        expect(points).toHaveLength(INTERVAL_MS[interval] / PRICE_INTERVAL_MS);
      }
    });

    it('spaces every entry two seconds apart', async () => {
      const points = (await tickers.historyFor('AAPL', '5m')) ?? [];
      const gaps = points
        .slice(1)
        .map((point, i) => point.timestamp - points[i].timestamp);

      expect(new Set(gaps)).toEqual(new Set([PRICE_INTERVAL_MS]));
    });

    it('keeps entries in order with no repeated timestamps', async () => {
      const points = (await tickers.historyFor('AAPL', '30m')) ?? [];
      const stamps = points.map((point) => point.timestamp);

      expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
      expect(new Set(stamps).size).toBe(stamps.length);
    });

    it('ends on the price the ticker list reports', async () => {
      for (const ticker of tickers.list()) {
        const points = (await tickers.historyFor(ticker.symbol, '1m')) ?? [];

        expect(points.at(-1)?.close).toBe(ticker.lastPrice);
      }
    });

    it('brackets open and close with high and low', async () => {
      const points = (await tickers.historyFor('BTC-USD', '1m')) ?? [];

      for (const point of points) {
        expect(point.high).toBeGreaterThanOrEqual(
          Math.max(point.open, point.close),
        );
        expect(point.low).toBeLessThanOrEqual(
          Math.min(point.open, point.close),
        );
      }
    });

    it('serves shorter windows out of the same series', async () => {
      const hour = (await tickers.historyFor('AAPL', '1h')) ?? [];
      const minute = (await tickers.historyFor('AAPL', '1m')) ?? [];

      expect(hour.slice(-minute.length)).toEqual(minute);
    });

    it('defaults to 1m when no interval is given', async () => {
      const fallback = (await tickers.historyFor('TSLA')) ?? [];

      expect(fallback).toHaveLength(30);
    });
  });

  describe('rolling buffer', () => {
    it('moves forward as prices arrive', async () => {
      const before = (await tickers.historyFor('AAPL', '1m')) ?? [];

      tickers.advanceAll();
      await waitPastTtl();
      const after = (await tickers.historyFor('AAPL', '1m')) ?? [];

      expect(after).toHaveLength(before.length);
      expect(after[0].timestamp).toBeGreaterThan(before[0].timestamp);
      expect(after.at(-1)?.timestamp).toBe(
        (before.at(-1)?.timestamp ?? 0) + PRICE_INTERVAL_MS,
      );
    });

    it('never grows past an hour of entries', async () => {
      for (let i = 0; i < 20; i++) {
        tickers.advanceAll();
      }
      await waitPastTtl();

      // The slice would hide a leak, so check what is actually being held.
      const held = Reflect.get(tickers, 'history') as Map<string, unknown[]>;
      expect(held.get('AAPL')).toHaveLength(BUFFER_SIZE);

      const points = (await tickers.historyFor('AAPL', '1h')) ?? [];
      expect(points).toHaveLength(BUFFER_SIZE);
    });

    it('keeps the newest entry in step with the live price', async () => {
      tickers.advanceAll();
      await waitPastTtl();

      const aapl = tickers.findBySymbol('AAPL');
      const points = (await tickers.historyFor('AAPL', '1m')) ?? [];

      expect(points.at(-1)?.close).toBe(aapl?.lastPrice);
    });
  });

  describe('cache', () => {
    it('serves a repeat request without reslicing', async () => {
      const first = await tickers.historyFor('AAPL', '1m');
      const second = await tickers.historyFor('AAPL', '1m');

      expect(second).toBe(first);
    });

    it('holds the old window until the entry expires', async () => {
      const before = (await tickers.historyFor('AAPL', '1m')) ?? [];

      tickers.advanceAll();
      const cached = (await tickers.historyFor('AAPL', '1m')) ?? [];
      expect(cached.at(-1)?.timestamp).toBe(before.at(-1)?.timestamp);

      await waitPastTtl();
      const fresh = (await tickers.historyFor('AAPL', '1m')) ?? [];
      expect(fresh.at(-1)?.timestamp).toBeGreaterThan(
        before.at(-1)?.timestamp ?? 0,
      );
    });

    it('keeps a separate entry per symbol and interval', async () => {
      const aapl = await tickers.historyFor('AAPL', '1m');
      const tsla = await tickers.historyFor('TSLA', '1m');
      const longer = await tickers.historyFor('AAPL', '5m');

      expect(tsla).not.toBe(aapl);
      expect(longer).not.toBe(aapl);
      expect(longer).toHaveLength(150);
    });

    it('never caches a symbol that is not seeded', async () => {
      await expect(tickers.historyFor('NOPE', '1m')).resolves.toBeUndefined();
      await expect(tickers.historyFor('NOPE', '1m')).resolves.toBeUndefined();
    });
  });
});
