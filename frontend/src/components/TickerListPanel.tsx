import { useEffect, useState } from 'react'
import type { PriceUpdate, Ticker } from '@trading-dashboard/contracts'
import { fetchTickers } from '../api/market'

type Props = {
  selected: string | null
  prices: Record<string, PriceUpdate>
  onSelect: (symbol: string) => void
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

export function TickerListPanel({ selected, prices, onSelect }: Props) {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let dropped = false

    fetchTickers()
      .then((rows) => {
        if (!dropped) {
          setTickers(rows)
        }
      })
      .catch(() => {
        if (!dropped) {
          setFailed(true)
        }
      })
      .finally(() => {
        if (!dropped) {
          setLoading(false)
        }
      })

    return () => {
      dropped = true
    }
  }, [])

  if (loading) {
    return <p className="panel-note">Loading tickers</p>
  }

  if (failed) {
    return <p className="panel-note">Could not reach the market data service</p>
  }

  return (
    <ul className="ticker-list">
      {tickers.map((ticker) => {
        const tick = prices[ticker.symbol]

        return (
          <li key={ticker.symbol}>
            <button
              type="button"
              className={
                ticker.symbol === selected ? 'ticker-row selected' : 'ticker-row'
              }
              onClick={() => onSelect(ticker.symbol)}
            >
              <span className="symbol">{ticker.symbol}</span>
              <span className="name">{ticker.name}</span>
              <span className="price">
                {formatPrice(tick?.price ?? ticker.lastPrice, ticker.currency)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
