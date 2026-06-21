import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Trade, TradingPlan, JournalEntry } from '@/types'
import type { ManualTrade } from '@/components/ui/AddTradeModal'

interface LocalTrade {
  id: string
  date: string
  symbol: string
  direction: 'long' | 'short'
  pnl: number
  planFollowed: boolean
  emotion: string
  note: string
  entryPrice: number
  exitPrice: number
  lots: number
}

interface LocalNote {
  id: string
  title: string
  content: string
  date: string
  createdAt: string
}

interface AppState {
  user: User | null
  theme: 'light' | 'dark'
  trades: Trade[]
  plans: TradingPlan[]
  localTrades: LocalTrade[]
  localNotes: LocalNote[]
  showTutorial: boolean
  tutorialStep: number
  seenTutorial: Record<string, boolean>
  setUser: (user: User | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  setTrades: (trades: Trade[]) => void
  setPlans: (plans: TradingPlan[]) => void
  addLocalTrade: (trade: ManualTrade) => void
  addLocalNote: (note: { title: string; content: string; date: string }) => void
  setShowTutorial: (show: boolean) => void
  setTutorialStep: (step: number) => void
  markTutorialSeen: (userId: string) => void
  signOut: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      trades: [],
      plans: [],
      localTrades: [],
      localNotes: [],
      showTutorial: false,
      tutorialStep: 0,
      seenTutorial: {},
      setUser: (user) => set({ user }),
      setTheme: (theme) => {
        set({ theme })
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      setTrades: (trades) => set({ trades }),
      setPlans: (plans) => set({ plans }),
      addLocalTrade: (trade) => set((s) => ({
        localTrades: [...s.localTrades, {
          id: `lt-${Date.now()}`,
          date: trade.date,
          symbol: trade.symbol,
          direction: trade.direction,
          pnl: trade.pnl,
          planFollowed: trade.planFollowed,
          emotion: trade.emotion,
          note: trade.note,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          lots: trade.lots,
        }],
      })),
      addLocalNote: (note) => set((s) => ({
        localNotes: [...s.localNotes, {
          id: `ln-${Date.now()}`,
          title: note.title,
          content: note.content,
          date: note.date,
          createdAt: new Date().toISOString(),
        }],
      })),
      setShowTutorial: (show) => set({ showTutorial: show, tutorialStep: 0 }),
      setTutorialStep: (step) => set({ tutorialStep: step }),
      markTutorialSeen: (userId) =>
        set((s) => ({ seenTutorial: { ...s.seenTutorial, [userId]: true } })),
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, trades: [], plans: [], localTrades: [], localNotes: [] })
      },
    }),
    {
      name: 'tradeflow-store',
      partialize: (state) => ({
        theme: state.theme,
        seenTutorial: state.seenTutorial,
        localTrades: state.localTrades,
        localNotes: state.localNotes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)
