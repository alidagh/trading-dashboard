import { Test } from '@nestjs/testing';
import type { PriceUpdate } from '@trading-dashboard/contracts';
import { AlertsService } from './alerts.service';

const ALI = 'u1';
const YARA = 'u2';

const tick = (symbol: string, price: number): PriceUpdate => ({
  symbol,
  price,
  timestamp: Date.now(),
});

describe('AlertsService', () => {
  let alerts: AlertsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AlertsService],
    }).compile();

    alerts = moduleRef.get(AlertsService);
  });

  it('starts a new alert armed', () => {
    const alert = alerts.create(ALI, {
      symbol: 'AAPL',
      direction: 'above',
      threshold: 200,
    });

    expect(alert.status).toBe('armed');
    expect(alert.id).toBeTruthy();
    expect(alerts.list(ALI)).toEqual([alert]);
  });

  it('keeps each user to their own alerts', () => {
    alerts.create(ALI, { symbol: 'AAPL', direction: 'above', threshold: 200 });

    expect(alerts.list(YARA)).toEqual([]);
  });

  it('will not remove an alert belonging to someone else', () => {
    const mine = alerts.create(ALI, {
      symbol: 'AAPL',
      direction: 'above',
      threshold: 200,
    });

    expect(alerts.remove(YARA, mine.id)).toBe(false);
    expect(alerts.list(ALI)).toHaveLength(1);

    expect(alerts.remove(ALI, mine.id)).toBe(true);
    expect(alerts.list(ALI)).toEqual([]);
  });

  describe('check', () => {
    it('fires an above alert once the price reaches the threshold', () => {
      alerts.create(ALI, {
        symbol: 'AAPL',
        direction: 'above',
        threshold: 215,
      });

      expect(alerts.check([tick('AAPL', 214.9)])).toEqual([]);

      const fired = alerts.check([tick('AAPL', 215.4)]);

      expect(fired).toHaveLength(1);
      expect(fired[0].userId).toBe(ALI);
      expect(fired[0].alert.status).toBe('fired');
      expect(fired[0].alert.firedPrice).toBe(215.4);
    });

    it('fires a below alert once the price drops to the threshold', () => {
      alerts.create(ALI, {
        symbol: 'TSLA',
        direction: 'below',
        threshold: 250,
      });

      expect(alerts.check([tick('TSLA', 250.1)])).toEqual([]);
      expect(alerts.check([tick('TSLA', 249.8)])).toHaveLength(1);
    });

    it('triggers when the price hits the threshold exactly', () => {
      alerts.create(ALI, {
        symbol: 'MSFT',
        direction: 'above',
        threshold: 430,
      });
      alerts.create(YARA, {
        symbol: 'MSFT',
        direction: 'below',
        threshold: 430,
      });

      expect(alerts.check([tick('MSFT', 430)])).toHaveLength(2);
    });

    it('only fires the alert once even if the price keeps moving', () => {
      alerts.create(ALI, {
        symbol: 'AAPL',
        direction: 'above',
        threshold: 215,
      });

      expect(alerts.check([tick('AAPL', 216)])).toHaveLength(1);
      expect(alerts.check([tick('AAPL', 220)])).toEqual([]);
      expect(alerts.check([tick('AAPL', 999)])).toEqual([]);
    });

    it('leaves an alert alone when its symbol is not in the batch', () => {
      alerts.create(ALI, {
        symbol: 'BTC-USD',
        direction: 'below',
        threshold: 1,
      });

      expect(alerts.check([tick('AAPL', 0.5)])).toEqual([]);
      expect(alerts.list(ALI)[0].status).toBe('armed');
    });

    it('fires for every user watching the same level', () => {
      alerts.create(ALI, {
        symbol: 'AAPL',
        direction: 'above',
        threshold: 215,
      });
      alerts.create(YARA, {
        symbol: 'AAPL',
        direction: 'above',
        threshold: 215,
      });

      const fired = alerts.check([tick('AAPL', 216)]);

      expect(fired.map((entry) => entry.userId).sort()).toEqual([ALI, YARA]);
    });
  });
});
