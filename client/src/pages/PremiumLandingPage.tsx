import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  motion, useScroll, useTransform, useInView, useSpring,
  useMotionValue, useVelocity, useAnimationFrame, AnimatePresence,
} from 'framer-motion'
import {
  TrendingUp, Play, ArrowRight, Check, Star, ChevronRight,
  BarChart2, FileText, BookOpen, Newspaper, Leaf, NotebookPen,
  RefreshCw, Target, Zap, Globe, Sparkles, Lock, Shield, Crown,
  Scissors, Volume2, Brain, TrendingDown,
} from 'lucide-react'

// ── Easing curves ──────────────────────────────────────────────────────────────
const EASE_OUT = [0.22, 1, 0.36, 1] as const

// ── Live ticker items ─────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { sym:'EURUSD', price:1.1158, chgPct:+0.11 },
  { sym:'BTCUSD', price:67420,  chgPct:-0.47 },
  { sym:'XAUUSD', price:3324,   chgPct:+0.37 },
  { sym:'NVDA',   price:138.5,  chgPct:+1.54 },
  { sym:'GBPUSD', price:1.2741, chgPct:-0.16 },
  { sym:'NIFTY50',price:24182,  chgPct:+0.35 },
  { sym:'ETHUSD', price:3480,   chgPct:+1.31 },
  { sym:'USDJPY', price:157.38, chgPct:+0.27 },
  { sym:'AAPL',   price:298.0,  chgPct:-0.40 },
  { sym:'SPX500', price:5312,   chgPct:+0.42 },
  { sym:'USOIL',  price:68.2,   chgPct:-2.57 },
  { sym:'SOLUSD', price:152.5,  chgPct:+2.14 },
]

// ── Hook: scroll-triggered fade/slide in ──────────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return { ref, inView, delay }
}

// ── Section wrapper that fades children in on scroll ──────────────────────────
function Reveal({ children, delay = 0, direction = 'up', className = '' }: {
  children: React.ReactNode; delay?: number; direction?: 'up'|'left'|'right'|'scale'; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const initial = {
    opacity: 0,
    y: direction === 'up' ? 50 : 0,
    x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0,
    scale: direction === 'scale' ? 0.88 : 1,
  }
  return (
    <motion.div ref={ref} className={className}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0, scale: 1 } : initial}
      transition={{ duration: 0.85, delay, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

// ── Horizontal scroll section for features ────────────────────────────────────
const FEATURE_SECTIONS = [
  {
    tag: 'Chart Replay', tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    heading: 'Replay any market.\nMaster your strategy.',
    headingGrad: 'from-purple-400 to-blue-400',
    body: 'Real price history from Yahoo Finance. 150+ instruments. Play bar by bar, paper trade, test your edge against actual market conditions — not random simulations.',
    bullets: ['Real data: stocks, forex, crypto, indices', 'Any global ticker: RELIANCE.NS, SAP.DE, 7203.T', 'SMA, EMA, BB, RSI, MACD indicators', 'Speed 1× to 32× · Scissors cut point'],
    chart: 'replay',
  },
  {
    tag: 'Trading Journal', tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    heading: 'Track every trade.\nFind every pattern.',
    headingGrad: 'from-emerald-400 to-teal-400',
    body: 'Log trades with emotion tracking, plan adherence, voice notes. The P&L calendar reveals which days of the week you win and lose — information that changes how you trade.',
    bullets: ['Post-trade emotion check-in popup', 'Calendar view: green wins, red losses', 'Voice note transcription (Pro)', 'Spot patterns in your behaviour'],
    chart: 'journal',
  },
  {
    tag: 'Performance', tagColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    heading: 'Watch your equity\ncurve grow.',
    headingGrad: 'from-violet-400 to-purple-400',
    body: 'Your equity curve, win rate, average R, max drawdown — all tracked automatically from every trade you log. Know exactly when your strategy is working and when it isn\'t.',
    bullets: ['Equity curve with milestone markers', 'Win rate, avg R, profit factor', 'Drawdown tracking and alerts', 'Monthly + weekly breakdown'],
    chart: 'equity',
  },
  {
    tag: 'Edge Plans', tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    heading: 'Build your playbook.\nEliminate guessing.',
    headingGrad: 'from-blue-400 to-indigo-400',
    body: 'Define your trading plan step by step. Charting process, entry criteria, invalidation rules. Every trade links back to a plan — so you always know why you entered.',
    bullets: ['Step-by-step charting process', 'Entry criteria with checkboxes', 'Invalidation rules', 'Link trades to plans in the journal'],
    chart: 'edge',
  },
  {
    tag: 'Sanctuary', tagColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    heading: 'Trade with a\nclear mind.',
    headingGrad: 'from-teal-400 to-emerald-400',
    body: 'Meditation timer with real ambient sounds — ocean, rain, forest, Tibetan singing bowl, binaural beats. Streak tracking, intention setting. Build the mental edge most traders ignore.',
    bullets: ['15 real ambient sounds', 'Interval bells + timer', 'Streak tracking + progress', 'Intention & daily focus setting'],
    chart: 'sanctuary',
  },
  {
    tag: 'AI Trading Bot', tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    heading: 'Automate your\nstrategy.',
    headingGrad: 'from-amber-400 to-orange-400',
    body: 'A real Alpaca paper trading bot with 7 active strategies, ADX-based market regime detection, and full risk management. Every trade syncs to your journal automatically.',
    bullets: ['EMA crossover, BB mean reversion, ICT FVG', 'ADX regime filter — only trades trending markets', '1% risk per trade · 10% drawdown circuit breaker', 'Live journal sync + Telegram alerts'],
    chart: 'aibot',
    proBadge: true,
  },
]

// ── Compact animated demo components (shown in feature sections) ─────────────

// Big animated candlestick chart used in the hero section
interface Candle { o:number; h:number; l:number; c:number }
function HeroChart() {
  const [candles, setCandles] = useState<Candle[]>([])
  const [ph, setPH] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  useEffect(() => {
    const d: Candle[] = []; let price = 185
    for (let i = 0; i < 70; i++) {
      const o = price
      const move = Math.sin(i * 0.25) * 2.2 + (Math.random() - 0.46) * 3.5
      const c = Math.max(160, Math.min(215, o + move))
      const r = Math.abs(c - o) * 0.6 + Math.random() * 1.5
      d.push({ o, h: Math.max(o,c)+r, l: Math.min(o,c)-r, c }); price = c
    }
    setCandles(d); setPH(18)
  }, [])
  useEffect(() => {
    if (!candles.length) return
    timerRef.current = setInterval(() => setPH(p => p >= candles.length ? 14 : p + 1), 120)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [candles.length])
  const vis = candles.slice(0, ph)
  if (!vis.length) return null
  const maxP = Math.max(...vis.map(c=>c.h)), minP = Math.min(...vis.map(c=>c.l)), rng = maxP - minP || 1
  const toY = (p: number) => ((maxP - p) / rng) * 155
  const ema: [number, number][] = []
  if (vis.length > 8) {
    let e = vis.slice(0,8).reduce((s,c)=>s+c.c,0)/8
    for (let i = 8; i < vis.length; i++) { e = vis[i].c * 0.16 + e * 0.84; ema.push([i, e]) }
  }
  const cur = vis[vis.length-1], prev = vis[vis.length-2]
  const chg = cur && prev ? cur.c - prev.c : 0
  return (
    <div className="rounded-2xl overflow-hidden bg-[#0b0b1a] border border-white/8 shadow-2xl">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
        <div className="flex gap-1.5">
          {['bg-red-500/60','bg-amber-500/60','bg-emerald-500/60'].map((c,i)=><div key={i} className={`w-3 h-3 rounded-full ${c}`}/>)}
        </div>
        <div className="flex items-center gap-2 ml-1">
          <span className="text-white text-xs font-bold">NVDA</span>
          <span className="text-xs font-mono text-gray-400">15m</span>
          {cur && <span className={`text-xs font-mono font-bold ${chg>=0?'text-emerald-400':'text-red-400'}`}>{cur.c.toFixed(2)}</span>}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>Live
        </div>
      </div>
      <div className="h-44 px-2 pt-2 pb-0">
        <svg width="100%" height="100%" viewBox="0 0 620 155" preserveAspectRatio="none">
          {[0,40,80,120].map(y=><line key={y} x1="0" y1={y} x2="620" y2={y} stroke="rgba(255,255,255,0.035)" strokeWidth="1"/>)}
          {vis.map((c,i)=>{
            const x=(i/69)*598+11, bull=c.c>=c.o, col=bull?'#22c55e':'#ef4444'
            const bt=Math.min(toY(c.o),toY(c.c)), bh=Math.max(1.5,Math.abs(toY(c.o)-toY(c.c)))
            return <g key={i}>
              <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={col} strokeWidth="1" opacity={i===vis.length-1?1:0.8}/>
              <rect x={x-3.5} y={bt} width="7" height={bh} fill={col} rx="0.5" opacity={i===vis.length-1?1:0.85} className={i===vis.length-1?'animate-pulse':''}/>
            </g>
          })}
          {ema.length>2&&<polyline points={ema.map(([i,v])=>`${(i/69)*598+11},${toY(v)}`).join(' ')}
            fill="none" stroke="#818cf8" strokeWidth="1.8" opacity="0.75" strokeLinejoin="round"/>}
        </svg>
      </div>
      {cur && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 text-[10px] font-mono text-gray-500">
          <span>O <span className="text-gray-300">{cur.o.toFixed(2)}</span></span>
          <span>H <span className="text-emerald-400">{cur.h.toFixed(2)}</span></span>
          <span>L <span className="text-red-400">{cur.l.toFixed(2)}</span></span>
          <span>C <span className={`font-bold ${chg>=0?'text-emerald-400':'text-red-400'}`}>{cur.c.toFixed(2)}</span></span>
          <span className={`ml-auto ${chg>=0?'text-emerald-400':'text-red-400'}`}>{chg>=0?'+':''}{chg.toFixed(2)}</span>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/5">
        <span className="text-[10px] text-gray-600 font-mono w-10 text-right">{ph}</span>
        <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
          <motion.div className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full"
            animate={{ width: `${(ph/70)*100}%` }} transition={{ duration: 0.12 }}/>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-purple-500 flex items-center justify-center shrink-0">
            <Play className="w-2.5 h-2.5 text-white fill-white"/>
          </div>
          {['1×','4×','16×'].map(s=>(
            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s==='1×'?'bg-purple-500/20 text-purple-400':'bg-white/5 text-gray-600'}`}>{s}</span>
          ))}
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 flex items-center gap-0.5 ml-1">
            <Scissors className="w-2.5 h-2.5"/> Cut
          </span>
        </div>
      </div>
    </div>
  )
}

function ReplayDemo() {
  const [ph, setPH] = useState(8)
  const [playing, setPlaying] = useState(true)
  const heights = [30,45,38,55,50,62,58,72,65,78,70,85,80,90,75,95,88,92,98,100]
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setPH(p => p >= heights.length ? 6 : p + 1), 200)
    return () => clearInterval(id)
  }, [playing])
  return (
    <div className="rounded-xl bg-[#0b0b1a] border border-white/8 p-4 text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-purple-300">EURUSD</span>
          <span className="text-gray-600 font-mono">15m · 1.1158</span>
        </div>
        <span className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>Live</span>
      </div>
      {/* Mini candle chart */}
      <div className="flex items-end gap-px h-16 mb-3">
        {heights.slice(0, ph).map((h, i) => (
          <motion.div key={i} className="flex-1 rounded-sm"
            initial={{ height: 0 }} animate={{ height: `${h}%` }}
            transition={{ duration: 0.15 }}
            style={{ background: i % 3 === 0 ? '#ef4444' : '#22c55e', opacity: i === ph - 1 ? 1 : 0.75 }}/>
        ))}
      </div>
      {/* Replay controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
          <motion.div className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full"
            animate={{ width: `${(ph / heights.length) * 100}%` }} transition={{ duration: 0.15 }}/>
        </div>
        <button onClick={() => setPlaying(p => !p)}
          className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center shrink-0">
          {playing
            ? <span className="w-2 h-2 flex gap-0.5"><span className="w-0.5 h-2 bg-white rounded"/><span className="w-0.5 h-2 bg-white rounded"/></span>
            : <Play className="w-2.5 h-2.5 text-white fill-white"/>}
        </button>
        {['1×','4×','16×'].map(s => (
          <span key={s} className={`px-1 py-0.5 rounded text-[9px] font-medium ${s==='1×'?'bg-purple-500/30 text-purple-300':'text-gray-600'}`}>{s}</span>
        ))}
        <span className="text-amber-400 flex items-center gap-0.5 text-[9px]"><Scissors className="w-2.5 h-2.5"/>Cut</span>
      </div>
    </div>
  )
}

function JournalDemo() {
  const days = [null,320,-180,540,null,210,-90,380,-220,460,null,150,290,-130,610]
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setVisible(v => v >= days.length ? 0 : v + 1), 120)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="rounded-xl bg-[#0b0b1a] border border-white/8 p-4 text-[10px]">
      <div className="flex justify-between mb-2">
        <span className="text-white font-bold">Journal · June</span>
        <span className="text-emerald-400 font-bold">+$1,870</span>
      </div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {['M','T','W','T','F'].map(d => <div key={d} className="text-center text-gray-600">{d}</div>)}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {days.map((v, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={i < visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className={`h-7 rounded text-[9px] font-bold flex items-center justify-center ${
              v === null ? 'bg-white/3' : v > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
            {v !== null ? (v > 0 ? `+${v}` : v) : ''}
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-gray-500">
        <span>Win rate</span><span className="text-emerald-400 font-bold">68%</span>
      </div>
    </div>
  )
}

function EquityDemo() {
  const pts = [100,103,101,107,105,112,109,117,114,121,119,126,124,131,128,135,140,137,144,142,149]
  const [drawn, setDrawn] = useState(4)
  useEffect(() => {
    const id = setInterval(() => setDrawn(d => d >= pts.length ? 4 : d + 1), 180)
    return () => clearInterval(id)
  }, [])
  const vis = pts.slice(0, drawn)
  const maxP = Math.max(...vis), minP = Math.min(...vis), rng = maxP - minP || 1
  const toY = (p: number) => 56 - ((p - minP) / rng) * 50
  const pathD = vis.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * 280} ${toY(p)}`).join(' ')
  return (
    <div className="rounded-xl bg-[#0b0b1a] border border-white/8 p-4 text-[10px]">
      <div className="flex justify-between mb-2">
        <span className="text-white font-bold">Equity Curve</span>
        <span className="text-emerald-400 font-bold">+49%</span>
      </div>
      <svg width="100%" height="64" viewBox="0 0 280 64">
        <defs>
          <linearGradient id="eq2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {vis.length > 1 && (
          <>
            <motion.path d={`${pathD} L ${((drawn-1)/(pts.length-1))*280} 64 L 0 64 Z`}
              fill="url(#eq2)" initial={{ opacity:0 }} animate={{ opacity:1 }}/>
            <motion.path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
        {vis.map((p, i) => (
          <motion.circle key={i} cx={(i/(pts.length-1))*280} cy={toY(p)} r="2.5"
            fill="#8b5cf6" initial={{ scale:0 }} animate={{ scale:1 }}
            transition={{ delay: i * 0.02 }}/>
        ))}
      </svg>
      <div className="flex justify-between text-gray-600 mt-1">
        <span>Jan</span><span>Mar</span><span>Jun</span>
      </div>
    </div>
  )
}

function EdgeDemo() {
  const [checked, setChecked] = useState<number[]>([])
  const steps = ['Mark HTF range', 'Mark liquidity', 'Pick ONE target', 'LQ Sweep entry', 'Set invalidation']
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      if (i < steps.length) { setChecked(p => [...p, i]); i++ }
      else { setChecked([]); i = 0 }
    }, 600)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="rounded-xl bg-[#0b0b1a] border border-white/8 p-4 text-[10px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-red-500"/>
        <span className="text-white font-bold text-xs">Market Mechanics Plan</span>
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <motion.div key={i} className="flex items-center gap-2"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}>
            <motion.div
              animate={checked.includes(i) ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.15)' }}
              transition={{ duration: 0.3 }}
              className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0">
              {checked.includes(i) && <Check className="w-2.5 h-2.5 text-white"/>}
            </motion.div>
            <span className={checked.includes(i) ? 'text-gray-400 line-through' : 'text-gray-300'}>{s}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 p-2 rounded bg-amber-500/8 border border-amber-500/20 text-amber-400/70 text-[9px]">
        Invalidation: Price breaks key HTF level
      </div>
    </div>
  )
}

function SanctuaryDemo() {
  const [active, setActive] = useState('ocean')
  const [progress, setProgress] = useState(0.2)
  const sounds = [['🌊','ocean'],['🌧️','rain'],['🌲','forest'],['🎵','bowl'],['✨','528hz'],['🕉️','om']]
  useEffect(() => {
    const id = setInterval(() => setProgress(p => p >= 1 ? 0.05 : p + 0.008), 100)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="rounded-xl bg-[#0b0b1a] border border-white/8 p-4 text-[10px]">
      <div className="flex justify-center mb-3">
        <div className="relative w-14 h-14">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
            <motion.circle cx="28" cy="28" r="24" fill="none" stroke="#7c3aed" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={`${2*Math.PI*24}`}
              animate={{ strokeDashoffset: `${2*Math.PI*24*(1-progress)}` }}
              transition={{ duration: 0.1 }}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg">🪷</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {sounds.map(([e, v]) => (
          <button key={v} onClick={() => setActive(v)}
            className={`flex flex-col items-center py-1.5 rounded-lg text-[9px] transition ${
              active === v ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/3 text-gray-600 border border-transparent'
            }`}>
            <span className="text-sm">{e}</span>{v}
          </button>
        ))}
      </div>
    </div>
  )
}

function AiBotDemo() {
  const [tick, setTick] = useState(0)
  const [equity, setEquity] = useState(99858)
  const regimes = [
    {sym:'BTC/USD', regime:'TRENDING', adx:29.1, col:'text-emerald-400'},
    {sym:'ETH/USD', regime:'RANGING',  adx:24.6, col:'text-amber-400'},
    {sym:'SOL/USD', regime:'RANGING',  adx:23.0, col:'text-amber-400'},
  ]
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      setEquity(e => parseFloat((e + (Math.random() - 0.45) * 3).toFixed(2)))
    }, 1200)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="rounded-xl bg-[#0b0b1a] border border-white/8 p-4 text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-white text-xs">AI Trading Bot</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>RUNNING
        </span>
      </div>
      <div className="flex justify-between mb-3">
        <div>
          <p className="text-gray-500">Equity</p>
          <p className="text-white font-bold text-sm">${equity.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Realised P&L</p>
          <p className="text-emerald-400 font-bold">+$683.13</p>
        </div>
      </div>
      <p className="text-gray-500 uppercase tracking-wide mb-1.5 text-[9px] font-semibold">Market Regime</p>
      <div className="space-y-1 mb-3">
        {regimes.map(r => (
          <div key={r.sym} className="flex items-center justify-between px-2 py-1 rounded bg-white/3 border border-white/5">
            <span className="text-gray-300 font-medium">{r.sym}</span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${r.col}`}>{r.regime}</span>
              <span className="text-gray-600">ADX {r.adx}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-2 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">LONG</span>
            <span className="text-white font-medium">PAXG/USD</span>
          </div>
          <span className="text-emerald-400 font-bold">+${(86 + tick % 8).toFixed(2)}</span>
        </div>
        <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div className="h-full bg-emerald-500 rounded-full"
            animate={{ width: `${Math.min(100, 90 + tick % 10)}%` }}
            transition={{ duration: 0.5 }}/>
        </div>
        <div className="flex justify-between text-gray-600 mt-0.5">
          <span>SL $4003</span><span>{Math.min(100, 90 + tick % 10)}% to TP</span><span>TP $4087</span>
        </div>
      </div>
    </div>
  )
}

function ChartForSection({ type }: { type: string }) {
  if (type === 'replay')    return <ReplayDemo />
  if (type === 'journal')   return <JournalDemo />
  if (type === 'equity')    return <EquityDemo />
  if (type === 'edge')      return <EdgeDemo />
  if (type === 'sanctuary') return <SanctuaryDemo />
  if (type === 'aibot')     return <AiBotDemo />
  return null
}

// ── Particle background ───────────────────────────────────────────────────────
function Particles({ count = 25 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * 2 + 1
        return (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{ width: size, height: size, background: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#60a5fa' : '#34d399', opacity: 0.3 }}
            initial={{ x: `${Math.random()*100}%`, y: `${Math.random()*100}%`, opacity: 0 }}
            animate={{ y: [`${Math.random()*100}%`, `${Math.random()*100}%`], opacity: [0, 0.5, 0] }}
            transition={{ duration: 6 + Math.random()*8, repeat: Infinity, delay: Math.random()*6, ease: 'linear' }}
          />
        )
      })}
    </div>
  )
}

// ── Marquee logos/markets ─────────────────────────────────────────────────────
const TICKERS = ['AAPL','NVDA','TSLA','BTCUSD','EURUSD','XAUUSD','SPX500','RELIANCE.NS','SAP.DE','GBPUSD','ETHUSD','SOLUSD','7203.T','SHEL.L','DAX40','USDJPY','AMZN','META']

function MarqueeTicker() {
  return (
    <div className="relative overflow-hidden py-3 border-y border-white/5 bg-white/1">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
        {[...TICKERS, ...TICKERS].map((t, i) => (
          <span key={i} className="text-xs font-mono text-gray-600 font-semibold">{t}</span>
        ))}
      </motion.div>
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#070714] to-transparent pointer-events-none"/>
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#070714] to-transparent pointer-events-none"/>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function PremiumLandingPage() {
  const navigate = useNavigate()
  const { setUser, setUserPlan, user } = useAppStore()
  const [currency, setCurrency] = useState<'USD'|'EUR'|'INR'>('USD')
  const [email, setEmail] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)
  const isLoggedIn = !!user

  const { scrollYProgress } = useScroll()

  const PRICE = { USD: 12, EUR: 11, INR: 999 }
  const SYM   = { USD: '$', EUR: '€', INR: '₹' }

  const goToAuth = () => navigate('/auth')
  const demoLogin = () => {
    setUser({ id:'demo', email:'demo@tradeflow.app', full_name:'Demo Trader', timezone:'UTC', account_currency:'USD', created_at:new Date().toISOString() })
    setUserPlan('pro')
    navigate('/app/dashboard')
  }

  return (
    <div className="bg-[#070714] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-[#070714]/95 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-8 h-18 flex items-center justify-between" style={{height:'72px'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0">
              <TrendingUp className="w-4 h-4 text-white"/>
            </div>
            <span className="font-bold text-white text-sm tracking-wide">TradeFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: 'Features',     href: '#features' },
              { label: 'How it Works', href: '#howitworks' },
              { label: 'Markets',      href: '#markets' },
              { label: 'Pricing',      href: '#pricing' },
              { label: 'Blog',         href: '#' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="px-3 py-1.5 rounded-lg text-base text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 font-medium">
                {item.label}
                {item.label === 'Blog' && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold align-middle">Soon</span>
                )}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <button onClick={goToAuth} className="text-base text-gray-400 hover:text-white transition font-medium">Sign in</button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/app/dashboard')}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-base font-bold rounded-xl shadow-lg shadow-purple-500/25">
                  Dashboard →
                </motion.button>
              </>
            ) : (
              <>
                <button onClick={goToAuth} className="text-base text-gray-400 hover:text-white transition font-medium">Sign in</button>
                <motion.button whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(139,92,246,0.4)' }} whileTap={{ scale: 0.96 }}
                  onClick={goToAuth}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-base font-bold rounded-xl shadow-lg shadow-purple-500/25">
                  Get started free
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── HERO — centered, with ticker + big chart ─────────────────────────── */}
      <section className="relative pt-20 pb-10 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}/>
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-teal-500/5 blur-[80px] rounded-full"/>
          <div className="absolute bottom-1/3 right-1/4 w-[250px] h-[250px] bg-violet-500/6 blur-[70px] rounded-full"/>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        </div>
        <Particles count={25}/>

        {/* Live price ticker */}
        <div className="relative z-10 overflow-hidden mb-8">
          <div className="relative border-y border-white/5 bg-white/2 py-2">
            <motion.div className="flex gap-0 whitespace-nowrap"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
                <div key={i} className="inline-flex items-center gap-2.5 px-5 border-r border-white/5">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.chgPct >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-pulse'}`}/>
                  <span className="text-xs font-bold text-white/80 font-mono">{t.sym}</span>
                  <span className="text-xs font-mono text-white/60">{t.price > 1000 ? t.price.toLocaleString() : t.price > 10 ? t.price.toFixed(2) : t.price.toFixed(4)}</span>
                  <span className={`text-[10px] font-semibold font-mono ${t.chgPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.chgPct >= 0 ? '▲' : '▼'}{Math.abs(t.chgPct).toFixed(2)}%
                  </span>
                </div>
              ))}
            </motion.div>
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#070714] to-transparent pointer-events-none"/>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#070714] to-transparent pointer-events-none"/>
          </div>
        </div>

        {/* Centered headline */}
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 mb-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/8 text-purple-300 text-xs font-semibold mb-6 tracking-wide">
              <Zap className="w-3 h-3 fill-purple-400 text-purple-400"/>
              FREE alternative to FXReplay · No credit card
            </div>
          </Reveal>

          <div className="mb-6">
            <motion.h1
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.15, ease: EASE_OUT }}
              className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.0] mb-5 pb-2">
              <span className="text-white">Practice trading.</span>
              <br/>
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-teal-400 bg-clip-text text-transparent">
                Without losing money.
              </span>
            </motion.h1>
          </div>

          <Reveal delay={0.25}>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              Chart replay on real market data. Journal. Edge plans. Meditation.
              Everything a serious trader needs — in one platform.
            </p>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 0 50px rgba(139,92,246,0.5)' }}
                whileTap={{ scale: 0.96 }}
                onClick={goToAuth}
                className="px-9 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-teal-600 text-white font-black text-lg rounded-2xl shadow-2xl shadow-purple-500/30 flex items-center gap-2 justify-center">
                Start for free <ArrowRight className="w-5 h-5"/>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={demoLogin}
                className="px-9 py-4 bg-white/5 hover:bg-white/8 text-white font-bold text-lg rounded-2xl border border-white/10 flex items-center gap-2 justify-center transition">
                <Play className="w-4 h-4 text-purple-400 fill-purple-400"/>
                Try demo now
              </motion.button>
            </div>
          </Reveal>

          {/* Stats */}
          <Reveal delay={0.45}>
            <div className="flex items-center justify-center gap-10 border-t border-white/5 pt-8">
              {[{ n: '150+', l: 'Instruments' }, { n: '10y+', l: 'Data depth' }, { n: '7', l: 'Asset classes' }, { n: 'Free', l: 'Forever' }].map(s => (
                <div key={s.l} className="text-center">
                  <p className="text-3xl font-black bg-gradient-to-r from-purple-300 to-teal-300 bg-clip-text text-transparent">{s.n}</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">{s.l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Big centered chart */}
        <Reveal delay={0.3}>
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <div className="relative">
              <motion.div className="absolute -inset-6 rounded-3xl"
                style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 65%)' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}/>
              <div className="relative">
                <HeroChart />
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-4 -right-4 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-xl text-xs font-black text-white whitespace-nowrap hidden sm:block">
                  📈 Real Yahoo Finance data
                </motion.div>
                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                  className="absolute -bottom-4 -left-4 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl shadow-xl text-xs font-black text-white whitespace-nowrap flex items-center gap-1.5 hidden sm:flex">
                  <Scissors className="w-3 h-3"/> Cut point · Replay mode
                </motion.div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How it Works ─────────────────────────────────────────────────────── */}
      <section id="howitworks" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Reveal>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">How it works</h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">Three steps to trade better without risking real money.</p>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }}/>
            {[
              { step: '01', emoji: '🔍', title: 'Pick any instrument', desc: 'Search any global stock, forex pair, crypto or index. EURUSD, RELIANCE.NS, AAPL, BTC — real historical data from Yahoo Finance.' },
              { step: '02', emoji: '⏮️', title: 'Replay the market', desc: 'Wind back to any point in history. Advance bar by bar at your own speed. Paper trade, test your entry, see what actually happened.' },
              { step: '03', emoji: '📓', title: 'Log & improve', desc: 'After every session, log trades in the journal. Track emotions, plan adherence, win rate. Spot your patterns. Trade better.' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.12}>
                <motion.div whileHover={{ y: -4, borderColor: 'rgba(139,92,246,0.4)' }}
                  className="relative p-6 rounded-2xl border border-white/6 bg-white/2 transition-all group cursor-default">
                  <div className="text-3xl mb-3">{s.emoji}</div>
                  <div className="text-[10px] font-black text-purple-500/60 tracking-widest mb-2 uppercase">{s.step}</div>
                  <h3 className="text-base font-black text-white mb-2 group-hover:text-purple-300 transition-colors">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="text-center mt-10">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={isLoggedIn ? () => navigate('/app/dashboard') : goToAuth}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-teal-600 shadow-lg shadow-purple-500/20">
              Start in 30 seconds — it's free <ArrowRight className="w-4 h-4"/>
            </motion.button>
          </Reveal>
        </div>
      </section>

      {/* ── Ticker marquee ────────────────────────────────────────────────────── */}
      {/* ── Ticker marquee now in hero ────────────────────────────────────────── */}

      {/* ── Feature sections (Apple-style: big scroll reveals) ────────────────── */}
      <section id="features">
        {FEATURE_SECTIONS.map((sec, idx) => (
          <div key={sec.tag} className="relative flex items-center py-20 px-6 overflow-hidden scroll-mt-16">
            {/* Alternating bg glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className={`absolute w-[600px] h-[400px] blur-[120px] rounded-full ${
                idx % 2 === 0 ? 'top-1/2 left-0 -translate-y-1/2 bg-purple-600/18' : 'top-1/2 right-0 -translate-y-1/2 bg-blue-600/12'
              }`}/>
            </div>

            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
              {/* Text — alternates left/right */}
              <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                <Reveal delay={0.1}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold mb-8 ${sec.tagColor}`}>
                    {sec.tag}
                    {(sec as any).proBadge && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold">PRO</span>
                    )}
                  </div>
                </Reveal>

                <div className="overflow-hidden mb-6">
                  <motion.h2
                    initial={{ y: 80, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: EASE_OUT }}
                    className="text-5xl lg:text-6xl font-black leading-tight">
                    {sec.heading.split('\n').map((line, i) => (
                      <span key={i} className={`block ${i === 1 ? `bg-gradient-to-r ${sec.headingGrad} bg-clip-text text-transparent` : 'text-white'}`}>
                        {line}
                      </span>
                    ))}
                  </motion.h2>
                </div>

                <Reveal delay={0.2}>
                  <p className="text-gray-400 text-xl leading-relaxed mb-6">{sec.body}</p>
                </Reveal>

                <ul className="space-y-2.5 mb-6">
                  {sec.bullets.map((b, i) => (
                    <motion.li key={i}
                      initial={{ opacity: 0, x: -25 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.07, duration: 0.6, ease: EASE_OUT }}
                      className="flex items-center gap-3 text-gray-300 text-sm">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${sec.headingGrad} opacity-20 border flex items-center justify-center shrink-0`}
                        style={{ borderColor: 'rgba(139,92,246,0.4)' }}>
                        <Check className="w-3 h-3 text-white opacity-100"/>
                      </div>
                      {b}
                    </motion.li>
                  ))}
                </ul>

                <Reveal delay={0.4}>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={isLoggedIn ? () => navigate('/app/dashboard') : goToAuth}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${sec.headingGrad} text-white shadow-lg`}>
                    Try {sec.tag} free <ChevronRight className="w-4 h-4"/>
                  </motion.button>
                </Reveal>
              </div>

              {/* Chart */}
              <div className={idx % 2 === 1 ? 'lg:order-1' : ''}>
                <Reveal direction={idx % 2 === 0 ? 'right' : 'left'} delay={0.2}>
                  <div className="relative">
                    {/* Strong glow behind chart */}
                    <motion.div
                      className="absolute -inset-4 rounded-3xl"
                      style={{ background: `radial-gradient(ellipse, rgba(139,92,246,0.25) 0%, transparent 70%)` }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}/>
                    <div className="relative rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl shadow-purple-500/10">
                      {/* Live demo badge */}
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-semibold text-white/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>
                        Live demo
                      </div>
                      <ChartForSection type={sec.chart} />
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Markets ───────────────────────────────────────────────────────────── */}
      <section id="markets" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full"/>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-10">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-300 text-xs font-semibold mb-6">
                <Globe className="w-3 h-3"/> Every market in the world
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="text-5xl lg:text-6xl font-black text-white mb-4">
                Not just forex.
                <br/>
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Every market.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                Type any ticker symbol. If Yahoo Finance has it, TradeFlow replays it.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { flag:<img src="https://flagcdn.com/w40/us.png" className="w-8 h-6 rounded object-cover" alt="US"/>, name:'US Stocks',   ex:'AAPL · NVDA · TSLA' },
              { flag:<img src="https://flagcdn.com/w40/in.png" className="w-8 h-6 rounded object-cover" alt="IN"/>, name:'India (NSE)', ex:'RELIANCE.NS · TCS.NS' },
              { flag:<span className="text-3xl">🌐</span>,                                                           name:'Forex',        ex:'EURUSD · GBPJPY · USDJPY' },
              { flag:<span className="text-3xl">₿</span>,                                                            name:'Crypto',       ex:'BTCUSD · ETHUSD · SOL' },
              { flag:<img src="https://flagcdn.com/w40/de.png" className="w-8 h-6 rounded object-cover" alt="DE"/>, name:'Germany',      ex:'SAP.DE · BMW.DE · SIE.DE' },
              { flag:<img src="https://flagcdn.com/w40/gb.png" className="w-8 h-6 rounded object-cover" alt="GB"/>, name:'UK (LSE)',      ex:'SHEL.L · HSBA.L · BP.L' },
              { flag:<img src="https://flagcdn.com/w40/jp.png" className="w-8 h-6 rounded object-cover" alt="JP"/>, name:'Japan (TSE)',  ex:'7203.T · 6758.T · 9984.T' },
              { flag:<span className="text-3xl">📊</span>,                                                           name:'Indices',      ex:'SPX500 · DAX40 · NIKKEI' },
            ].map((m, i) => (
              <Reveal key={m.name} delay={i * 0.05} direction="scale">
                <motion.div whileHover={{ scale: 1.04, borderColor: 'rgba(139,92,246,0.5)' }}
                  className="rounded-2xl border border-white/8 bg-white/3 p-5 cursor-default transition-colors">
                  <div className="mb-3 h-8 flex items-center">{m.flag}</div>
                  <div className="font-bold text-white mb-1">{m.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{m.ex}</div>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="mt-8 p-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl text-center">
              <p className="text-sm text-purple-300 leading-relaxed">
                <span className="font-bold text-purple-200">Tip:</span> Type any exchange suffix in Replay search —
                RELIANCE.NS · SAP.DE · SHEL.L · 7203.T · 0700.HK · BHP.AX · RY.TO · MC.PA · 005930.KS
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-8">
            <h2 className="text-5xl font-black text-white">Traders love it</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:'Rahul S.', role:'Prop Firm Trader', text:'Finally a journal + replay tool that works. The Indian NSE data is a game changer — I practice on RELIANCE, NIFTY, everything.', stars:5, grad:'from-purple-500 to-blue-600' },
              { name:'Lena M.',  role:'Forex Trader',     text:'I cancelled FXReplay. TradeFlow does everything I need for free. The chart replay is identical and Sanctuary is genuinely useful.', stars:5, grad:'from-emerald-500 to-teal-600' },
              { name:'James T.', role:'Day Trader',       text:'The Edge plan builder helped me stop overtrading. Win rate up from 52% to 68% in 6 weeks. Every trade now has a documented plan.', stars:5, grad:'from-violet-500 to-purple-600' },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <motion.div whileHover={{ y: -4, borderColor: 'rgba(139,92,246,0.3)' }}
                  className="rounded-2xl border border-white/8 bg-white/3 p-7 transition-all">
                  <div className="flex gap-1 mb-5">
                    {Array(t.stars).fill(0).map((_,j)=><Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400"/>)}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-white font-black`}>
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{t.name}</p>
                      <p className="text-gray-600 text-xs">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/8 blur-[120px] rounded-full"/>
        </div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-8">
            <Reveal><h2 className="text-5xl lg:text-6xl font-black text-white mb-4">Simple, honest pricing</h2></Reveal>
            <Reveal delay={0.1}><p className="text-gray-400 text-xl mb-5">Start free. Upgrade when you're serious.</p></Reveal>
            <Reveal delay={0.15}>
              <div className="inline-flex items-center gap-1 bg-white/4 border border-white/10 rounded-2xl p-1.5">
                {(['USD','EUR','INR'] as const).map(c => (
                  <motion.button key={c} onClick={() => setCurrency(c)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition ${currency===c?'bg-purple-600 text-white shadow-lg':'text-gray-500 hover:text-white'}`}>
                    {c==='USD'?'🇺🇸 USD':c==='EUR'?'🇪🇺 EUR':'🇮🇳 INR'}
                  </motion.button>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <Reveal direction="left">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-8 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-gray-400"/>
                  <span className="text-gray-400 text-sm font-black uppercase tracking-widest">Trader</span>
                </div>
                <div className="text-6xl font-black text-white mb-2">Free</div>
                <div className="text-gray-600 text-sm mb-8">Forever. No card needed.</div>
                <ul className="space-y-2.5 mb-6">
                  {['5 journal entries/day','Chart replay (150+ instruments)','3 edge plans','Economic calendar','$100k demo account','Sanctuary meditation'].map(f=>(
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0"/>{f}
                    </li>
                  ))}
                </ul>
                <motion.button whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.07)' }} whileTap={{ scale: 0.98 }}
                  onClick={goToAuth}
                  className="w-full py-3.5 rounded-xl border border-white/15 text-white font-bold transition">
                  Get started free
                </motion.button>
              </div>
            </Reveal>

            {/* Pro */}
            <Reveal direction="right" delay={0.1}>
              <div className="rounded-2xl p-px bg-gradient-to-br from-purple-500 via-violet-500 to-blue-600 shadow-2xl shadow-purple-500/25 h-full">
                <div className="rounded-2xl bg-[#0d0920] p-8 h-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 to-blue-900/15"/>
                  <div className="relative h-full flex flex-col">
                    <div className="absolute top-0 right-0 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-black text-[10px] font-black rounded-bl-xl rounded-tr-xl uppercase tracking-wider">
                      Coming Soon
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-5 h-5 text-amber-400"/>
                      <span className="text-amber-400 text-sm font-black uppercase tracking-widest">Edge Pro</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-6xl font-black text-white">{SYM[currency]}{PRICE[currency]}</span>
                      <span className="text-gray-500 text-lg">/mo</span>
                    </div>
                    <div className="text-gray-600 text-sm mb-8">Billed monthly. Cancel anytime.</div>
                    <ul className="space-y-3.5 mb-8 flex-1">
                      {['Unlimited everything','AI trade analysis & coaching','Prop firm challenge simulator','Monte Carlo analysis','MT4/MT5 CSV import','Priority support'].map(f=>(
                        <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                          <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                            <Lock className="w-2.5 h-2.5 text-purple-400"/>
                          </div>{f}
                        </li>
                      ))}
                    </ul>
                    {waitlisted ? (
                      <div className="w-full py-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm text-center">✓ You're on the waitlist!</div>
                    ) : (
                      <div className="space-y-2">
                        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white/8 border border-white/15 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400 transition"/>
                        <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(139,92,246,0.4)' }} whileTap={{ scale: 0.98 }}
                          onClick={() => { if(email) setWaitlisted(true) }}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black shadow-lg transition">
                          Join Pro waitlist
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}/>
        </div>
        <Particles count={20}/>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 1, ease: EASE_OUT }}>
            <p className="text-gray-600 text-sm uppercase tracking-widest font-semibold mb-6">Ready to level up?</p>
            <h2 className="text-6xl lg:text-8xl font-black text-white leading-tight mb-8">
              Stop guessing.<br/>
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                Start backtesting.
              </span>
            </h2>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              Your strategy shouldn't be tested with real money. Use TradeFlow to build confidence before you risk a single rupee, dollar or euro.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(139,92,246,0.6)' }}
                whileTap={{ scale: 0.96 }}
                onClick={goToAuth}
                className="px-12 py-5 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 text-white font-black text-xl rounded-2xl shadow-2xl shadow-purple-500/40 flex items-center gap-3 justify-center">
                Get started free <ArrowRight className="w-6 h-6"/>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.07)' }}
                whileTap={{ scale: 0.97 }}
                onClick={demoLogin}
                className="px-12 py-5 bg-white/4 text-white font-bold text-xl rounded-2xl border border-white/10 flex items-center gap-3 justify-center backdrop-blur-sm">
                <Play className="w-5 h-5 text-purple-400 fill-purple-400"/> Try demo
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white"/>
              </div>
              <span className="font-black text-white text-lg">TradeFlow</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-700">
              {['Features','Markets','Pricing'].map(i => <a key={i} href={`#${i.toLowerCase()}`} className="hover:text-gray-400 transition">{i}</a>)}
              <button onClick={goToAuth} className="hover:text-gray-400 transition">Sign in</button>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-700 text-sm">Not affiliated with TradingView or FXReplay. Data via Yahoo Finance.</p>
            <p className="text-gray-600 text-sm">Built with ❤️ by <span className="font-bold text-gray-400">Kishore JR</span></p>
          </div>
        </div>
      </footer>
    </div>
  )
}
