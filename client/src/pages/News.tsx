import { useState, useMemo } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'

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

const DEMO_EVENTS: NewsEvent[] = [
  { id: '1', time: '08:30', currency: 'USD', impact: 'high', event: 'Non-Farm Payrolls', actual: '177K', forecast: '185K', previous: '228K' },
  { id: '2', time: '08:30', currency: 'USD', impact: 'high', event: 'Unemployment Rate', actual: '4.2%', forecast: '4.2%', previous: '4.2%' },
  { id: '3', time: '10:00', currency: 'USD', impact: 'medium', event: "Fed Chair Powell Speech", forecast: undefined, previous: undefined },
  { id: '4', time: '07:00', currency: 'GBP', impact: 'medium', event: 'GDP m/m', forecast: '0.1%', previous: '0.5%' },
  { id: '5', time: '09:00', currency: 'EUR', impact: 'high', event: 'CPI Flash Estimate y/y', forecast: '2.1%', previous: '2.2%' },
  { id: '6', time: '01:30', currency: 'JPY', impact: 'low', event: 'Tokyo Core CPI y/y', actual: '3.1%', forecast: '3.0%', previous: '2.9%' },
  { id: '7', time: '04:00', currency: 'CNY', impact: 'medium', event: 'Manufacturing PMI', forecast: '50.5', previous: '50.4' },
  { id: '8', time: '12:30', currency: 'CAD', impact: 'high', event: 'Employment Change', forecast: '25.0K', previous: '32.6K' },
  { id: '9', time: '14:00', currency: 'USD', impact: 'medium', event: 'ISM Manufacturing PMI', forecast: '48.5', previous: '48.7' },
  { id: '10', time: '02:30', currency: 'AUD', impact: 'low', event: 'Building Approvals m/m', forecast: '1.5%', previous: '-3.9%' },
]

const IMPACT_COLOR: Record<Impact, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300 dark:bg-gray-600',
}

const FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳',
}

export default function News() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['USD', 'EUR', 'GBP'])
  const [selectedImpacts, setSelectedImpacts] = useState<Impact[]>(['high', 'medium'])
  const [showFilters, setShowFilters] = useState(true)

  const toggleCurrency = (c: string) =>
    setSelectedCurrencies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleImpact = (i: Impact) =>
    setSelectedImpacts(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const filtered = useMemo(() =>
    DEMO_EVENTS.filter(e =>
      selectedCurrencies.includes(e.currency) &&
      selectedImpacts.includes(e.impact)
    ).sort((a, b) => a.time.localeCompare(b.time)),
    [selectedCurrencies, selectedImpacts]
  )

  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'This week', date: startOfWeek(new Date(), { weekStartsOn: 1 }) },
    { label: 'Next week', date: addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7) },
  ]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter panel */}
      {showFilters && (
        <div className="w-60 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5 overflow-y-auto">
            {/* Date range */}
            <div>
              <div className="flex gap-1.5 mb-2">
                <input
                  type="date"
                  value={format(currentDate, 'yyyy-MM-dd')}
                  onChange={e => setCurrentDate(new Date(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickDates.map(q => (
                  <button
                    key={q.label}
                    onClick={() => setCurrentDate(q.date)}
                    className="text-[11px] px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 hover:text-brand-600 dark:hover:text-brand-400 transition"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Currencies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Currencies</p>
                <button
                  onClick={() => setSelectedCurrencies(selectedCurrencies.length === CURRENCIES.length ? [] : [...CURRENCIES])}
                  className="text-[10px] text-brand-500 hover:text-brand-600"
                >
                  {selectedCurrencies.length === CURRENCIES.length ? 'Clear' : 'All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCurrency(c)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition border ${
                      selectedCurrencies.includes(c)
                        ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span>{FLAG[c]}</span> {c}
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
                    <input
                      type="checkbox"
                      checked={selectedImpacts.includes(i)}
                      onChange={() => toggleImpact(i)}
                      className="accent-brand-500 w-3.5 h-3.5"
                    />
                    <span className={`w-2.5 h-2.5 rounded-full ${IMPACT_COLOR[i]}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{i}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Categories</p>
              <div className="space-y-1.5">
                {['Employment', 'Inflation', 'GDP', 'Trade Balance', 'Central Bank', 'PMI'].map(cat => (
                  <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="accent-brand-500 w-3.5 h-3.5" defaultChecked />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">News</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Economic calendar</p>
          </div>
          <div className="flex items-center gap-2">
            {!showFilters && (
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentDate(d => subDays(d, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </span>
              <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-6 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <span>Time</span>
            <span>Currency</span>
            <span>Impact</span>
            <span className="col-span-2">Event</span>
            <span className="text-right grid grid-cols-3 gap-2">
              <span>Actual</span>
              <span>Forecast</span>
              <span>Previous</span>
            </span>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                No events match your filters for this date.
              </div>
            ) : (
              filtered.map(event => (
                <div key={event.id} className="grid grid-cols-6 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{event.time}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{FLAG[event.currency] || '🌐'}</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{event.currency}</span>
                  </div>
                  <div>
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${IMPACT_COLOR[event.impact]}`} />
                  </div>
                  <span className="col-span-2 text-sm text-gray-800 dark:text-gray-200">{event.event}</span>
                  <div className="grid grid-cols-3 gap-2 text-right text-xs">
                    <span className={event.actual ? (parseFloat(event.actual) >= parseFloat(event.forecast || '0') ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold') : 'text-gray-300 dark:text-gray-600'}>
                      {event.actual || '—'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{event.forecast || '—'}</span>
                    <span className="text-gray-500 dark:text-gray-400">{event.previous || '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
