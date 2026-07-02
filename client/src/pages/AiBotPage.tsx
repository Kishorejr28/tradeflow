import { useEffect, useState, useCallback } from 'react'
import { botApi, BotSummary } from '@/lib/botApi'
import { supabase } from '@/lib/supabase'
import { RefreshCw, WifiOff, Activity, X, Wifi, Lock, Zap, Terminal, Github, ExternalLink } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
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

// ── Close button with confirm ─────────────────────────────────────────────────
function CloseButton({
  tradeId, instrument, unrealPnl, onClosed,
}: {
  tradeId: string
  instrument: string
  unrealPnl: number | null
  onClosed: () => void
}) {
  const [state, setState] = useState<'idle' | 'confirm' | 'closing' | 'done'>('idle')
  const [error, setError] = useState('')

  const handleClose = async () => {
    setState('closing')
    setError('')
    try {
      const symbol = instrument.replace('/', '')
      const botApiUrl = (import.meta.env.VITE_BOT_API_URL || 'http://localhost:8000')
      const result = await fetch(`${botApiUrl}/alpaca/positions/${symbol}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': import.meta.env.VITE_BOT_API_KEY || '',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      })
      if (result.ok) {
        setState('done')
        setTimeout(onClosed, 1000)
      } else {
        const d = await result.json().catch(() => ({}))
        setError(d.detail || `Close failed (HTTP ${result.status})`)
        setState('confirm')
      }
    } catch (e: any) {
      const isOffline = e.name === 'TypeError' || e.name === 'TimeoutError' || String(e.message).includes('fetch')
      setError(isOffline ? 'Bot API offline — run: python api/bot_api.py' : (e.message || 'Close failed'))
      setState('confirm')
    }
  }

  if (state === 'done') {
    return <span className="text-xs text-emerald-400 font-semibold">Closed ✓</span>
  }

  if (state === 'closing') {
    return (
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <RefreshCw size={12} className="animate-spin" /> Closing…
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-[10px] text-slate-400 text-right max-w-[120px]">
          Close at market?
          {unrealPnl !== null && (
            <span className={unrealPnl >= 0 ? ' text-emerald-400' : ' text-red-400'}>
              {' '}{unrealPnl >= 0 ? '+' : ''}{fmt$(unrealPnl)}
            </span>
          )}
        </p>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        <div className="flex gap-1">
          <button
            onClick={() => setState('idle')}
            className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 border border-[#2a2f3e] rounded transition">
            Cancel
          </button>
          <button
            onClick={handleClose}
            className="px-2 py-1 text-[11px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded transition">
            Confirm Close
          </button>
        </div>
      </div>
    )
  }

  // idle
  return (
    <button
      onClick={() => setState('confirm')}
      title="Close this position"
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition shrink-0">
      <X size={12} /> Close
    </button>
  )
}

// ── Custom dark tooltip for P&L charts ───────────────────────────────────────
function PnlTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = Number(payload[0]?.value ?? 0)
  const color = val >= 0 ? '#26a69a' : '#ef5350'
  return (
    <div style={{ background: '#1e2130', border: '1px solid #2a2f3e', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#9e9e9e', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color, fontWeight: 700, fontSize: 14 }}>{val >= 0 ? '+' : ''}${val.toFixed(2)}</p>
    </div>
  )
}
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
        <Tooltip content={<PnlTooltip />} />
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
            <Tooltip content={<PnlTooltip />} />
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

// ── Fetch from Supabase (remote fallback) ────────────────────────────────────
async function fetchFromSupabase(): Promise<{ summary: Partial<BotSummary>; source: 'supabase' } | null> {
  try {
    const [statusRes, posRes, tradesRes] = await Promise.all([
      supabase.from('bot_status').select('*').eq('id', 1).single(),
      supabase.from('bot_live_positions').select('*'),
      supabase.from('trades').select('*').eq('status', 'closed').order('exit_time', { ascending: false }).limit(20),
    ])

    if (statusRes.error || !statusRes.data) return null

    const s = statusRes.data
    const positions: any[] = (posRes.data || [])
    const closed: any[]    = (tradesRes.data || [])

    // Map Supabase rows → BotSummary shape
    const open_trades = positions.map((p: any) => ({
      trade_id:       p.trade_id,
      timestamp_open: p.updated_at,
      timestamp_close: null,
      strategy_name:  p.strategy_name,
      instrument:     p.instrument,
      direction:      p.direction,
      entry_price:    p.entry_price,
      exit_price:     p.current_price,   // current price stored here
      stop_loss:      p.stop_loss,
      take_profit:    p.take_profit,
      position_size:  p.position_size,
      pnl_dollars:    p.unrealized_pnl,
      pnl_percent:    p.unrealized_pct,
      exit_reason:    null,
      market_regime:  null,
      status:         'open' as const,
    }))

    // Use recent_closed from bot_status JSON (full detail, synced by bot)
    const rcRaw = s.recent_closed ? JSON.parse(s.recent_closed) : []
    const recent_closed = rcRaw.length > 0 ? rcRaw : closed.map((t: any) => ({
      trade_id:        t.id,
      timestamp_open:  t.entry_time,
      timestamp_close: t.exit_time,
      strategy_name:   t.note?.match(/Strategy: ([^\s]+)/)?.[1] || 'unknown',
      instrument:      t.symbol.replace(/([A-Z]{3,4})(USD)$/, '$1/$2'),
      direction:       t.direction as 'long' | 'short',
      entry_price:     t.entry_price,
      exit_price:      t.exit_price,
      stop_loss:       0,
      take_profit:     null,
      position_size:   t.quantity,
      pnl_dollars:     t.pnl,
      pnl_percent:     null,
      exit_reason:     null,
      market_regime:   null,
      status:          'closed' as const,
    }))

    // Strategies from bot_status JSON
    const strategies = s.strategies ? JSON.parse(s.strategies) : []

    const alerts: any[] = (s.recent_alerts ? JSON.parse(s.recent_alerts) : [])
      .map((a: any, i: number) => ({ id: i, ...a }))

    const regimes = s.regimes ? JSON.parse(s.regimes) : {}

    return {
      source: 'supabase',
      summary: {
        open_trades,
        recent_closed,
        strategies,
        alerts,
        snapshot: {
          equity:      s.equity,
          cash:        s.cash,
          daily_pnl:   s.daily_pnl,
          drawdown_pct: 0,
          regimes,
          is_running:  s.is_running,
          last_heartbeat: s.updated_at,
        } as any,
        equity_curve: [],
        stats: {
          total_trades:  s.total_trades || 0,
          wins:          s.wins || 0,
          losses:        (s.total_trades || 0) - (s.wins || 0),
          win_rate:      s.win_rate || 0,
          total_pnl:     s.realised_pnl || 0,
          profit_factor: s.profit_factor || 0,
        },
      },
    }
  } catch {
    return null
  }
}

// ── Plan gate — shown to free/trader users ────────────────────────────────────
function AiBotUpgradeWall() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] px-6">
      <div className="max-w-2xl w-full">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 mb-5">
            <Lock className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">AI Trading Bot</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
            Automate your strategy with a real Alpaca paper trading bot. Available on <strong className="text-brand-500">Edge Pro</strong>.
          </p>
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {[
            { icon:'🤖', title:'7 Active Strategies',   desc:'EMA crossover, BB mean reversion, ICT FVG, momentum breakout & more' },
            { icon:'📊', title:'Live Market Regime',     desc:'ADX-based regime detection — only trades trending markets with trend strategies' },
            { icon:'🛡️', title:'Risk Management',       desc:'1% risk per trade, 3% daily loss limit, 10% drawdown circuit breaker' },
            { icon:'📓', title:'Auto Journal Sync',      desc:'Every bot trade appears in your TradeFlow journal automatically' },
            { icon:'📱', title:'Telegram Alerts',        desc:'Real-time notifications on your phone for every trade open & close' },
            { icon:'📈', title:'Full Analytics',         desc:'Equity curve, win rate, profit factor, strategy scoring' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{f.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Demo preview */}
        <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-purple-500/5 p-6 mb-8">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-3">What you'll see</p>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            {['$99,858 Equity','12 Trades · 41.7% WR','BTC/USD TRENDING ADX 29','PAXG LONG +$99 (+0.99%)'].map(s => (
              <span key={s} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono text-xs">{s}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition shadow-lg shadow-brand-500/25">
            <Zap className="w-4 h-4" /> Upgrade to Edge Pro
          </button>
          <a
            href="https://github.com/Kishorejr28/tradeflow"
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm transition">
            <Github className="w-4 h-4" /> View Source
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Pro setup guide — shown to pro users who haven't configured their bot ──────
function AiBotSetupGuide() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] px-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-5">
            <Terminal className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Set up your AI Bot</h1>
          <p className="text-gray-500 dark:text-gray-400">Your Edge Pro plan includes the bot. Follow these steps to get it running.</p>
        </div>

        <div className="space-y-4">
          {[
            {
              step: '1', title: 'Get Alpaca Paper Trading Keys',
              desc: 'Sign up free at alpaca.markets → Paper Trading → API Keys. Copy your API Key ID and Secret Key.',
              link: 'https://alpaca.markets', linkLabel: 'alpaca.markets →',
            },
            {
              step: '2', title: 'Download the bot',
              desc: 'Clone or download the TradeFlow bot repository to your computer.',
              code: 'git clone https://github.com/Kishorejr28/tradeflow.git',
            },
            {
              step: '3', title: 'Configure .env',
              desc: 'Inside the trading_bot folder, copy .env.example to .env and fill in your Alpaca keys + your Supabase URL/service key.',
              code: 'cp .env.example .env',
            },
            {
              step: '4', title: 'Install & run',
              desc: 'Install Python 3.10+, install requirements, then start both the bot and the API server.',
              code: 'pip install -r requirements.txt\npython -m bot.main\npython api/bot_api.py',
            },
            {
              step: '5', title: 'Come back here',
              desc: 'Once both processes are running, refresh this page. Your live bot dashboard will appear.',
            },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">{s.step}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</p>
                {s.code && (
                  <pre className="mt-2 text-xs bg-gray-900 text-green-400 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">{s.code}</pre>
                )}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline mt-1">
                    {s.linkLabel} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? The bot uses your own Alpaca paper account — no real money involved until you explicitly switch to live trading.
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AiBotPage() {
  const { userPlan, user } = useAppStore()
  const ADMIN_EMAIL = 'kishorejr28@gmail.com'
  const isAdmin = userPlan === 'admin' || user?.email === ADMIN_EMAIL
  const isPro   = userPlan === 'pro' || isAdmin

  // Free/trader users see upgrade wall
  if (!isPro) return <AiBotUpgradeWall />

  return <AiBotPageInner />
}

function AiBotPageInner() {
  const [data,       setData]       = useState<BotSummary | null>(null)
  const [livePos,    setLivePos]    = useState<Record<string, any>>({})
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [offline,    setOffline]    = useState(false)
  const [dataSource, setDataSource] = useState<'local' | 'supabase' | 'none'>('none')
  const [tab,        setTab]        = useState<'overview' | 'analytics' | 'trades' | 'strategies' | 'log'>('overview')

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    const localResult = await botApi.getSummary()

    if (localResult) {
      setData(localResult)
      setOffline(false)
      setDataSource('local')
      // Fetch live Alpaca positions for unrealised P&L
      try {
        const alpacaRes = await fetch(
          (import.meta.env.VITE_BOT_API_URL || 'http://localhost:8000') + '/alpaca/positions',
          {
            headers: { 'X-API-Key': import.meta.env.VITE_BOT_API_KEY || '' },
            signal: AbortSignal.timeout(5000),
          }
        )
        if (alpacaRes.ok) {
          const alpacaPos: any[] = await alpacaRes.json()
          const map: Record<string, any> = {}
          for (const p of alpacaPos) {
            map[p.symbol] = p
            const withSlash = p.symbol.length > 3
              ? p.symbol.slice(0, p.symbol.length - 3) + '/' + p.symbol.slice(-3)
              : p.symbol
            map[withSlash] = p
          }
          setLivePos(map)
        }
      } catch { /* non-blocking */ }

    } else {
      // Local API unreachable — fall back to Supabase (works from anywhere)
      const supaResult = await fetchFromSupabase()
      if (supaResult) {
        setData(supaResult.summary as BotSummary)
        setOffline(false)
        setDataSource('supabase')
        // Build livePos from Supabase positions
        // Note: in Supabase open_trades, exit_price stores current_price
        const map: Record<string, any> = {}
        for (const p of supaResult.summary.open_trades || []) {
          const sym = p.instrument.replace('/', '')
          // exit_price was mapped to hold current_price in fetchFromSupabase
          const currPx = (p.exit_price ?? p.entry_price) as number
          const live = {
            current_price:   currPx,
            unrealized_pl:   p.pnl_dollars ?? 0,
            unrealized_plpc: p.pnl_percent ?? 0,
          }
          map[sym] = live
          map[p.instrument] = live
        }
        setLivePos(map)
      } else {
        setOffline(true)
        setDataSource('none')
      }
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  // ── offline — show setup guide for pro users ─────────────────────────────
  if (!loading && offline) {
    return <AiBotSetupGuide />
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
          {/* Data source badge */}
          {dataSource === 'supabase' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-400/10 border border-blue-400/30 text-blue-400">
              <Wifi size={9} /> Supabase · 30s delay
            </span>
          )}
          {dataSource === 'local' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/10 border border-emerald-400/30 text-emerald-400">
              <Wifi size={9} /> Live
            </span>
          )}
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1f2e] hover:bg-[#252b3b] border border-[#2a2f3e] rounded-lg text-slate-300 transition disabled:opacity-60">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
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
                {open_trades.length ? open_trades.map(t => {
                  const alpacaSym  = t.instrument.replace('/', '')
                  const live       = livePos[alpacaSym] || livePos[t.instrument]

                  // Best current price: Alpaca live feed > Supabase stored current_price > null
                  // Note: in Supabase open_trades, exit_price holds current_price
                  const currPrice: number | null =
                    live?.current_price != null ? parseFloat(String(live.current_price))
                    : t.exit_price != null       ? t.exit_price
                    : null

                  // Calculate P&L per-trade using our position size (correct even for netted positions)
                  const unrealPnl = currPrice !== null && t.position_size > 0
                    ? (t.direction === 'long'
                        ? (currPrice - t.entry_price) * t.position_size
                        : (t.entry_price - currPrice) * t.position_size)
                    : null
                  const unrealPct = currPrice !== null && t.entry_price > 0
                    ? (t.direction === 'long'
                        ? (currPrice - t.entry_price) / t.entry_price * 100
                        : (t.entry_price - currPrice) / t.entry_price * 100)
                    : null

                  const isLong     = t.direction === 'long'
                  const pnlColor   = unrealPnl === null ? 'text-slate-400'
                                   : unrealPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                  const entryP = t.entry_price
                  const tpP    = t.take_profit
                  const slP    = t.stop_loss
                  const progress = currPrice && tpP ? (
                    isLong
                      ? Math.min(100, Math.max(0, (currPrice - entryP) / (tpP - entryP) * 100))
                      : Math.min(100, Math.max(0, (entryP - currPrice) / (entryP - tpP) * 100))
                  ) : null

                  return (
                    <div key={t.trade_id} className="px-4 py-3 border-b border-[#1e2330] last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isLong ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'}`}>
                            {t.direction.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{t.instrument}</p>
                            <p className="text-xs text-slate-500">{t.strategy_name.replace(/_/g, ' ')}</p>
                          </div>
                        </div>

                        {/* Centre: live P&L */}
                        <div className="text-center">
                          {unrealPnl !== null ? (
                            <>
                              <p className={`text-base font-bold ${pnlColor}`}>
                                {unrealPnl >= 0 ? '+' : ''}{fmt$(unrealPnl)}
                              </p>
                              <p className={`text-xs ${pnlColor}`}>
                                {unrealPct !== null ? `${unrealPct >= 0 ? '+' : ''}${unrealPct.toFixed(2)}%` : ''}
                                {currPrice !== null ? ` · $${currPrice.toFixed(currPrice > 100 ? 2 : 4)}` : ''}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500">loading…</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            Entry ${entryP.toFixed(entryP > 100 ? 2 : 4)}
                          </p>
                        </div>

                        {/* Right: Close button */}
                        <CloseButton
                          tradeId={t.trade_id}
                          instrument={t.instrument}
                          unrealPnl={unrealPnl}
                          onClosed={load}
                        />
                      </div>

                      {/* SL/TP info + progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                          <span>SL ${slP.toFixed(slP > 100 ? 2 : 4)}</span>
                          {progress !== null && tpP && (
                            <span className={`font-semibold ${progress >= 50 ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {progress.toFixed(0)}% to TP
                            </span>
                          )}
                          {tpP
                            ? <span>TP ${tpP.toFixed(tpP > 100 ? 2 : 4)}</span>
                            : <span>Trailing stop</span>
                          }
                        </div>
                        {progress !== null && tpP && (
                          <div className="h-1.5 bg-[#2a2f3e] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${unrealPnl !== null && unrealPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.max(2, progress)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }) : <p className="text-sm text-slate-500 text-center py-6">No open positions</p>}
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
