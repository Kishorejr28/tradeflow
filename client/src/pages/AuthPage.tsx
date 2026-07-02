import { useState } from 'react'
import { TrendingUp, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
function FloatingCards() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"/>
      {/* Three floating parallelogram-style cards */}
      <div className="relative w-72 h-72">
        <div
          className="absolute w-48 h-24 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-2xl shadow-brand-500/40 animate-float-1"
          style={{ top: '5%', left: '15%', transform: 'rotate(-8deg)' }}
        />
        <div
          className="absolute w-52 h-24 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-2xl shadow-purple-500/30 animate-float-2"
          style={{ top: '38%', left: '5%', transform: 'rotate(-5deg)' }}
        />
        <div
          className="absolute w-44 h-24 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-2xl shadow-brand-700/40 animate-float-3"
          style={{ top: '68%', left: '20%', transform: 'rotate(-6deg)' }}
        />
      </div>

      <style>{`
        @keyframes float1 {
          0%,100% { transform: rotate(-8deg) translateY(0); }
          50% { transform: rotate(-8deg) translateY(-12px); }
        }
        @keyframes float2 {
          0%,100% { transform: rotate(-5deg) translateY(0); }
          50% { transform: rotate(-5deg) translateY(-8px); }
        }
        @keyframes float3 {
          0%,100% { transform: rotate(-6deg) translateY(0); }
          50% { transform: rotate(-6deg) translateY(-10px); }
        }
        .animate-float-1 { animation: float1 4s ease-in-out infinite; }
        .animate-float-2 { animation: float2 5s ease-in-out infinite 0.5s; }
        .animate-float-3 { animation: float3 4.5s ease-in-out infinite 1s; }
      `}</style>
    </div>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { setUser, setUserPlan } = useAppStore()

  const demoLogin = () => {
    setUser({
      id: 'demo', email: 'demo@tradeflow.app', full_name: 'Demo Trader',
      timezone: 'UTC', account_currency: 'USD', created_at: new Date().toISOString(),
    })
    setUserPlan('pro') // demo gets pro features
    navigate('/app/dashboard')
  }

  // Local credentials — all bypass Supabase, work offline
  const LOCAL_CREDS: Record<string, { password: string; name: string; plan: 'free'|'pro'|'admin'; id: string; dest: string }> = {
    'kishore':                    { password:'TradeFlow@2026', name:'Kishore JR',  plan:'admin', id:'295842bd-d60d-4411-af01-5e934112d0db', dest:'/admin' },
    'kishorejr28@gmail.com':      { password:'TradeFlow@2026', name:'Kishore JR',  plan:'admin', id:'295842bd-d60d-4411-af01-5e934112d0db', dest:'/admin' },
    'user_trader@tradeflow.app':  { password:'Trader@123',     name:'Trader User', plan:'free',  id:'dummy-trader-001', dest:'/app/dashboard' },
    'trader_test@tradeflow.app':  { password:'Trader@123',     name:'Trader User', plan:'free',  id:'dummy-trader-001', dest:'/app/dashboard' },
    'user_pro@tradeflow.app':     { password:'ProUser@123',    name:'Pro User',    plan:'pro',   id:'dummy-pro-001',    dest:'/app/dashboard' },
    'pro_test@tradeflow.app':     { password:'ProUser@123',    name:'Pro User',    plan:'pro',   id:'dummy-pro-001',    dest:'/app/dashboard' },
    'trader':                     { password:'Trader@123',     name:'Trader User', plan:'free',  id:'dummy-trader-001', dest:'/app/dashboard' },
    'pro':                        { password:'ProUser@123',    name:'Pro User',    plan:'pro',   id:'dummy-pro-001',    dest:'/app/dashboard' },
  }

  const checkLocalCredentials = (emailOrUser: string, pw: string) => {
    const cred = LOCAL_CREDS[emailOrUser.toLowerCase().trim()]
    return cred?.password === pw ? cred : null
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/app/dashboard` },
      })
      if (error) {
        setError(`Google sign-in failed: ${error.message}. Use email/password instead.`)
        setGoogleLoading(false)
      }
      // On success the page redirects — googleLoading stays true intentionally
    } catch {
      setError('Google sign-in unavailable. Use email/password login instead.')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)

    // Check local credentials first (works without Supabase)
    if (mode === 'signin') {
      const cred = checkLocalCredentials(email, password)
      if (cred) {
        setUser({ id: cred.id, email, full_name: cred.name, timezone: 'UTC', account_currency: 'USD', created_at: new Date().toISOString() })
        setUserPlan(cred.plan)
        setLoading(false)
        navigate(cred.dest)
        // Also sign into Supabase in the background so RLS queries work
        // (local bypass skips Supabase auth — this gives us a real session token)
        supabase.auth.signInWithPassword({ email: 'kishorejr28@gmail.com', password }).catch(() => {})
        return
      }
    }

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } },
        })
        if (signUpError) {
          setError(signUpError.message)
        } else {
          // Try to sign in immediately — works when email confirmation is disabled
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (!signInError) {
            navigate('/app/dashboard')
          } else {
            // Email confirmation is required — show a helpful message
            setMessage(`We sent a confirmation to ${email}. Check your spam folder too. Once confirmed, return here to sign in.`)
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else navigate('/app/dashboard')
      }
    } catch { setError('Connection error — check your internet.') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-[#070714]">
      {/* ── Left visual panel ── */}
      <div className="hidden lg:flex w-1/2 bg-[#0d0d1e] relative flex-col items-center justify-center p-12 border-r border-white/5">
        <FloatingCards />
        {/* Brand name top-left */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">TradeFlow</span>
        </div>
        {/* Tagline bottom */}
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <p className="text-2xl font-bold text-white leading-snug">
            Practice. Journal.<br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Trade with confidence.</span>
          </p>
          <p className="text-gray-400 text-sm mt-2">
            The all-in-one platform for serious traders.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-[#070714]">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">TradeFlow</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white leading-tight">
              {mode === 'signin' ? 'Welcome back!' : 'Create account'}
            </h1>
            <p className="text-gray-400 mt-2">
              {mode === 'signin'
                ? 'Sign in to your account below'
                : 'Start your trading journey today'}
            </p>
          </div>

          {/* Google sign-in — always show, not gated by hasSupabaseConfig */}
          <button onClick={handleGoogleLogin} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-white/10 rounded-xl text-sm font-medium text-gray-200 bg-white/5 hover:bg-white/10 transition mb-5 disabled:opacity-50">
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin"/>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8"/>
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/8"/>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Your name" required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition"/>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                {mode === 'signup' ? 'Email' : 'Username or Email'}
              </label>
              <input
                type={mode === 'signup' ? 'email' : 'text'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={mode === 'signup' ? 'you@example.com' : 'Email or username'}
                required
                className="w-full px-4 py-3 text-sm rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Enter your password" required minLength={6}
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition"/>
                <button type="button" onClick={()=>setShowPw(p=>!p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}
            {message && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">{message}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading?(
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ):(
                <>
                  {mode==='signin'?'Log In':'Create Account'}
                  <ArrowRight className="w-4 h-4"/>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {mode==='signin'?"Don't have an account? ":'Already have an account? '}
            <button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');setMessage('')}}
              className="text-purple-400 font-semibold hover:text-purple-300 transition">
              {mode==='signin'?'Sign Up':'Sign In'}
            </button>
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/8"/>
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/8"/>
          </div>

          <button onClick={demoLogin}
            className="w-full py-3 px-4 border-2 border-dashed border-white/10 text-gray-500 text-sm font-medium rounded-xl hover:bg-white/5 hover:border-purple-500/30 hover:text-gray-300 transition">
            Continue as Demo User
          </button>
        </div>
      </div>
    </div>
  )
}
