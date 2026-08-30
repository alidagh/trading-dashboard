import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { HISTORY_INTERVALS, INTERVAL_MS } from '@trading-dashboard/contracts'
import type { HistoryInterval, PriceUpdate } from '@trading-dashboard/contracts'
import { fetchHistory } from '../api/market'

const MAX_POINTS = 180

const UP = ['#35c46b', '#4fd1e0']
const DOWN = ['#e5484d', '#f2a33c']

type ChartPoint = {
  timestamp: number
  price: number
}

type Props = {
  symbol: string | null
  tick: PriceUpdate | undefined
}

const clockTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

const calendarDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })


const labelFor = (interval: HistoryInterval) =>
  INTERVAL_MS[interval] >= INTERVAL_MS['6h'] ? calendarDate : clockTime

export function PriceChart({ symbol, tick }: Props) {
  const [series, setSeries] = useState<ChartPoint[]>([])
  const [interval, setInterval] = useState<HistoryInterval>('1m')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) {
      return
    }

    let cancelled = false
    setLoading(true)

    fetchHistory(symbol, interval)
      .then((history) => {
        if (cancelled) {
          return
        }
        setSeries(
          history.points.map((candle) => ({
            timestamp: candle.timestamp,
            price: candle.close,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setSeries([])
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
  }, [symbol, interval])

  useEffect(() => {
    if (!tick || tick.symbol !== symbol) {
      return
    }

    const bucket =
      tick.timestamp - (tick.timestamp % INTERVAL_MS[interval])

    setSeries((current) => {
      const last = current.at(-1)

      // Still inside the newest candle, so it moves rather than a new one appearing.
      if (last?.timestamp === bucket) {
        return [...current.slice(0, -1), { timestamp: bucket, price: tick.price }]
      }

      return [...current, { timestamp: bucket, price: tick.price }].slice(
        -MAX_POINTS,
      )
    })
  }, [tick, symbol, interval])

  if (!symbol) {
    return <p className="panel-note">Pick a ticker to see its chart</p>
  }

  if (loading && series.length === 0) {
    return <p className="panel-note">Loading {symbol}</p>
  }

  const openPrice = series[0]?.price
  const latest = series.at(-1)
  const [lineStart, lineEnd] =
    latest && openPrice !== undefined && latest.price < openPrice ? DOWN : UP

  return (
    <div className="chart">
      <div className="chart-head">
        <h2>{symbol}</h2>
        <div className="intervals">
          {HISTORY_INTERVALS.map((option) => (
            <button
              key={option}
              type="button"
              className={option === interval ? 'selected' : undefined}
              onClick={() => setInterval(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={series} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="priceLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={lineStart} />
              <stop offset="100%" stopColor={lineEnd} />
            </linearGradient>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineStart} stopOpacity={0.28} />
              <stop offset="100%" stopColor={lineStart} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1b2230" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={labelFor(interval)}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
            stroke="#6b7688"
            fontSize={11}
          />
          <YAxis
            orientation="right"
            domain={['auto', 'auto']}
            tickFormatter={(price: number) => price.toFixed(2)}
            width={64}
            axisLine={false}
            tickLine={false}
            stroke="#6b7688"
            fontSize={11}
          />
          <Tooltip
            labelFormatter={(label) => labelFor(interval)(Number(label))}
            formatter={(price) => [Number(price).toFixed(2), 'Price']}
            cursor={{ stroke: '#2a3446', strokeDasharray: '3 3' }}
            contentStyle={{
              background: '#151b26',
              border: '1px solid #222a38',
              borderRadius: 6,
            }}
          />
          {openPrice !== undefined && (
            <ReferenceLine
              y={openPrice}
              stroke="#3d4759"
              strokeDasharray="4 4"
              label={{
                value: 'open',
                position: 'insideLeft',
                fill: '#6b7688',
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke="url(#priceLine)"
            strokeWidth={1.6}
            fill="url(#priceFill)"
            dot={false}
            activeDot={{ r: 4, fill: lineStart, stroke: '#10141c', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {latest && (
            <ReferenceDot
              x={latest.timestamp}
              y={latest.price}
              r={3.5}
              fill={lineStart}
              stroke="#10141c"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
