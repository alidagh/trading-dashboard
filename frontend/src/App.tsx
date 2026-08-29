import { useState } from 'react'
import { PriceChart } from './components/PriceChart'
import { TickerListPanel } from './components/TickerListPanel'
import { useMarketSocket } from './hooks/useMarketSocket'
import { useTickers } from './hooks/useTickers'
import './App.css'

function App() {
  const { tickers, loading, failed } = useTickers()
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked ?? tickers[0]?.symbol ?? null
  const { prices, connected } = useMarketSocket(selected)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Trading Dashboard</h1>
        <span className={connected ? 'status live' : 'status'}>
          {connected ? 'live' : 'offline'}
        </span>
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

export default App
