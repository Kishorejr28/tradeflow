// Alpaca proxy client — calls our local FastAPI server (port 8000)
// Keys never touch the browser — they stay in the Python server's .env

const BASE = "http://localhost:8000/alpaca"

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AlpacaAccount {
  equity:          number
  cash:            number
  buying_power:    number
  last_equity:     number
  daily_pnl:       number
  portfolio_value: number
  status:          string
}

export interface AlpacaPosition {
  symbol:          string
  qty:             number
  side:            string
  avg_entry_price: number
  current_price:   number
  unrealized_pl:   number
  unrealized_plpc: number
  market_value:    number
}

export interface AlpacaOrder {
  id:               string
  symbol:           string
  side:             string
  qty:              string
  filled_qty:       string
  filled_avg_price: number | null
  status:           string
  order_type:       string
  created_at:       string | null
}

export interface PlaceOrderParams {
  symbol:      string
  qty:         number
  side:        "buy" | "sell"
  order_type?: "market" | "limit"
  limit_price?: number
  stop_loss?:  number
  take_profit?: number
}

// ── API calls ────────────────────────────────────────────────────────────────

export const alpacaClient = {
  getAccount:  ()              => req<AlpacaAccount>("GET",    "/account"),
  getPositions:()              => req<AlpacaPosition[]>("GET", "/positions"),
  getOrders:   (limit = 20)   => req<AlpacaOrder[]>("GET",    `/orders?limit=${limit}`),
  placeOrder:  (p: PlaceOrderParams) => req<AlpacaOrder>("POST", "/orders", p),
  closePosition: (symbol: string)    => req<AlpacaOrder>("DELETE", `/positions/${symbol}`),

  /** Check if the proxy server is reachable */
  isAvailable: async (): Promise<boolean> => {
    try {
      await fetch("http://localhost:8000/alpaca/account", {
        signal: AbortSignal.timeout(3000),
      })
      return true
    } catch {
      return false
    }
  },
}
