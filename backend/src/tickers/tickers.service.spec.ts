import { Test } from '@nestjs/testing';
import { TickersService } from './tickers.service';

describe('TickersService', () => {
  let tickers: TickersService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TickersService],
    }).compile();

    tickers = moduleRef.get(TickersService);
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

  it('has nothing for a symbol that was never seeded', () => {
    expect(tickers.findBySymbol('NOPE')).toBeUndefined();
    expect(tickers.historyFor('NOPE')).toBeUndefined();
  });

  describe('history', () => {
    it('returns candles in chronological order', () => {
      for (const ticker of tickers.list()) {
        const points = tickers.historyFor(ticker.symbol) ?? [];
        expect(points.length).toBeGreaterThan(1);

        const timestamps = points.map((candle) => candle.timestamp);
        expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
      }
    });

    it('closes on the price the ticker list reports', () => {
      for (const ticker of tickers.list()) {
        const points = tickers.historyFor(ticker.symbol) ?? [];

        expect(points.at(-1)?.close).toBe(ticker.lastPrice);
      }
    });

    it('brackets open and close with high and low', () => {
      const points = tickers.historyFor('BTC-USD') ?? [];

      for (const candle of points) {
        expect(candle.high).toBeGreaterThanOrEqual(
          Math.max(candle.open, candle.close),
        );
        expect(candle.low).toBeLessThanOrEqual(
          Math.min(candle.open, candle.close),
        );
      }
    });

    it('generates the same price on a frsh instance', () => {
      const restarted = new TickersService();

      expect(
        restarted.historyFor('AAPL')?.map((candle) => candle.close),
      ).toEqual(tickers.historyFor('AAPL')?.map((candle) => candle.close));
    });
  });
});
