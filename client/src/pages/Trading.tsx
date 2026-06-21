import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

declare global {
  interface Window {
    TradingView: {
      widget: new (config: object) => void
    }
  }
}

const WATCHLIST = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', price: 1.1158, change: -0.0023, changePct: -0.21 },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', price: 1.2741, change: 0.0041, changePct: 0.32 },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', price: 157.38, change: 0.42, changePct: 0.27 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', price: 0.6412, change: -0.0018, changePct: -0.28 },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', price: 1.3592, change: 0.0012, changePct: 0.09 },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', price: 0.8981, change: -0.0007, changePct: -0.08 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', price: 0.5891, change: 0.0009, changePct: 0.15 },
  { symbol: 'XAUUSD', name: 'Gold Spot / US Dollar', price: 3324.50, change: 12.4, changePct: 0.37 },
]

function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load TradingView script
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `FX:${symbol}`,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
      const wrapper = document.createElement('div')
      wrapper.className = 'tradingview-widget-container__widget'
      wrapper.style.height = '100%'
      wrapper.style.width = '100%'
      containerRef.current.appendChild(wrapper)
      containerRef.current.appendChild(script)
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [symbol])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '100%', width: '100%' }}
    />
  )
}

export default function Trading() {
  const [activeSymbol, setActiveSymbol] = useState('EURUSD')

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chart area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{activeSymbol}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Balance: <strong className="text-gray-700 dark:text-gray-300">$52,480</strong></span>
            <span>Open P&L: <strong className="text-gray-700 dark:text-gray-300">$0.00</strong></span>
            <span>Equity: <strong className="text-gray-700 dark:text-gray-300">$52,480</strong></span>
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="flex-1 bg-white dark:bg-[#141414]">
          <TradingViewWidget symbol={activeSymbol} />
        </div>

        {/* Positions strip */}
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] px-4 py-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-medium text-gray-600 dark:text-gray-400">Open Positions</span>
            <span className="text-gray-400">No open positions</span>
          </div>
        </div>
      </div>

      {/* Watchlist sidebar */}
      <div className="w-56 border-l border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#141414] shrink-0">
        <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Watchlist</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {WATCHLIST.map(item => (
            <button
              key={item.symbol}
              onClick={() => setActiveSymbol(item.symbol)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition border-l-2 ${
                activeSymbol === item.symbol
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.symbol}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.price.toFixed(item.symbol.includes('JPY') || item.symbol.includes('XAU') ? 2 : 4)}</p>
              </div>
              <div className="flex items-center gap-0.5">
                {item.changePct >= 0
                  ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                  : <TrendingDown className="w-3 h-3 text-red-500" />
                }
                <span className={`text-[10px] font-medium ${item.changePct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Today's discipline */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Today's Discipline</p>
          <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Trades</span><span className="text-gray-700 dark:text-gray-300">0/3</span>
            </div>
            <div className="flex justify-between">
              <span>Closed P&L</span><span className="text-gray-700 dark:text-gray-300">$0.00</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Rule violations</span><span>None</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
