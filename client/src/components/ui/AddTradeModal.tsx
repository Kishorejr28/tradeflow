import { useState } from 'react'
import { X } from 'lucide-react'

const EMOTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😩', label: 'Tired' },
  { emoji: '🏆', label: 'Confident' },
]

export interface ManualTrade {
  symbol: string
  direction: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  lots: number
  pnl: number
  date: string
  planFollowed: boolean
  emotion: string
  note: string
}

interface Props {
  onSave: (trade: ManualTrade) => void
  onClose: () => void
}

export default function AddTradeModal({ onSave, onClose }: Props) {
  const [symbol, setSymbol] = useState('EURUSD')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [lots, setLots] = useState('0.01')
  const [pnl, setPnl] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [planFollowed, setPlanFollowed] = useState(true)
  const [emotion, setEmotion] = useState('Neutral')
  const [note, setNote] = useState('')
  const [manualPnl, setManualPnl] = useState(false)

  const calcPnl = () => {
    if (manualPnl) return parseFloat(pnl) || 0
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const l = parseFloat(lots) || 0.01
    if (!entry || !exit) return 0
    const pip = symbol.includes('JPY') || symbol === 'XAUUSD' ? 0.01 : 0.0001
    const pips = direction === 'long' ? (exit - entry) / pip : (entry - exit) / pip
    const pipVal = symbol === 'XAUUSD' ? l * 1 : l * 10
    return parseFloat((pips * pipVal).toFixed(2))
  }

  const computed = calcPnl()

  const handleSave = () => {
    if (!symbol || !date) return
    onSave({
      symbol,
      direction,
      entryPrice: parseFloat(entryPrice) || 0,
      exitPrice: parseFloat(exitPrice) || 0,
      lots: parseFloat(lots) || 0.01,
      pnl: computed,
      date,
      planFollowed,
      emotion,
      note,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#1e1e1e]">
          <h3 className="font-semibold text-gray-900 dark:text-white">Add Trade</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Symbol + direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Symbol</label>
              <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="EURUSD"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['long', 'short'] as const).map(d => (
                  <button key={d} onClick={() => setDirection(d)}
                    className={`py-2 rounded-lg text-xs font-bold capitalize transition ${direction === d ? d === 'long' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date + lots */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Lots</label>
              <input value={lots} onChange={e => setLots(e.target.value)} placeholder="0.01"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </div>

          {/* Entry / Exit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Entry Price</label>
              <input value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="1.1000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Exit Price</label>
              <input value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="1.1050"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </div>

          {/* P&L */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">P&L (USD)</label>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={manualPnl} onChange={e => setManualPnl(e.target.checked)} className="accent-brand-500" />
                Enter manually
              </label>
            </div>
            {manualPnl ? (
              <input value={pnl} onChange={e => setPnl(e.target.value)} placeholder="e.g. 150 or -80"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            ) : (
              <div className={`px-3 py-2.5 text-sm rounded-lg border ${computed >= 0 ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'} font-semibold`}>
                {computed >= 0 ? '+' : ''}${computed.toFixed(2)}
                <span className="text-xs font-normal ml-1 opacity-60">(auto-calculated)</span>
              </div>
            )}
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Emotion */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">How did you feel?</label>
            <div className="flex gap-2">
              {EMOTIONS.map(e => (
                <button key={e.label} onClick={() => setEmotion(e.label)}
                  className={`text-xl p-1.5 rounded-lg transition hover:scale-110 ${emotion === e.label ? 'bg-brand-100 dark:bg-brand-500/20 ring-2 ring-brand-400' : ''}`}
                  title={e.label}>
                  {e.emoji}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={planFollowed} onChange={e => setPlanFollowed(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">I followed my trade plan</span>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Notes</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What happened? What did you learn?"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">Save Trade</button>
          </div>
        </div>
      </div>
    </div>
  )
}
