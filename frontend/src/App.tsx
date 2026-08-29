import { useState } from 'react'
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

      <TickerListPanel
        selected={selected}
        prices={prices}
        onSelect={setSelected}
      />
    </div>
  )
}

export default App
