import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
  SubscribePayload,
  UnsubscribePayload,
} from '@trading-dashboard/contracts';
import { AlertsService } from '../alerts/alerts.service';
import { AuthService } from '../auth/auth.service';
import { TickersService } from '../tickers/tickers.service';

const TICK_INTERVAL_MS = 2000;

@WebSocketGateway({ cors: { origin: '*' } })
export class MarketDataGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  private readonly server!: Server;

  // maintain the members state by mapping symbol to uniqe clients.
  private readonly rooms = new Map<string, Set<string>>();

  private clock?: NodeJS.Timeout;

  constructor(
    private readonly tickers: TickersService,
    private readonly auth: AuthService,
    private readonly alerts: AlertsService,
  ) {}

  onModuleInit(): void {
    this.clock = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.clock);
  }

  // Keep all tickers moving so alerts can trigger even when a symbol isn't being watched.
  private tick(): void {
    const updates = this.tickers.advanceAll();

    for (const update of updates) {
      this.server.to(update.symbol).emit(MARKET_EVENTS.priceUpdate, update);
    }

    for (const fired of this.alerts.check(updates)) {
      console.log(
        `[ws] alert fired for ${fired.userId}: ${fired.alert.symbol} ${fired.alert.direction} ${fired.alert.threshold}`,
      );
      this.server
        .to(`user:${fired.userId}`)
        .emit(MARKET_EVENTS.alertTriggered, fired.alert);
    }
  }

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    const user = token ? this.auth.verify(token) : undefined;

    if (!user) {
      console.log('[ws] rejecting unauthenticated client', client.id);
      client.disconnect();
      return;
    }

    void client.join(`user:${user.id}`);
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
    client.emit(MARKET_EVENTS.priceUpdate, {
      symbol: ticker.symbol,
      price: ticker.lastPrice,
      timestamp: Date.now(),
    });
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
    console.log(`[ws] no subscribers left on ${symbol}`);
  }
}
