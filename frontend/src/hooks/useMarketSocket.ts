import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { MARKET_EVENTS } from '@trading-dashboard/contracts'
import type {
  ClientToServerEvents,
  PriceUpdate,
  ServerToClientEvents,
} from '@trading-dashboard/contracts'
import { API_URL } from '../api/client'
import { clearSession, getToken } from '../api/session'

type MarketSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useMarketSocket(symbol: string | null) {
  const socketRef = useRef<MarketSocket | null>(null)
  const watchedSymbol = useRef(symbol)
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({})
  const [connected, setConnected] = useState(false)
  const [rejected, setRejected] = useState(false)

  useEffect(() => {
    const socket: MarketSocket = io(API_URL, {
      transports: ['websocket'],
      auth: { token: getToken() },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)

      // A reconnect arrives with a fresh socket id, so the room we joined is gone with the old one.
      if (watchedSymbol.current) {
        socket.emit(MARKET_EVENTS.subscribe, { symbol: watchedSymbol.current })
      }
    })

    socket.on('disconnect', (reason) => {
      setConnected(false)

      if (reason === 'io server disconnect') {
        clearSession()
        setRejected(true)
      }
    })

    socket.on(MARKET_EVENTS.priceUpdate, (tick) => {
      console.log('tick', tick)
      setPrices((current) => ({ ...current, [tick.symbol]: tick }))
    })

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    watchedSymbol.current = symbol

    const socket = socketRef.current

    // Skipped while the socket is still connecting, the connect handler picks it up instead.
    if (symbol && socket?.connected) {
      socket.emit(MARKET_EVENTS.subscribe, { symbol })
    }

    return () => {
      if (symbol && socket?.connected) {
        socket.emit(MARKET_EVENTS.unsubscribe, { symbol })
      }
    }
  }, [symbol])

  return { prices, connected, rejected }
}
