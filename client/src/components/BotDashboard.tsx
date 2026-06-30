import { useEffect, useState, useCallback } from "react";
import { botApi, BotSummary } from "../lib/botApi";
import {
  TrendingUp, TrendingDown, Activity, AlertCircle,
  RefreshCw, Wifi, WifiOff, Clock, Target, Shield
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt$ = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const SCORE_COLOR: Record<string, string> = {
  GOOD:    "text-emerald-400",
  NEUTRAL: "text-yellow-400",
  BAD:     "text-red-400",
};

const SCORE_BG: Record<string, string> = {
  GOOD:    "bg-emerald-400/10 border-emerald-400/30",
  NEUTRAL: "bg-yellow-400/10 border-yellow-400/30",
  BAD:     "bg-red-400/10 border-red-400/30",
};

const SCORE_ICON: Record<string, string> = {
  GOOD: "🟢", NEUTRAL: "🟡", BAD: "🔴",
};

const LEVEL_STYLE: Record<string, string> = {
  INFO:    "text-slate-300 border-slate-600",
  WARNING: "text-yellow-400 border-yellow-600",
  ERROR:   "text-red-400 border-red-600",
  TRADE:   "text-emerald-400 border-emerald-600",
};

const REGIME_COLOR: Record<string, string> = {
  trending: "text-blue-400",
  ranging:  "text-yellow-400",
  volatile: "text-red-400",
};

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, positive,
}: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400"}`}>
        {value}
      </p>
      {sub && <p className={`text-xs mt-0.5 ${positive === undefined ? "text-slate-400" : positive ? "text-emerald-500" : "text-red-500"}`}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ running }: { running: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${running ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" : "bg-red-400/10 border-red-400/30 text-red-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
      {running ? "BOT RUNNING" : "BOT OFFLINE"}
    </span>
  );
}

function OpenPositionRow({ trade }: { trade: BotSummary["open_trades"][0] }) {
  const isLong = trade.direction === "long";
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2330] last:border-0 hover:bg-[#1e2330]/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLong ? "bg-emerald-400/20 text-emerald-400" : "bg-red-400/20 text-red-400"}`}>
          {trade.direction.toUpperCase()}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{trade.instrument}</p>
          <p className="text-xs text-slate-500">{trade.strategy_name.replace(/_/g, " ")}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-white">{fmt$(trade.entry_price)}</p>
        <p className="text-xs text-slate-500">
          SL: {fmt$(trade.stop_loss)}
          {trade.take_profit ? ` · TP: ${fmt$(trade.take_profit)}` : " · Trailing"}
        </p>
      </div>
      <div className="text-right min-w-[70px]">
        <p className="text-xs text-slate-500">{trade.timestamp_open.slice(11, 16)} UTC</p>
        <p className="text-xs text-slate-600">{(trade.position_size).toFixed(4)}</p>
      </div>
    </div>
  );
}

function ClosedTradeRow({ trade }: { trade: BotSummary["recent_closed"][0] }) {
  const pnl     = trade.pnl_dollars ?? 0;
  const isWin   = pnl > 0;
  const isLong  = trade.direction === "long";
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2330] last:border-0 hover:bg-[#1e2330]/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLong ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
          {trade.direction.toUpperCase()}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{trade.instrument}</p>
          <p className="text-xs text-slate-500">{trade.strategy_name.replace(/_/g, " ")}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
          {fmt$(pnl)}
        </p>
        <p className="text-xs text-slate-500">{trade.exit_reason ?? "—"}</p>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="text-xs text-slate-500">{trade.timestamp_close?.slice(11, 16)} UTC</p>
      </div>
    </div>
  );
}

function StrategyCard({ s }: { s: BotSummary["strategies"][0] }) {
  const paused = Boolean(s.is_paused);
  const score  = paused ? "PAUSED" : s.score;
  const color  = paused ? "text-slate-400" : SCORE_COLOR[s.score] ?? "text-slate-400";
  const bg     = paused ? "bg-slate-400/10 border-slate-400/30" : SCORE_BG[s.score] ?? "";
  const icon   = paused ? "⏸" : SCORE_ICON[s.score] ?? "⚪";

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white capitalize">
          {s.strategy_name.replace(/_/g, " ")}
        </p>
        <span className={`text-xs font-bold ${color}`}>{icon} {score}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Win Rate (10)</p>
          <p className="text-white font-medium">{((s.win_rate_last10 ?? 0) * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-slate-500">Win Rate (all)</p>
          <p className="text-white font-medium">{((s.win_rate_alltime ?? 0) * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-slate-500">Profit Factor</p>
          <p className="text-white font-medium">{(s.profit_factor_last10 ?? 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500">Total Trades</p>
          <p className="text-white font-medium">{s.total_trades ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: BotSummary["alerts"][0] }) {
  const style = LEVEL_STYLE[alert.level] ?? LEVEL_STYLE.INFO;
  return (
    <div className={`px-4 py-2.5 border-b border-[#1e2330] last:border-0 font-mono text-xs flex gap-3`}>
      <span className={`font-bold min-w-[60px] ${style.split(" ")[0]}`}>[{alert.level}]</span>
      <span className="text-slate-500 min-w-[55px]">{alert.timestamp.slice(11, 19)}</span>
      <span className="text-slate-300 truncate">{alert.message}</span>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function BotDashboard() {
  const [data,    setData]    = useState<BotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [tab,     setTab]     = useState<"overview" | "strategies" | "history" | "log">("overview");

  const load = useCallback(async () => {
    const result = await botApi.getSummary();
    if (result) {
      setData(result);
      setOffline(false);
    } else {
      setOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // ── offline state ──────────────────────────────────────────────────────
  if (!loading && offline) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 py-20">
        <WifiOff size={40} className="text-slate-600" />
        <p className="text-lg font-semibold">Bot API Offline</p>
        <p className="text-sm text-center max-w-sm">
          Start the API server to connect TradeFlow to your trading bot.
        </p>
        <code className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-lg px-4 py-2 text-xs text-emerald-400">
          python trading_bot/api/bot_api.py
        </code>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Connecting to bot...</span>
        </div>
      </div>
    );
  }

  const { snapshot, stats, open_trades, recent_closed, strategies, alerts } = data;
  const equity    = (snapshot as any)?.equity ?? 0;
  const dailyPnl  = (snapshot as any)?.daily_pnl ?? 0;
  const totalPnl  = (snapshot as any)?.total_pnl ?? stats.total_pnl ?? 0;
  const drawdown  = ((snapshot as any)?.drawdown_pct ?? 0) * 100;

  const TABS = [
    { id: "overview",    label: "Overview" },
    { id: "strategies",  label: "Strategies" },
    { id: "history",     label: "Trade History" },
    { id: "log",         label: "Alerts & Log" },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#0e1117] text-white overflow-hidden">

      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2330]">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-blue-400" />
          <span className="font-semibold text-white">AI Trading Bot</span>
          <StatusBadge running={!offline} />
        </div>
        <div className="flex items-center gap-3">
          {(snapshot as any)?.last_heartbeat && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={12} />
              {String((snapshot as any).last_heartbeat).slice(11, 19)} UTC
            </span>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1f2e] hover:bg-[#252b3b] border border-[#2a2f3e] rounded-lg transition-colors text-slate-300"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-[#1e2330]">
        <KpiCard label="Account Equity"  value={fmt$(equity)}   />
        <KpiCard label="Today's P&L"     value={fmt$(dailyPnl)}  positive={dailyPnl >= 0}  sub={fmtPct(equity ? dailyPnl / equity * 100 : 0)} />
        <KpiCard label="Total P&L"       value={fmt$(totalPnl)}  positive={totalPnl >= 0}  sub={`${stats.total_trades} trades · ${stats.win_rate}% WR`} />
        <KpiCard label="Max Drawdown"    value={`${drawdown.toFixed(2)}%`} positive={drawdown < 5} />
      </div>

      {/* ── tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 px-6 pt-3 border-b border-[#1e2330]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── tab content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-6">

            {/* regimes */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Market Regime</h3>
              <div className="flex gap-3 flex-wrap">
                {Object.entries((snapshot as any)?.regimes ?? {}).map(([inst, r]: any) => (
                  <div key={inst} className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-lg px-4 py-2 flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{inst}</span>
                    <span className={`text-xs font-bold uppercase ${REGIME_COLOR[r.regime] ?? "text-slate-400"}`}>{r.regime}</span>
                    <span className="text-xs text-slate-500">ADX {r.adx?.toFixed(1)}</span>
                  </div>
                ))}
                {!Object.keys((snapshot as any)?.regimes ?? {}).length && (
                  <p className="text-sm text-slate-500">No regime data yet — bot may be starting up.</p>
                )}
              </div>
            </div>

            {/* open positions */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Open Positions ({open_trades.length})
              </h3>
              <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
                {open_trades.length ? open_trades.map(t => (
                  <OpenPositionRow key={t.trade_id} trade={t} />
                )) : (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">No open positions</p>
                )}
              </div>
            </div>

            {/* recent closed */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Closed Trades</h3>
              <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
                {recent_closed.length ? recent_closed.map(t => (
                  <ClosedTradeRow key={t.trade_id} trade={t} />
                )) : (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">No closed trades yet</p>
                )}
              </div>
            </div>

            {/* stats row */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Performance Stats</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: "Total Trades",  value: stats.total_trades },
                  { label: "Wins",          value: stats.wins,          color: "text-emerald-400" },
                  { label: "Losses",        value: stats.losses,        color: "text-red-400" },
                  { label: "Win Rate",      value: `${stats.win_rate}%` },
                  { label: "Profit Factor", value: stats.profit_factor.toFixed(2) },
                  { label: "Total PnL",     value: fmt$(stats.total_pnl), color: stats.total_pnl >= 0 ? "text-emerald-400" : "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl px-3 py-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className={`text-base font-bold ${(s as any).color ?? "text-white"}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STRATEGIES */}
        {tab === "strategies" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {strategies.length ? strategies.map(s => (
              <StrategyCard key={s.strategy_name} s={s} />
            )) : (
              <p className="col-span-3 text-sm text-slate-500 text-center py-10">
                No strategy data yet — trades will appear after the first signal fires.
              </p>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
            {recent_closed.length ? recent_closed.map(t => (
              <ClosedTradeRow key={t.trade_id} trade={t} />
            )) : (
              <p className="px-4 py-10 text-sm text-slate-500 text-center">No closed trades yet</p>
            )}
          </div>
        )}

        {/* LOG */}
        {tab === "log" && (
          <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
            {alerts.length ? alerts.map(a => (
              <AlertRow key={a.id} alert={a} />
            )) : (
              <p className="px-4 py-10 text-sm text-slate-500 text-center">No alerts yet</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
