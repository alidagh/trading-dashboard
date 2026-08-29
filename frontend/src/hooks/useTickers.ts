import { useEffect, useState } from 'react'
import type { Ticker } from '@trading-dashboard/contracts'
import { fetchTickers } from '../api/market'

export function useTickers() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchTickers()
      .then((rows) => {
        if (!cancelled) {
          setTickers(rows)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { tickers, loading, failed }
}
