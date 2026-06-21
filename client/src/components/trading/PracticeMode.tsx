import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, X, Play, Pause, SkipBack, SkipForward, Scissors, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  genCandles, assetDp, ASSET_GROUPS,
  useReplayChart, usePaperTrading, PaperPanel,
} from '@/pages/Replay'
import type { OHLCV } from '@/pages/Replay'

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D']
const SPEEDS = [1, 2, 4, 8, 16, 32]
const ALL_ASSETS = ASSET_GROUPS.flatMap((g: typeof ASSET_GROUPS[0]) => g.assets)

// ── Symbol Search ─────────────────────────────────────────────────────────────
function SymbolSearch({ current, onSelect }: { current: string; onSelect: (s: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.length > 0
    ? ALL_ASSETS.filter(a => a.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : ALL_ASSETS

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const groupOf = (a: string) => ASSET_GROUPS.find((g: typeof ASSET_GROUPS[0]) => g.assets.includes(a))?.group ?? ''

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:border-brand-400 transition"
        onClick={() => setOpen(o => !o)}>
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={current}
          className="w-24 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
        />
        {query && <button onClick={e => { e.stopPropagation(); setQuery('') }}><X className="w-3 h-3 text-gray-400 hover:text-gray-600" /></button>}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {ASSET_GROUPS.map(group => {
              const items = group.assets.filter(a =>
                !query || a.toLowerCase().includes(query.toLowerCase())
              )
              if (!items.length) return null
              return (
                <div key={group.group}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                    {group.group}
                  </div>
                  {items.map(a => (
                    <button key={a} onClick={() => { onSelect(a); setQuery(''); setOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-brand-50 dark:hover:bg-brand-500/10 transition flex items-center justify-between group ${a === current ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      <span className="font-medium">{a}</span>
                      {a === current && <span className="text-[10px] text-brand-500">active</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Practice Mode overlay ─────────────────────────────────────────────────────
interface PracticeModeProps {
  initialSymbol: string
  onClose: () => void
}

export default function PracticeMode({ initialSymbol, onClose }: PracticeModeProps) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const [sym, setSym] = useState(initialSymbol)
  const [tf, setTf] = useState('15m')
  const [data, setData] = useState<OHLCV[]>([])
  const [ph, setPH] = useState(100)
  const [play, setPlay] = useState(false)
  const [spd, setSpd] = useState(1)
  const [scissor, setScissor] = useState(false)
  const [showSMA, setShowSMA] = useState(true)
  const [showEMA, setShowEMA] = useState(true)
  const [showBB, setShowBB] = useState(false)
  const [showVol, setShowVol] = useState(true)
  const [showRSI, setShowRSI] = useState(false)
  const [showMACD, setShowMACD] = useState(false)

  const spdRef = useRef(spd)
  const scissorRef = useRef(scissor)
  useEffect(() => { spdRef.current = spd }, [spd])
  useEffect(() => { scissorRef.current = scissor }, [scissor])

  const { mainRef, rsiRef, macdRef, build, render, fitContent } = useReplayChart({
    showSMA, showEMA, showBB, showVol, showRSI, showMACD, isDark,
  })

  const paper = usePaperTrading(sym, data[ph - 1])

  const load = useCallback(() => {
    setPlay(false)
    setScissor(false)
    const fresh = genCandles(sym, tf, 600)
    const startPH = Math.floor(fresh.length * 0.5)
    setData(fresh)
    setPH(startPH)
    setTimeout(() => {
      render(fresh.slice(0, startPH))
      fitContent()
    }, 30)
  }, [sym, tf, render, fitContent])

  useEffect(() => {
    const cleanup = build((p) => {
      if (!scissorRef.current || p.time == null) return
      setData(d => {
        const idx = d.findIndex(c => c.time === p.time)
        if (idx >= 0) { setPH(idx + 1); setPlay(false); setScissor(false) }
        return d
      })
    })
    return cleanup
  }, [build])

  useEffect(() => { load() }, [load])

  // Slider fix: render immediately, don't wait for effect
  const seekTo = useCallback((n: number) => {
    setPlay(false)
    setPH(n)
    if (data.length) render(data.slice(0, n))
  }, [data, render])

  useEffect(() => {
    if (data.length) render(data.slice(0, ph))
  }, [ph, data, render])

  // Play loop
  useEffect(() => {
    if (!play) return
    const id = setInterval(() => {
      setPH(p => {
        const next = p >= data.length ? (setPlay(false), p) : p + 1
        if (next !== p) render(data.slice(0, next))
        return next
      })
    }, Math.max(30, 400 / spdRef.current))
    return () => clearInterval(id)
  }, [play, spd, data, render])

  const cur = data[ph - 1]
  const prev = data[ph - 2]
  const dp = assetDp(sym)
  const chg = cur && prev ? cur.close - prev.close : 0
  const chgP = prev ? (chg / prev.close) * 100 : 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141414]">
      {/* Practice top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap">
        {/* Symbol search */}
        <SymbolSearch current={sym} onSelect={s => setSym(s)} />

        {/* Timeframe */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-2 py-1 text-[11px] rounded font-medium transition ${tf === t ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          {[
            { label: 'SMA', color: 'bg-amber-400', val: showSMA, set: setShowSMA },
            { label: 'EMA', color: 'bg-blue-500', val: showEMA, set: setShowEMA },
            { label: 'BB', color: 'bg-purple-400', val: showBB, set: setShowBB },
            { label: 'Vol', color: 'bg-sky-400', val: showVol, set: setShowVol },
            { label: 'RSI', color: 'bg-yellow-500', val: showRSI, set: setShowRSI },
            { label: 'MACD', color: 'bg-cyan-500', val: showMACD, set: setShowMACD },
          ].map(ind => (
            <button key={ind.label} onClick={() => ind.set(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition border ${ind.val ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'border-transparent text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ind.color}`} />
              {ind.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* OHLC */}
        {cur && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-800 dark:text-white">{sym}</span>
            <span className="text-gray-400">O <span className="font-mono text-gray-600 dark:text-gray-300">{cur.open.toFixed(dp)}</span></span>
            <span className="text-gray-400">H <span className="font-mono text-emerald-600">{cur.high.toFixed(dp)}</span></span>
            <span className="text-gray-400">L <span className="font-mono text-red-500">{cur.low.toFixed(dp)}</span></span>
            <span className="text-gray-400">C <span className={`font-mono font-semibold ${chg >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{cur.close.toFixed(dp)}</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${chg >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-500'}`}>
              {chg >= 0 ? '+' : ''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)
            </span>
          </div>
        )}

        <span className="text-[10px] text-gray-400">{ph}/{data.length}</span>
        <button onClick={load} className="p-1.5 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {/* Close practice mode */}
        <button onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 text-xs font-medium transition border border-red-200 dark:border-red-800">
          <X className="w-3.5 h-3.5" /> Exit Practice
        </button>
      </div>

      {/* Charts + paper trading */}
      <div className="flex flex-1 min-h-0">
        {/* Chart column */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={mainRef} className={`flex-1 min-h-0 ${scissor ? 'cursor-crosshair' : ''}`} />

          {showRSI && (
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{ height: 80 }}>
              <span className="absolute top-1 left-2 text-[9px] font-semibold text-amber-500 z-10 pointer-events-none">RSI</span>
              <div ref={rsiRef} className="w-full h-full" />
            </div>
          )}
          {showMACD && (
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{ height: 80 }}>
              <span className="absolute top-1 left-2 text-[9px] font-semibold text-cyan-500 z-10 pointer-events-none">MACD</span>
              <div ref={macdRef} className="w-full h-full" />
            </div>
          )}

          {/* Playback controls */}
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] px-3 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{ph}</span>
            <input
              type="range"
              min={1}
              max={data.length || 600}
              value={ph}
              onChange={e => seekTo(Number(e.target.value))}
              className="flex-1 min-w-[100px] accent-brand-500 cursor-pointer"
              style={{ height: '4px' }}
            />
            <span className="text-[10px] text-gray-400 w-8 shrink-0">{data.length}</span>

            <button onClick={() => seekTo(Math.max(1, ph - 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipBack className="w-3.5 h-3.5" /></button>

            <button onClick={() => setPlay(p => !p)} className="p-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition shadow">
              {play ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button onClick={() => seekTo(Math.min(data.length, ph + 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipForward className="w-3.5 h-3.5" /></button>

            <button onClick={() => seekTo(Math.min(data.length, ph + 10))} className="px-2 py-1 text-[11px] font-medium rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">+10</button>

            {/* Speed */}
            <div className="flex items-center gap-0.5">
              {SPEEDS.map(s => (
                <button key={s} onClick={() => setSpd(s)}
                  className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${spd === s ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {s}×
                </button>
              ))}
            </div>

            {/* Scissor */}
            <button onClick={() => { setPlay(false); setScissor(s => !s) }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition border ${scissor ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Scissors className="w-3 h-3" />
              {scissor ? 'Click chart to cut…' : 'Cut point'}
            </button>
          </div>
        </div>

        {/* Paper trading right panel */}
        <div className="w-48 border-l border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Paper Trading</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <PaperPanel
              sym={sym} ph={ph} cur={cur}
              closed={paper.closed} openT={paper.openT}
              bal={paper.bal} lots={paper.lots} livePnl={paper.livePnl}
              onLots={paper.setLots}
              onBuy={() => paper.enter('buy', ph)}
              onSell={() => paper.enter('sell', ph)}
              onClose={() => paper.exit(ph)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
