import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Mic, FileText } from 'lucide-react'
import { useIsDemo } from '@/hooks/useIsDemo'

const EMOTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😩', label: 'Tired' },
  { emoji: '🏆', label: 'Confident' },
]

const DEMO_ENTRIES = [
  { date: '2026-06-10', symbol: 'EURUSD', direction: 'long', pnl: 3200, planFollowed: true, emotion: 'Confident', note: 'Clean breakout, waited for confirmation.' },
  { date: '2026-06-14', symbol: 'GBPUSD', direction: 'short', pnl: -1100, planFollowed: false, emotion: 'Frustrated', note: 'Revenge traded after morning loss. Against the plan.' },
  { date: '2026-06-18', symbol: 'EURUSD', direction: 'long', pnl: 2400, planFollowed: true, emotion: 'Happy', note: 'Perfect entry at H4 POI.' },
]

interface PostTradeModal {
  symbol: string
  pnl: number
  grossPnl: number
}

function PostTradePopup({ trade, onClose }: { trade: PostTradeModal; onClose: () => void }) {
  const [emotion, setEmotion] = useState('')
  const [planFollowed, setPlanFollowed] = useState(false)
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">Closed P&L</span>
              <span className={`text-lg font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Gross P&L</span>
              <span className="text-xs text-gray-500">${trade.grossPnl.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
          {trade.symbol} trade closed.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">How do you feel right now?</p>

        <div className="flex gap-2 mb-5">
          {EMOTIONS.map(e => (
            <button
              key={e.label}
              onClick={() => setEmotion(e.label)}
              className={`text-xl p-1.5 rounded-lg transition hover:scale-110 ${emotion === e.label ? 'bg-brand-100 dark:bg-brand-500/20 ring-2 ring-brand-400' : ''}`}
              title={e.label}
            >
              {e.emoji}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={planFollowed}
            onChange={e => setPlanFollowed(e.target.checked)}
            className="w-4 h-4 accent-brand-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">I followed my trade plan</span>
        </label>

        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Add a note or voice reflection</p>
          <div className="relative">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button className="absolute bottom-2.5 right-2.5 text-gray-400 hover:text-brand-500 transition">
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Go To Journal
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Journal() {
  const isDemo = useIsDemo()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showDemo, setShowDemo] = useState(false)
  const [selected, setSelected] = useState<typeof DEMO_ENTRIES[0] | null>(null)

  const entries = isDemo ? DEMO_ENTRIES : []
  const calendarDays = (() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    const dow = getDay(start) === 0 ? 6 : getDay(start) - 1
    return [...Array(dow).fill(null), ...days]
  })()

  const entryMap = entries.reduce((m, e) => { m[e.date] = e; return m }, {} as Record<string, typeof DEMO_ENTRIES[0]>)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {showDemo && (
        <PostTradePopup
          trade={{ symbol: 'EURUSD', pnl: -698.75, grossPnl: -350 }}
          onClose={() => setShowDemo(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Review your trades, emotions, and patterns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDemo(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Preview post-trade popup
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">Today</button>
              <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
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
              const ds = format(day, 'yyyy-MM-dd')
              const entry = entryMap[ds]
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)
              return (
                <div
                  key={ds}
                  onClick={() => entry && setSelected(entry)}
                  className={`rounded-lg p-1.5 min-h-[64px] border transition cursor-pointer
                    ${today ? 'border-brand-400 dark:border-brand-500' : 'border-transparent'}
                    ${entry ? entry.pnl > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                    ${!inMonth ? 'opacity-30' : ''}
                  `}
                >
                  <span className={`text-[11px] font-medium ${today ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {entry && (
                    <div className="mt-0.5">
                      <p className={`text-[10px] font-semibold ${entry.pnl > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {entry.pnl > 0 ? '+' : ''}${entry.pnl.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-gray-400">{entry.symbol}</p>
                      {!entry.planFollowed && <p className="text-[9px] text-orange-400">Off-plan</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selected ? (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{format(new Date(selected.date), 'MMM d, yyyy')}</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Symbol</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selected.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Direction</span>
                  <span className={`font-medium capitalize ${selected.direction === 'long' ? 'text-emerald-600' : 'text-red-500'}`}>{selected.direction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">P&L</span>
                  <span className={`font-bold ${selected.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {selected.pnl >= 0 ? '+' : ''}${selected.pnl.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan followed</span>
                  <span className={selected.planFollowed ? 'text-emerald-600' : 'text-orange-500'}>{selected.planFollowed ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Emotion</span>
                  <span className="text-gray-900 dark:text-white">{selected.emotion}</span>
                </div>
                {selected.note && (
                  <div>
                    <p className="text-gray-500 mb-1">Note</p>
                    <p className="text-gray-700 dark:text-gray-300 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">{selected.note}</p>
                  </div>
                )}
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="card p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No journal entries yet</p>
                <p className="text-xs text-gray-400 mt-1">After closing a trade, a popup will appear asking how you felt and whether you followed your plan.</p>
              </div>
            </div>
          ) : (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Monthly Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total trades</span><span className="font-medium text-gray-900 dark:text-white">{entries.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Wins</span><span className="text-emerald-600 font-medium">{entries.filter(e => e.pnl > 0).length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Losses</span><span className="text-red-500 font-medium">{entries.filter(e => e.pnl < 0).length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Plan followed</span><span className="text-emerald-600 font-medium">{entries.filter(e => e.planFollowed).length}/{entries.length}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Net P&L</span>
                  <span className="font-bold text-emerald-600">+${entries.reduce((s, e) => s + e.pnl, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent entries */}
          {entries.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Trades</h3>
              <div className="space-y-2">
                {entries.slice().reverse().map((e, i) => (
                  <button key={i} onClick={() => setSelected(e)} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.symbol}</p>
                      <p className="text-xs text-gray-400">{format(new Date(e.date), 'MMM d')} · {e.emotion}</p>
                    </div>
                    <span className={`text-sm font-semibold ${e.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {e.pnl >= 0 ? '+' : ''}${e.pnl.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
