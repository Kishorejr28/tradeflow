import { create } from "zustand"
import { alpacaClient, AlpacaAccount, AlpacaPosition, AlpacaOrder, PlaceOrderParams } from "@/lib/alpacaClient"

interface AlpacaState {
  // data
  account:   AlpacaAccount | null
  positions: AlpacaPosition[]
  orders:    AlpacaOrder[]
  available: boolean    // is the proxy server reachable?
  loading:   boolean
  error:     string | null

  // actions
  sync:          () => Promise<void>
  placeOrder:    (params: PlaceOrderParams) => Promise<AlpacaOrder>
  closePosition: (symbol: string) => Promise<void>
  checkAvailable:() => Promise<boolean>
  clearError:    () => void
}

export const useAlpacaStore = create<AlpacaState>((set, get) => ({
  account:   null,
  positions: [],
  orders:    [],
  available: false,
  loading:   false,
  error:     null,

  checkAvailable: async () => {
    const ok = await alpacaClient.isAvailable()
    set({ available: ok })
    return ok
  },

  sync: async () => {
    set({ loading: true, error: null })
    try {
      const [account, positions, orders] = await Promise.all([
        alpacaClient.getAccount(),
        alpacaClient.getPositions(),
        alpacaClient.getOrders(20),
      ])
      set({ account, positions, orders, available: true, loading: false })
    } catch (e: any) {
      set({ loading: false, error: e.message, available: false })
    }
  },

  placeOrder: async (params) => {
    set({ loading: true, error: null })
    try {
      const order = await alpacaClient.placeOrder(params)
      // Re-sync account + positions after order
      await get().sync()
      return order
    } catch (e: any) {
      set({ loading: false, error: e.message })
      throw e
    }
  },

  closePosition: async (symbol) => {
    set({ loading: true, error: null })
    try {
      await alpacaClient.closePosition(symbol)
      await get().sync()
    } catch (e: any) {
      set({ loading: false, error: e.message })
      throw e
    }
  },

  clearError: () => set({ error: null }),
}))
