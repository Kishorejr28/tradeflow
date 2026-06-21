import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, getDay,
} from 'date-fns'
import {
  TrendingUp, TrendingDown, Target, Activity,
  ChevronLeft, ChevronRight, ArrowUpRight, PlusCircle, Plus,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useIsDemo } from '@/hooks/useIsDemo'
import { useAppStore } from '@/store/appStore'
import type { DailyStat } from '@/types'
import AddTradeModal, { type ManualTrade } from '@/components/ui/AddTradeModal'

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

export default function Dashboard() {
  const isDemo = useIsDemo()
  const user = useAppStore((s) => s.user)
  const { setShowTutorial } = useAppStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [manualTrades, setManualTrades] = useState<DailyStat[]>([])

  const handleAddTrade = (t: ManualTrade) => {
    const existing = manualTrades.find(m => m.date === t.date)
    if (existing) {
      setManualTrades(prev => prev.map(m => m.date === t.date ? {
        ...m, pnl: m.pnl + t.pnl, trades: m.trades + 1,
        wins: t.pnl > 0 ? m.wins + 1 : m.wins,
        losses: t.pnl < 0 ? m.losses + 1 : m.losses,
        win_rate: Math.round(((t.pnl > 0 ? m.wins + 1 : m.wins) / (m.trades + 1)) * 100),
        avg_r: 0,
      } : m))
    } else {
      setManualTrades(prev => [...prev, {
        date: t.date, pnl: t.pnl, trades: 1,
        wins: t.pnl > 0 ? 1 : 0, losses: t.pnl < 0 ? 1 : 0,
        win_rate: t.pnl > 0 ? 100 : 0, avg_r: 0,
      }])
    }
  }

  const baseTrades = isDemo ? DEMO_TRADES : []
  const trades = [...baseTrades, ...(!isDemo ? manualTrades : [])]
  const balance = isDemo ? 52480 : manualTrades.reduce((s, t) => s + t.pnl, 0)
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
    </div>
  )
}
