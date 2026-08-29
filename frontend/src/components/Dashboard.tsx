import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { useMarketSocket } from '../hooks/useMarketSocket'
import { useTickers } from '../hooks/useTickers'
import { PriceChart } from './PriceChart'
import { TickerListPanel } from './TickerListPanel'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const { tickers, loading, failed } = useTickers()
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked ?? tickers[0]?.symbol ?? null
  const { prices, connected, rejected } = useMarketSocket(selected)

  useEffect(() => {
    if (rejected) {
      signOut()
    }
  }, [rejected, signOut])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Trading Dashboard</h1>
        <span className={connected ? 'status live' : 'status'}>
          {connected ? 'live' : 'offline'}
        </span>

        <div className="account">
          <span className="account-name">{user?.name}</span>
          <span className="account-role">{user?.role}</span>
        </div>
        <button type="button" className="sign-out" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="dashboard">
        <TickerListPanel
          tickers={tickers}
          loading={loading}
          failed={failed}
          selected={selected}
          prices={prices}
          onSelect={setPicked}
        />
        <PriceChart
          symbol={selected}
          tick={selected ? prices[selected] : undefined}
        />
      </div>
    </div>
  )
}
