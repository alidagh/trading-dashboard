export type AlertDirection = 'above' | 'below';

export type AlertStatus = 'armed' | 'fired';

export interface Alert {
  id: string;
  symbol: string;
  direction: AlertDirection;
  threshold: number;
  status: AlertStatus;
  createdAt: number;
  firedAt?: number;
  firedPrice?: number;
}

export interface CreateAlertRequest {
  symbol: string;
  direction: AlertDirection;
  threshold: number;
}

export type AlertListResponse = Alert[];
