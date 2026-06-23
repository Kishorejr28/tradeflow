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

// ── Chart 1: Animated candlestick (hero) ──────────────────────────────────────
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

  // EMA-like smooth line
  const ema: [number, number][] = []
  if (vis.length > 8) {
    let e = vis.slice(0,8).reduce((s,c)=>s+c.c,0)/8
    for (let i = 8; i < vis.length; i++) { e = vis[i].c * 0.16 + e * 0.84; ema.push([i, e]) }
  }

  const cur = vis[vis.length-1], prev = vis[vis.length-2]
  const chg = cur && prev ? cur.c - prev.c : 0

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0b0b1a] border border-white/8 shadow-2xl">
      {/* Top bar */}
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

      {/* SVG chart */}
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
          {ema.length>2&&<polyline
            points={ema.map(([i,v])=>`${(i/69)*598+11},${toY(v)}`).join(' ')}
            fill="none" stroke="#818cf8" strokeWidth="1.8" opacity="0.75" strokeLinejoin="round"/>}
        </svg>
      </div>

      {/* OHLC row */}
      {cur && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 text-[10px] font-mono text-gray-500">
          <span>O <span className="text-gray-300">{cur.o.toFixed(2)}</span></span>
          <span>H <span className="text-emerald-400">{cur.h.toFixed(2)}</span></span>
          <span>L <span className="text-red-400">{cur.l.toFixed(2)}</span></span>
          <span>C <span className={`font-bold ${chg>=0?'text-emerald-400':'text-red-400'}`}>{cur.c.toFixed(2)}</span></span>
          <span className={`ml-auto ${chg>=0?'text-emerald-400':'text-red-400'}`}>{chg>=0?'+':''}{chg.toFixed(2)} ({((chg/cur.c)*100).toFixed(2)}%)</span>
        </div>
      )}

      {/* Replay bar */}
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

// ── Chart 2: Journal P&L calendar visual ──────────────────────────────────────
function JournalCalendarChart() {
  const days = ['Mon','Tue','Wed','Thu','Fri']
  const weeks = [
    [null, 320, -180, 540, null],
    [210, -90, 380, -220, 460],
    [null, 150, 290, -130, 610],
    [-80, 420, null, 180, -250],
  ]
  return (
    <div className="rounded-2xl bg-[#0b0b1a] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Trading Journal</p>
          <p className="text-white font-bold text-sm mt-0.5">June 2026</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Month P&L</p>
          <p className="text-emerald-400 font-black text-lg">+$2,410</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {days.map(d=><div key={d} className="text-center text-[9px] text-gray-600 font-medium">{d}</div>)}
      </div>
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-5 gap-1.5">
            {week.map((pnl, di) => (
              <motion.div key={di}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: wi * 0.08 + di * 0.03, duration: 0.4 }}
                className={`h-10 rounded-lg flex flex-col items-center justify-center text-[9px] font-bold cursor-default transition-all hover:scale-105 ${
                  pnl === null ? 'bg-white/3 border border-white/5 text-gray-700' :
                  pnl > 0 ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' :
                  'bg-red-500/15 border border-red-500/25 text-red-400'
                }`}>
                {pnl !== null && (
                  <>
                    <span>{pnl > 0 ? '▲' : '▼'}</span>
                    <span>{pnl > 0 ? '+' : ''}{pnl}</span>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30 inline-block"/>Win</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/15 border border-red-500/25 inline-block"/>Loss</span>
        <span className="ml-auto font-medium text-gray-400">Win rate: 68%</span>
      </div>
    </div>
  )
}

// ── Chart 3: Equity curve ─────────────────────────────────────────────────────
function EquityCurve() {
  const points = [100,104,102,108,106,113,110,118,115,122,120,128,125,133,130,138,142,139,147,145,152]
  const maxP = Math.max(...points), minP = Math.min(...points), rng = maxP - minP
  const toY = (p: number) => 120 - ((p - minP) / rng) * 100

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 340
    const y = toY(p)
    return i === 0 ? `M ${x} ${y}` : `C ${x - 10} ${y + 2}, ${x - 5} ${y - 2}, ${x} ${y}`
  }).join(' ')

  const fillD = `${pathD} L 340 140 L 0 140 Z`

  return (
    <div className="rounded-2xl bg-[#0b0b1a] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Equity Curve</p>
          <p className="text-white font-bold text-sm mt-0.5">+52% since January</p>
        </div>
        <div className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20">
          ↑ Growing
        </div>
      </div>
      <svg width="100%" height="140" viewBox="0 0 360 140" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 40, 80, 120].map(y=><line key={y} x1="0" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>)}
        <motion.path d={fillD} fill="url(#eq-grad)"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}/>
        <motion.path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinejoin="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.8, ease: EASE_OUT }}/>
        {points.map((p, i) => (
          <motion.circle key={i} cx={(i/(points.length-1))*340} cy={toY(p)} r="3" fill="#8b5cf6"
            initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.3 }}/>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-mono">
        <span>Jan</span><span>Mar</span><span>May</span><span>Jun</span>
      </div>
    </div>
  )
}

// ── Chart 4: Edge Plan builder preview ────────────────────────────────────────
function EdgePlanChart() {
  const steps = [
    { num: 1, text: 'Mark HTF range + premium/discount', done: true },
    { num: 2, text: 'Mark liquidity (PDH/PDL, equal H/L)', done: true },
    { num: 3, text: 'Pick ONE opposing target', done: true },
    { num: 4, text: 'Wait for LQ Sweep entry model', done: false },
    { num: 5, text: 'Define invalidation level', done: false },
  ]
  const criteria = ['LQ Sweep', 'Market Shift', 'Breakout Candle']

  return (
    <div className="rounded-2xl bg-[#0b0b1a] border border-white/8 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-red-500"/>
        <span className="text-white font-bold text-sm">Market Mechanics Plan</span>
        <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">Active</span>
      </div>

      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2">Charting Process</p>
      <div className="space-y-2 mb-4">
        {steps.map((s, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-2.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-px ${
              s.done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-600 border border-white/10'
            }`}>{s.done ? '✓' : s.num}</div>
            <span className={`text-[11px] leading-tight ${s.done ? 'text-gray-400' : 'text-gray-600'}`}>{s.text}</span>
          </motion.div>
        ))}
      </div>

      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2">Entry Criteria</p>
      <div className="flex flex-wrap gap-1.5">
        {criteria.map(c => (
          <span key={c} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 font-medium">{c}</span>
        ))}
      </div>

      <div className="mt-4 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
        <p className="text-[10px] text-amber-400 font-semibold">Invalidation</p>
        <p className="text-[10px] text-amber-400/70 mt-0.5">Price breaks + holds beyond key HTF level</p>
      </div>
    </div>
  )
}

// ── Chart 5: Sanctuary mood ────────────────────────────────────────────────────
function SanctuaryCard() {
  const [active, setActive] = useState('ocean')
  const sounds = [
    { v:'ocean', e:'🌊', l:'Ocean' }, { v:'rain', e:'🌧️', l:'Rain' },
    { v:'forest', e:'🌲', l:'Forest' }, { v:'bowl', e:'🎵', l:'Bowl' },
    { v:'528hz', e:'✨', l:'528 Hz' }, { v:'om', e:'🕉️', l:'OM Drone' },
  ]
  return (
    <div className="rounded-2xl bg-[#0b0b1a] border border-white/8 p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=60)` }}/>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Sanctuary</p>
            <p className="text-white font-bold text-sm mt-0.5">Meditation · Focus</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white tabular-nums">08:42</p>
            <p className="text-[10px] text-gray-500">remaining</p>
          </div>
        </div>

        {/* Circle timer */}
        <div className="flex justify-center mb-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
              <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#8b5cf6" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*34}`}
                initial={{ strokeDashoffset: `${2*Math.PI*34*0.9}` }}
                animate={{ strokeDashoffset: [`${2*Math.PI*34*0.9}`, `${2*Math.PI*34*0.3}`] }}
                transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl">🪷</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {sounds.map(s => (
            <button key={s.v} onClick={() => setActive(s.v)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-medium transition border ${
                active===s.v ? 'border-purple-500/50 bg-purple-500/15 text-purple-300' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/10'
              }`}>
              <span className="text-sm">{s.e}</span>
              <span>{s.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
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
    chart: 'hero',
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
]

function ChartForSection({ type }: { type: string }) {
  if (type === 'hero')    return <HeroChart />
  if (type === 'journal') return <JournalCalendarChart />
  if (type === 'equity')  return <EquityCurve />
  if (type === 'edge')    return <EdgePlanChart />
  if (type === 'sanctuary') return <SanctuaryCard />
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
    <div className="relative overflow-hidden py-4 border-y border-white/5 bg-white/1">
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
  const heroY       = useTransform(scrollYProgress, [0, 0.35], [0, -100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroScale   = useTransform(scrollYProgress, [0, 0.3], [1, 0.96])

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
        className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#070714]/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <TrendingUp className="w-4 h-4 text-white"/>
            </motion.div>
            <span className="font-black text-lg">TradeFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            {['Features','Markets','Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="hover:text-white transition-colors duration-200">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/app/dashboard')}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/25">
                Dashboard →
              </motion.button>
            ) : (
              <>
                <button onClick={goToAuth} className="text-sm text-gray-500 hover:text-white transition">Sign in</button>
                <motion.button whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(139,92,246,0.4)' }} whileTap={{ scale: 0.96 }}
                  onClick={goToAuth}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/25">
                  Get started free
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Multi-layer background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}/>
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-blue-500/6 blur-[80px] rounded-full"/>
          <div className="absolute bottom-1/3 right-1/4 w-[250px] h-[250px] bg-violet-500/8 blur-[70px] rounded-full"/>
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        </div>
        <Particles count={30}/>

        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-20 items-center py-20 relative z-10">
          {/* Left */}
          <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}>
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/8 text-purple-300 text-xs font-semibold mb-10 tracking-wide">
                <Zap className="w-3 h-3 fill-purple-400 text-purple-400"/>
                FREE alternative to FXReplay · No credit card
              </div>
            </Reveal>

            <div className="mb-8 overflow-hidden">
              <motion.h1
                initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.15, ease: EASE_OUT }}
                className="text-6xl lg:text-8xl font-black tracking-tight leading-[0.92] mb-3">
                <span className="block text-white">Practice</span>
                <span className="block bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                  trading.
                </span>
                <span className="block text-white mt-1">Without</span>
                <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  losing money.
                </span>
              </motion.h1>
            </div>

            <Reveal delay={0.3}>
              <p className="text-xl text-gray-400 max-w-lg leading-relaxed mb-10">
                Chart replay on real market data. Journal. Edge plans. Meditation.
                Everything a serious trader needs — in one beautiful platform.
              </p>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 0 50px rgba(139,92,246,0.5)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={goToAuth}
                  className="px-9 py-4.5 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 text-white font-black text-lg rounded-2xl shadow-2xl shadow-purple-500/30 flex items-center gap-3 justify-center py-5">
                  Start for free <ArrowRight className="w-5 h-5"/>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.07)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={demoLogin}
                  className="px-9 py-5 bg-white/4 text-white font-bold text-lg rounded-2xl border border-white/10 flex items-center gap-3 justify-center backdrop-blur-sm">
                  <Play className="w-4 h-4 text-purple-400 fill-purple-400"/>
                  Try demo now
                </motion.button>
              </div>
            </Reveal>

            <Reveal delay={0.55}>
              <div className="grid grid-cols-3 gap-8 mt-14 pt-10 border-t border-white/5">
                {[{ n: 150, s: '+', l: 'Instruments' }, { n: 10, s: 'y+', l: 'Data depth' }, { n: 7, s: '', l: 'Asset classes' }].map(s => (
                  <div key={s.l}>
                    <p className="text-4xl font-black bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">{s.n}{s.s}</p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">{s.l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </motion.div>

          {/* Right — chart */}
          <Reveal direction="right" delay={0.3}>
            <div className="relative">
              <motion.div
                className="absolute -inset-6 rounded-3xl"
                style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}/>
              <div className="relative">
                <HeroChart />
                {/* Floating badges */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-5 -right-5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-xl text-xs font-black text-white whitespace-nowrap">
                  📈 NVDA +2.8%
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                  className="absolute -bottom-5 -left-5 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl shadow-xl text-xs font-black text-white whitespace-nowrap flex items-center gap-1.5">
                  <Scissors className="w-3 h-3"/> Cut point active
                </motion.div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Ticker marquee ────────────────────────────────────────────────────── */}
      <MarqueeTicker />

      {/* ── Feature sections (Apple-style: big scroll reveals) ────────────────── */}
      <section id="features">
        {FEATURE_SECTIONS.map((sec, idx) => (
          <div key={sec.tag} className="relative min-h-screen flex items-center py-32 px-6 overflow-hidden">
            {/* Alternating bg glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className={`absolute w-[600px] h-[400px] blur-[120px] rounded-full ${
                idx % 2 === 0 ? 'top-1/2 left-0 -translate-y-1/2 bg-purple-600/6' : 'top-1/2 right-0 -translate-y-1/2 bg-blue-600/6'
              }`}/>
            </div>

            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center">
              {/* Text — alternates left/right */}
              <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                <Reveal delay={0.1}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold mb-8 ${sec.tagColor}`}>
                    {sec.tag}
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
                  <p className="text-gray-400 text-lg leading-relaxed mb-8">{sec.body}</p>
                </Reveal>

                <ul className="space-y-3 mb-10">
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
                    <motion.div
                      className="absolute -inset-6 rounded-3xl opacity-40"
                      style={{ background: `radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)` }}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}/>
                    <div className="relative">
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
      <section id="markets" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/6 blur-[120px] rounded-full"/>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
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
              { flag:'🇺🇸', name:'US Stocks',    ex:'AAPL · NVDA · TSLA' },
              { flag:'🇮🇳', name:'India (NSE)',  ex:'RELIANCE.NS · TCS.NS' },
              { flag:'🌍', name:'Forex',          ex:'EURUSD · GBPJPY · USDJPY' },
              { flag:'₿',  name:'Crypto',         ex:'BTCUSD · ETHUSD · SOL' },
              { flag:'🇩🇪', name:'Germany',      ex:'SAP.DE · BMW.DE · SIE.DE' },
              { flag:'🇬🇧', name:'UK (LSE)',      ex:'SHEL.L · HSBA.L · BP.L' },
              { flag:'🇯🇵', name:'Japan (TSE)',   ex:'7203.T · 6758.T · 9984.T' },
              { flag:'📊', name:'Indices',         ex:'SPX500 · DAX40 · NIKKEI' },
            ].map((m, i) => (
              <Reveal key={m.name} delay={i * 0.05} direction="scale">
                <motion.div whileHover={{ scale: 1.04, borderColor: 'rgba(139,92,246,0.5)' }}
                  className="rounded-2xl border border-white/8 bg-white/3 p-5 cursor-default transition-colors">
                  <div className="text-3xl mb-3">{m.flag}</div>
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
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
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
      <section id="pricing" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/8 blur-[120px] rounded-full"/>
        </div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <Reveal><h2 className="text-5xl lg:text-6xl font-black text-white mb-4">Simple, honest pricing</h2></Reveal>
            <Reveal delay={0.1}><p className="text-gray-400 text-lg mb-8">Start free. Upgrade when you're serious.</p></Reveal>
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
                <ul className="space-y-3.5 mb-8">
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
      <section className="py-40 px-6 relative overflow-hidden">
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
            <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
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
