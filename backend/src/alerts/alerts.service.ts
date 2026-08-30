import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  Alert,
  CreateAlertRequest,
  PriceUpdate,
} from '@trading-dashboard/contracts';

export type FiredAlert = {
  userId: string;
  alert: Alert;
};

@Injectable()
export class AlertsService {
  // keep the alerts in memorey
  private readonly byUser = new Map<string, Alert[]>();

  list(userId: string): Alert[] {
    return this.byUser.get(userId) ?? [];
  }

  create(userId: string, request: CreateAlertRequest): Alert {
    const alert: Alert = {
      id: randomUUID(),
      symbol: request.symbol,
      direction: request.direction,
      threshold: request.threshold,
      status: 'armed',
      createdAt: Date.now(),
    };

    this.byUser.set(userId, [...this.list(userId), alert]);

    return alert;
  }

  remove(userId: string, id: string): boolean {
    const alerts = this.list(userId);
    const keeping = alerts.filter((alert) => alert.id !== id);

    if (keeping.length === alerts.length) {
      return false;
    }

    this.byUser.set(userId, keeping);

    return true;
  }

  check(updates: PriceUpdate[]): FiredAlert[] {
    const prices = new Map(updates.map((tick) => [tick.symbol, tick.price]));
    const fired: FiredAlert[] = [];

    for (const [userId, alerts] of this.byUser) {
      for (const alert of alerts) {
        if (alert.status === 'fired') {
          continue;
        }

        const price = prices.get(alert.symbol);
        if (price === undefined) {
          continue;
        }

        const breached =
          alert.direction === 'above'
            ? price >= alert.threshold
            : price <= alert.threshold;

        if (breached) {
          alert.status = 'fired';
          alert.firedAt = Date.now();
          alert.firedPrice = price;
          fired.push({ userId, alert });
        }
      }
    }

    return fired;
  }
}
