// Bot API client — fetches data from the local FastAPI server (port 8000)
// The Python trading bot must be running for this to work.

const BASE = "http://localhost:8000";

export interface BotSnapshot {
  equity: number;
  cash: number;
  daily_pnl: number;
  total_pnl: number;
  drawdown_pct: number;
  open_positions: number;
  regimes: Record<string, { regime: string; adx: number; atr_pct: number }>;
  last_heartbeat: string | null;
  is_running: boolean;
}

export interface BotTrade {
  trade_id: string;
  timestamp_open: string;
  timestamp_close: string | null;
  strategy_name: string;
  instrument: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  take_profit: number | null;
  position_size: number;
  pnl_dollars: number | null;
  pnl_percent: number | null;
  exit_reason: string | null;
  market_regime: string | null;
  status: "open" | "closed";
}

export interface BotStrategy {
  strategy_name: string;
  score: "GOOD" | "NEUTRAL" | "BAD";
  win_rate_last10: number;
  win_rate_alltime: number;
  profit_factor_last10: number;
  profit_factor_alltime: number;
  total_trades: number;
  consecutive_bad: number;
  is_paused: number;
  timestamp: string;
}

export interface BotAlert {
  id: number;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "TRADE";
  message: string;
}

export interface BotStats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  profit_factor: number;
}

export interface BotSummary {
  open_trades: BotTrade[];
  recent_closed: BotTrade[];
  strategies: BotStrategy[];
  alerts: BotAlert[];
  snapshot: Partial<BotSnapshot>;
  equity_curve: Array<{ timestamp: string; equity: number; drawdown_pct: number }>;
  stats: BotStats;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const botApi = {
  getSummary: () => fetchJson<BotSummary>("/summary"),
  getStatus:  () => fetchJson<BotSnapshot>("/status"),
  getOpenTrades:   () => fetchJson<BotTrade[]>("/trades/open"),
  getClosedTrades: (strategy?: string, instrument?: string, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (strategy)   params.set("strategy",   strategy);
    if (instrument) params.set("instrument", instrument);
    return fetchJson<BotTrade[]>(`/trades/closed?${params}`);
  },
  getAlerts: (level?: string, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (level) params.set("level", level);
    return fetchJson<BotAlert[]>(`/alerts?${params}`);
  },
};
