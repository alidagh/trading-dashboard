import { Test } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { MARKET_EVENTS } from '@trading-dashboard/contracts';
import { Socket } from 'socket.io';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { USER_SEED } from '../auth/user-seed';
import { TickersService } from '../tickers/tickers.service';
import { MarketDataGateway } from './market-data.gateway';

type ClientStub = Socket & {
  join: jest.Mock;
  leave: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
};

function clientStub(id: string, token?: string): ClientStub {
  return {
    id,
    handshake: { auth: token ? { token } : {} },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as ClientStub;
}

describe('MarketDataGateway', () => {
  let gateway: MarketDataGateway;
  let tickers: TickersService;
  let auth: AuthService;
  let roomEmit: jest.Mock;
  let server: { to: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, CacheModule.register(), AlertsModule],
      providers: [MarketDataGateway, TickersService],
    }).compile();

    gateway = moduleRef.get(MarketDataGateway);
    tickers = moduleRef.get(TickersService);
    auth = moduleRef.get(AuthService);

    roomEmit = jest.fn();
    server = { to: jest.fn().mockReturnValue({ emit: roomEmit }) };
    Reflect.set(gateway, 'server', server);

    // ignore console.log during tests for now.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.useFakeTimers();
    gateway.onModuleInit();
  });

  const roomsOf = () =>
    Reflect.get(gateway, 'rooms') as Map<string, Set<string>>;

  // Which symbols the shared clock actually pushed a price for.
  const tickedSymbols = () =>
    roomEmit.mock.calls
      .map(([, tick]) => (tick as { symbol: string }).symbol)
      .filter((symbol) => symbol === 'AAPL');

  afterEach(() => {
    gateway.onModuleDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sends a price once a client connect so the client is not left waiting', () => {
    const client = clientStub('c1');

    gateway.onSubscribe(client, { symbol: 'aapl' });

    expect(client.join).toHaveBeenCalledWith('AAPL');
    expect(client.emit).toHaveBeenCalledWith(
      MARKET_EVENTS.priceUpdate,
      expect.objectContaining({
        symbol: 'AAPL',
        price: tickers.findBySymbol('AAPL')?.lastPrice,
      }),
    );
  });

  it('keeps tickng into the room after the first update', () => {
    gateway.onSubscribe(clientStub('c1'), { symbol: 'AAPL' });

    jest.advanceTimersByTime(4000);

    expect(server.to).toHaveBeenCalledWith('AAPL');
    expect(tickedSymbols()).toEqual(['AAPL', 'AAPL']);
  });

  it('moves every ticker, not only the watched one', () => {
    gateway.onSubscribe(clientStub('c1'), { symbol: 'AAPL' });

    jest.advanceTimersByTime(2000);

    const rooms = server.to.mock.calls.map(([room]) => room as string);
    expect(new Set(rooms)).toEqual(
      new Set(tickers.list().map((ticker) => ticker.symbol)),
    );
  });

  it('ignores a symbol that is not in the seed', () => {
    const client = clientStub('c1');

    gateway.onSubscribe(client, { symbol: 'NOPE' });
    jest.advanceTimersByTime(6000);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
    expect(roomsOf().has('NOPE')).toBe(false);
  });

  it('drops the room once the last subscriber leaves', () => {
    const client = clientStub('c1');

    gateway.onSubscribe(client, { symbol: 'AAPL' });
    expect(roomsOf().get('AAPL')?.size).toBe(1);

    gateway.onUnsubscribe(client, { symbol: 'aapl' });

    expect(client.leave).toHaveBeenCalledWith('AAPL');
    expect(roomsOf().has('AAPL')).toBe(false);
  });

  it('keeps streaming if at least someon else is still watching', () => {
    const first = clientStub('c1');
    const second = clientStub('c2');

    gateway.onSubscribe(first, { symbol: 'AAPL' });
    gateway.onSubscribe(second, { symbol: 'AAPL' });
    gateway.onUnsubscribe(first, { symbol: 'AAPL' });
    jest.advanceTimersByTime(2000);

    expect(tickedSymbols()).toEqual(['AAPL']);
  });

  it('clears every subscription a client held when it disconnects', () => {
    const client = clientStub('c1');

    gateway.onSubscribe(client, { symbol: 'AAPL' });
    gateway.onSubscribe(client, { symbol: 'BTC-USD' });
    expect(roomsOf().size).toBe(2);

    gateway.handleDisconnect(client);

    expect(roomsOf().size).toBe(0);
  });

  it('Does nothing when client unsubscribes for something never subscribed to', () => {
    const client = clientStub('c1');

    expect(() =>
      gateway.onUnsubscribe(client, { symbol: 'TSLA' }),
    ).not.toThrow();
  });

  describe('handshake', () => {
    it('rejects a client that connects without a token', () => {
      const client = clientStub('c1');

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('rejets a client whose token does not verify', () => {
      const client = clientStub('c1', 'not-a-jwt');

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('lets a signed-in client stay connected', () => {
      const seeded = USER_SEED[0];
      const session = auth.signIn(seeded.username, seeded.password);
      const client = clientStub('c1', session?.token);

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });
});
