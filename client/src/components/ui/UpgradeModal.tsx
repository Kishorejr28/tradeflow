import { useState } from 'react'
import { X, Check, Crown, Sparkles, ArrowRight, Lock, Mail } from 'lucide-react'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { sendWaitlistConfirmation } from '@/lib/email'

const FREE_FEATURES = [
  '5 journal entries per day',
  'Chart replay (150+ instruments)',
  'Edge plans (up to 3)',
  'Economic calendar',
  '$100k demo account',
  'Sanctuary meditation',
]

const PRO_FEATURES = [
  { label: 'Unlimited journal entries', locked: true },
  { label: 'Unlimited edge plans', locked: true },
  { label: 'AI trade analysis & coaching', locked: true },
  { label: 'Prop firm challenge simulator', locked: true },
  { label: 'Monte Carlo stress testing', locked: true },
  { label: 'MT4/MT5 CSV import', locked: true },
  { label: '2yr+ historical chart data', locked: true },
  { label: 'Priority support', locked: true },
]

const PRICES = {
  USD: { symbol: '$', monthly: 12, annual: 99, save: '31%' },
  EUR: { symbol: '€', monthly: 11, annual: 89, save: '32%' },
  INR: { symbol: '₹', monthly: 999, annual: 7999, save: '33%' },
}

type Currency = keyof typeof PRICES
type Billing = 'monthly' | 'annual'

interface UpgradeModalProps {
  onClose: () => void
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const { user } = useAppStore()
  const [currency, setCurrency] = useState<Currency>('USD')
  const [billing, setBilling] = useState<Billing>('monthly')
  const [step, setStep] = useState<'plans' | 'waitlist'>('plans')
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.full_name ?? '')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const price = PRICES[currency]

  const handleWaitlist = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true); setError('')
    try {
      if (hasSupabaseConfig) {
        await supabase.from('waitlist').upsert({
          email,
          name: name || undefined,
          source: 'upgrade-modal',
          plan_interest: `pro-${billing}-${currency}`,
        })
      }
      // Send premium confirmation email
      await sendWaitlistConfirmation({
        to: email,
        name: name || undefined,
        plan: 'pro',
        currency,
        billing,
      })
      setDone(true)
    } catch {
      setError('Something went wrong — please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-white/8">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h2 className="text-white font-black text-lg">Upgrade to Edge Pro</h2>
              <p className="text-white/80 text-xs">Unlock your full trading potential</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
            <X className="w-5 h-5"/>
          </button>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {['Choose plan', 'Join waitlist'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                  (step === 'plans' && i === 0) || (step === 'waitlist' && i === 1)
                    ? 'bg-white text-amber-500'
                    : i === 0 && step === 'waitlist'
                    ? 'bg-white/40 text-white'
                    : 'bg-white/20 text-white/60'
                }`}>{i+1}</div>
                <span className={`text-[11px] font-medium ${(step === 'plans' && i === 0) || (step === 'waitlist' && i === 1) ? 'text-white' : 'text-white/60'}`}>{s}</span>
                {i === 0 && <div className="w-8 h-px bg-white/30 mx-1"/>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 1: Plans ── */}
        {step === 'plans' && (
          <div className="p-6">
            {/* Currency + billing toggles */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                {(['USD','EUR','INR'] as Currency[]).map(c => (
                  <button key={c} onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currency===c?'bg-white dark:bg-white/15 text-gray-800 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    {c==='USD'?'🇺🇸 USD':c==='EUR'?'🇪🇺 EUR':'🇮🇳 INR'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                {(['monthly','annual'] as Billing[]).map(b => (
                  <button key={b} onClick={() => setBilling(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${billing===b?'bg-white dark:bg-white/15 text-gray-800 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
                    {b === 'annual' && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500 text-white font-bold">Save {price.save}</span>}
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Two plan cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              {/* Free */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Plan</span>
                </div>
                <div className="text-2xl font-black text-gray-800 dark:text-white mb-1">Free</div>
                <div className="text-xs text-gray-400 mb-4">Basic access · forever</div>
                <ul className="space-y-2">
                  {FREE_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Check className="w-3.5 h-3.5 text-gray-400 shrink-0"/>{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro */}
              <div className="rounded-2xl border-2 border-amber-400 dark:border-amber-500/60 p-5 relative bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-500/5 dark:to-orange-500/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-[10px] font-black text-white uppercase tracking-wider whitespace-nowrap">
                  🥇 Most Popular
                </div>
                <div className="flex items-center gap-2 mb-1 mt-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500"/>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Edge Pro</span>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-2xl font-black text-gray-800 dark:text-white">
                    {price.symbol}{billing === 'monthly' ? price.monthly : Math.round(price.annual / 12)}
                  </span>
                  <span className="text-xs text-gray-400">/mo</span>
                </div>
                {billing === 'annual' && (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    {price.symbol}{price.annual}/yr — save {price.save}
                  </div>
                )}
                <div className="text-xs text-gray-400 mb-4">Everything in Free, plus:</div>
                <ul className="space-y-2">
                  {PRO_FEATURES.map(f => (
                    <li key={f.label} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Lock className="w-2 h-2 text-amber-500"/>
                      </div>
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button onClick={() => setStep('waitlist')}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-black text-base rounded-2xl transition shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5"/>
              Get Edge Pro — {price.symbol}{billing==='monthly'?price.monthly:price.annual}/{billing==='monthly'?'mo':'yr'}
              <ArrowRight className="w-5 h-5"/>
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Payments launching soon · Join the waitlist to be first
            </p>
          </div>
        )}

        {/* ── Step 2: Waitlist ── */}
        {step === 'waitlist' && (
          <div className="p-6">
            {done ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/30">
                  <Check className="w-8 h-8 text-white"/>
                </div>
                <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">You're on the list! 🥇</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">
                  We'll email you at <strong>{email}</strong> the moment Edge Pro payments go live — with an early-bird discount.
                </p>
                <div className="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-left w-full max-w-xs">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Your plan: Edge Pro</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">{PRICES[currency].symbol}{billing==='monthly'?PRICES[currency].monthly:PRICES[currency].annual}/{billing==='monthly'?'month':'year'} · {currency}</p>
                </div>
                <button onClick={onClose}
                  className="mt-6 px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold rounded-xl transition">
                  Back to trading
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <Crown className="w-5 h-5 text-amber-500 shrink-0"/>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      Edge Pro · {PRICES[currency].symbol}{billing==='monthly'?PRICES[currency].monthly:PRICES[currency].annual}/{billing==='monthly'?'month':'year'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Be first when payments launch · Early-bird discount guaranteed
                    </p>
                  </div>
                  <button onClick={() => setStep('plans')} className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                    Change
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Full Name</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your name (optional)"
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"/>
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                  <button onClick={handleWaitlist} disabled={loading || !email}
                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-black text-base rounded-2xl transition shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5"/>
                        Reserve my spot
                        <ArrowRight className="w-5 h-5"/>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                    No payment now · We'll notify you when Pro launches · Unsubscribe anytime
                  </p>

                  {/* Placeholder for Stripe payment link */}
                  <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1 font-medium">💳 Direct payment coming soon</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">
                      Stripe integration · Add your payment link here when ready
                    </p>
                    {/* Replace the button below with your Stripe payment link */}
                    {/* <a href="https://buy.stripe.com/YOUR_LINK" className="...">Pay now</a> */}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
