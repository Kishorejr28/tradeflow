import { useEffect, useRef, useState, useCallback } from 'react'

// Simulated live prices seeded from realistic base values
// In production replace with a real free feed e.g. twelve-data free WebSocket
const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.1158,
  GBPUSD: 1.2741,
  USDJPY: 157.38,
  AUDUSD: 0.6412,
  USDCAD: 1.3592,
  USDCHF: 0.8981,
  NZDUSD: 0.5891,
  XAUUSD: 3324.50,
  GBPJPY: 200.54,
  EURJPY: 175.63,
}

const PIP: Record<string, number> = {
  USDJPY: 0.01, GBPJPY: 0.01, EURJPY: 0.01, XAUUSD: 0.1,
}

function getPipSize(symbol: string) {
  return PIP[symbol] ?? 0.0001
}

function randomWalk(price: number, symbol: string) {
  const pip = getPipSize(symbol)
  const delta = (Math.random() - 0.5) * pip * 4
  return parseFloat((price + delta).toFixed(symbol.includes('JPY') || symbol === 'XAUUSD' ? 2 : 4))
}

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    symbols.forEach(s => { init[s] = BASE_PRICES[s] ?? 1.0 })
    return init
  })
  const prevRef = useRef<Record<string, number>>({ ...prices })
  const [direction, setDirection] = useState<Record<string, 'up' | 'down'>>({})

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => {
        const next: Record<string, number> = {}
        const dirs: Record<string, 'up' | 'down'> = {}
        symbols.forEach(s => {
          next[s] = randomWalk(prev[s] ?? BASE_PRICES[s] ?? 1.0, s)
          dirs[s] = next[s] >= (prev[s] ?? next[s]) ? 'up' : 'down'
        })
        prevRef.current = prev
        setDirection(dirs)
        return next
      })
    }, 1500)
    return () => clearInterval(id)
  }, [symbols.join(',')])

  return { prices, direction }
}

export { BASE_PRICES, getPipSize }
