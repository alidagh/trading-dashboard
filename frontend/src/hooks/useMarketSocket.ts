import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { MARKET_EVENTS } from '@trading-dashboard/contracts'
import type {
  ClientToServerEvents,
  PriceUpdate,
  ServerToClientEvents,
} from '@trading-dashboard/contracts'
import { API_URL } from '../api/client'

type MarketSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useMarketSocket(symbol: string | null) {
  const socketRef = useRef<MarketSocket | null>(null)
  const watchedSymbol = useRef(symbol)
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket: MarketSocket = io(API_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)

      // A reconnect arrives with a fresh socket id, so the room we joined is gone with the old one.
      if (watchedSymbol.current) {
        socket.emit(MARKET_EVENTS.subscribe, { symbol: watchedSymbol.current })
      }
    })

    // TODO: handle auth-related server disconnects; Socket.IO won't retry them automtically.
    socket.on('disconnect', () => setConnected(false))

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

  return { prices, connected }
}
