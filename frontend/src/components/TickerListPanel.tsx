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
