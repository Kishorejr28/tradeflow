import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  TrendingUp, Play, BarChart2, BookOpen, FileText, Leaf,
  ChevronRight, Check, Star, ArrowRight, Newspaper,
  RefreshCw, Target, Brain, Zap, Globe,
} from 'lucide-react'

const FEATURES = [
  {
    icon: RefreshCw,
    title: 'Chart Replay',
    desc: 'Replay real historical data for any stock, forex pair, crypto or index. Practice your strategy without risking money.',
    color: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
  },
  {
    icon: FileText,
    title: 'Trading Journal',
    desc: 'Log every trade with emotions, plan adherence, notes. Calendar view shows your wins and losses at a glance.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: BookOpen,
    title: 'Edge Plans',
    desc: 'Build your trading playbook with step-by-step charting processes, entry criteria and invalidation rules.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: BarChart2,
    title: 'Live Trading View',
    desc: 'Professional TradingView charts with multi-layout, watchlist, price alerts, pip calculator and demo account.',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
  {
    icon: Newspaper,
    title: 'Economic Calendar',
    desc: 'Live economic events filtered by currency and impact. Never get caught by surprise by high-impact news.',
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
  },
  {
    icon: Leaf,
    title: 'Sanctuary',
    desc: 'Meditation timer with ocean waves, rain, forest and frequency tones. Build focus before every session.',
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
  },
]

const MARKETS = [
  { flag: '🇺🇸', name: 'US Stocks', examples: 'AAPL · NVDA · TSLA' },
  { flag: '🇮🇳', name: 'India (NSE)', examples: 'RELIANCE.NS · TCS.NS' },
  { flag: '🌍', name: 'Forex', examples: 'EURUSD · GBPJPY · USDJPY' },
  { flag: '₿', name: 'Crypto', examples: 'BTCUSD · ETHUSD · SOLUSD' },
  { flag: '🇩🇪', name: 'Germany', examples: 'SAP.DE · BMW.DE · SIE.DE' },
  { flag: '🇬🇧', name: 'UK', examples: 'SHEL.L · HSBA.L · BP.L' },
  { flag: '🇯🇵', name: 'Japan', examples: '7203.T · 6758.T · 9984.T' },
  { flag: '📊', name: 'Indices', examples: 'SPX500 · NIKKEI · DAX40' },
  { flag: '🪙', name: 'Commodities', examples: 'XAUUSD · USOIL · WHEAT' },
  { flag: '🇭🇰', name: 'Hong Kong', examples: '0700.HK · 9988.HK' },
  { flag: '🇦🇺', name: 'Australia', examples: 'BHP.AX · CBA.AX' },
  { flag: '🇧🇷', name: 'Brazil', examples: 'VALE3.SA · PETR4.SA' },
]

const STATS = [
  { value: '150+', label: 'Instruments' },
  { value: '10y+', label: 'Historical data' },
  { value: '6', label: 'Asset classes' },
  { value: '100%', label: 'Free forever' },
]

const TESTIMONIALS = [
  {
    name: 'Rahul S.',
    role: 'Prop Firm Trader',
    text: 'Finally a journal + replay tool that actually works. The Indian stock data is a game changer — I can practice on RELIANCE, NIFTY, everything.',
    stars: 5,
  },
  {
    name: 'Lena M.',
    role: 'Forex Trader',
    text: 'I used to pay $29/month for FXReplay. TradeFlow does everything I need for free. The chart replay is identical and I love the Sanctuary feature.',
    stars: 5,
  },
  {
    name: 'James T.',
    role: 'Day Trader',
    text: 'The Edge plan builder helped me stop overtrading. Now every trade has a documented plan. Win rate up from 52% to 68% in 6 weeks.',
    stars: 5,
  },
]

const PLAN_FEATURES = {
  free: [
    'Unlimited journal entries',
    'Chart replay (150+ instruments)',
    'Real historical data',
    'Edge plan builder',
    'Economic calendar',
    'Demo trading account ($100k)',
    'Meditation & sanctuary',
    'Dashboard & stats',
  ],
  pro: [
    'Everything in Free',
    'AI trade analysis & coaching',
    'Prop firm challenge simulator',
    'Advanced analytics & Monte Carlo',
    'Multi-account tracking',
    'CSV import from MT4/MT5',
    'Priority support',
    'Early access to new features',
  ],
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { setUser } = useAppStore()
  const [email, setEmail] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)

  const goToApp = () => navigate('/auth')
  const demoLogin = () => {
    setUser({
      id: 'demo', email: 'demo@tradeflow.app', full_name: 'Demo Trader',
      timezone: 'UTC', account_currency: 'USD', created_at: new Date().toISOString(),
    })
    navigate('/dashboard')
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
            {['Features','Markets','Pricing','About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="hover:text-white transition">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goToApp} className="text-sm text-gray-400 hover:text-white transition">Sign in</button>
            <button onClick={goToApp}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-brand-500/20">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[400px] h-[300px] bg-purple-500/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Free alternative to FXReplay — no credit card needed
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-none">
            Practice trading.
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              Without losing money.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Chart replay on real historical data. Trading journal. Edge plans.
            Economic calendar. Meditation. Everything a serious trader needs — completely free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button onClick={goToApp}
              className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition shadow-2xl shadow-brand-500/30 flex items-center gap-2 justify-center text-lg">
              Start for free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={demoLogin}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition flex items-center gap-2 justify-center">
              <Play className="w-4 h-4 text-brand-400" /> Try demo instantly
            </button>
          </div>

          <p className="text-xs text-gray-500">No credit card · No account needed for demo · Cancel anytime</p>

          {/* Stats row */}
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
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Six tools built for serious traders — all in one platform, all free.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/5 hover:border-white/10 transition group">
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

      {/* ── Chart Replay Highlight ───────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-6">
                <RefreshCw className="w-3 h-3" /> Chart Replay
              </div>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Replay any market.<br/>
                <span className="text-brand-400">Learn from real moves.</span>
              </h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Pick any instrument — AAPL, BTCUSD, RELIANCE.NS, EURUSD, Gold — and replay
                real historical candles bar by bar. Practice entries, test your plan, build
                muscle memory. No synthetic data. Real price history.
              </p>
              <ul className="space-y-3 text-sm text-gray-300">
                {[
                  'Real data from Yahoo Finance — 10+ years of history',
                  '150+ instruments across 7 asset classes',
                  'Any global stock: Indian, German, UK, Japanese, Korean...',
                  'Type any ticker symbol — not limited to a preset list',
                  'SMA, EMA, Bollinger Bands, RSI, MACD indicators',
                  'Paper trade during replay with live P&L tracking',
                  'Scissors cut point — jump to any moment in history',
                  'Speed control: 1× to 32×',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={goToApp}
                className="mt-8 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition flex items-center gap-2">
                Try chart replay free <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Mock chart visual */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-xs text-gray-400 font-mono">AAPL · 1D · Real data</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">● Live data</span>
              </div>
              {/* Fake candlestick chart using CSS */}
              <div className="p-4 h-64 flex items-end gap-1">
                {[40,55,48,62,58,70,65,80,72,85,78,92,88,95,82,98,88,75,85,90,72,65,78,82,88,95,85,92,98,100].map((h,i)=>(
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-px">
                    <div
                      className={`w-full rounded-sm ${i%3===0?'bg-red-500/80':'bg-emerald-500/80'}`}
                      style={{height:`${h}%`,minHeight:'4px'}}
                    />
                  </div>
                ))}
              </div>
              {/* Playback bar mock */}
              <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
                <span className="text-[10px] text-gray-500 font-mono">Bar 180</span>
                <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                  <div className="bg-brand-500 h-1.5 rounded-full" style={{width:'60%'}} />
                </div>
                <span className="text-[10px] text-gray-500 font-mono">300</span>
                <div className="flex gap-1">
                  {['1×','2×','4×'].map(s=>(
                    <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s==='1×'?'bg-brand-500 text-white':'bg-white/10 text-gray-400'}`}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
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
              Indian stocks, German equities, Japanese futures, Korean indices — all supported.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MARKETS.map(m => (
              <div key={m.name}
                className="bg-white/3 border border-white/5 rounded-xl p-4 hover:bg-white/5 transition">
                <div className="text-2xl mb-2">{m.flag}</div>
                <div className="font-semibold text-white text-sm mb-1">{m.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">{m.examples}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl text-center">
            <p className="text-sm text-brand-300">
              <span className="font-semibold">Tip:</span> In the Replay page, just type any symbol and press Enter.
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
            <p className="text-gray-400">Join traders already improving their consistency</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white/3 border border-white/5 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
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
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple pricing</h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-8">
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wide mb-2">Free</div>
              <div className="text-5xl font-bold text-white mb-1">$0</div>
              <div className="text-gray-500 text-sm mb-8">Forever. No card needed.</div>
              <ul className="space-y-3 mb-8">
                {PLAN_FEATURES.free.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={goToApp}
                className="w-full py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition">
                Get started free
              </button>
            </div>
            {/* Pro */}
            <div className="bg-gradient-to-br from-brand-500/20 to-purple-500/10 border border-brand-500/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-brand-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                Coming Soon
              </div>
              <div className="text-brand-400 text-sm font-medium uppercase tracking-wide mb-2">Pro</div>
              <div className="text-5xl font-bold text-white mb-1">$12<span className="text-2xl text-gray-400">/mo</span></div>
              <div className="text-gray-500 text-sm mb-8">Billed monthly. Cancel anytime.</div>
              <ul className="space-y-3 mb-8">
                {PLAN_FEATURES.pro.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {/* Waitlist */}
              {waitlisted ? (
                <div className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm text-center">
                  ✓ You're on the waitlist!
                </div>
              ) : (
                <div className="space-y-2">
                  <input value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400"/>
                  <button onClick={()=>{ if(email) setWaitlisted(true) }}
                    className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition">
                    Join Pro waitlist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-8">
            <Target className="w-3 h-3" /> Start practising today
          </div>
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Stop guessing.<br/>
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              Start backtesting.
            </span>
          </h2>
          <p className="text-gray-400 text-xl mb-10">
            Your strategy shouldn't be tested with real money.
            Use TradeFlow to build confidence before you risk a single rupee, dollar or euro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToApp}
              className="px-10 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition shadow-2xl shadow-brand-500/30 text-lg flex items-center gap-2 justify-center">
              Get started free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={demoLogin}
              className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition text-lg flex items-center gap-2 justify-center">
              <Play className="w-4 h-4 text-brand-400" /> Try demo now
            </button>
          </div>
          <p className="mt-6 text-gray-600 text-sm">No credit card · Takes 30 seconds · Free forever</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">TradeFlow</span>
          </div>
          <p className="text-gray-600 text-sm text-center">
            Built for traders who take their craft seriously.
            Not affiliated with TradingView or FXReplay.
          </p>
          <div className="flex gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-400 transition">Features</a>
            <a href="#pricing" className="hover:text-gray-400 transition">Pricing</a>
            <button onClick={goToApp} className="hover:text-gray-400 transition">Sign in</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
