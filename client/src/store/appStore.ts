import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Trade, TradingPlan } from '@/types'

interface AppState {
  user: User | null
  theme: 'light' | 'dark'
  trades: Trade[]
  plans: TradingPlan[]
  showTutorial: boolean
  tutorialStep: number
  seenTutorial: Record<string, boolean>
  setUser: (user: User | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  setTrades: (trades: Trade[]) => void
  setPlans: (plans: TradingPlan[]) => void
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
      setShowTutorial: (show) => set({ showTutorial: show, tutorialStep: 0 }),
      setTutorialStep: (step) => set({ tutorialStep: step }),
      markTutorialSeen: (userId) =>
        set((s) => ({ seenTutorial: { ...s.seenTutorial, [userId]: true } })),
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, trades: [], plans: [] })
      },
    }),
    {
      name: 'tradeflow-store',
      partialize: (state) => ({
        theme: state.theme,
        seenTutorial: state.seenTutorial,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      },
    }
  )
)
