import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion'
import {
  TrendingUp, Play, ArrowRight, Check, Star, ChevronRight,
  BarChart2, FileText, BookOpen, Newspaper, Leaf, NotebookPen,
  RefreshCw, Target, Zap, Globe, Sparkles, Lock, Shield, Crown,
} from 'lucide-react'

// ── Animated candlestick chart ─────────────────────────────────────────────────
interface Candle { o:number; h:number; l:number; c:number }
function AnimatedChart() {
  const [candles, setCandles] = useState<Candle[]>([])
  const [ph, setPH] = useState(0)
  const frameRef = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(() => {
    const data: Candle[] = []
    let price = 172
    for (let i = 0; i < 60; i++) {
      const o = price
      const move = Math.sin(i * 0.3) * 1.5 + (Math.random() - 0.45) * 3
      const c = Math.max(140, Math.min(210, o + move))
      const range = Math.abs(c - o) + Math.random() * 2
      data.push({ o, h: Math.max(o, c) + range * 0.4, l: Math.min(o, c) - range * 0.4, c })
      price = c
    }
    setCandles(data)
    setPH(20)
  }, [])

  useEffect(() => {
    if (!candles.length) return
    frameRef.current = setInterval(() => {
      setPH(p => p >= candles.length ? 15 : p + 1)
    }, 140)
    return () => { if (frameRef.current) clearInterval(frameRef.current) }
  }, [candles.length])

  const visible = candles.slice(0, ph)
  if (!visible.length) return null
  const prices = visible.flatMap(c => [c.h, c.l])
  const maxP = Math.max(...prices), minP = Math.min(...prices), range = maxP - minP || 1
  const toY = (p: number) => ((maxP - p) / range) * 160

  const cur = visible[visible.length - 1]
  const prev = visible[visible.length - 2]
  const chg = cur && prev ? cur.c - prev.c : 0

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d1a] shadow-2xl shadow-purple-500/10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60"/>
          <div className="w-3 h-3 rounded-full bg-amber-500/60"/>
          <div className="w-3 h-3 rounded-full bg-emerald-500/60"/>
        </div>
        <span className="text-xs text-gray-400 font-mono">AAPL · 1D</span>
        {cur && (
          <span className={`text-xs font-mono font-bold ml-1 ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {cur.c.toFixed(2)}
            <span className="ml-1 text-[10px]">{chg >= 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}</span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>
          Live data
        </span>
      </div>

      {/* Chart */}
      <div className="relative h-44 px-2 pt-3 pb-1">
        <svg width="100%" height="100%" viewBox="0 0 580 160" preserveAspectRatio="none">
          {[0, 40, 80, 120, 160].map(y => (
            <line key={y} x1="0" y1={y} x2="580" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          ))}
          {visible.map((c, i) => {
            const x = (i / 59) * 560 + 10
            const bull = c.c >= c.o
            const color = bull ? '#22c55e' : '#ef4444'
            const bodyTop = Math.min(toY(c.o), toY(c.c))
            const bodyH = Math.max(1.5, Math.abs(toY(c.o) - toY(c.c)))
            const isLast = i === visible.length - 1
            return (
              <g key={i}>
                <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={color} strokeWidth="1"/>
                <rect x={x - 3.5} y={bodyTop} width="7" height={bodyH} fill={color} rx="0.5"
                  opacity={isLast ? 1 : 0.85}
                  className={isLast ? 'animate-pulse' : ''}/>
              </g>
            )
          })}
          {/* EMA line */}
          {visible.length > 10 && (() => {
            const ema: number[] = []
            let e = visible.slice(0,10).reduce((s,c)=>s+c.c,0)/10
            ema.push(e)
            for (let i=10;i<visible.length;i++){e=visible[i].c*0.18+e*0.82;ema.push(e)}
            const pts = ema.map((v,i) => `${((i+10)/59)*560+10},${toY(v)}`).join(' ')
            return <polyline points={pts} fill="none" stroke="#818cf8" strokeWidth="1.5" opacity="0.7" strokeLinejoin="round"/>
          })()}
        </svg>
        {/* Playhead */}
        <div className="absolute top-0 bottom-0 w-px bg-purple-500/30"
          style={{ left: `${Math.min(97, ((ph - 1) / 59) * 97 + 1.5)}%` }}/>
      </div>

      {/* Playback bar */}
      <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-3">
        <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
          <motion.div className="bg-purple-500 h-1.5 rounded-full"
            animate={{ width: `${(ph / candles.length) * 100}%` }}
            transition={{ duration: 0.15 }}/>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white fill-white"/>
          </div>
          {['1×','4×','16×'].map(s => (
            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s==='1×'?'bg-purple-500/20 text-purple-400':'bg-white/5 text-gray-500'}`}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Floating particle background ───────────────────────────────────────────────
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({length: 20}).map((_, i) => (
        <motion.div key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-500/30"
          initial={{ x: `${Math.random()*100}%`, y: `${Math.random()*100}%`, opacity: 0 }}
          animate={{ y: [`${Math.random()*100}%`, `${Math.random()*100}%`], opacity: [0, 0.6, 0] }}
          transition={{ duration: 4 + Math.random()*6, repeat: Infinity, delay: Math.random()*5, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

// ── Animated feature card ──────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color, delay }: {
  icon: React.ElementType; title: string; desc: string; color: string; delay: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6 hover:border-purple-500/30 hover:bg-white/5 transition-all duration-300 cursor-default overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-blue-500/5 transition-all duration-500 rounded-2xl"/>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-6 h-6 text-white"/>
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

// ── Stats counter ──────────────────────────────────────────────────────────────
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = to / 40
    const t = setInterval(() => {
      start = Math.min(start + step, to)
      setVal(Math.floor(start))
      if (start >= to) clearInterval(t)
    }, 30)
    return () => clearInterval(t)
  }, [inView, to])
  return <span ref={ref}>{val}{suffix}</span>
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: RefreshCw,   title: 'Chart Replay',     desc: 'Replay real historical data for any global market. 150+ instruments, real prices from Yahoo Finance.',                  color: 'bg-gradient-to-br from-purple-500 to-blue-600',  delay: 0.0 },
  { icon: FileText,    title: 'Trading Journal',   desc: 'Log trades with emotion tracking, plan adherence notes and voice reflections. Calendar view reveals your patterns.',    color: 'bg-gradient-to-br from-emerald-500 to-teal-600', delay: 0.1 },
  { icon: BookOpen,    title: 'Edge Plans',        desc: 'Build your trading playbook — step-by-step charting processes, entry criteria and invalidation rules.',                  color: 'bg-gradient-to-br from-blue-500 to-indigo-600',  delay: 0.2 },
  { icon: BarChart2,   title: 'Live Trading',      desc: 'TradingView charts with multi-layout, watchlist, price alerts, pip calculator and a $100k demo account.',             color: 'bg-gradient-to-br from-violet-500 to-purple-600',delay: 0.3 },
  { icon: Newspaper,   title: 'News & Calendar',   desc: 'Real-time market news + economic calendar with currency and impact filters. Stay ahead of every market move.',         color: 'bg-gradient-to-br from-orange-500 to-rose-600',  delay: 0.4 },
  { icon: NotebookPen, title: 'Notebook',          desc: 'Personal trading library — notes, templates, daily reviews and pre-market prep all in one organised space.',           color: 'bg-gradient-to-br from-pink-500 to-rose-600',    delay: 0.5 },
  { icon: Leaf,        title: 'Sanctuary',         desc: 'Meditation timer with real ambient sounds — ocean, rain, forest, binaural beats. Build focus before every session.',   color: 'bg-gradient-to-br from-teal-500 to-emerald-600', delay: 0.6 },
  { icon: Target,      title: 'Performance Stats', desc: 'Equity curve, win rate, avg R, P&L calendar. See exactly what is and isn\'t working in your trading.',               color: 'bg-gradient-to-br from-amber-500 to-orange-600', delay: 0.7 },
]

const MARKETS = [
  { flag:'🇺🇸', name:'US Stocks',    ex:'AAPL · NVDA · TSLA' },
  { flag:'🇮🇳', name:'India (NSE)',  ex:'RELIANCE.NS · TCS' },
  { flag:'🌍', name:'Forex',          ex:'EURUSD · GBPJPY' },
  { flag:'₿',  name:'Crypto',         ex:'BTCUSD · ETHUSD' },
  { flag:'🇩🇪', name:'Germany',      ex:'SAP.DE · BMW.DE' },
  { flag:'🇬🇧', name:'UK',           ex:'SHEL.L · HSBA.L' },
  { flag:'🇯🇵', name:'Japan',        ex:'7203.T · 6758.T' },
  { flag:'📊', name:'Indices',         ex:'SPX500 · DAX40' },
]

const TESTIMONIALS = [
  { name:'Rahul S.', role:'Prop Firm Trader', text:'Finally a journal + replay tool that actually works. The Indian NSE data is a game changer.', stars:5, avatar:'R' },
  { name:'Lena M.',  role:'Forex Trader',     text:'I cancelled my FXReplay subscription. TradeFlow does everything I need and Sanctuary is a bonus.', stars:5, avatar:'L' },
  { name:'James T.', role:'Day Trader',       text:'The Edge plan builder helped me stop overtrading. Win rate up from 52% to 68% in 6 weeks.', stars:5, avatar:'J' },
]

const FREE_FEATURES = ['5 journal entries/day','Chart replay (all instruments)','3 edge plans','Economic calendar','$100k demo account','Sanctuary meditation']
const PRO_FEATURES  = ['Unlimited everything','AI trade analysis & coaching','Prop firm simulator','Monte Carlo analysis','MT4/MT5 CSV import','Priority support']

export default function PremiumLandingPage() {
  const navigate = useNavigate()
  const { setUser, setUserPlan, user } = useAppStore()
  const [email, setEmail] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)
  const [currency, setCurrency] = useState<'USD'|'EUR'|'INR'>('USD')
  const isLoggedIn = !!user

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3])

  const PRICE = { USD: 12, EUR: 11, INR: 999 }
  const SYM   = { USD: '$', EUR: '€', INR: '₹' }

  const goToAuth = () => navigate('/auth')
  const demoLogin = () => {
    setUser({ id:'demo', email:'demo@tradeflow.app', full_name:'Demo Trader', timezone:'UTC', account_currency:'USD', created_at:new Date().toISOString() })
    setUserPlan('pro')
    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#070714] text-white overflow-x-hidden">

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#070714]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <TrendingUp className="w-4 h-4 text-white"/>
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">TradeFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            {['Features','Markets','Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/app/dashboard')}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20">
                Go to dashboard →
              </motion.button>
            ) : (
              <>
                <button onClick={goToAuth} className="text-sm text-gray-400 hover:text-white transition">Sign in</button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={goToAuth}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20">
                  Get started free
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 pb-20 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full"/>
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/8 blur-[100px] rounded-full"/>
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[250px] bg-violet-500/8 blur-[80px] rounded-full"/>
        </div>
        <ParticleField />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left */}
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-8">
              <Zap className="w-3 h-3"/>
              Free forever · No credit card needed
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl lg:text-7xl font-black tracking-tight leading-none mb-6">
              <span className="text-white">Practice</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                trading.
              </span>
              <br/>
              <span className="text-white">Without</span>{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                losing money.
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="text-lg text-gray-400 max-w-lg leading-relaxed mb-10">
              Chart replay on real market data. Trading journal. Edge plans. Economic calendar. Sanctuary meditation.
              Everything a serious trader needs — all in one platform.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4 mb-8">
              <motion.button whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(139,92,246,0.4)' }} whileTap={{ scale: 0.97 }}
                onClick={goToAuth}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-purple-500/30 flex items-center gap-2 justify-center">
                Start for free <ArrowRight className="w-5 h-5"/>
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={demoLogin}
                className="px-8 py-4 bg-white/5 hover:bg-white/8 text-white font-semibold text-lg rounded-2xl border border-white/10 flex items-center gap-2 justify-center backdrop-blur-sm transition">
                <Play className="w-4 h-4 text-purple-400 fill-purple-400"/>
                Try demo
              </motion.button>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-xs text-gray-600">
              No credit card · No account needed for demo · Free plan available
            </motion.p>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/5">
              {[
                { to: 150, suffix: '+', label: 'Instruments' },
                { to: 10,  suffix: 'y+', label: 'Historical data' },
                { to: 7,   suffix: '',   label: 'Asset classes' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-3xl font-black bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                    <CountUp to={s.to} suffix={s.suffix}/>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — animated chart */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative">
            {/* Glow behind chart */}
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-2xl rounded-3xl"/>
            <div className="relative">
              <AnimatedChart />
              {/* Floating badges */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-xl text-xs font-bold text-white">
                📈 +2.4% today
              </motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 px-3 py-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl shadow-xl text-xs font-bold text-white">
                ✂ Cut point · Replay
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full"/>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium mb-6">
              <Sparkles className="w-3 h-3"/> Everything you need
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              8 tools. One platform.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built for serious traders who want to improve consistency, not just track trades.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => <FeatureCard key={f.title} {...f}/>)}
          </div>
        </div>
      </section>

      {/* ── Chart Replay Highlight ────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent pointer-events-none"/>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-8">
              <RefreshCw className="w-3 h-3"/> Chart Replay
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              Replay any market.<br/>
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Master every move.
              </span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Real price history from Yahoo Finance — not synthetic data. Replay bar by bar, place paper trades, test your strategy against actual market conditions.
            </p>
            <ul className="space-y-3 mb-10">
              {[
                'Real data for any global stock, forex or crypto',
                'Type any ticker — RELIANCE.NS, SAP.DE, 7203.T',
                'SMA, EMA, Bollinger Bands, RSI, MACD',
                'Paper trade during replay with live P&L',
                'Scissors cut point — jump to any moment',
                'Speed: 1× to 32×',
              ].map(item => (
                <motion.li key={item} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  className="flex items-center gap-3 text-gray-300 text-sm">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-purple-400"/>
                  </div>
                  {item}
                </motion.li>
              ))}
            </ul>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={isLoggedIn ? () => navigate('/app/replay') : goToAuth}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20">
              Try chart replay free <ChevronRight className="w-4 h-4"/>
            </motion.button>
          </motion.div>

          {/* Animated second chart */}
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-r from-purple-600/15 to-blue-600/15 blur-3xl rounded-3xl"/>
              <AnimatedChart />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Markets ───────────────────────────────────────────────────────────── */}
      <section id="markets" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium mb-6">
              <Globe className="w-3 h-3"/> Every market in the world
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              Not just forex. Every market.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Type any ticker symbol. If Yahoo Finance has it, TradeFlow can replay it.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {MARKETS.map((m, i) => (
              <motion.div key={m.name}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03, borderColor: 'rgba(139,92,246,0.4)' }}
                className="rounded-xl border border-white/8 bg-white/3 p-4 cursor-default transition-colors">
                <div className="text-2xl mb-2">{m.flag}</div>
                <div className="font-bold text-white text-sm mb-1">{m.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">{m.ex}</div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl text-center">
            <p className="text-sm text-purple-300">
              <span className="font-bold">Tip:</span> Type any exchange suffix — RELIANCE.NS (India), SAP.DE (Germany), SHEL.L (UK), 7203.T (Toyota), 0700.HK (Tencent)
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Traders love it</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/8 bg-white/3 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 hover:from-purple-500/5 hover:to-blue-500/5 transition-all"/>
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_,j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400"/>)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{t.avatar}</div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/8 blur-[100px] rounded-full"/>
        </div>
        <div className="max-w-5xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Simple, honest pricing</h2>
            <p className="text-gray-400 text-lg mb-8">Start free. Upgrade when you're serious.</p>

            {/* Currency selector */}
            <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              {(['USD','EUR','INR'] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${currency===c?'bg-purple-600 text-white shadow-lg':'text-gray-400 hover:text-white'}`}>
                  {c === 'USD' ? '🇺🇸 USD' : c === 'EUR' ? '🇪🇺 EUR' : '🇮🇳 INR'}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-white/3 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-400"/>
                <span className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Trader</span>
              </div>
              <div className="text-5xl font-black text-white mb-1">Free</div>
              <div className="text-gray-500 text-sm mb-8">Forever. No card needed.</div>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0"/>{f}
                  </li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={goToAuth}
                className="w-full py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition">
                Get started free
              </motion.button>
            </motion.div>

            {/* Pro */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="rounded-2xl p-px bg-gradient-to-br from-purple-500 via-violet-500 to-blue-600 shadow-2xl shadow-purple-500/20 relative">
              <div className="rounded-2xl bg-[#0d0920] p-8 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20"/>
                <div className="relative">
                  <div className="absolute top-0 right-0 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black rounded-bl-xl rounded-tr-xl uppercase tracking-wide">
                    Coming Soon
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400"/>
                    <span className="text-amber-400 text-sm font-semibold uppercase tracking-wide">Edge Pro</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-black text-white">{SYM[currency]}{PRICE[currency]}</span>
                    <span className="text-gray-400 text-lg">/mo</span>
                  </div>
                  <div className="text-gray-500 text-sm mb-8">Billed monthly. Cancel anytime.</div>
                  <ul className="space-y-3 mb-8">
                    {PRO_FEATURES.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                          <Lock className="w-2.5 h-2.5 text-purple-400"/>
                        </div>{f}
                      </li>
                    ))}
                  </ul>
                  {waitlisted ? (
                    <div className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm text-center">
                      ✓ You're on the waitlist!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"/>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { if(email) setWaitlisted(true) }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg shadow-purple-500/20 transition">
                        Join Pro waitlist
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/12 blur-[120px] rounded-full"/>
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 className="text-5xl lg:text-7xl font-black text-white mb-6 leading-tight">
              Stop guessing.<br/>
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                Start backtesting.
              </span>
            </h2>
            <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Your strategy shouldn't be tested with real money. Use TradeFlow to build confidence before you risk a single rupee, dollar or euro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.03, boxShadow: '0 0 50px rgba(139,92,246,0.5)' }} whileTap={{ scale: 0.97 }}
                onClick={goToAuth}
                className="px-10 py-5 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 text-white font-black text-xl rounded-2xl shadow-2xl shadow-purple-500/30 flex items-center gap-3 justify-center">
                Get started free <ArrowRight className="w-6 h-6"/>
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={demoLogin}
                className="px-10 py-5 bg-white/5 hover:bg-white/8 text-white font-bold text-xl rounded-2xl border border-white/10 flex items-center gap-3 justify-center backdrop-blur-sm transition">
                <Play className="w-5 h-5 text-purple-400 fill-purple-400"/>
                Try demo now
              </motion.button>
            </div>
            <p className="mt-6 text-gray-700 text-sm">No credit card · Free plan available · Cancel Pro anytime</p>
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
              <span className="font-bold text-white text-lg">TradeFlow</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-400 transition">Features</a>
              <a href="#markets"  className="hover:text-gray-400 transition">Markets</a>
              <a href="#pricing"  className="hover:text-gray-400 transition">Pricing</a>
              <button onClick={goToAuth} className="hover:text-gray-400 transition">Sign in</button>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-700 text-sm">Not affiliated with TradingView or FXReplay. Data provided by Yahoo Finance.</p>
            <p className="text-gray-500 text-sm flex items-center gap-1.5">
              Built with ❤️ by <span className="font-semibold text-gray-400">Kishore JR</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
