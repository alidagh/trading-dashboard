import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MARKET_EVENTS } from '@trading-dashboard/contracts';
import type {
  PriceUpdate,
  SubscribePayload,
  UnsubscribePayload,
} from '@trading-dashboard/contracts';
import { AuthService } from '../auth/auth.service';
import { TickersService } from '../tickers/tickers.service';

const TICK_INTERVAL_MS = 2000;

@WebSocketGateway({ cors: { origin: '*' } })
export class MarketDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  // maintain the members state by mapping symbol to uniqe clients.
  private readonly rooms = new Map<string, Set<string>>();

  // streams is a map between symbol to setInterval which emit events
  private readonly streams = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly tickers: TickersService,
    private readonly auth: AuthService,
  ) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    const user = token ? this.auth.verify(token) : undefined;

    if (!user) {
      console.log('[ws] rejecting unauthenticated client', client.id);
      client.disconnect();
      return;
    }

    console.log(`[ws] connected ${client.id} as ${user.username}`);
  }

  @SubscribeMessage(MARKET_EVENTS.subscribe)
  onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): void {
    const ticker = this.tickers.findBySymbol(payload?.symbol ?? '');
    // if the ticker isn't exist, just return
    if (!ticker) {
      console.log('[ws] ignoring subscribe to unknown symbol', payload?.symbol);
      return;
    }

    const clients = this.rooms.get(ticker.symbol) ?? new Set<string>();
    clients.add(client.id);
    this.rooms.set(ticker.symbol, clients);

    console.log(
      `[ws] ${client.id} subscribed to ${ticker.symbol} (${clients.size} in room)`,
    );

    void client.join(ticker.symbol);
    client.emit(MARKET_EVENTS.priceUpdate, this.priceTick(ticker.symbol));

    this.openStram(ticker.symbol);
  }

  @SubscribeMessage(MARKET_EVENTS.unsubscribe)
  onUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UnsubscribePayload,
  ): void {
    const symbol = (payload?.symbol ?? '').toUpperCase();
    console.log(`[ws] ${client.id} unsubscribed from ${symbol}`);

    void client.leave(symbol);
    this.dropSubscriber(symbol, client.id);
  }

  handleDisconnect(client: Socket): void {
    console.log('[ws] disconnected', client.id);

    for (const symbol of [...this.rooms.keys()]) {
      this.dropSubscriber(symbol, client.id);
    }
  }

  private dropSubscriber(symbol: string, clientId: string): void {
    const clients = this.rooms.get(symbol);
    if (!clients?.delete(clientId) || clients.size > 0) {
      return;
    }

    this.rooms.delete(symbol);

    const stream = this.streams.get(symbol);
    if (stream) {
      clearInterval(stream);
      this.streams.delete(symbol);
      console.log(`[ws] stopped streaming ${symbol}, no subscribers left`);
    }
  }

  private openStram(symbol: string): void {
    if (this.streams.has(symbol)) {
      return;
    }

    const stream = setInterval(() => {
      const tick = this.priceTick(symbol);
      console.log('[ws] tick', tick.symbol, tick.price);
      this.server.to(symbol).emit(MARKET_EVENTS.priceUpdate, tick);
    }, TICK_INTERVAL_MS);

    console.log(`[ws] streaming ${symbol} every ${TICK_INTERVAL_MS}ms`);
    this.streams.set(symbol, stream);
  }

  // Replays the seeded price until the random simulator is implemented.
  private priceTick(symbol: string): PriceUpdate {
    return {
      symbol,
      price: this.tickers.findBySymbol(symbol)?.lastPrice ?? 0,
      timestamp: Date.now(),
    };
  }
}
