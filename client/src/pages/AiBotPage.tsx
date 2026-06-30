import { useEffect, useState, useCallback } from 'react'
import { botApi, BotSummary } from '@/lib/botApi'
import { RefreshCw, WifiOff, Activity } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const GREEN  = '#26a69a'
const RED    = '#ef5350'
const YELLOW = '#ffa726'
const GREY   = '#607d8b'
const BG     = '#0e1117'
const CARD   = '#1e2130'
const TEXT   = '#e0e0e0'

const SCORE_ICON: Record<string, string> = { GOOD: '🟢', NEUTRAL: '🟡', BAD: '🔴' }
const SCORE_COLOR: Record<string, string> = {
  GOOD: 'text-emerald-400', NEUTRAL: 'text-yellow-400', BAD: 'text-red-400',
}

function KpiCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${positive === undefined ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${positive === undefined ? 'text-slate-400' : positive ? 'text-emerald-500' : 'text-red-500'}`}>{sub}</p>}
    </div>
  )
}

// ── Daily P&L chart ───────────────────────────────────────────────────────────
function DailyPnlChart({ trades }: { trades: BotSummary['recent_closed'] }) {
  const all = [...trades].filter(t => t.timestamp_close && t.pnl_dollars !== null)
  const byDay: Record<string, number> = {}
  for (const t of all) {
    const day = t.timestamp_close!.slice(0, 10)
    byDay[day] = (byDay[day] || 0) + (t.pnl_dollars || 0)
  }
  const data = Object.keys(byDay).sort().map(d => ({ day: d, pnl: parseFloat(byDay[d].toFixed(2)) }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 40, left: 50 }}>
        <XAxis dataKey="day" tick={{ fill: GREY, fontSize: 10 }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fill: GREY, fontSize: 10 }} />
        <Tooltip contentStyle={{ background: CARD, border: '1px solid #2a2f3e', color: TEXT }} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']} />
        <ReferenceLine y={0} stroke={GREY} strokeDasharray="3 3" />
        <Bar dataKey="pnl" radius={[3,3,0,0]}>
          {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? GREEN : RED} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Weekly / Monthly filter ───────────────────────────────────────────────────
function PnlWithFilter({ trades }: { trades: BotSummary['recent_closed'] }) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const bucket = (dateStr: string) => {
    const d = new Date(dateStr)
    if (period === 'daily')   return d.toISOString().slice(0, 10)
    if (period === 'monthly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const jan4 = new Date(d.getFullYear(), 0, 4)
    const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
  }

  const all = trades.filter(t => t.timestamp_close && t.pnl_dollars !== null)
  const grouped: Record<string, number> = {}
  for (const t of all) {
    const key = bucket(t.timestamp_close!)
    grouped[key] = (grouped[key] || 0) + (t.pnl_dollars || 0)
  }
  const chartData = Object.keys(grouped).sort().map(k => ({ key: k, pnl: parseFloat(grouped[k].toFixed(2)) }))

  return (
    <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">P&L by Period</p>
        <div className="flex gap-1">
          {(['daily','weekly','monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition capitalize ${
                period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>{p}</button>
          ))}
        </div>
      </div>
      {chartData.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No closed trades yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: 50 }}>
            <XAxis dataKey="key" tick={{ fill: GREY, fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fill: GREY, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: CARD, border: '1px solid #2a2f3e', color: TEXT }} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']} />
            <ReferenceLine y={0} stroke={GREY} strokeDasharray="3 3" />
            <Bar dataKey="pnl" radius={[3,3,0,0]}>
              {chartData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? GREEN : RED} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Strategy accuracy ─────────────────────────────────────────────────────────
function StrategyAccuracy({ strategies, trades }: { strategies: BotSummary['strategies']; trades: BotSummary['recent_closed'] }) {
  // Compute per-strategy stats from closed trades
  const stats: Record<string, { wins: number; total: number; pnl: number }> = {}
  for (const t of trades) {
    const s = t.strategy_name
    if (!stats[s]) stats[s] = { wins: 0, total: 0, pnl: 0 }
    stats[s].total++
    stats[s].pnl += t.pnl_dollars || 0
    if ((t.pnl_dollars || 0) > 0) stats[s].wins++
  }

  const allStrats = strategies.length > 0
    ? strategies
    : Object.keys(stats).map(name => ({ strategy_name: name, score: 'NEUTRAL' as any, is_paused: 0, total_trades: stats[name]?.total || 0, win_rate_alltime: 0, profit_factor_alltime: 0, win_rate_last10: 0, profit_factor_last10: 0, consecutive_bad: 0, timestamp: '' }))

  return (
    <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl p-4">
      <p className="text-sm font-semibold text-white mb-3">Strategy Accuracy</p>
      <div className="space-y-2">
        {allStrats.map(s => {
          const st = stats[s.strategy_name] || { wins: 0, total: 0, pnl: 0 }
          const wr = st.total > 0 ? st.wins / st.total : (s.win_rate_alltime || 0)
          const pnl = st.pnl
          const score = s.is_paused ? 'PAUSED' : (s.score || 'NEUTRAL')
          const scoreColor = s.is_paused ? 'text-slate-400' : SCORE_COLOR[score] || 'text-slate-400'
          const scoreIcon = s.is_paused ? '⏸' : (SCORE_ICON[score] || '⚪')
          const trades_count = st.total || s.total_trades || 0

          return (
            <div key={s.strategy_name} className="flex items-center gap-3 px-3 py-2.5 bg-[#0e1117] rounded-lg">
              <span className="text-sm">{scoreIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white capitalize">{s.strategy_name.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Win rate bar */}
                  <div className="flex-1 h-1.5 bg-[#2a2f3e] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${wr * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 min-w-[30px]">{(wr * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pnl !== 0 ? `$${pnl.toFixed(0)}` : '—'}</p>
                <p className="text-[10px] text-slate-500">{trades_count} trades</p>
              </div>
              <span className={`text-[10px] font-bold ${scoreColor} min-w-[50px] text-right`}>{score}</span>
            </div>
          )
        })}
        {allStrats.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No strategy data yet</p>}
      </div>
    </div>
  )
}

// ── Trade list ────────────────────────────────────────────────────────────────
function TradeList({ trades }: { trades: BotSummary['recent_closed'] }) {
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all')

  const filtered = trades.filter(t => {
    const pnl = t.pnl_dollars || 0
    if (filter === 'win')  return pnl > 0
    if (filter === 'loss') return pnl <= 0
    return true
  })

  return (
    <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2f3e]">
        <p className="text-sm font-semibold text-white">All Trades</p>
        <div className="flex gap-1">
          {(['all','win','loss'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition capitalize ${
                filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>{f}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No trades</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 bg-[#0e1117]">
                {['Strategy','Instrument','Dir','Entry','Exit','P&L','Reason','Closed'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const pnl = t.pnl_dollars || 0
                const isLong = t.direction === 'long'
                return (
                  <tr key={t.trade_id} className={`border-t border-[#2a2f3e] ${pnl > 0 ? 'bg-emerald-500/5' : pnl < 0 ? 'bg-red-500/5' : ''}`}>
                    <td className="px-3 py-2 text-slate-300 capitalize">{t.strategy_name.replace(/_/g,' ')}</td>
                    <td className="px-3 py-2 font-semibold text-white">{t.instrument}</td>
                    <td className={`px-3 py-2 font-bold uppercase ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>{t.direction}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">${t.entry_price.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">${(t.exit_price || 0).toFixed(2)}</td>
                    <td className={`px-3 py-2 font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${pnl.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{t.exit_reason || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{t.timestamp_close?.slice(0,16).replace('T',' ')} UTC</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AiBotPage() {
  const [data,    setData]    = useState<BotSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [tab,     setTab]     = useState<'overview' | 'analytics' | 'trades' | 'strategies' | 'log'>('overview')

  const load = useCallback(async () => {
    const result = await botApi.getSummary()
    if (result) { setData(result); setOffline(false) }
    else setOffline(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  // ── offline ──────────────────────────────────────────────────────────────
  if (!loading && offline) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 py-20">
        <WifiOff size={40} className="text-slate-600" />
        <p className="text-lg font-semibold">AI Bot API Offline</p>
        <p className="text-sm text-center max-w-sm text-slate-500">
          The local API server isn't reachable. Make sure it's running on your machine.
        </p>
        <code className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-lg px-4 py-2 text-xs text-emerald-400">
          python trading_bot/api/bot_api.py
        </code>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={18} className="animate-spin" /><span className="text-sm">Connecting to bot...</span>
        </div>
      </div>
    )
  }

  const { snapshot, stats, open_trades, recent_closed, strategies, alerts } = data
  const equity   = (snapshot as any)?.equity   ?? 0
  const dailyPnl = (snapshot as any)?.daily_pnl ?? 0
  const drawdown = ((snapshot as any)?.drawdown_pct ?? 0) * 100
  const realised = stats.total_pnl ?? 0

  const TABS = [
    { id: 'overview',   label: '📊 Overview' },
    { id: 'analytics',  label: '📈 Analytics' },
    { id: 'trades',     label: '📋 Trades' },
    { id: 'strategies', label: '🎯 Strategies' },
    { id: 'log',        label: '🔔 Log' },
  ] as const

  const LEVEL_STYLE: Record<string, string> = {
    INFO: 'text-slate-300', WARNING: 'text-yellow-400',
    ERROR: 'text-red-400',  TRADE: 'text-emerald-400',
  }

  return (
    <div className="flex flex-col h-full bg-[#0e1117] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2330]">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-blue-400" />
          <div>
            <h1 className="text-base font-bold text-white">AI Trading Bot</h1>
            <p className="text-xs text-slate-500">Alpaca Paper Trading · {strategies.length} strategies active</p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/10 border border-emerald-400/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> RUNNING
          </span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1f2e] hover:bg-[#252b3b] border border-[#2a2f3e] rounded-lg text-slate-300 transition">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-[#1e2330]">
        <KpiCard label="Account Equity"     value={fmt$(equity)} />
        <KpiCard label="Realised P&L"       value={fmt$(realised)}  positive={realised >= 0} sub={`${stats.total_trades} trades · ${stats.win_rate}% WR`} />
        <KpiCard label="Today's P&L"        value={fmt$(dailyPnl)}  positive={dailyPnl >= 0} />
        <KpiCard label="Max Drawdown"       value={`${drawdown.toFixed(2)}%`} positive={drawdown < 5} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 border-b border-[#1e2330]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs rounded-t-lg border-b-2 transition ${
              tab === t.id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            {/* Market regimes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Market Regime</p>
              <div className="flex gap-3 flex-wrap">
                {Object.entries((snapshot as any)?.regimes ?? {}).map(([inst, r]: any) => {
                  const c = r.regime === 'trending' ? 'text-blue-400' : r.regime === 'volatile' ? 'text-red-400' : 'text-yellow-400'
                  return (
                    <div key={inst} className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-lg px-4 py-2 flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{inst}</span>
                      <span className={`text-xs font-bold uppercase ${c}`}>{r.regime}</span>
                      <span className="text-xs text-slate-500">ADX {r.adx?.toFixed(1)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Open positions */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Open Positions ({open_trades.length})</p>
              <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
                {open_trades.length ? open_trades.map(t => (
                  <div key={t.trade_id} className="flex items-center justify-between px-4 py-3 border-b border-[#1e2330] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.direction==='long'?'bg-emerald-400/20 text-emerald-400':'bg-red-400/20 text-red-400'}`}>{t.direction.toUpperCase()}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.instrument}</p>
                        <p className="text-xs text-slate-500">{t.strategy_name.replace(/_/g,' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">${t.entry_price.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">SL ${t.stop_loss.toFixed(2)}{t.take_profit ? ` · TP $${t.take_profit.toFixed(2)}` : ' · Trailing'}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-slate-500 text-center py-6">No open positions</p>}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: 'Total Trades',   value: stats.total_trades },
                { label: 'Wins',           value: stats.wins,          color: 'text-emerald-400' },
                { label: 'Losses',         value: stats.losses,        color: 'text-red-400' },
                { label: 'Win Rate',       value: `${stats.win_rate}%` },
                { label: 'Profit Factor',  value: (stats.profit_factor || 0).toFixed(2) },
                { label: 'Realised P&L',   value: fmt$(stats.total_pnl), color: stats.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl px-3 py-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className={`text-base font-bold ${(s as any).color ?? 'text-white'}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ANALYTICS */}
        {tab === 'analytics' && (
          <>
            <PnlWithFilter trades={recent_closed} />
            <StrategyAccuracy strategies={strategies} trades={recent_closed} />
          </>
        )}

        {/* TRADES */}
        {tab === 'trades' && <TradeList trades={recent_closed} />}

        {/* STRATEGIES */}
        {tab === 'strategies' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {strategies.length ? strategies.map(s => {
              const paused = Boolean(s.is_paused)
              const score  = paused ? 'PAUSED' : s.score
              const color  = paused ? 'text-slate-400' : SCORE_COLOR[s.score] ?? 'text-slate-400'
              const icon   = paused ? '⏸' : SCORE_ICON[s.score] ?? '⚪'
              return (
                <div key={s.strategy_name} className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white capitalize">{s.strategy_name.replace(/_/g,' ')}</p>
                    <span className={`text-xs font-bold ${color}`}>{icon} {score}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-slate-500">Win Rate (10)</p><p className="text-white font-medium">{((s.win_rate_last10??0)*100).toFixed(0)}%</p></div>
                    <div><p className="text-slate-500">Win Rate (all)</p><p className="text-white font-medium">{((s.win_rate_alltime??0)*100).toFixed(0)}%</p></div>
                    <div><p className="text-slate-500">Profit Factor</p><p className="text-white font-medium">{(s.profit_factor_last10??0).toFixed(2)}</p></div>
                    <div><p className="text-slate-500">Total Trades</p><p className="text-white font-medium">{s.total_trades??0}</p></div>
                  </div>
                </div>
              )
            }) : <p className="col-span-3 text-slate-500 text-center py-10">No strategy data — trades will appear after the first signal fires.</p>}
          </div>
        )}

        {/* LOG */}
        {tab === 'log' && (
          <div className="bg-[#1a1f2e] border border-[#2a2f3e] rounded-xl overflow-hidden">
            {alerts.length ? alerts.map(a => (
              <div key={a.id} className="px-4 py-2.5 border-b border-[#1e2330] last:border-0 font-mono text-xs flex gap-3">
                <span className={`font-bold min-w-[64px] ${LEVEL_STYLE[a.level] ?? 'text-slate-300'}`}>[{a.level}]</span>
                <span className="text-slate-500 min-w-[55px]">{a.timestamp.slice(11,19)}</span>
                <span className="text-slate-300 truncate">{a.message}</span>
              </div>
            )) : <p className="text-slate-500 text-center py-8 text-sm">No alerts yet</p>}
          </div>
        )}

      </div>
    </div>
  )
}
