import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, getDay, startOfWeek, addDays
} from 'date-fns'
import {
  TrendingUp, TrendingDown, Target, Activity,
  ChevronLeft, ChevronRight, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import type { DailyStat } from '@/types'

// Demo data — replaced by real Supabase data later
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

const DEMO_BALANCE = 52480
const DEMO_START_BALANCE = 45000

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StatCard({
  label, value, sub, icon: Icon, trend
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-brand-500" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const statsMap = useMemo(() => {
    const m: Record<string, DailyStat> = {}
    DEMO_TRADES.forEach(d => { m[d.date] = d })
    return m
  }, [])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    // pad front
    const dow = getDay(start) === 0 ? 6 : getDay(start) - 1
    const padded = Array(dow).fill(null)
    return [...padded, ...days]
  }, [currentMonth])

  const monthStats = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    const monthData = DEMO_TRADES.filter(d => d.date.startsWith(monthStr))
    const totalPnl = monthData.reduce((s, d) => s + d.pnl, 0)
    const totalTrades = monthData.reduce((s, d) => s + d.trades, 0)
    const totalWins = monthData.reduce((s, d) => s + d.wins, 0)
    const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0
    const avgR = totalTrades > 0 ? (monthData.reduce((s, d) => s + d.avg_r * d.trades, 0) / totalTrades).toFixed(2) : '0'
    return { totalPnl, totalTrades, winRate, avgR }
  }, [currentMonth])

  // Equity curve
  const equityData = useMemo(() => {
    let balance = DEMO_START_BALANCE
    return DEMO_TRADES.map(d => {
      balance += d.pnl
      return { date: format(new Date(d.date), 'MMM d'), balance }
    })
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your trading performance at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Account Balance"
          value={formatCurrency(DEMO_BALANCE)}
          sub="Live account"
          icon={Activity}
        />
        <StatCard
          label="Total P&L"
          value={formatCurrency(monthStats.totalPnl)}
          sub="This month"
          icon={monthStats.totalPnl >= 0 ? TrendingUp : TrendingDown}
          trend={monthStats.totalPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Win Rate"
          value={`${monthStats.winRate}%`}
          sub={`${monthStats.totalTrades} trades`}
          icon={Target}
          trend={monthStats.winRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          label="Avg R Per Trade"
          value={`${monthStats.avgR}R`}
          sub="This month"
          icon={ArrowUpRight}
          trend={parseFloat(monthStats.avgR) > 0 ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />
              const dateStr = format(day, 'yyyy-MM-dd')
              const stat = statsMap[dateStr]
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)

              return (
                <div
                  key={dateStr}
                  className={`relative rounded-lg p-1.5 min-h-[56px] border transition
                    ${today ? 'border-brand-400 dark:border-brand-500' : 'border-transparent'}
                    ${stat
                      ? stat.pnl > 0
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }
                    ${!inMonth ? 'opacity-30' : ''}
                    cursor-pointer
                  `}
                >
                  <span className={`text-[11px] font-medium ${today ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {stat && (
                    <div className="mt-0.5">
                      <p className={`text-[10px] font-semibold leading-tight ${stat.pnl > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {stat.pnl > 0 ? '+' : ''}{formatCurrency(stat.pnl)}
                      </p>
                      <p className="text-[9px] text-gray-400 leading-tight">
                        {stat.trades}T · {stat.win_rate}%
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Equity curve */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Equity Curve</h2>
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
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card, #fff)', border: 'none', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), 'Balance']}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#eq)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total trades</span>
              <span className="font-medium text-gray-900 dark:text-white">{monthStats.totalTrades}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Win rate</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{monthStats.winRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Net P&L</span>
              <span className={`font-medium ${monthStats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {monthStats.totalPnl >= 0 ? '+' : ''}{formatCurrency(monthStats.totalPnl)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Avg R</span>
              <span className="font-medium text-gray-900 dark:text-white">{monthStats.avgR}R</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
