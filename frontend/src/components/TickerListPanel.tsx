import type { PriceUpdate, Ticker } from '@trading-dashboard/contracts'

type Props = {
  tickers: Ticker[]
  loading: boolean
  failed: boolean
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

function moveSinceOpen(live: number, open: number) {
  const percent = open === 0 ? 0 : ((live - open) / open) * 100
  const direction = live > open ? 'up' : live < open ? 'down' : 'flat'

  return {
    direction,
    label: `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`,
  }
}

export function TickerListPanel({
  tickers,
  loading,
  failed,
  selected,
  prices,
  onSelect,
}: Props) {
  if (loading) {
    return <p className="panel-note">Loading tickers</p>
  }

  if (failed) {
    return <p className="panel-note">Could not reach the market data service</p>
  }

  return (
    <ul className="ticker-list">
      {tickers.map((ticker) => {
        const live = prices[ticker.symbol]?.price ?? ticker.lastPrice
        const move = moveSinceOpen(live, ticker.lastPrice)

        return (
          <li key={ticker.symbol}>
            <button
              type="button"
              className={
                ticker.symbol === selected ? 'ticker-row selected' : 'ticker-row'
              }
              onClick={() => onSelect(ticker.symbol)}
            >
              <span className="ticker-id">
                <span className="symbol">{ticker.symbol}</span>
                <span className="name">{ticker.name}</span>
              </span>
              <span className="ticker-quote">
                <span className="price">
                  {formatPrice(live, ticker.currency)}
                </span>
                <span className={`change ${move.direction}`}>{move.label}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
