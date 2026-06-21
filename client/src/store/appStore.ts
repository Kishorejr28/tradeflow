import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Trade, TradingPlan } from '@/types'

interface AppState {
  user: User | null
  theme: 'light' | 'dark'
  trades: Trade[]
  plans: TradingPlan[]
  setUser: (user: User | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  setTrades: (trades: Trade[]) => void
  setPlans: (plans: TradingPlan[]) => void
  signOut: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      trades: [],
      plans: [],
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
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, trades: [], plans: [] })
      },
    }),
    {
      name: 'tradeflow-store',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)
