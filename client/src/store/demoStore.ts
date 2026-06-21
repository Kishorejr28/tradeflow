import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DemoPosition {
  id: string
  symbol: string
  direction: 'buy' | 'sell'
  lots: number
  entryPrice: number
  openTime: string
  sl?: number
  tp?: number
}

export interface DemoTrade {
  id: string
  symbol: string
  direction: 'buy' | 'sell'
  lots: number
  entryPrice: number
  exitPrice: number
  openTime: string
  closeTime: string
  pnl: number
  pips: number
}

interface DemoState {
  balance: number
  positions: DemoPosition[]
  history: DemoTrade[]
  openPosition: (pos: Omit<DemoPosition, 'id' | 'openTime'>) => void
  closePosition: (id: string, currentPrice: number) => void
  resetAccount: () => void
}

const STARTING_BALANCE = 100000

function calcPnl(pos: DemoPosition, exitPrice: number): number {
  const pipValue = pos.symbol.includes('JPY') ? 0.01 : 0.0001
  const pipSize = pos.symbol === 'XAUUSD' ? 0.1 : pos.symbol.includes('JPY') ? 0.01 : 0.0001
  const contractSize = pos.symbol === 'XAUUSD' ? 100 : 100000
  const pips = pos.direction === 'buy'
    ? (exitPrice - pos.entryPrice) / pipSize
    : (pos.entryPrice - exitPrice) / pipSize
  // Simplified: 1 pip ≈ $10 per standard lot for non-JPY
  const pipDollarValue = pos.symbol === 'XAUUSD' ? pos.lots * 1 : pos.lots * 10
  return parseFloat((pips * pipDollarValue).toFixed(2))
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      positions: [],
      history: [],
      openPosition: (pos) => {
        const newPos: DemoPosition = {
          ...pos,
          id: `pos-${Date.now()}`,
          openTime: new Date().toISOString(),
        }
        set((s) => ({ positions: [...s.positions, newPos] }))
      },
      closePosition: (id, currentPrice) => {
        const pos = get().positions.find(p => p.id === id)
        if (!pos) return
        const pnl = calcPnl(pos, currentPrice)
        const pipSize = pos.symbol === 'XAUUSD' ? 0.1 : pos.symbol.includes('JPY') ? 0.01 : 0.0001
        const pips = pos.direction === 'buy'
          ? (currentPrice - pos.entryPrice) / pipSize
          : (pos.entryPrice - currentPrice) / pipSize

        const trade: DemoTrade = {
          id: `trade-${Date.now()}`,
          symbol: pos.symbol,
          direction: pos.direction,
          lots: pos.lots,
          entryPrice: pos.entryPrice,
          exitPrice: currentPrice,
          openTime: pos.openTime,
          closeTime: new Date().toISOString(),
          pnl,
          pips: parseFloat(pips.toFixed(1)),
        }
        set((s) => ({
          positions: s.positions.filter(p => p.id !== id),
          history: [trade, ...s.history],
          balance: parseFloat((s.balance + pnl).toFixed(2)),
        }))
      },
      resetAccount: () => set({ balance: STARTING_BALANCE, positions: [], history: [] }),
    }),
    { name: 'tradeflow-demo-account' }
  )
)

export { calcPnl }
