import { useState, useMemo, useEffect, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, getDay,
} from 'date-fns'
import {
  TrendingUp, TrendingDown, Target, Activity,
  ChevronLeft, ChevronRight, ArrowUpRight, PlusCircle, Plus,
  X, BookOpen, FileText, BarChart2, Newspaper, Leaf, NotebookPen, History,
  Layout, Sparkles, Clock, Pencil, Lock,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useIsDemo } from '@/hooks/useIsDemo'
import { useAppStore } from '@/store/appStore'
import type { DailyStat } from '@/types'
import AddTradeModal, { type ManualTrade } from '@/components/ui/AddTradeModal'
import { useNavigate } from 'react-router-dom'

// re-export type so Journal can import it too
export type { ManualTrade }

// ── Greeting helper ───────────────────────────────────────────────────────────
function getGreeting(name: string | undefined, isFirstTime: boolean): { headline: string; sub: string; emoji: string } {
  const hour = new Date().getHours()
  const first = name?.split(' ')[0] || 'Trader'
  let timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  if (isFirstTime) {
    return {
      emoji: '🎉',
      headline: `Welcome to TradeFlow, ${first}!`,
      sub: "You're all set. Take a quick tour to see what's here — it only takes 2 minutes.",
    }
  }
  const motivational = [
    'Discipline beats talent every single day.',
    'Every trade is a lesson. Every lesson is progress.',
    'The best traders are the ones who never stop learning.',
    'Consistency is a process, not an event.',
    'One good trade at a time.',
    'Your edge only works if you follow it.',
    'Patience is a strategy.',
  ]
  const msg = motivational[new Date().getDay() % motivational.length]
  return {
    emoji: hour < 12 ? '☀️' : hour < 17 ? '📈' : '🌙',
    headline: `${timeGreet}, ${first}`,
    sub: msg,
  }
}

// ── Feature Tour ──────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  { icon: BarChart2,   path: '/app/trading',   color: 'bg-brand-500',   title: 'Trading',            desc: 'Live TradingView chart with demo account, multi-layout, price alerts and watchlist.' },
  { icon: History,     path: '/app/replay',    color: 'bg-purple-500',  title: 'Chart Replay',       desc: 'Replay real historical data for any global stock, forex or crypto — bar by bar.' },
  { icon: FileText,    path: '/app/journal',   color: 'bg-emerald-600', title: 'Journal',            desc: 'Log every trade with emotion tracking. Post-trade popup appears automatically.' },
  { icon: BookOpen,    path: '/app/edge',      color: 'bg-blue-600',    title: 'Edge Plans',         desc: 'Build your trading playbook with entry criteria, steps and invalidation rules.' },
  { icon: NotebookPen, path: '/app/notebook',  color: 'bg-pink-600',    title: 'Notebook',           desc: 'Notes, templates and reviews. Use built-in templates like Daily Review and Pre-Market Prep.' },
  { icon: Newspaper,   path: '/app/news',      color: 'bg-orange-600',  title: 'News',               desc: 'Economic calendar with currency and impact filters. Never be surprised by news again.' },
  { icon: Leaf,        path: '/app/sanctuary', color: 'bg-teal-600',    title: 'Sanctuary',          desc: 'Meditation timer with ambient sounds. Build focus and discipline before every session.' },
]

function FeatureTour({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const current = TOUR_STEPS[step]
  const Icon = current.icon
  const isLast = step === TOUR_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div className="h-1 bg-brand-500 transition-all duration-300"
            style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>
        <div className="p-7">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-gray-400">{step + 1} of {TOUR_STEPS.length}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={`w-14 h-14 rounded-2xl ${current.color} flex items-center justify-center mb-5`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{current.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">{current.desc}</p>
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-7">
            {TOUR_STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`rounded-full transition-all ${i === step ? 'w-5 h-1.5 bg-brand-500' : i < step ? 'w-1.5 h-1.5 bg-brand-300 dark:bg-brand-700' : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                ← Back
              </button>
            )}
            <button onClick={() => { if (isLast) onClose(); else setStep(s => s + 1) }}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">
              {isLast ? '✓ Done' : 'Next →'}
            </button>
          </div>
          {/* "Open section" as a small link below, not a button that navigates and closes */}
          <button onClick={() => { navigate(current.path); onClose() }}
            className="w-full text-center text-xs text-brand-500 hover:text-brand-600 mt-3 transition underline underline-offset-2">
            Open {current.title} now
          </button>
          {!isLast && (
            <button onClick={onClose} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1.5 transition">
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const DEMO_TRADES: DailyStat[] = [
  { date: '2026-06-01', pnl: 1240, trades: 2, wins: 2, losses: 0, win_rate: 100, avg_r: 1.8 },
  { date: '2026-06-03', pnl: -680, trades: 1, wins: 0, losses: 1, win_rate: 0, avg_r: -1.2 },
  { date: '2026-06-04', pnl: 2100, trades: 3, wins: 2, losses: 1, win_rate: 67, avg_r: 1.4 },
  { date: '2026-06-07', pnl: 890, trades: 1, wins: 1, losses: 0, win_rate: 100, avg_r: 2.1 },
  { date: '2026-06-09', pnl: -420, trades: 2, wins: 1, losses: 1, win_rate: 50, avg_r: -0.3 },
  { date: '2026-06-10', pnl: 3200, trades: 2, wins: 2, losses: 0, win_rate: 100, avg_r: 3.2 },
  { date: '2026-06-12', pnl: 760, trades: 1, wins: 1, losses: 0, win_rate: 100, avg_r: 1.6 },
  { date: '2026-06-14', pnl: -1100, trades: 2, wins: 0, losses: 2, win_rate: 0, avg_r: -1.5 },
  { date: '2026-06-17', pnl: 1850, trades: 3, wins: 2, losses: 1, win_rate: 67, avg_r: 1.9 },
  { date: '2026-06-18', pnl: 2400, trades: 2, wins: 2, losses: 0, win_rate: 100, avg_r: 2.8 },
  { date: '2026-06-19', pnl: -330, trades: 1, wins: 0, losses: 1, win_rate: 0, avg_r: -0.8 },
  { date: '2026-06-21', pnl: 1620, trades: 2, wins: 2, losses: 0, win_rate: 100, avg_r: 2.0 },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StatCard({ label, value, sub, icon: Icon, trend, empty }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral'; empty?: boolean
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-brand-500" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${empty ? 'text-gray-300 dark:text-gray-700' : trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function EmptyEquity() {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-2">
      <TrendingUp className="w-8 h-8 text-gray-200 dark:text-gray-700" />
      <p className="text-xs text-gray-400">Your equity curve will appear here</p>
    </div>
  )
}

// ── Multi-Chart Analysis Widget ───────────────────────────────────────────────
const CHART_SYMBOLS = ['EURUSD','GBPUSD','XAUUSD','BTCUSD','AAPL','NVDA','SPX500','USDJPY','GBPJPY','NZDUSD','ETHUSD','MSFT']

const LS_KEY = 'tf-multicharts-symbols'

function loadSavedSymbols(fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return fallback
}

function TVMiniChart({ symbol, theme }: { symbol: string; theme: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    s.async = true
    s.innerHTML = JSON.stringify({
      symbol: symbol === 'XAUUSD' ? 'TVC:GOLD' : symbol === 'SPX500' ? 'SP:SPX' : symbol.includes('USD') && !symbol.startsWith('USD') ? `FX:${symbol}` : symbol,
      width: '100%', height: '100%',
      locale: 'en',
      dateRange: '1D',
      colorTheme: theme,
      isTransparent: false,
      autosize: true,
      largeChartUrl: '',
    })
    ref.current.appendChild(s)
    return () => { if (ref.current) ref.current.innerHTML = '' }
  }, [symbol, theme])
  return <div ref={ref} className="w-full h-full tradingview-widget-container" />
}

function MultiChartWidget() {
  const { theme, userPlan } = useAppStore()
  const isDark = theme === 'dark'
  const isPro = userPlan === 'pro' || userPlan === 'admin'
  const maxCharts = isPro ? 4 : 2

  const defaultSymbols = ['EURUSD', 'XAUUSD', 'BTCUSD', 'AAPL']

  const [symbols, setSymbols] = useState<string[]>(() => {
    const saved = loadSavedSymbols(defaultSymbols)
    // Clamp to maxCharts on load; we'll handle upgrades dynamically
    return saved.slice(0, 4)
  })
  const [activeCount, setActiveCount] = useState<2|4>(() => {
    const saved = loadSavedSymbols(defaultSymbols)
    return (isPro && saved.length === 4) ? 4 : 2
  })
  const [editIdx, setEditIdx] = useState<number|null>(null)
  const [editVal, setEditVal] = useState('')
  const [upgradeNudge, setUpgradeNudge] = useState(false)

  const layout = Math.min(activeCount, maxCharts) as 2|4
  const shown = symbols.slice(0, layout)

  // Persist symbol choices whenever they change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(symbols))
  }, [symbols])

  const updateSymbol = (idx: number, sym: string) => {
    setSymbols(p => { const n = [...p]; n[idx] = sym.toUpperCase(); return n })
    setEditIdx(null)
  }

  const handleLayoutChange = (n: 2|4) => {
    if (n === 4 && !isPro) {
      setUpgradeNudge(true)
      setTimeout(() => setUpgradeNudge(false), 4000)
      return
    }
    setActiveCount(n)
    setUpgradeNudge(false)
  }

  const gridCls = layout === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-2 grid-rows-2'

  return (
    <div className="mt-6 card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Multi-Chart Analysis</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">Layout:</span>
          {([2, 4] as const).map(n => (
            <button key={n} onClick={() => handleLayoutChange(n)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded font-medium transition ${layout === n ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {n === 4 && !isPro && <Lock className="w-2.5 h-2.5"/>}
              {n === 2 ? '2 charts' : '4 charts'}
            </button>
          ))}
        </div>
      </div>

      {/* Upgrade nudge */}
      {upgradeNudge && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0"/>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Upgrade to <strong>Edge Pro</strong> to unlock 4 simultaneous charts.
          </p>
          <a href="/#pricing" className="ml-auto text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0">Upgrade →</a>
        </div>
      )}

      <div className={`grid gap-px bg-gray-100 dark:bg-gray-800 ${gridCls}`} style={{ height: layout === 2 ? 280 : 480 }}>
        {shown.map((sym, i) => (
          <div key={`${sym}-${i}`} className="relative bg-white dark:bg-[#141414]">
            <TVMiniChart symbol={sym} theme={isDark ? 'dark' : 'light'} />

            {/* Edit overlay */}
            {editIdx === i ? (
              <div className="absolute top-1 left-1 z-20 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[160px]">
                <input autoFocus value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { updateSymbol(i, editVal) }
                    if (e.key === 'Escape') { setEditIdx(null) }
                  }}
                  placeholder="e.g. GBPUSD"
                  className="text-[11px] px-2 py-1.5 rounded border border-brand-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full focus:outline-none mb-1.5"
                />
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {CHART_SYMBOLS.map(s => (
                    <button key={s} onClick={() => updateSymbol(i, s)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition">
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => updateSymbol(i, editVal)}
                    className="flex-1 text-[10px] px-2 py-1 bg-brand-500 text-white rounded font-medium">
                    Apply
                  </button>
                  <button onClick={() => { setEditIdx(null) }}
                    className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Always-visible pencil edit button */
              <button onClick={() => { setEditVal(sym); setEditIdx(i) }}
                className="absolute top-1 right-1 z-20 flex items-center gap-0.5 px-1.5 py-1 bg-black/40 hover:bg-black/60 text-white text-[10px] rounded transition"
                title={`Edit chart ${i + 1}`}>
                <Pencil className="w-2.5 h-2.5"/>
                <span>{sym}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-400">
          {isPro ? 'Up to 4 charts · symbols saved' : `Free: 2 charts · `}
          {!isPro && <a href="/#pricing" className="text-brand-500 hover:underline">Upgrade for 4</a>}
        </span>
      </div>
    </div>
  )
}

// ── Pro Free Limited-Time Banner ──────────────────────────────────────────────
const PRO_FREE_UNTIL = new Date('2026-09-30') // update when ready to charge

function ProFreeBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('tf-pro-banner-dismissed') === '1')
  if (dismissed) return null

  const daysLeft = Math.max(0, Math.ceil((PRO_FREE_UNTIL.getTime() - Date.now()) / 86400000))

  return (
    <div className="mt-6 rounded-2xl bg-gradient-to-r from-brand-500 via-purple-600 to-brand-600 p-px shadow-xl shadow-brand-500/20">
      <div className="rounded-2xl bg-white dark:bg-[#0f0f0f] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 dark:text-white text-sm">All Pro features are FREE right now</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-700">
                EARLY ACCESS
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysLeft > 0
                ? `${daysLeft} days remaining — AI coach, unlimited journal, prop simulator and more. No card needed.`
                : 'Early access period has ended. Upgrade to keep Pro features.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="#pricing" onClick={() => { localStorage.setItem('tf-pro-banner-dismissed','1'); setDismissed(true) }}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition shadow-sm">
            Learn about Pro →
          </a>
          <button onClick={() => { localStorage.setItem('tf-pro-banner-dismissed','1'); setDismissed(true) }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const isDemo = useIsDemo()
  const user = useAppStore((s) => s.user)
  const { setShowTutorial, addLocalTrade, localTrades, seenTutorial } = useAppStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [greetingDismissed, setGreetingDismissed] = useState(false)

  const isFirstTime = !isDemo && user && !seenTutorial[user.id]

  // Auto-show tour for first-time real users
  useEffect(() => {
    if (isFirstTime && !isDemo) {
      const t = setTimeout(() => setShowTour(true), 800)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line

  const handleAddTrade = (t: ManualTrade) => {
    addLocalTrade(t)
  }

  const baseTrades = isDemo ? DEMO_TRADES : []
  const manualStats = localTrades.reduce((acc, t) => {
    const existing = acc.find(d => d.date === t.date)
    if (existing) {
      existing.pnl += t.pnl; existing.trades += 1
      if (t.pnl > 0) existing.wins += 1; else existing.losses += 1
      existing.win_rate = Math.round((existing.wins / existing.trades) * 100)
    } else {
      acc.push({ date: t.date, pnl: t.pnl, trades: 1, wins: t.pnl > 0 ? 1 : 0, losses: t.pnl < 0 ? 1 : 0, win_rate: t.pnl > 0 ? 100 : 0, avg_r: 0 })
    }
    return acc
  }, [] as DailyStat[])

  const trades = isDemo ? baseTrades : manualStats
  const balance = isDemo ? 52480 : localTrades.reduce((s, t) => s + t.pnl, 0)
  const startBalance = isDemo ? 45000 : 0

  const statsMap = useMemo(() => {
    const m: Record<string, DailyStat> = {}
    trades.forEach(d => { m[d.date] = d })
    return m
  }, [trades])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    const dow = getDay(start) === 0 ? 6 : getDay(start) - 1
    return [...Array(dow).fill(null), ...days]
  }, [currentMonth])

  const monthStats = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    const monthData = trades.filter(d => d.date.startsWith(monthStr))
    const totalPnl = monthData.reduce((s, d) => s + d.pnl, 0)
    const totalTrades = monthData.reduce((s, d) => s + d.trades, 0)
    const totalWins = monthData.reduce((s, d) => s + d.wins, 0)
    const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0
    const avgR = totalTrades > 0 ? (monthData.reduce((s, d) => s + d.avg_r * d.trades, 0) / totalTrades).toFixed(2) : '0'
    return { totalPnl, totalTrades, winRate, avgR }
  }, [trades, currentMonth])

  const equityData = useMemo(() => {
    let bal = startBalance
    return trades.map(d => {
      bal += d.pnl
      return { date: format(new Date(d.date), 'MMM d'), balance: bal }
    })
  }, [trades, startBalance])

  const noTrades = trades.length === 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showAddTrade && <AddTradeModal onSave={handleAddTrade} onClose={() => setShowAddTrade(false)} />}
      {showTour && <FeatureTour onClose={() => { setShowTour(false); setShowTutorial(false) }} />}

      {/* ── Welcome / Motivational banner ── */}
      {!greetingDismissed && !isDemo && (() => {
        const g = getGreeting(user?.full_name, !!isFirstTime)
        return (
          <div className={`relative mb-6 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 ${isFirstTime ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/20' : 'bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{g.emoji}</span>
              <div>
                <p className={`font-bold text-sm ${isFirstTime ? 'text-white' : 'text-brand-700 dark:text-brand-300'}`}>{g.headline}</p>
                <p className={`text-xs mt-0.5 ${isFirstTime ? 'text-white/80' : 'text-brand-500 dark:text-brand-400'}`}>{g.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isFirstTime && (
                <button onClick={() => setShowTour(true)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition">
                  Take the tour →
                </button>
              )}
              <button onClick={() => setGreetingDismissed(true)}
                className={`p-1 rounded transition ${isFirstTime ? 'text-white/60 hover:text-white' : 'text-brand-400 hover:text-brand-600'}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })()}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isDemo ? 'Demo account — sample data' : `Welcome back, ${user?.full_name?.split(' ')[0] || 'Trader'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isDemo && (
            <button onClick={() => setShowAddTrade(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Trade
            </button>
          )}
          {!isDemo && (
            <button onClick={() => setShowTutorial(true)} className="text-xs text-brand-500 hover:text-brand-600 transition">
              View tutorial
            </button>
          )}
        </div>
      </div>

      {/* Empty state banner for real users */}
      {!isDemo && noTrades && (
        <div className="card p-5 mb-6 border-dashed border-2 border-brand-200 dark:border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
            <PlusCircle className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No trades yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Head to the <strong>Trading</strong> page to log your first trade. Your stats, calendar and equity curve will populate automatically.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Account Balance" value={noTrades ? '—' : formatCurrency(balance)} sub="Live account" icon={Activity} empty={noTrades} />
        <StatCard label="Total P&L" value={noTrades ? '—' : formatCurrency(monthStats.totalPnl)} sub="This month" icon={monthStats.totalPnl >= 0 ? TrendingUp : TrendingDown} trend={noTrades ? 'neutral' : monthStats.totalPnl >= 0 ? 'up' : 'down'} empty={noTrades} />
        <StatCard label="Win Rate" value={noTrades ? '—' : `${monthStats.winRate}%`} sub={noTrades ? 'No trades' : `${monthStats.totalTrades} trades`} icon={Target} trend={noTrades ? 'neutral' : monthStats.winRate >= 50 ? 'up' : 'down'} empty={noTrades} />
        <StatCard label="Avg R Per Trade" value={noTrades ? '—' : `${monthStats.avgR}R`} sub="This month" icon={ArrowUpRight} trend={noTrades ? 'neutral' : parseFloat(monthStats.avgR) > 0 ? 'up' : 'down'} empty={noTrades} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">Today</button>
              <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />
              const dateStr = format(day, 'yyyy-MM-dd')
              const stat = statsMap[dateStr]
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)
              return (
                <div key={dateStr} className={`relative rounded-lg p-1.5 min-h-[56px] border transition cursor-pointer
                  ${today ? 'border-brand-400 dark:border-brand-500' : 'border-transparent'}
                  ${stat ? stat.pnl > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                  ${!inMonth ? 'opacity-30' : ''}`}
                >
                  <span className={`text-[11px] font-medium ${today ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {stat && (
                    <div className="mt-0.5">
                      <p className={`text-[10px] font-semibold leading-tight ${stat.pnl > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {stat.pnl > 0 ? '+' : ''}{formatCurrency(stat.pnl)}
                      </p>
                      <p className="text-[9px] text-gray-400 leading-tight">{stat.trades}T · {stat.win_rate}%</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Equity + summary */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Equity Curve</h2>
          {noTrades ? <EmptyEquity /> : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#fff', border: 'none', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Balance']} />
                  <Area type="monotone" dataKey="balance" stroke="#7c3aed" strokeWidth={2} fill="url(#eq)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            {[
              { label: 'Total trades', value: noTrades ? '—' : monthStats.totalTrades },
              { label: 'Win rate', value: noTrades ? '—' : `${monthStats.winRate}%`, green: !noTrades },
              { label: 'Net P&L', value: noTrades ? '—' : `${monthStats.totalPnl >= 0 ? '+' : ''}${formatCurrency(monthStats.totalPnl)}`, colored: !noTrades, positive: monthStats.totalPnl >= 0 },
              { label: 'Avg R', value: noTrades ? '—' : `${monthStats.avgR}R` },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                <span className={`font-medium ${row.colored ? row.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' : row.green ? 'text-emerald-600 dark:text-emerald-400' : noTrades ? 'text-gray-300 dark:text-gray-700' : 'text-gray-900 dark:text-white'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Multi-Chart Analysis ── */}
      <MultiChartWidget />

      {/* ── Pro Free Banner ── */}
      <ProFreeBanner />
    </div>
  )
}
