import { useState, useEffect, useMemo, useRef } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter, X, RefreshCw, AlertCircle } from 'lucide-react'

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

// Try multiple free CORS-friendly sources
async function fetchCalendar(date: Date): Promise<NewsEvent[]> {
  const dateStr = format(date, 'yyyy-MM-dd')

  // Source 1: forexfactory via allorigins CORS proxy
  try {
    const ffUrl = `https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=${dateStr}`
    const res = await fetch(ffUrl, { cache: 'no-store' })
    if (res.ok) {
      const raw = await res.json() as Array<{
        title: string; country: string; date: string; time: string
        impact: string; forecast: string; previous: string; actual: string
      }>
      // FF dates come as "MM/DD/YYYY" or "YYYY-MM-DD" depending on version
      const dayEvents = raw.filter(e => {
        const d = e.date
        if (!d) return false
        // Handle both formats
        if (d.includes('/')) {
          const [mo, dy, yr] = d.split('/')
          return `${yr}-${mo.padStart(2,'0')}-${dy.padStart(2,'0')}` === dateStr
        }
        return d.startsWith(dateStr)
      })
      if (dayEvents.length > 0) {
        return dayEvents.map((e, i) => ({
          id: `ff-${i}`,
          time: e.time || 'All Day',
          currency: e.country?.toUpperCase() || '?',
          impact: (e.impact === 'High' ? 'high' : e.impact === 'Medium' ? 'medium' : 'low') as Impact,
          event: e.title,
          actual: e.actual || undefined,
          forecast: e.forecast || undefined,
          previous: e.previous || undefined,
        }))
      }
    }
  } catch {}

  // Source 2: tradingeconomics open calendar (no key needed for basic use)
  try {
    const teUrl = `https://api.tradingeconomics.com/calendar/country/all/${dateStr}/${dateStr}?c=guest:guest&f=json`
    const res = await fetch(teUrl, { cache: 'no-store' })
    if (res.ok) {
      const raw = await res.json() as Array<{
        Event: string; Country: string; Date: string; Time: string
        Importance: number; Actual: string; Forecast: string; Previous: string
      }>
      return raw.map((e, i) => ({
        id: `te-${i}`,
        time: e.Time?.slice(0, 5) || 'All Day',
        currency: e.Country?.slice(0, 3).toUpperCase() || '?',
        impact: (e.Importance >= 3 ? 'high' : e.Importance >= 2 ? 'medium' : 'low') as Impact,
        event: e.Event,
        actual: e.Actual || undefined,
        forecast: e.Forecast || undefined,
        previous: e.Previous || undefined,
      }))
    }
  } catch {}

  return []
}

export default function News() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(CURRENCIES)
  const [selectedImpacts, setSelectedImpacts] = useState<Impact[]>(['high', 'medium', 'low'])
  const [showFilters, setShowFilters] = useState(true)
  const [events, setEvents] = useState<NewsEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [apiDown, setApiDown] = useState(false)

  const loadEvents = async (date: Date) => {
    setLoading(true)
    setApiDown(false)
    const data = await fetchCalendar(date)
    setEvents(data)
    if (data.length === 0) setApiDown(true)
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

  const isSaturday = currentDate.getDay() === 6
  const isSunday = currentDate.getDay() === 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter panel */}
      {showFilters && (
        <div className="w-60 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-5 overflow-y-auto">
            {/* Date */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date</p>
              <input type="date" value={format(currentDate, 'yyyy-MM-dd')}
                onChange={e => {
                  const d = new Date(e.target.value + 'T12:00:00')
                  if (!isNaN(d.getTime())) setCurrentDate(d)
                }}
                className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400 mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Yesterday', date: subDays(new Date(), 1) },
                  { label: 'Today', date: new Date() },
                  { label: 'Tomorrow', date: addDays(new Date(), 1) },
                  { label: '+2 days', date: addDays(new Date(), 2) },
                ].map(q => (
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">News</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Economic calendar</p>
          </div>
          <div className="flex items-center gap-2">
            {!showFilters && (
              <button onClick={() => setShowFilters(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
            )}
            <button onClick={() => loadEvents(currentDate)} disabled={loading}
              className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentDate(d => subDays(d, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2 min-w-[200px] text-center">
                {format(currentDate, 'EEEE, MMM d yyyy')}
              </span>
              <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekend notice */}
        {(isSaturday || isSunday) && !loading && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Markets are closed on weekends — no economic events scheduled.
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="card overflow-hidden">
            {/* Header row */}
            <div className="grid text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800"
              style={{ gridTemplateColumns: '80px 100px 70px 1fr 90px 90px 90px' }}>
              <span>Time</span>
              <span>Currency</span>
              <span>Impact</span>
              <span>Event</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Forecast</span>
              <span className="text-right">Previous</span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <p className="text-sm">Fetching calendar...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center px-8">
                {apiDown && !isSaturday && !isSunday ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Calendar feed unavailable</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs">
                        The free ForexFactory feed only covers the current week and has rate limits.
                        Try today's date or use the embedded calendar below.
                      </p>
                    </div>
                    <button onClick={() => loadEvents(currentDate)} className="text-xs text-brand-500 hover:text-brand-600 underline">Try again</button>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No events match your filters for this date.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {filtered.map(event => (
                  <div key={event.id}
                    className="grid px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition items-center text-sm"
                    style={{ gridTemplateColumns: '80px 100px 70px 1fr 90px 90px 90px' }}>
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">{event.time}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{FLAG[event.currency] || '🌐'}</span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{event.currency}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${IMPACT_COLOR[event.impact]}`} />
                      <span className="text-xs text-gray-400 capitalize hidden xl:inline">{event.impact}</span>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 pr-4">{event.event}</span>
                    <span className={`text-right text-xs font-semibold ${
                      event.actual
                        ? event.forecast && parseFloat(event.actual) >= parseFloat(event.forecast)
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}>{event.actual || '—'}</span>
                    <span className="text-right text-xs text-gray-500 dark:text-gray-400">{event.forecast || '—'}</span>
                    <span className="text-right text-xs text-gray-500 dark:text-gray-400">{event.previous || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Embedded ForexFactory widget as reliable fallback */}
          <div className="mt-6">
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Full Calendar (ForexFactory)</p>
            <div className="card overflow-hidden" style={{ height: 400 }}>
              <iframe
                src="https://www.forexfactory.com/calendar"
                title="ForexFactory Calendar"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
