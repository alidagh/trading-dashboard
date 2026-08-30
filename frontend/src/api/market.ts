import type {
  HistoryInterval,
  TickerHistoryResponse,
  TickerListResponse,
} from '@trading-dashboard/contracts'
import { api } from './client'

export async function fetchTickers() {
  const { data: tickers } = await api.get<TickerListResponse>('/tickers')
  return tickers
}

export async function fetchHistory(symbol: string, interval: HistoryInterval) {
  const { data: history } = await api.get<TickerHistoryResponse>(
    `/tickers/${symbol}/history`,
    { params: { interval } },
  )
  return history
}
