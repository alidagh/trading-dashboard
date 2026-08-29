import { useState } from 'react'
import { PriceChart } from './components/PriceChart'
import { TickerListPanel } from './components/TickerListPanel'
import { useMarketSocket } from './hooks/useMarketSocket'
import './App.css'

function App() {
  const [selected, setSelected] = useState<string | null>(null)
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
          selected={selected}
          prices={prices}
          onSelect={setSelected}
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
