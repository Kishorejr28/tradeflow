import { useState, useEffect, useMemo } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter, X, RefreshCw } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY']
const IMPACTS = ['high', 'medium', 'low'] as const
type Impact = typeof IMPACTS[number]

interface NewsEvent {
  id: string
  time: string
  currency: string
  impact: Impact
  event: string
  actual?: string
  forecast?: string
  previous?: string
}

const IMPACT_COLOR: Record<Impact, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300 dark:bg-gray-600',
}

const FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳',
}

// Free CORS-friendly calendar via allorigins proxy of investing.com calendar API
// Fallback: tradingeconomics-style public endpoint
async function fetchCalendar(date: Date): Promise<NewsEvent[]> {
  const dateStr = format(date, 'yyyy-MM-dd')
  try {
    const url = `https://nfs.faireconomy.media/ff_calendar_thisweek.json`
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const raw = await res.json() as Array<{
      title: string; country: string; date: string; time: string
      impact: string; forecast: string; previous: string; actual: string
    }>
    // filter to selected date
    const dayEvents = raw.filter(e => e.date === dateStr || e.date.startsWith(dateStr))
    return dayEvents.map((e, i) => ({
      id: String(i),
      time: e.time || '00:00',
      currency: e.country?.toUpperCase() || '?',
      impact: (e.impact === 'High' ? 'high' : e.impact === 'Medium' ? 'medium' : 'low') as Impact,
      event: e.title,
      actual: e.actual || undefined,
      forecast: e.forecast || undefined,
      previous: e.previous || undefined,
    }))
  } catch {
    return []
  }
}

export default function News() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(CURRENCIES)
  const [selectedImpacts, setSelectedImpacts] = useState<Impact[]>(['high', 'medium', 'low'])
  const [showFilters, setShowFilters] = useState(true)
  const [events, setEvents] = useState<NewsEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadEvents = async (date: Date) => {
    setLoading(true)
    setError('')
    const data = await fetchCalendar(date)
    if (data.length === 0) {
      setError('No events found for this date, or the calendar service is unavailable.')
    }
    setEvents(data)
    setLoading(false)
  }

  useEffect(() => { loadEvents(currentDate) }, [currentDate.toDateString()])

  const filtered = useMemo(() =>
    events
      .filter(e => selectedCurrencies.includes(e.currency) && selectedImpacts.includes(e.impact))
      .sort((a, b) => a.time.localeCompare(b.time)),
    [events, selectedCurrencies, selectedImpacts]
  )

  const toggleCurrency = (c: string) =>
    setSelectedCurrencies(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  const toggleImpact = (i: Impact) =>
    setSelectedImpacts(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])

  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'Yesterday', date: subDays(new Date(), 1) },
  ]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter panel */}
      {showFilters && (
        <div className="w-60 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-5 overflow-y-auto">
            {/* Date */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date</p>
              <input type="date" value={format(currentDate, 'yyyy-MM-dd')}
                onChange={e => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setCurrentDate(d) }}
                className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400 mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {quickDates.map(q => (
                  <button key={q.label} onClick={() => setCurrentDate(q.date)}
                    className="text-[11px] px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 hover:text-brand-600 dark:hover:text-brand-400 transition">
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Currencies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Currencies</p>
                <button onClick={() => setSelectedCurrencies(selectedCurrencies.length === CURRENCIES.length ? [] : [...CURRENCIES])}
                  className="text-[10px] text-brand-500 hover:text-brand-600">
                  {selectedCurrencies.length === CURRENCIES.length ? 'Clear' : 'All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CURRENCIES.map(c => (
                  <button key={c} onClick={() => toggleCurrency(c)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition border ${
                      selectedCurrencies.includes(c)
                        ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                    <span>{FLAG[c]}</span>{c}
                  </button>
                ))}
              </div>
            </div>

            {/* Impact */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Impact</p>
              <div className="space-y-1.5">
                {IMPACTS.map(i => (
                  <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={selectedImpacts.includes(i)} onChange={() => toggleImpact(i)} className="accent-brand-500 w-3.5 h-3.5" />
                    <span className={`w-2.5 h-2.5 rounded-full ${IMPACT_COLOR[i]}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{i}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">News</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Live economic calendar</p>
          </div>
          <div className="flex items-center gap-2">
            {!showFilters && (
              <button onClick={() => setShowFilters(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
            )}
            <button onClick={() => loadEvents(currentDate)} disabled={loading} className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentDate(d => subDays(d, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1 min-w-[180px] text-center">
                {format(currentDate, 'EEEE, MMM d yyyy')}
              </span>
              <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-6 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <span>Time</span><span>Currency</span><span>Impact</span>
            <span className="col-span-2">Event</span>
            <span className="text-right grid grid-cols-3 gap-2 text-[10px]">
              <span>Actual</span><span>Forecast</span><span>Previous</span>
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-sm">Loading calendar...</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400 text-center px-8">
              <p className="text-sm">{error}</p>
              <p className="text-xs text-gray-300 dark:text-gray-600">The ForexFactory calendar API may be unavailable or this day has no events. Try another date.</p>
              <button onClick={() => loadEvents(currentDate)} className="text-xs text-brand-500 hover:text-brand-600 underline">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No events match your filters for this date.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {filtered.map(event => (
                <div key={event.id} className="grid grid-cols-6 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{event.time}</span>
                  <div className="flex items-center gap-1.5">
                    <span>{FLAG[event.currency] || '🌐'}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{event.currency}</span>
                  </div>
                  <div><span className={`w-2.5 h-2.5 rounded-full inline-block ${IMPACT_COLOR[event.impact]}`} /></div>
                  <span className="col-span-2 text-sm text-gray-800 dark:text-gray-200">{event.event}</span>
                  <div className="grid grid-cols-3 gap-2 text-right text-xs">
                    <span className={event.actual ? (event.forecast && parseFloat(event.actual) >= parseFloat(event.forecast) ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold') : 'text-gray-300 dark:text-gray-600'}>
                      {event.actual || '—'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{event.forecast || '—'}</span>
                    <span className="text-gray-500 dark:text-gray-400">{event.previous || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
