import type {
  Alert,
  AlertDirection,
  AlertListResponse,
} from '@trading-dashboard/contracts'
import { api } from './client'

export async function fetchAlerts() {
  const { data: alerts } = await api.get<AlertListResponse>('/alerts')
  return alerts
}

export async function createAlert(
  symbol: string,
  direction: AlertDirection,
  threshold: number,
) {
  const { data: alert } = await api.post<Alert>('/alerts', {
    symbol,
    direction,
    threshold,
  })
  return alert
  
}

export async function removeAlert(id: string) {
  await api.delete(`/alerts/${id}`)
}
