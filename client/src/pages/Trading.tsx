import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, BarChart2, X, RotateCcw } from 'lucide-react'
import { useDemoStore, calcPnl } from '@/store/demoStore'
import { useLivePrices, getPipSize } from '@/hooks/useLivePrices'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'XAUUSD', 'GBPJPY', 'EURJPY']

const TV_SYMBOL: Record<string, string> = {
  XAUUSD: 'TVC:GOLD',
  GBPJPY: 'FX:GBPJPY',
  EURJPY: 'FX:EURJPY',
}
function tvSymbol(s: string) { return TV_SYMBOL[s] ?? `FX:${s}` }

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useAppStore()

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol(symbol),
      interval: '15',
      timezone: 'Etc/UTC',
      theme: theme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [symbol, theme])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '100%', width: '100%' }}
    />
  )
}

function OrderModal({ symbol, price, onClose }: {
  symbol: string; price: number; onClose: () => void
}) {
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy')
  const [lots, setLots] = useState('0.01')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const { openPosition, balance } = useDemoStore()

  const lotsNum = parseFloat(lots) || 0
  const pipVal = symbol === 'XAUUSD' ? lotsNum * 1 : lotsNum * 10
  const margin = lotsNum * (symbol === 'XAUUSD' ? price * 100 * 0.01 : 100000 * 0.03)
  const decimals = symbol.includes('JPY') || symbol === 'XAUUSD' ? 2 : 4

  const pipSize = getPipSize(symbol)
  const slPips = sl ? Math.abs((parseFloat(sl) - price) / pipSize).toFixed(1) : null
  const tpPips = tp ? Math.abs((parseFloat(tp) - price) / pipSize).toFixed(1) : null
  const slRisk = slPips ? (parseFloat(slPips) * pipVal).toFixed(2) : null
  const tpReward = tpPips ? (parseFloat(tpPips) * pipVal).toFixed(2) : null

  const handleOpen = () => {
    if (lotsNum <= 0) return
    openPosition({
      symbol, direction, lots: lotsNum, entryPrice: price,
      sl: sl ? parseFloat(sl) : undefined,
      tp: tp ? parseFloat(tp) : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">New Order — {symbol}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Market @ {price.toFixed(decimals)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Buy / Sell */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDirection('buy')}
              className={`py-3 rounded-xl text-sm font-bold transition ${direction === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              ▲ BUY {price.toFixed(decimals)}
            </button>
            <button onClick={() => setDirection('sell')}
              className={`py-3 rounded-xl text-sm font-bold transition ${direction === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              ▼ SELL {price.toFixed(decimals)}
            </button>
          </div>

          {/* Volume */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Volume (lots)</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setLots(l => Math.max(0.01, parseFloat(l) - 0.01).toFixed(2))}
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition text-lg">−</button>
              <input value={lots} onChange={e => setLots(e.target.value)}
                className="flex-1 text-center py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              <button onClick={() => setLots(l => (parseFloat(l) + 0.01).toFixed(2))}
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition text-lg">+</button>
            </div>
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-red-500 mb-1.5">Stop Loss</label>
              <input value={sl} onChange={e => setSl(e.target.value)} placeholder={`e.g. ${(price * (direction === 'buy' ? 0.999 : 1.001)).toFixed(decimals)}`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/30" />
              {slPips && <p className="text-[10px] text-red-400 mt-1">{slPips} pips · risk ${slRisk}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-600 mb-1.5">Take Profit</label>
              <input value={tp} onChange={e => setTp(e.target.value)} placeholder={`e.g. ${(price * (direction === 'buy' ? 1.002 : 0.998)).toFixed(decimals)}`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
              {tpPips && <p className="text-[10px] text-emerald-500 mt-1">{tpPips} pips · profit ${tpReward}</p>}
            </div>
          </div>

          {/* Risk summary */}
          <div className="text-xs text-gray-400 space-y-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <div className="flex justify-between">
              <span>Pip value</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">${pipVal.toFixed(2)} / pip</span>
            </div>
            <div className="flex justify-between">
              <span>Est. margin</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">${margin.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">${balance.toLocaleString()}</span>
            </div>
            {slRisk && tpReward && (
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>Risk:Reward</span>
                <span className={`font-semibold ${parseFloat(tpReward) / parseFloat(slRisk) >= 1.5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  1:{(parseFloat(tpReward) / parseFloat(slRisk)).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <button onClick={handleOpen}
            className={`w-full py-3 rounded-xl text-white text-sm font-bold transition shadow-lg ${direction === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}>
            Place {direction.toUpperCase()} — {lots} lots
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Trading() {
  const [activeSymbol, setActiveSymbol] = useState('EURUSD')
  const [showOrder, setShowOrder] = useState(false)
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions')
  const [showReset, setShowReset] = useState(false)
  const { prices, direction } = useLivePrices(SYMBOLS)
  const { balance, positions, history, closePosition, resetAccount } = useDemoStore()

  // Auto-close on SL/TP hit
  useEffect(() => {
    positions.forEach(pos => {
      const price = prices[pos.symbol]
      if (!price) return
      if (pos.tp && ((pos.direction === 'buy' && price >= pos.tp) || (pos.direction === 'sell' && price <= pos.tp))) {
        closePosition(pos.id, price)
      }
      if (pos.sl && ((pos.direction === 'buy' && price <= pos.sl) || (pos.direction === 'sell' && price >= pos.sl))) {
        closePosition(pos.id, price)
      }
    })
  }, [prices])

  const openPnl = positions.reduce((sum, pos) => sum + calcPnl(pos, prices[pos.symbol] ?? pos.entryPrice), 0)
  const equity = balance + openPnl
  const decimals = (s: string) => s.includes('JPY') || s === 'XAUUSD' ? 2 : 4

  return (
    <div className="flex h-full overflow-hidden">
      {showOrder && <OrderModal symbol={activeSymbol} price={prices[activeSymbol] ?? 1} onClose={() => setShowOrder(false)} />}

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Reset Demo Account?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This will close all positions and reset your balance to $100,000.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => { resetAccount(); setShowReset(false) }} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{activeSymbol}</span>
            <span className={`text-xs font-mono font-bold tabular-nums ${direction[activeSymbol] === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
              {(prices[activeSymbol] ?? 0).toFixed(decimals(activeSymbol))}
            </span>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">DEMO</span>
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Balance: <strong className="text-gray-700 dark:text-gray-300">${balance.toLocaleString()}</strong></span>
            <span>Open P&L: <strong className={openPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}>{openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}</strong></span>
            <span>Equity: <strong className="text-gray-700 dark:text-gray-300">${equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
          </div>
          <button onClick={() => setShowOrder(true)} className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition shadow-sm">
            New Order
          </button>
          <button onClick={() => setShowReset(true)} title="Reset demo account" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 bg-white dark:bg-[#141414]">
          <TradingViewChart symbol={activeSymbol} />
        </div>

        {/* Positions / History panel */}
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] shrink-0" style={{ height: '160px' }}>
          <div className="flex items-center gap-4 px-4 py-1.5 border-b border-gray-100 dark:border-gray-800">
            {(['positions', 'history'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`text-xs font-medium pb-1 border-b-2 transition capitalize ${activeTab === tab ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                {tab} {tab === 'positions' && positions.length > 0 && `(${positions.length})`}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto h-[calc(100%-32px)]">
            {activeTab === 'positions' ? (
              positions.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No open positions — click New Order to trade</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                      {['Symbol', 'Dir', 'Lots', 'Entry', 'Current', 'P&L', 'Pips', 'SL', 'TP', 'Action'].map(h => (
                        <th key={h} className="text-left px-3 py-1.5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => {
                      const cur = prices[pos.symbol] ?? pos.entryPrice
                      const pnl = calcPnl(pos, cur)
                      const pipSz = getPipSize(pos.symbol)
                      const pips = pos.direction === 'buy' ? (cur - pos.entryPrice) / pipSz : (pos.entryPrice - cur) / pipSz
                      const d = decimals(pos.symbol)
                      return (
                        <tr key={pos.id} className="border-t border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/3">
                          <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{pos.symbol}</td>
                          <td className={`px-3 py-2 font-bold uppercase ${pos.direction === 'buy' ? 'text-emerald-600' : 'text-red-500'}`}>{pos.direction}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{pos.lots}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono">{pos.entryPrice.toFixed(d)}</td>
                          <td className="px-3 py-2 font-mono text-gray-800 dark:text-gray-200">{cur.toFixed(d)}</td>
                          <td className={`px-3 py-2 font-semibold ${pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</td>
                          <td className={`px-3 py-2 ${pips >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{pips.toFixed(1)}</td>
                          <td className="px-3 py-2 text-red-400 text-[11px]">{pos.sl?.toFixed(d) || '—'}</td>
                          <td className="px-3 py-2 text-emerald-500 text-[11px]">{pos.tp?.toFixed(d) || '—'}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => closePosition(pos.id, cur)}
                              className="px-2 py-1 rounded bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium transition text-[11px]">
                              Close
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            ) : (
              history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No closed trades yet</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                      {['Symbol', 'Dir', 'Lots', 'Entry', 'Exit', 'P&L', 'Pips', 'Closed'].map(h => (
                        <th key={h} className="text-left px-3 py-1.5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(t => (
                      <tr key={t.id} className="border-t border-gray-50 dark:border-gray-800/60">
                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{t.symbol}</td>
                        <td className={`px-3 py-2 font-bold uppercase ${t.direction === 'buy' ? 'text-emerald-600' : 'text-red-500'}`}>{t.direction}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{t.lots}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{t.entryPrice.toFixed(decimals(t.symbol))}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{t.exitPrice.toFixed(decimals(t.symbol))}</td>
                        <td className={`px-3 py-2 font-semibold ${t.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</td>
                        <td className={`px-3 py-2 ${t.pips >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{t.pips.toFixed(1)}</td>
                        <td className="px-3 py-2 text-gray-400">{format(new Date(t.closeTime), 'MMM d HH:mm')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>

      {/* Watchlist */}
      <div className="w-52 border-l border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#141414] shrink-0">
        <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Watchlist</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {SYMBOLS.map(sym => (
            <button key={sym} onClick={() => setActiveSymbol(sym)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition border-l-2 ${activeSymbol === sym ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{sym}</p>
                <p className={`text-[11px] font-mono mt-0.5 tabular-nums ${direction[sym] === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {(prices[sym] ?? 0).toFixed(decimals(sym))}
                </p>
              </div>
              {direction[sym] === 'up'
                ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                : <TrendingDown className="w-3 h-3 text-red-500" />}
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1.5 text-xs">
          <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Account</p>
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Balance</span><span className="font-medium text-gray-700 dark:text-gray-300">${balance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Open P&L</span>
            <span className={`font-medium ${openPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Positions</span><span className="text-gray-700 dark:text-gray-300">{positions.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
