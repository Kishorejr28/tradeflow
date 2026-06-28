import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, ArrowRight, Check,
  RefreshCw, BookOpen, FileText, Leaf, Scissors,
  BarChart2, Newspaper, ChevronRight, Crown,
} from 'lucide-react'
import { TradeFlowLogo } from '@/components/ui/TradeFlowLogo'

// ─── THEME: Deep Emerald / Teal / Black (distinct from GoCharting purple) ────

// ─── Live ticker data (simulated live prices) ─────────────────────────────────
const TICKER_ITEMS = [
  { sym:'EURUSD', price:1.1158, chg:+0.0012, chgPct:+0.11 },
  { sym:'BTCUSD', price:67420, chg:-320, chgPct:-0.47 },
  { sym:'XAUUSD', price:3324, chg:+12.4, chgPct:+0.37 },
  { sym:'NVDA',   price:138.5, chg:+2.1, chgPct:+1.54 },
  { sym:'GBPUSD', price:1.2741, chg:-0.0021, chgPct:-0.16 },
  { sym:'NIFTY50',price:24182, chg:+85, chgPct:+0.35 },
  { sym:'ETHUSD', price:3480, chg:+45, chgPct:+1.31 },
  { sym:'USDJPY', price:157.38, chg:+0.42, chgPct:+0.27 },
  { sym:'AAPL',   price:298.0, chg:-1.2, chgPct:-0.40 },
  { sym:'SENSEX', price:74602, chg:-18, chgPct:-0.08 },
  { sym:'USOIL',  price:68.2, chg:-1.8, chgPct:-2.57 },
  { sym:'SOLUSD', price:152.5, chg:+3.2, chgPct:+2.14 },
  { sym:'SPX500', price:5312, chg:+22, chgPct:+0.42 },
  { sym:'GBPJPY', price:200.54, chg:+0.31, chgPct:+0.15 },
]

function LiveTicker() {
  const [prices, setPrices] = useState(TICKER_ITEMS.map(t => ({ ...t })))

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => prev.map(t => {
        const delta = (Math.random() - 0.5) * t.price * 0.001
        const newPrice = parseFloat((t.price + delta).toFixed(t.price > 1000 ? 0 : t.price > 10 ? 2 : 4))
        const newChg = parseFloat((newPrice - TICKER_ITEMS.find(i => i.sym === t.sym)!.price).toFixed(4))
        const newChgPct = parseFloat(((newChg / TICKER_ITEMS.find(i => i.sym === t.sym)!.price) * 100).toFixed(2))
        return { ...t, price: newPrice, chg: newChg, chgPct: newChgPct }
      }))
    }, 1800)
    return () => clearInterval(id)
  }, [])

  const repeated = [...prices, ...prices, ...prices]

  return (
    <div className="border-b border-white/8 bg-[#050d0a] overflow-hidden">
      <motion.div
        className="flex gap-0 whitespace-nowrap py-2"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
      >
        {repeated.map((t, i) => (
          <div key={i} className="inline-flex items-center gap-2.5 px-5 border-r border-white/5">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${t.chgPct >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}/>
            <span className="text-xs font-bold text-white/90 font-mono">{t.sym}</span>
            <span className="text-xs font-mono text-white/70">
              {t.price > 1000 ? t.price.toLocaleString() : t.price.toFixed(t.price > 10 ? 2 : 4)}
            </span>
            <span className={`text-[10px] font-semibold font-mono ${t.chgPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.chgPct >= 0 ? '▲' : '▼'}{Math.abs(t.chgPct).toFixed(2)}%
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Animated candlestick chart ───────────────────────────────────────────────
interface Candle { o: number; h: number; l: number; c: number }

function HeroChart() {
  const [candles, setCandles] = useState<Candle[]>([])
  const [ph, setPH] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const d: Candle[] = []; let price = 175
    for (let i = 0; i < 80; i++) {
      const o = price
      const move = Math.sin(i * 0.22) * 2.5 + (Math.random() - 0.46) * 4
      const c = Math.max(150, Math.min(210, o + move))
      const r = Math.abs(c - o) * 0.5 + Math.random() * 1.8
      d.push({ o, h: Math.max(o, c) + r, l: Math.min(o, c) - r, c })
      price = c
    }
    setCandles(d)
    setPH(22)
  }, [])

  useEffect(() => {
    if (!candles.length) return
    timerRef.current = setInterval(() => {
      setPH(p => p >= candles.length ? 18 : p + 1)
    }, 110)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [candles.length])

  const vis = candles.slice(0, ph)
  if (!vis.length) return null
  const maxP = Math.max(...vis.map(c => c.h))
  const minP = Math.min(...vis.map(c => c.l))
  const rng  = maxP - minP || 1
  const toY  = (p: number) => ((maxP - p) / rng) * 170

  const ema: [number, number][] = []
  if (vis.length > 8) {
    let e = vis.slice(0, 8).reduce((s, c) => s + c.c, 0) / 8
    for (let i = 8; i < vis.length; i++) { e = vis[i].c * 0.15 + e * 0.85; ema.push([i, e]) }
  }

  const cur = vis[vis.length - 1]
  const prev = vis[vis.length - 2]
  const chg = cur && prev ? cur.c - prev.c : 0

  return (
    <div className="rounded-2xl overflow-hidden bg-[#060f0c] border border-emerald-900/40 shadow-2xl shadow-emerald-500/10">
      {/* Chart header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#060f0c]">
        <div className="flex gap-1.5">
          {['bg-red-500/60','bg-amber-500/60','bg-emerald-500/60'].map((c,i) => <div key={i} className={`w-3 h-3 rounded-full ${c}`}/>)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-xs font-bold">AAPL</span>
          <span className="text-gray-500 text-xs font-mono">·</span>
          <span className="text-xs text-gray-500 font-mono">15m</span>
          {cur && <span className={`text-xs font-mono font-bold ml-1 ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cur.c.toFixed(2)}</span>}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>Live
        </div>
      </div>

      {/* SVG candles */}
      <div className="h-52 px-2 pt-2">
        <svg width="100%" height="100%" viewBox="0 0 700 170" preserveAspectRatio="none">
          {[0, 45, 90, 135].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>)}
          {vis.map((c, i) => {
            const x = (i / 79) * 675 + 12.5
            const bull = c.c >= c.o
            const col = bull ? '#10b981' : '#ef4444'
            const bt = Math.min(toY(c.o), toY(c.c))
            const bh = Math.max(1.5, Math.abs(toY(c.o) - toY(c.c)))
            const isLast = i === vis.length - 1
            return (
              <g key={i}>
                <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={col} strokeWidth="1" opacity={isLast ? 1 : 0.8}/>
                <rect x={x - 4} y={bt} width="8" height={bh} fill={col} rx="0.5"
                  opacity={isLast ? 1 : 0.85}
                  className={isLast ? 'animate-pulse' : ''}/>
              </g>
            )
          })}
          {ema.length > 2 && (
            <polyline
              points={ema.map(([i, v]) => `${(i / 79) * 675 + 12.5},${toY(v)}`).join(' ')}
              fill="none" stroke="#06b6d4" strokeWidth="1.8" opacity="0.8" strokeLinejoin="round"/>
          )}
        </svg>
      </div>

      {/* OHLC row */}
      {cur && (
        <div className="flex items-center gap-4 px-4 py-1.5 border-t border-white/5 text-[10px] font-mono text-gray-600">
          <span>O <span className="text-gray-300">{cur.o.toFixed(2)}</span></span>
          <span>H <span className="text-emerald-400">{cur.h.toFixed(2)}</span></span>
          <span>L <span className="text-red-400">{cur.l.toFixed(2)}</span></span>
          <span>C <span className={`font-bold ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cur.c.toFixed(2)}</span></span>
          <span className={`ml-auto ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {chg >= 0 ? '+' : ''}{chg.toFixed(2)} ({((chg / cur.c) * 100).toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Replay bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/5">
        <span className="text-[10px] text-gray-600 font-mono w-8">{ph}</span>
        <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
          <motion.div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full"
            animate={{ width: `${(ph / 80) * 100}%` }}
            transition={{ duration: 0.1 }}/>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white fill-white"/>
          </div>
          {['1×','4×','16×'].map(s => (
            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s === '1×' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-600'}`}>{s}</span>
          ))}
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 flex items-center gap-0.5 ml-1">
            <Scissors className="w-2.5 h-2.5"/> Cut
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Feature preview cards ─────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'replay',
    icon: RefreshCw,
    label: 'Chart Replay',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    accent: '#10b981',
    desc: 'Replay real historical data for any global stock, forex pair, or crypto — bar by bar with paper trading.',
    preview: (
      <div className="rounded-xl bg-[#060f0c] border border-emerald-900/30 p-3 text-[10px] font-mono">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-400 font-bold">EURUSD</span>
          <span className="text-gray-600">1D · 750 bars</span>
          <span className="ml-auto text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>Live data</span>
        </div>
        <div className="flex items-end gap-0.5 h-12 mb-2">
          {[40,55,48,62,58,70,65,80,72,85,78,62,68,75,82,88,95,82,90,98].map((h,i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height:`${h}%`, background: i%3===0?'#ef4444':'#10b981', opacity: 0.8 }}/>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full w-3/5"/></div>
          <span className="text-emerald-400">▶ 1×</span>
          <span className="text-amber-400">✂ Cut</span>
        </div>
      </div>
    ),
  },
  {
    id: 'journal',
    icon: FileText,
    label: 'Trading Journal',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    accent: '#06b6d4',
    desc: 'Log every trade with emotions, plan adherence and voice notes. Calendar view reveals your patterns.',
    preview: (
      <div className="rounded-xl bg-[#060f0c] border border-cyan-900/30 p-3 text-[10px]">
        <div className="grid grid-cols-5 gap-1 mb-2">
          {['M','T','W','T','F'].map(d => <div key={d} className="text-center text-gray-600 font-medium">{d}</div>)}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[null,320,-180,540,null,210,-90,380,-220,460,null,150,290,-130,610].map((v,i) => (
            <div key={i} className={`h-8 rounded text-[9px] font-bold flex items-center justify-center ${
              v === null ? 'bg-white/3' : v > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {v !== null ? (v > 0 ? `+${v}` : `${v}`) : ''}
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
          <span>Win rate</span><span className="text-emerald-400 font-bold">68%</span>
        </div>
      </div>
    ),
  },
  {
    id: 'trading',
    icon: BarChart2,
    label: 'Live Trading',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    accent: '#8b5cf6',
    desc: 'TradingView charts with multi-layout, $100k demo account, price alerts and pip calculator.',
    preview: (
      <div className="rounded-xl bg-[#060f0c] border border-violet-900/30 p-3 text-[10px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-violet-400 font-bold text-xs">DEMO</span>
          <span className="text-emerald-400 font-bold">$100,000</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button className="py-1.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">▲ BUY</button>
          <button className="py-1.5 rounded bg-red-500/15 text-red-400 font-bold text-[10px]">▼ SELL</button>
        </div>
        <div className="space-y-1 text-[9px]">
          {[['EURUSD','BUY','1.1158','+$42.30'],['XAUUSD','SELL','3324','-$12.80']].map(([sym,dir,price,pnl]) => (
            <div key={sym} className="flex items-center justify-between bg-white/3 rounded px-2 py-1">
              <span className="text-gray-400">{sym}</span>
              <span className={dir==='BUY'?'text-emerald-400':'text-red-400'}>{dir}</span>
              <span className="text-gray-500">{price}</span>
              <span className={parseFloat(pnl)>0?'text-emerald-400 font-bold':'text-red-400 font-bold'}>{pnl}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'edge',
    icon: BookOpen,
    label: 'Edge Plans',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    accent: '#f59e0b',
    desc: 'Build your trading playbook with step-by-step charting processes, entry criteria and rules.',
    preview: (
      <div className="rounded-xl bg-[#060f0c] border border-amber-900/30 p-3 text-[10px]">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500"/>
          <span className="text-white font-bold text-xs">Market Mechanics Plan</span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Active</span>
        </div>
        <div className="space-y-1.5">
          {['Mark HTF range + premium/discount','Mark liquidity (PDH/PDL)','Pick ONE opposing target','LQ Sweep entry model'].map((s,i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${i<3?'bg-emerald-500/20 text-emerald-400':'bg-white/5 text-gray-600'}`}>
                {i<3?'✓':i+1}
              </div>
              <span className={i<3?'text-gray-400':'text-gray-600'}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'news',
    icon: Newspaper,
    label: 'News & Calendar',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    accent: '#f43f5e',
    desc: 'Real-time market news + economic calendar filtered by currency and impact level.',
    preview: (
      <div className="rounded-xl bg-[#060f0c] border border-rose-900/30 p-3 text-[10px]">
        <div className="space-y-2">
          {[
            { time:'08:30', cur:'USD', impact:'high', event:'Non-Farm Payrolls', actual:'177K', fore:'185K' },
            { time:'10:00', cur:'EUR', impact:'high', event:'ECB Rate Decision', actual:'—', fore:'4.50%' },
            { time:'14:00', cur:'GBP', impact:'medium', event:'CPI y/y', actual:'—', fore:'2.1%' },
          ].map(e => (
            <div key={e.event} className="flex items-center gap-2">
              <span className="text-gray-600 w-8 font-mono">{e.time}</span>
              <span className="text-gray-400 w-6">{e.cur}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${e.impact==='high'?'bg-red-500':'bg-amber-400'}`}/>
              <span className="text-gray-400 flex-1 truncate">{e.event}</span>
              <span className={e.actual!=='—'?'text-emerald-400 font-bold':'text-gray-600'}>{e.actual}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'sanctuary',
    icon: Leaf,
    label: 'Sanctuary',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    accent: '#14b8a6',
    desc: 'Meditation timer with real ambient sounds — ocean, rain, forest, binaural beats. Build focus.',
    preview: (
      <div className="rounded-xl bg-[#060f0c] border border-teal-900/30 p-3 text-[10px]">
        <div className="flex justify-center mb-3">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
              <motion.circle cx="32" cy="32" r="28" fill="none" stroke="#14b8a6" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${2*Math.PI*28}`}
                initial={{ strokeDashoffset: `${2*Math.PI*28*0.8}` }}
                animate={{ strokeDashoffset: [`${2*Math.PI*28*0.8}`,`${2*Math.PI*28*0.2}`] }}
                transition={{ duration: 5, repeat: Infinity, repeatType:'reverse', ease:'easeInOut' }}/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg">🪷</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[['🌊','Ocean'],['🌧️','Rain'],['🌲','Forest'],['🎵','Bowl'],['✨','528Hz'],['🕉️','OM']].map(([e,l]) => (
            <div key={l} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg bg-white/3 text-[9px] text-gray-500">
              <span className="text-sm">{e}</span>{l}
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

// ─── Scroll reveal wrapper ────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 40, direction, className = '' }: {
  children: React.ReactNode; delay?: number; y?: number; direction?: 'left'|'right'|'scale'; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const initial = {
    opacity: 0,
    y: direction ? 0 : y,
    x: direction === 'left' ? -50 : direction === 'right' ? 50 : 0,
    scale: direction === 'scale' ? 0.9 : 1,
  }
  return (
    <motion.div ref={ref} className={className}
      initial={initial}
      animate={visible ? { opacity: 1, y: 0, x: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NewHomePage() {
  const navigate = useNavigate()
  const { setUser, setUserPlan, user } = useAppStore()
  const [activeFeature, setActiveFeature] = useState('replay')
  const [email, setEmail] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)
  const [currency, setCurrency] = useState<'USD'|'EUR'|'INR'>('USD')
  const isLoggedIn = !!user

  const PRICES = { USD:{ sym:'$', mo:12, yr:99 }, EUR:{ sym:'€', mo:11, yr:89 }, INR:{ sym:'₹', mo:999, yr:7999 } }

  const goToAuth = () => navigate('/auth')
  const demoLogin = () => {
    setUser({ id:'demo', email:'demo@tradeflow.app', full_name:'Demo Trader', timezone:'UTC', account_currency:'USD', created_at:new Date().toISOString() })
    setUserPlan('pro')
    navigate('/app/dashboard')
  }

  const currentFeature = FEATURES.find(f => f.id === activeFeature)!

  return (
    <div className="bg-[#030908] text-white min-h-screen overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <motion.nav initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ duration:0.6 }}
        className="fixed top-0 inset-x-0 z-50 bg-[#030908]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <motion.div whileHover={{ scale:1.06 }} transition={{ type:'spring', stiffness:300 }}>
              <TradeFlowLogo size={28}/>
            </motion.div>
            <span className="font-semibold text-white text-sm tracking-wide">
              TradeFlow
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label:'Features',     href:'#features' },
              { label:'How it Works', href:'#howitworks' },
              { label:'Markets',      href:'#markets' },
              { label:'Pricing',      href:'#pricing' },
              { label:'Blog',         href:'/blog',    external: true },
            ].map(item => (
              <a key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                {item.label}
                {item.external && (
                  <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold align-middle">Soon</span>
                )}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <>
                <button onClick={goToAuth} className="text-sm text-gray-500 hover:text-white transition">Sign in</button>
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  onClick={() => navigate('/app/dashboard')}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20">
                  Dashboard →
                </motion.button>
              </>
            ) : (
              <>
                <button onClick={goToAuth} className="text-sm text-gray-500 hover:text-white transition">Sign in</button>
                <motion.button whileHover={{ scale:1.03, boxShadow:'0 0 25px rgba(16,185,129,0.4)' }} whileTap={{ scale:0.97 }}
                  onClick={goToAuth}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20">
                  Get started free
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── Ticker ───────────────────────────────────────────────────────────── */}
      <div className="pt-16">
        <LiveTicker />
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        {/* Background glows — teal/emerald, not purple */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full" style={{ background:'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 65%)' }}/>
          <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-cyan-500/5 blur-[80px] rounded-full"/>
          <div className="absolute bottom-0 right-1/4 w-[250px] h-[200px] bg-teal-500/6 blur-[70px] rounded-full"/>
          {/* subtle grid */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage:'linear-gradient(rgba(16,185,129,0.06) 1px, transparent 1px),linear-gradient(90deg, rgba(16,185,129,0.06) 1px, transparent 1px)', backgroundSize:'50px 50px' }}/>
        </div>

        <div className="max-w-7xl mx-auto relative">
          {/* Top badge */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
            className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>
              Free forever · Real market data · 150+ instruments
            </div>
          </motion.div>

          {/* Headline centered */}
          <div className="text-center mb-10 max-w-4xl mx-auto">
            <motion.h1 initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2, duration:0.9, ease:[0.22,1,0.36,1] }}
              className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.92] mb-5">
              <span className="text-white">Practice trading.</span>
              <br/>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Without risking money.
              </span>
            </motion.h1>
            <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
              className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              Chart replay on real historical data. Trading journal. Edge plans. Meditation sanctuary.
              One platform built for traders who take their craft seriously.
            </motion.p>
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button whileHover={{ scale:1.04, boxShadow:'0 0 40px rgba(16,185,129,0.45)' }} whileTap={{ scale:0.96 }}
                onClick={goToAuth}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-lg rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-2">
                Start for free <ArrowRight className="w-5 h-5"/>
              </motion.button>
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                onClick={demoLogin}
                className="px-8 py-4 bg-white/5 hover:bg-white/8 text-white font-bold text-lg rounded-2xl border border-white/10 flex items-center gap-2 transition">
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400"/> Try demo now
              </motion.button>
            </motion.div>
          </div>

          {/* Big centered chart */}
          <motion.div initial={{ opacity:0, y:50, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ delay:0.5, duration:1, ease:[0.22,1,0.36,1] }}
            className="max-w-3xl mx-auto relative">
            <div className="absolute -inset-4 rounded-3xl" style={{ background:'radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)' }}/>
            <div className="relative">
              <HeroChart />
              {/* Floating badges */}
              <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }}
                className="absolute -top-4 -right-6 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-xl text-xs font-black text-white whitespace-nowrap hidden sm:block">
                📈 Real Yahoo Finance data
              </motion.div>
              <motion.div animate={{ y:[0,8,0] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut', delay:1.5 }}
                className="absolute -bottom-4 -left-6 px-3 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl shadow-xl text-xs font-black text-white whitespace-nowrap hidden sm:block">
                ✂ Cut point · Replay mode
              </motion.div>
            </div>
          </motion.div>

          {/* Stats row */}
          <Reveal delay={0.1} className="mt-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { n:'150+', l:'Instruments' },
                { n:'10y+',  l:'Historical data' },
                { n:'7',     l:'Asset classes' },
                { n:'Free',  l:'Forever' },
              ].map(s => (
                <div key={s.l} className="text-center p-4 rounded-2xl border border-white/5 bg-white/2">
                  <p className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{s.n}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────────────────── */}
      <section id="howitworks" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-3">How it works</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Three steps to trade better without risking real money.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0"/>
            {[
              { step:'01', icon:'🔍', title:'Pick an instrument', desc:'Search any global stock, forex pair, crypto or index. EURUSD, RELIANCE.NS, AAPL, BTCUSD — real data from Yahoo Finance.' },
              { step:'02', icon:'⏮️', title:'Replay the market', desc:'Wind back to any point in history. Advance bar by bar at your own speed. Paper trade, test your entry, see what actually happened.' },
              { step:'03', icon:'📓', title:'Log and review', desc:'After every session, log your trades in the journal. Track emotions, plan adherence, win rate. Spot patterns. Improve.' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.12}>
                <div className="relative p-6 rounded-2xl border border-white/6 bg-white/2 hover:bg-white/4 hover:border-emerald-500/20 transition-all group">
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="text-[10px] font-black text-emerald-500/60 tracking-widest mb-2 uppercase">{s.step}</div>
                  <h3 className="text-lg font-black text-white mb-2 group-hover:text-emerald-300 transition-colors">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="text-center mt-10">
            <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              onClick={goToAuth}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white"
              style={{ background:'linear-gradient(135deg, #059669, #0891b2)' }}>
              Start in 30 seconds — it's free <ArrowRight className="w-4 h-4"/>
            </motion.button>
          </Reveal>
        </div>
      </section>

      {/* ── Feature interactive showcase ─────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-3">
              Everything in one place.
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Six tools built for serious traders — click each to see a live preview.
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left: feature list */}
            <div className="space-y-2">
              {FEATURES.map((f, i) => (
                <Reveal key={f.id} delay={i * 0.06}>
                  <motion.button
                    onClick={() => setActiveFeature(f.id)}
                    whileHover={{ x: 4 }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                      activeFeature === f.id
                        ? `${f.bg} border-opacity-60`
                        : 'border-white/5 bg-white/2 hover:bg-white/4 hover:border-white/10'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f.bg}`}>
                        <f.icon className={`w-4 h-4 ${f.color}`}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${activeFeature === f.id ? 'text-white' : 'text-gray-300'}`}>{f.label}</p>
                        <p className="text-xs text-gray-500 truncate">{f.desc}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeFeature === f.id ? f.color + ' rotate-90' : 'text-gray-700'}`}/>
                    </div>
                  </motion.button>
                </Reveal>
              ))}
            </div>

            {/* Right: live preview */}
            <div className="lg:sticky lg:top-24">
              <Reveal direction="right" delay={0.2}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeFeature}
                    initial={{ opacity:0, x:20 }}
                    animate={{ opacity:1, x:0 }}
                    exit={{ opacity:0, x:-20 }}
                    transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}>
                    <div className={`rounded-3xl p-1 ${currentFeature.bg}`} style={{ border:`1px solid ${currentFeature.accent}22` }}>
                      <div className="rounded-2xl bg-[#060f0c] p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentFeature.bg}`}>
                            <currentFeature.icon className={`w-5 h-5 ${currentFeature.color}`}/>
                          </div>
                          <div>
                            <p className="text-white font-bold">{currentFeature.label}</p>
                            <p className="text-xs text-gray-500 max-w-xs">{currentFeature.desc}</p>
                          </div>
                        </div>
                        {currentFeature.preview}
                        <motion.button
                          whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                          onClick={isLoggedIn ? () => navigate('/app/dashboard') : goToAuth}
                          className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                          style={{ background:`linear-gradient(135deg, ${currentFeature.accent}cc, ${currentFeature.accent}88)` }}>
                          Try {currentFeature.label} free <ArrowRight className="w-4 h-4"/>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Markets marquee ───────────────────────────────────────────────────── */}
      <section id="markets" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-4xl font-black text-white mb-3">Every market. Any instrument.</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Type any ticker — RELIANCE.NS, SAP.DE, BTC, EURUSD, Gold — real data from Yahoo Finance.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { flag:'🇺🇸', name:'US Stocks', ex:'AAPL · NVDA · TSLA' },
              { flag:'🇮🇳', name:'India (NSE)', ex:'RELIANCE.NS · TCS' },
              { flag:'🌍', name:'Forex', ex:'EURUSD · GBPJPY · USDJPY' },
              { flag:'₿', name:'Crypto', ex:'BTCUSD · ETHUSD · SOL' },
              { flag:'🇩🇪', name:'Germany', ex:'SAP.DE · BMW.DE · SIE.DE' },
              { flag:'🇬🇧', name:'UK', ex:'SHEL.L · HSBA.L · BP.L' },
              { flag:'🇯🇵', name:'Japan', ex:'7203.T · 6758.T · 9984.T' },
              { flag:'📊', name:'Indices', ex:'SPX500 · DAX40 · NIKKEI' },
            ].map((m, i) => (
              <Reveal key={m.name} delay={i * 0.05} direction="scale">
                <motion.div whileHover={{ scale:1.03, borderColor:'rgba(16,185,129,0.4)' }}
                  className="rounded-2xl border border-white/6 bg-white/2 p-4 cursor-default transition-colors">
                  <div className="text-2xl mb-2">{m.flag}</div>
                  <div className="font-bold text-white text-sm mb-1">{m.name}</div>
                  <div className="text-[11px] text-gray-600 font-mono">{m.ex}</div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-3">Simple, honest pricing</h2>
            <p className="text-gray-400 text-lg mb-6">Start free. Upgrade when you're serious.</p>
            <div className="inline-flex items-center gap-1 bg-white/4 border border-white/8 rounded-2xl p-1.5">
              {(['USD','EUR','INR'] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${currency===c?'bg-emerald-600 text-white shadow':'text-gray-500 hover:text-white'}`}>
                  {c==='USD'?'🇺🇸 USD':c==='EUR'?'🇪🇺 EUR':'🇮🇳 INR'}
                </button>
              ))}
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <Reveal direction="left">
              <div className="rounded-2xl border border-white/8 bg-white/2 p-7 h-full">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Trader</div>
                <div className="text-5xl font-black text-white mb-6">Free</div>
                <ul className="space-y-3 mb-7">
                  {['Chart replay (150+ instruments)','Trading journal','Edge plan builder','$100k demo account','Sanctuary meditation','Economic calendar'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0"/>{f}
                    </li>
                  ))}
                </ul>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  onClick={goToAuth}
                  className="w-full py-3 rounded-xl border border-white/15 text-white font-bold hover:bg-white/5 transition">
                  Get started free
                </motion.button>
              </div>
            </Reveal>

            {/* Pro */}
            <Reveal direction="right" delay={0.1}>
              <div className="rounded-2xl p-px h-full" style={{ background:'linear-gradient(135deg, #10b981, #06b6d4, #14b8a6)', boxShadow:'0 0 40px rgba(16,185,129,0.15)' }}>
                <div className="rounded-2xl bg-[#060f0c] p-7 h-full relative overflow-hidden">
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-black text-[10px] font-black rounded-full uppercase tracking-wide">
                    Coming Soon
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400"/>
                    <span className="text-amber-400 text-xs font-black uppercase tracking-wider">Edge Pro</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-black text-white">{PRICES[currency].sym}{PRICES[currency].mo}</span>
                    <span className="text-gray-500 text-lg">/mo</span>
                  </div>
                  <ul className="space-y-3 mb-7">
                    {['Unlimited everything','AI trade analysis & coaching','Prop firm challenge simulator','2yr+ historical chart data','MT4/MT5 CSV import','Priority support'].map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0"/>{f}
                      </li>
                    ))}
                  </ul>
                  {waitlisted ? (
                    <div className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm text-center">✓ You're on the waitlist!</div>
                  ) : (
                    <div className="space-y-2">
                      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-white/8 border border-white/12 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"/>
                      <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                        onClick={() => { if(email) setWaitlisted(true) }}
                        className="w-full py-3 rounded-xl font-black text-white" style={{ background:'linear-gradient(135deg,#10b981,#06b6d4)' }}>
                        Join waitlist
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 65%)' }}/>
        <Reveal>
          <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
            Stop guessing.<br/>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Start backtesting.</span>
          </h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">
            Your strategy shouldn't be tested with real money. Build confidence before you risk a single rupee, dollar or euro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button whileHover={{ scale:1.04, boxShadow:'0 0 50px rgba(16,185,129,0.5)' }} whileTap={{ scale:0.96 }}
              onClick={goToAuth}
              className="px-12 py-5 font-black text-xl rounded-2xl text-white shadow-2xl shadow-emerald-500/30 flex items-center gap-3 justify-center"
              style={{ background:'linear-gradient(135deg,#059669,#0891b2)' }}>
              Get started free <ArrowRight className="w-6 h-6"/>
            </motion.button>
            <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={demoLogin}
              className="px-12 py-5 bg-white/5 hover:bg-white/8 text-white font-bold text-xl rounded-2xl border border-white/10 flex items-center gap-3 justify-center transition">
              <Play className="w-5 h-5 text-emerald-400 fill-emerald-400"/> Try demo
            </motion.button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <TradeFlowLogo size={28}/>
            <span className="font-semibold text-white text-sm tracking-wide">TradeFlow</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-700">
            {['Features','Markets','Pricing'].map(i => <a key={i} href={`#${i.toLowerCase()}`} className="hover:text-gray-400 transition">{i}</a>)}
            <button onClick={goToAuth} className="hover:text-gray-400 transition">Sign in</button>
          </div>
          <p className="text-gray-700 text-sm">Built with ❤️ by <span className="font-bold text-gray-500">Kishore JR</span></p>
        </div>
      </footer>
    </div>
  )
}
