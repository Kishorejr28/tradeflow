import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  TrendingUp, Play, BarChart2, BookOpen, FileText, Leaf,
  ChevronRight, Check, Star, ArrowRight, Newspaper,
  RefreshCw, Target, Zap, Globe, Lock, Sparkles, NotebookPen,
} from 'lucide-react'

// ── Animated Candlestick Chart ────────────────────────────────────────────────
interface Candle { o: number; h: number; l: number; c: number }

function AnimatedChart() {
  const [candles, setCandles] = useState<Candle[]>([])
  const [playhead, setPlayhead] = useState(0)
  const frameRef = useRef<ReturnType<typeof setInterval>|null>(null)

  // Generate realistic-looking AAPL-style candles
  useEffect(() => {
    const data: Candle[] = []
    let price = 172
    for (let i = 0; i < 60; i++) {
      const o = price
      const move = (Math.sin(i * 0.3) * 1.5 + (Math.random() - 0.45) * 3)
      const c = Math.max(140, Math.min(210, o + move))
      const range = Math.abs(c - o) + Math.random() * 2
      const h = Math.max(o, c) + range * 0.4
      const l = Math.min(o, c) - range * 0.4
      data.push({ o, h, l, c })
      price = c
    }
    setCandles(data)
    setPlayhead(30)
  }, [])

  // Auto-advance playhead
  useEffect(() => {
    if (!candles.length) return
    frameRef.current = setInterval(() => {
      setPlayhead(p => p >= candles.length ? 20 : p + 1)
    }, 180)
    return () => { if (frameRef.current) clearInterval(frameRef.current) }
  }, [candles.length])

  const visible = candles.slice(0, playhead)
  if (!visible.length) return null

  const prices = visible.flatMap(c => [c.h, c.l])
  const maxP = Math.max(...prices)
  const minP = Math.min(...prices)
  const range = maxP - minP || 1
  const toY = (p: number) => ((maxP - p) / range) * 100

  const currentCandle = visible[visible.length - 1]
  const prevCandle = visible[visible.length - 2]
  const chg = currentCandle && prevCandle ? currentCandle.c - prevCandle.c : 0

  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-xs text-gray-400 font-mono">AAPL · 1D</span>
        {currentCandle && (
          <span className={`text-xs font-mono font-bold ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currentCandle.c.toFixed(2)}
            <span className="ml-1 text-[10px]">{chg >= 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}</span>
          </span>
        )}
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live data
        </span>
      </div>

      {/* Chart area */}
      <div className="relative h-52 px-2 pt-3 pb-1 overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 600 180" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 33, 66, 100].map(y => (
            <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}

          {/* Candles */}
          {visible.map((c, i) => {
            const x = (i / 59) * 580 + 10
            const bullish = c.c >= c.o
            const color = bullish ? '#22c55e' : '#ef4444'
            const bodyTop = toY(Math.max(c.o, c.c)) * 1.8
            const bodyBot = toY(Math.min(c.o, c.c)) * 1.8
            const wickTop = toY(c.h) * 1.8
            const wickBot = toY(c.l) * 1.8
            const bodyH = Math.max(1.5, bodyBot - bodyTop)
            const isLast = i === visible.length - 1
            return (
              <g key={i} opacity={i < visible.length - 8 ? 1 : 0.6 + 0.05 * (i - visible.length + 8)}>
                {/* Wick */}
                <line x1={x} y1={wickTop} x2={x} y2={wickBot}
                  stroke={color} strokeWidth="1" />
                {/* Body */}
                <rect x={x - 3.5} y={bodyTop} width="7" height={bodyH}
                  fill={color} rx="0.5"
                  className={isLast ? 'animate-pulse' : ''} />
              </g>
            )
          })}

          {/* EMA line */}
          {visible.length > 10 && (() => {
            const ema: number[] = []
            let e = visible.slice(0,10).reduce((s,c)=>s+c.c,0)/10
            ema.push(e)
            for (let i=10;i<visible.length;i++){e=visible[i].c*0.18+e*0.82;ema.push(e)}
            const pts = ema.map((v, i) => {
              const x = ((i+10) / 59) * 580 + 10
              const y = toY(v) * 1.8
              return `${x},${y}`
            }).join(' ')
            return <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" strokeLinejoin="round" />
          })()}
        </svg>

        {/* Vertical playhead line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-brand-500/40 transition-all duration-200"
          style={{ left: `${((playhead - 1) / 59) * 96 + 2}%` }}
        >
          <div className="absolute top-1 -translate-x-1/2 text-[9px] text-brand-400 font-mono bg-gray-900 px-1">
            {playhead}
          </div>
        </div>
      </div>

      {/* OHLC row */}
      {currentCandle && (
        <div className="px-4 py-1.5 border-t border-white/5 flex items-center gap-4 text-[10px] font-mono">
          <span className="text-gray-500">O <span className="text-gray-300">{currentCandle.o.toFixed(2)}</span></span>
          <span className="text-gray-500">H <span className="text-emerald-400">{currentCandle.h.toFixed(2)}</span></span>
          <span className="text-gray-500">L <span className="text-red-400">{currentCandle.l.toFixed(2)}</span></span>
          <span className="text-gray-500">C <span className={chg>=0?'text-emerald-400':'text-red-400'}>{currentCandle.c.toFixed(2)}</span></span>
          <span className="ml-auto text-gray-600">EMA 50 <span className="text-blue-400">●</span></span>
        </div>
      )}

      {/* Playback bar */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
        <span className="text-[10px] text-gray-500 font-mono w-10">Bar {playhead}</span>
        <div className="flex-1 bg-gray-800 rounded-full h-1.5 relative overflow-hidden">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all duration-200"
            style={{ width: `${(playhead / 60) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500 font-mono">60</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white fill-white" />
          </div>
          {['1×','4×','16×'].map(s => (
            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s==='1×'?'bg-brand-500/20 text-brand-400':'bg-white/5 text-gray-500'}`}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: RefreshCw,  title: 'Chart Replay',       desc: 'Replay real historical data for any stock, forex pair, crypto or index. Practice without risking money.', color: 'text-brand-500',   bg: 'bg-brand-50 dark:bg-brand-500/10' },
  { icon: FileText,   title: 'Trading Journal',     desc: 'Log every trade with emotions, plan adherence, notes and voice reflections. Calendar view shows patterns.', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { icon: BookOpen,   title: 'Edge Plans',          desc: 'Build your trading playbook with step-by-step charting processes, entry criteria and invalidation rules.',  color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { icon: BarChart2,  title: 'Live Trading',        desc: 'TradingView charts with multi-layout, watchlist, price alerts, pip calculator and a $100k demo account.',  color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { icon: Newspaper,  title: 'Economic Calendar',   desc: 'Live economic events filtered by currency and impact. Never get caught off-guard by high-impact news.',    color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { icon: NotebookPen,title: 'Notebook',            desc: 'Your personal trading library. Write notes, use templates (Daily Review, Pre-Market Prep) and save lessons.', color: 'text-pink-600',   bg: 'bg-pink-50 dark:bg-pink-500/10' },
  { icon: Leaf,       title: 'Sanctuary',           desc: 'Meditation timer with guided ambient audio — ocean, rain, forest, binaural beats. Reset your mind before every session.', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-500/10' },
  { icon: Target,     title: 'Performance Stats',   desc: 'Dashboard with equity curve, win rate, average R, P&L calendar. See your progress at a glance every day.', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
]

const MARKETS = [
  { flag:'🇺🇸', name:'US Stocks',    examples:'AAPL · NVDA · TSLA' },
  { flag:'🇮🇳', name:'India (NSE)',   examples:'RELIANCE.NS · TCS.NS' },
  { flag:'🌍', name:'Forex',          examples:'EURUSD · GBPJPY · USDJPY' },
  { flag:'₿',  name:'Crypto',         examples:'BTCUSD · ETHUSD · SOLUSD' },
  { flag:'🇩🇪', name:'Germany',       examples:'SAP.DE · BMW.DE · SIE.DE' },
  { flag:'🇬🇧', name:'UK',            examples:'SHEL.L · HSBA.L · BP.L' },
  { flag:'🇯🇵', name:'Japan',         examples:'7203.T · 6758.T · 9984.T' },
  { flag:'📊', name:'Indices',         examples:'SPX500 · NIKKEI · DAX40' },
  { flag:'🪙', name:'Commodities',     examples:'XAUUSD · USOIL · WHEAT' },
  { flag:'🇭🇰', name:'Hong Kong',     examples:'0700.HK · 9988.HK' },
  { flag:'🇦🇺', name:'Australia',     examples:'BHP.AX · CBA.AX' },
  { flag:'🇧🇷', name:'Brazil',        examples:'VALE3.SA · PETR4.SA' },
]

const STATS = [
  { value: '150+', label: 'Instruments' },
  { value: '10y+', label: 'Historical data' },
  { value: '7',    label: 'Asset classes' },
  { value: 'Free', label: 'To get started' },
]

const TESTIMONIALS = [
  { name:'Rahul S.', role:'Prop Firm Trader', text:'Finally a journal + replay tool that works. Indian stock data is a game changer — I practice on RELIANCE, NIFTY, everything.', stars:5 },
  { name:'Lena M.',  role:'Forex Trader',      text:'I used to pay $29/month for FXReplay. TradeFlow does everything I need. The chart replay is identical and I love the Sanctuary feature.', stars:5 },
  { name:'James T.', role:'Day Trader',        text:'The Edge plan builder helped me stop overtrading. Win rate up from 52% to 68% in 6 weeks. Every trade now has a documented plan.', stars:5 },
]

const FREE_FEATURES = [
  '5 journal entries per day',
  'Chart replay (all 150+ instruments)',
  'Real historical data (Yahoo Finance)',
  'Edge plan builder (up to 3 plans)',
  'Economic calendar',
  'Demo trading account ($100k)',
  'Sanctuary meditation',
  'Dashboard & basic stats',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited journal entries',
  'Unlimited edge plans',
  'AI trade analysis & coaching',
  'Prop firm challenge simulator',
  'Advanced analytics & Monte Carlo',
  'Multi-account tracking',
  'CSV import from MT4/MT5',
  'Voice note transcription',
  'Priority support',
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { setUser, setUserPlan, user } = useAppStore()
  const [email, setEmail] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)
  const [priceCurrency, setPriceCurrency] = useState<'USD'|'INR'|'EUR'>('USD')

  const PRICE = {
    USD: { symbol:'$',  amount:12,  note:'per month · ~₹999' },
    INR: { symbol:'₹',  amount:999, note:'per month · ~$12' },
    EUR: { symbol:'€',  amount:11,  note:'per month · ~₹999' },
  }
  const pc = PRICE[priceCurrency]

  // If already logged in, show go-to-app button in nav
  const isLoggedIn = !!user

  const goToAuth = () => navigate('/auth')
  const goToApp  = () => navigate('/app/dashboard')
  const demoLogin = () => {
    setUser({
      id: 'demo', email: 'demo@tradeflow.app', full_name: 'Demo Trader',
      timezone: 'UTC', account_currency: 'USD', created_at: new Date().toISOString(),
    })
    setUserPlan('pro')
    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TradeFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            {['Features','Markets','Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-gray-400">
                  {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
                </span>
                <button onClick={goToApp}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-brand-500/20">
                  Go to dashboard →
                </button>
              </>
            ) : (
              <>
                <button onClick={goToAuth} className="text-sm text-gray-400 hover:text-white transition">Sign in</button>
                <button onClick={goToAuth}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-brand-500/20">
                  Get started free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" /> Free alternative to FXReplay · No credit card needed
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-none">
            Practice trading.<br />
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              Without losing money.
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Chart replay on real historical data. Trading journal. Edge plans.
            Economic calendar. Meditation. Everything a serious trader needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button onClick={goToAuth}
              className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition shadow-2xl shadow-brand-500/30 flex items-center gap-2 justify-center text-lg">
              Start for free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={demoLogin}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition flex items-center gap-2 justify-center">
              <Play className="w-4 h-4 text-brand-400 fill-brand-400" /> Try demo instantly
            </button>
          </div>
          <p className="text-xs text-gray-600">No credit card · No account needed for demo · Free plan available</p>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="text-4xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to trade better</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Six tools built for serious traders — all in one platform.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 hover:border-white/10 transition">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chart Replay Highlight with animated chart ───────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-6">
                <RefreshCw className="w-3 h-3" /> Chart Replay — Live Demo
              </div>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Replay any market.<br />
                <span className="text-brand-400">Learn from real moves.</span>
              </h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Pick any instrument — AAPL, BTCUSD, RELIANCE.NS, EURUSD, Gold — and replay
                real historical candles bar by bar. Practice entries, test your plan, build
                muscle memory. No synthetic data. Real price history.
              </p>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                {[
                  'Real data from Yahoo Finance — 10+ years of history',
                  'Any global stock: Indian, German, UK, Japanese, Korean…',
                  'Type any ticker — not limited to a preset list',
                  'SMA, EMA, Bollinger Bands, RSI, MACD indicators',
                  'Paper trade during replay with live P&L tracking',
                  'Scissors cut point — jump to any moment in history',
                  'Speed control: 1× to 32×',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={isLoggedIn ? goToApp : goToAuth}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition flex items-center gap-2">
                Try chart replay free <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Animated chart */}
            <AnimatedChart />
          </div>
        </div>
      </section>

      {/* ── Markets ──────────────────────────────────────────────────────── */}
      <section id="markets" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium mb-6">
              <Globe className="w-3 h-3" /> Every market in the world
            </div>
            <h2 className="text-4xl font-bold mb-4">Not just forex. Every market.</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Type any ticker symbol — if Yahoo Finance has it, TradeFlow can replay it.
              Indian stocks, German equities, Japanese, Korean, Brazilian — all supported.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MARKETS.map(m => (
              <div key={m.name} className="bg-white/3 border border-white/5 rounded-xl p-4 hover:bg-white/5 transition">
                <div className="text-2xl mb-2">{m.flag}</div>
                <div className="font-semibold text-white text-sm mb-1">{m.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">{m.examples}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl text-center">
            <p className="text-sm text-brand-300">
              <span className="font-semibold">Tip:</span> In the Replay page, type any symbol and press Enter.
              Works for RELIANCE.NS (India), SAP.DE (Germany), SHEL.L (UK), 7203.T (Toyota), 0700.HK (Tencent) and thousands more.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Traders love it</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white/3 border border-white/5 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Simple, honest pricing</h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade when you're serious about trading.</p>

            {/* Currency selector */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="text-xs text-gray-500">Currency:</span>
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                {([
                  { code:'USD', symbol:'$',  flag:'🇺🇸' },
                  { code:'INR', symbol:'₹',  flag:'🇮🇳' },
                  { code:'EUR', symbol:'€',  flag:'🇪🇺' },
                ] as const).map(c => (
                  <button key={c.code} onClick={() => setPriceCurrency(c.code)}
                    className={`px-3 py-1.5 text-xs font-medium transition flex items-center gap-1 ${priceCurrency===c.code?'bg-brand-500 text-white':'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                    {c.flag} {c.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-8">
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wide mb-2">Free</div>
              <div className="text-5xl font-bold text-white mb-1">$0</div>
              <div className="text-gray-500 text-sm mb-8">Get started today. No card needed.</div>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={goToAuth}
                className="w-full py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition">
                Get started free
              </button>
            </div>
            {/* Pro */}
            <div className="bg-gradient-to-br from-brand-500/20 to-purple-500/10 border border-brand-500/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-brand-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                Coming Soon
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="text-brand-400 text-sm font-medium uppercase tracking-wide">Pro</span>
              </div>
              <div className="text-5xl font-bold text-white mb-1">{pc.symbol}{pc.amount}<span className="text-2xl text-gray-400">/mo</span></div>
              <div className="text-gray-500 text-sm mb-8">{pc.note} · Cancel anytime.</div>
              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    {f === 'Everything in Free'
                      ? <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                      : <Lock className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
                    }
                    {f}
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
                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400" />
                  <button onClick={() => { if (email) setWaitlisted(true) }}
                    className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition">
                    Join Pro waitlist
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Why upgrade box */}
          <div className="mt-12 p-6 bg-white/3 border border-white/5 rounded-2xl max-w-3xl mx-auto">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" /> Why upgrade to Pro?
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              The free plan is genuinely useful and has no time limit. Pro is for traders who want to go deeper —
              AI-powered feedback that reads your journal and tells you your actual patterns, unlimited everything,
              and prop firm simulation so you can practice the exact rules of FTMO, MyForexFunds etc. before spending $500 on a challenge.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Stop guessing.<br />
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              Start backtesting.
            </span>
          </h2>
          <p className="text-gray-400 text-xl mb-10">
            Your strategy shouldn't be tested with real money.
            Use TradeFlow to build confidence before you risk a single rupee, dollar or euro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToAuth}
              className="px-10 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition shadow-2xl shadow-brand-500/30 text-lg flex items-center gap-2 justify-center">
              Get started free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={demoLogin}
              className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition text-lg flex items-center gap-2 justify-center">
              <Play className="w-4 h-4 text-brand-400 fill-brand-400" /> Try demo now
            </button>
          </div>
          <p className="mt-6 text-gray-600 text-sm">No credit card · Free plan available · Cancel Pro anytime</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">TradeFlow</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#features"  className="hover:text-gray-400 transition">Features</a>
              <a href="#markets"   className="hover:text-gray-400 transition">Markets</a>
              <a href="#pricing"   className="hover:text-gray-400 transition">Pricing</a>
              <button onClick={goToAuth} className="hover:text-gray-400 transition">Sign in</button>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">
              Not affiliated with TradingView or FXReplay. Data provided by Yahoo Finance.
            </p>
            <p className="text-gray-500 text-sm flex items-center gap-1.5">
              Built with ❤️ by{' '}
              <span className="font-semibold text-gray-400">Kishore JR</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
