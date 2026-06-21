import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY']

const FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳',
}

function EconomicCalendarWidget({
  importance,
  currencies,
}: {
  importance: string
  currencies: string[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useAppStore()

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-economic-calendar.js'
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

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [importance, currencies.join(','), theme])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '100%', width: '100%' }}
    />
  )
}

export default function News() {
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(
    ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD']
  )
  const [importance, setImportance] = useState('-1,0,1')

  const toggleCurrency = (c: string) =>
    setSelectedCurrencies(p =>
      p.includes(c) ? p.filter(x => x !== c) : [...p, c]
    )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filters */}
      <div className="w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Updates calendar in real time</p>
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
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="importance"
                    checked={importance === opt.value}
                    onChange={() => setImportance(opt.value)}
                    className="accent-brand-500"
                  />
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
              <button
                onClick={() => setSelectedCurrencies(
                  selectedCurrencies.length === CURRENCIES.length ? [] : [...CURRENCIES]
                )}
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
                  <span>{FLAG[c]}</span>{c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 leading-relaxed">
            Powered by TradingView. Navigate dates using the arrows inside the calendar.
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
          <EconomicCalendarWidget
            importance={importance}
            currencies={selectedCurrencies}
          />
        </div>
      </div>
    </div>
  )
}
