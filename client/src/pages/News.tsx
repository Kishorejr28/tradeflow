import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from 'date-fns'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY']

const FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳',
}

function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date(selected))

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startPad = getDay(startOfMonth(month)) === 0 ? 6 : getDay(startOfMonth(month)) - 1

  return (
    <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(m => subMonths(m, 1))}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {format(month, 'MMM yyyy')}
        </span>
        <button onClick={() => setMonth(m => addMonths(m, 1))}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array(startPad).fill(null).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const isSelected = isSameDay(day, selected)
          const today = isToday(day)
          const isWeekend = [0, 6].includes(day.getDay())
          return (
            <button
              key={day.toISOString()}
              onClick={() => { onSelect(day); setMonth(new Date(day)) }}
              className={`aspect-square flex items-center justify-center text-[10px] rounded font-medium transition
                ${isSelected ? 'bg-brand-500 text-white' : today ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : isWeekend ? 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// embed-widget-events.js is TradingView's economic calendar widget
function EconomicCalendarWidget({ importance, currencies }: {
  importance: string
  currencies: string[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useAppStore()
  // key forces full remount when filters change
  const key = `${importance}-${currencies.sort().join(',')}-${theme}`

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: theme === 'dark' ? 'dark' : 'light',
      isTransparent: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter: importance,
      countryFilter: currencies.map(c => c.toLowerCase()).join(','),
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [key])

  return (
    <div key={key} ref={containerRef} className="tradingview-widget-container" style={{ height: '100%', width: '100%' }} />
  )
}

export default function News() {
  const [selectedCurrencies, setSelectedCurrencies] = useState(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'])
  const [importance, setImportance] = useState('-1,0,1')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const toggleCurrency = (c: string) =>
    setSelectedCurrencies(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filters */}
      <div className="w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
        {/* Mini calendar at top */}
        <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />

        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Updates calendar on apply</p>
        </div>
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Impact */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">Impact</p>
            <div className="space-y-2">
              {[
                { label: 'All events', value: '-1,0,1', dot: 'bg-gray-400' },
                { label: 'Medium + High', value: '0,1', dot: 'bg-amber-400' },
                { label: 'High only', value: '1', dot: 'bg-red-500' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="importance" checked={importance === opt.value}
                    onChange={() => setImportance(opt.value)} className="accent-brand-500" />
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Currencies */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
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
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <span>{FLAG[c]}</span>{c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 leading-relaxed">
            Live data via TradingView. Navigate dates using the arrows inside the calendar.
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">News</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Economic calendar — live data</p>
        </div>
        <div className="flex-1 min-h-0">
          {selectedCurrencies.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Select at least one currency to show events
            </div>
          ) : (
            <EconomicCalendarWidget importance={importance} currencies={selectedCurrencies} />
          )}
        </div>
      </div>
    </div>
  )
}
