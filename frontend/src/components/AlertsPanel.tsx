import { useEffect, useState, type FormEvent } from 'react'
import type { Alert, AlertDirection } from '@trading-dashboard/contracts'
import { createAlert, fetchAlerts, removeAlert } from '../api/alerts'

type Props = {
  symbol: string | null
  price: number | undefined
  firedAlerts: Alert[]
}

export function AlertsPanel({ symbol, price, firedAlerts }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [direction, setDirection] = useState<AlertDirection>('above')
  const [threshold, setThreshold] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let dropped = false

    fetchAlerts()
      .then((saved) => {
        if (!dropped) {
          setAlerts(saved)
        }
      })
      .catch(() => undefined)

    return () => {
      dropped = true
    }
  }, [])

  // Update the existing alert when it fires over the socket.
  useEffect(() => {
    if (firedAlerts.length === 0) {
      return
    }

    setAlerts((current) =>
      current.map(
        (alert) => firedAlerts.find((fired) => fired.id === alert.id) ?? alert,
      ),
    )
  }, [firedAlerts])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    if (!symbol) {
      return
    }

    try {
      const created = await createAlert(symbol, direction, Number(threshold))
      setAlerts((current) => [...current, created])
      setThreshold('')
      setError('')
    } catch {
      setError('Enter a price above zero')
    }
  }

  async function onRemove(id: string) {
    await removeAlert(id)
    setAlerts((current) => current.filter((alert) => alert.id !== id))
  }

  const armed = alerts.filter((alert) => alert.status === 'armed').length
  const fired = alerts.length - armed

  return (
    <section className="alerts">
      <header className="alerts-head">
        <h2>Price alerts</h2>
        <span className="alerts-count">
          {armed} armed{fired > 0 && ` · ${fired} fired`}
        </span>
      </header>

      <form className="alert-form" onSubmit={onSubmit}>
        <div className="direction">
          <button
            type="button"
            className={direction === 'above' ? 'selected' : undefined}
            onClick={() => setDirection('above')}
          >
            Above
          </button>
          <button
            type="button"
            className={direction === 'below' ? 'selected' : undefined}
            onClick={() => setDirection('below')}
          >
            Below
          </button>
        </div>

        <input
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          placeholder={price ? price.toFixed(2) : 'Price'}
          aria-label="Threshold"
        />

        <button type="submit" disabled={!symbol || threshold === ''}>
          Alert on {symbol ?? '-'}
        </button>
      </form>

      {error && <p className="alert-error">{error}</p>}

      <ul className="alert-list">
        {alerts.map((alert) => (
          <li key={alert.id} className={alert.status}>
            <span className="alert-symbol">{alert.symbol}</span>
            <span className={`alert-level ${alert.direction}`}>
              {alert.direction === 'above' ? '▲' : '▼'}{' '}
              {alert.threshold.toFixed(2)}
            </span>
            <span className={`alert-status ${alert.status}`}>
              {alert.status === 'fired'
                ? `fired at ${alert.firedPrice?.toFixed(2)}`
                : 'armed'}
            </span>
            <button type="button" onClick={() => void onRemove(alert.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
