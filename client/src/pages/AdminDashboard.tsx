import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  Users, Clock, Crown, BarChart2, RefreshCw, ChevronDown, ChevronUp,
  Check, X, Shield, Zap, Lock, Unlock, Mail, TrendingUp, Search,
  ToggleLeft, ToggleRight, AlertCircle,
} from 'lucide-react'
import {
  adminGetAllUsers, adminGetWaitlist, adminGetStats, adminUpdateUserPlan,
  adminGetFeatureDefinitions, adminGetUserFlags, adminSetUserFlag,
  adminMarkWaitlistConverted, type Plan,
} from '@/lib/adminApi'

// ── Only this email gets access (also guarded at route level) ─────────────────
const ADMIN_EMAIL = 'kishorejr28@gmail.com'

interface UserRow {
  user_id: string
  plan: Plan
  plan_started_at: string
  plan_ends_at?: string
  notes?: string
  created_at: string
  // joined from auth — we show what we can
  email?: string
}

interface WaitlistRow {
  id: string
  email: string
  name?: string
  source: string
  plan_interest: string
  converted: boolean
  created_at: string
}

interface FeatureDef {
  key: string
  label: string
  description: string
  default_plan: Plan
  category: string
}

const PLAN_BADGE: Record<Plan, string> = {
  free:  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  pro:   'bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400',
  admin: 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
}
const PLAN_ICON: Record<Plan, React.ReactNode> = {
  free:  <Shield className="w-3 h-3"/>,
  pro:   <Crown className="w-3 h-3"/>,
  admin: <Zap className="w-3 h-3"/>,
}

// ── Local feature flag store (works without Supabase) ─────────────────────────
const LOCAL_FLAGS_KEY = 'tf-admin-flags'
const LOCAL_PLANS_KEY = 'tf-admin-plans'

function loadLocalFlags(): Record<string, Record<string, boolean>> {
  try { return JSON.parse(localStorage.getItem(LOCAL_FLAGS_KEY) || '{}') } catch { return {} }
}
function saveLocalFlags(flags: Record<string, Record<string, boolean>>) {
  localStorage.setItem(LOCAL_FLAGS_KEY, JSON.stringify(flags))
}
function loadLocalPlans(): Record<string, Plan> {
  try { return JSON.parse(localStorage.getItem(LOCAL_PLANS_KEY) || '{}') } catch { return {} }
}
function saveLocalPlans(plans: Record<string, Plan>) {
  localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans))
}

// Built-in feature list (doesn't need Supabase)
const BUILTIN_FEATURES: FeatureDef[] = [
  { key:'journal_unlimited',    label:'Unlimited Journal Entries', description:'Remove 5/day limit',                      default_plan:'pro', category:'journal'  },
  { key:'edge_plans_unlimited', label:'Unlimited Edge Plans',      description:'Remove 3 plan limit',                     default_plan:'pro', category:'edge'     },
  { key:'ai_coach',             label:'AI Trade Coach',            description:'AI-powered analysis and suggestions',      default_plan:'pro', category:'ai'       },
  { key:'prop_simulator',       label:'Prop Firm Simulator',       description:'FTMO/MyForexFunds challenge simulation',   default_plan:'pro', category:'trading'  },
  { key:'monte_carlo',          label:'Monte Carlo Analysis',      description:'Strategy stress testing',                  default_plan:'pro', category:'analytics'},
  { key:'csv_import',           label:'MT4/MT5 CSV Import',        description:'Import trades from MetaTrader',            default_plan:'pro', category:'journal'  },
  { key:'multi_account',        label:'Multi-Account Tracking',    description:'Track multiple trading accounts',          default_plan:'pro', category:'trading'  },
  { key:'voice_notes',          label:'Voice Note Transcription',  description:'Auto-transcribe voice journal notes',      default_plan:'pro', category:'journal'  },
  { key:'advanced_charts',      label:'Advanced Chart Replay',     description:'2yr+ historical data, all timeframes',     default_plan:'pro', category:'replay'   },
  { key:'export_data',          label:'Export Data',               description:'Export journal/stats as CSV/PDF',          default_plan:'pro', category:'general'  },
  { key:'replay_basic',         label:'Basic Chart Replay',        description:'150+ instruments, real historical data',   default_plan:'free',category:'replay'   },
  { key:'sanctuary',            label:'Sanctuary Meditation',      description:'Meditation timer and ambient sounds',      default_plan:'free',category:'general'  },
  { key:'economic_calendar',    label:'Economic Calendar',         description:'Live forex factory calendar',              default_plan:'free',category:'general'  },
  { key:'demo_trading',         label:'Demo Trading Account',      description:'$100k demo account',                       default_plan:'free',category:'trading'  },
]

function StatCard({ label, value, sub, color }: { label: string; value: number|string; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function UserFlagsPanel({ userId, features }: { userId: string; features: FeatureDef[] }) {
  const [allFlags, setAllFlags] = useState<Record<string, Record<string, boolean>>>(loadLocalFlags)

  const flags = allFlags[userId] ?? {}

  const setFlag = (key: string, val: boolean | null) => {
    const next = { ...allFlags }
    if (!next[userId]) next[userId] = {}
    if (val === null) delete next[userId][key]
    else next[userId][key] = val
    setAllFlags(next)
    saveLocalFlags(next)
  }

  const categories = [...new Set(features.map(f => f.category))]

  return (
    <div className="space-y-4 py-3">
      {categories.map(cat => (
        <div key={cat}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{cat}</p>
          <div className="space-y-1">
            {features.filter(f => f.category === cat).map(f => {
              const override = flags[f.key]
              const isOn  = override === true
              const isOff = override === false
              const isDefault = override === undefined
              return (
                <div key={f.key} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{f.description}</p>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block ${f.default_plan==='pro'?'bg-brand-50 dark:bg-brand-500/10 text-brand-500':'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      default: {f.default_plan}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    <button onClick={() => setFlag(f.key, isOn ? null : true)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${isOn?'bg-emerald-500 text-white shadow-sm':'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600'}`}>
                      <Unlock className="w-2.5 h-2.5"/> ON
                    </button>
                    <button onClick={() => setFlag(f.key, isOff ? null : false)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${isOff?'bg-red-500 text-white shadow-sm':'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600'}`}>
                      <Lock className="w-2.5 h-2.5"/> OFF
                    </button>
                    {!isDefault && (
                      <button onClick={() => setFlag(f.key, null)}
                        className="px-2 py-1.5 rounded-lg text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition font-bold"
                        title="Reset to plan default">
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const user = useAppStore(s => s.user)
  const [tab, setTab] = useState<'overview' | 'users' | 'waitlist' | 'features'>('overview')
  const [stats, setStats] = useState({ total: 0, free: 0, pro: 0, waitlist: 0, waitlistConverted: 0 })
  const [users, setUsers] = useState<UserRow[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([])
  const [features, setFeatures] = useState<FeatureDef[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  const [localPlans, setLocalPlans] = useState<Record<string, Plan>>(loadLocalPlans)

  // Guard now handled at route level (AdminRoute in App.tsx)

  const refresh = useCallback(async () => {
    setLoading(true)
    // Try Supabase first, fall back to local storage
    const [s, u, w, f] = await Promise.all([
      adminGetStats().catch(() => ({ total:0, free:0, pro:0, waitlist:0, waitlistConverted:0 })),
      adminGetAllUsers().catch(() => ({ data: [] })),
      adminGetWaitlist().catch(() => ({ data: [] })),
      adminGetFeatureDefinitions().catch(() => ({ data: [] })),
    ])
    setStats(s as any)
    setUsers((u.data ?? []) as UserRow[])
    setWaitlist((w.data ?? []) as WaitlistRow[])
    // Use built-in features if Supabase has none
    const supabaseFeatures = (f.data ?? []) as FeatureDef[]
    setFeatures(supabaseFeatures.length > 0 ? supabaseFeatures : BUILTIN_FEATURES)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const changePlan = async (userId: string, plan: Plan) => {
    setSavingPlan(userId)
    // Save locally always (works without Supabase)
    const next = { ...localPlans, [userId]: plan }
    setLocalPlans(next)
    saveLocalPlans(next)
    // Also try Supabase
    try { await adminUpdateUserPlan(userId, plan) } catch { /* offline */ }
    setUsers(p => p.map(u => u.user_id === userId ? { ...u, plan } : u))
    setSavingPlan(null)
  }

  const convertWaitlist = async (id: string) => {
    await adminMarkWaitlistConverted(id)
    setWaitlist(p => p.map(w => w.id === id ? { ...w, converted: true } : w))
  }

  const filteredUsers = users.filter(u =>
    !search || u.user_id.toLowerCase().includes(search.toLowerCase())
  )
  const filteredWaitlist = waitlist.filter(w =>
    !search || w.email.toLowerCase().includes(search.toLowerCase()) ||
    (w.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#141414] border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white"/>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-xs text-gray-400">TradeFlow backend · {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refresh} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/>
              Refresh
            </button>
            <button onClick={() => navigate('/app/dashboard')}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition">
              ← Back to app
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
          {([
            { id: 'overview', icon: BarChart2, label: 'Overview' },
            { id: 'users',    icon: Users,    label: `Users (${stats.total})` },
            { id: 'waitlist', icon: Clock,    label: `Waitlist (${stats.waitlist})` },
            { id: 'features', icon: Zap,      label: 'Feature Flags' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <t.icon className="w-3.5 h-3.5"/>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Users"     value={stats.total}            color="text-gray-900 dark:text-white"/>
              <StatCard label="Free Plan"       value={stats.free}             color="text-gray-600 dark:text-gray-300"/>
              <StatCard label="Pro Plan"        value={stats.pro}              color="text-brand-600 dark:text-brand-400" sub="paying customers"/>
              <StatCard label="Waitlist"        value={stats.waitlist}         color="text-amber-600 dark:text-amber-400"/>
              <StatCard label="Converted"       value={stats.waitlistConverted} color="text-emerald-600 dark:text-emerald-400" sub={stats.waitlist ? `${Math.round(stats.waitlistConverted/stats.waitlist*100)}%` : '0%'}/>
            </div>

            {/* Revenue estimate */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue Estimate</h3>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Current MRR', value: `$${stats.pro * 12}`, sub: `${stats.pro} Pro × $12/mo` },
                  { label: 'Potential (all Pro)', value: `$${stats.total * 12}`, sub: `if all ${stats.total} users paid` },
                  { label: 'Conversion Rate', value: stats.total ? `${Math.round(stats.pro/stats.total*100)}%` : '0%', sub: 'free → paid' },
                ].map(row => (
                  <div key={row.label}>
                    <p className="text-xs text-gray-400 mb-1">{row.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{row.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{row.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature plan reference */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Plan Feature Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Feature</th>
                      <th className="pb-2 font-medium text-center">Free</th>
                      <th className="pb-2 font-medium text-center">Pro</th>
                      <th className="pb-2 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {features.map(f => (
                      <tr key={f.key}>
                        <td className="py-2">
                          <p className="font-medium text-gray-700 dark:text-gray-300 text-xs">{f.label}</p>
                          <p className="text-[10px] text-gray-400">{f.description}</p>
                        </td>
                        <td className="py-2 text-center">
                          {f.default_plan === 'free' ? <Check className="w-4 h-4 text-emerald-500 mx-auto"/> : <X className="w-4 h-4 text-gray-300 dark:text-gray-700 mx-auto"/>}
                        </td>
                        <td className="py-2 text-center">
                          <Check className="w-4 h-4 text-emerald-500 mx-auto"/>
                        </td>
                        <td className="py-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{f.category}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by user ID…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"/>
              </div>
              <p className="text-xs text-gray-400">{filteredUsers.length} users</p>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Change Plan</th>
                    <th className="px-4 py-3 font-medium">Feature Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                      {users.length === 0 ? 'No users yet — Supabase admin schema may not be set up' : 'No results'}
                    </td></tr>
                  ) : filteredUsers.map(u => (
                    <>
                      <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {u.user_id.slice(0,8)}…
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${PLAN_BADGE[u.plan]}`}>
                            {PLAN_ICON[u.plan]} {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {(['free','pro','admin'] as Plan[]).map(p => (
                              <button key={p} onClick={() => changePlan(u.user_id, p)}
                                disabled={u.plan === p || savingPlan === u.user_id}
                                className={`px-2 py-1 text-[11px] rounded font-medium transition ${
                                  u.plan === p
                                    ? 'bg-brand-500 text-white cursor-default'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40'
                                }`}>
                                {savingPlan === u.user_id ? '…' : p}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
                            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition">
                            Override features
                            {expandedUser === u.user_id ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                          </button>
                        </td>
                      </tr>
                      {expandedUser === u.user_id && (
                        <tr key={`${u.user_id}-flags`}>
                          <td colSpan={5} className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/30">
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1e1e1e] overflow-hidden">
                              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <ToggleRight className="w-4 h-4 text-brand-500"/>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Feature overrides for user {u.user_id.slice(0,8)}…</span>
                                <span className="text-[10px] text-gray-400 ml-auto">Green = force ON · Red = force OFF · ↺ = use plan default</span>
                              </div>
                              <div className="px-2 max-h-72 overflow-y-auto">
                                <UserFlagsPanel userId={u.user_id} features={features}/>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-4 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-semibold">To see user emails:</p>
                  <p className="mt-0.5">Go to Supabase dashboard → Authentication → Users. Email lookup requires Supabase service role key which we keep server-side only for security.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Waitlist ── */}
        {tab === 'waitlist' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search email or name…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"/>
              </div>
              <p className="text-xs text-gray-400">{filteredWaitlist.length} entries · {waitlist.filter(w=>w.converted).length} converted</p>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Interest</th>
                    <th className="px-4 py-3 font-medium">Signed up</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {filteredWaitlist.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                      {waitlist.length === 0 ? 'No waitlist entries yet' : 'No results'}
                    </td></tr>
                  ) : filteredWaitlist.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{w.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{w.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{w.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium">{w.plan_interest}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {w.converted ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3"/> Converted
                          </span>
                        ) : (
                          <button onClick={() => convertWaitlist(w.id)}
                            className="text-[11px] px-2 py-1 rounded bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-100 dark:hover:bg-brand-500/20 transition">
                            Mark converted
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Feature Flags ── */}
        {tab === 'features' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Feature Flag System</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Features are gated by plan by default. You can override individual features per user — useful for granting Pro trial, testing, or locking down specific users.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {(['free','pro','admin'] as Plan[]).map(plan => (
                  <div key={plan} className={`rounded-xl border p-4 ${plan === 'pro' ? 'border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-500/5' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {PLAN_ICON[plan]}
                      <span className="font-semibold text-sm capitalize text-gray-800 dark:text-gray-200">{plan} Plan</span>
                    </div>
                    <div className="space-y-1.5">
                      {features.filter(f => f.default_plan === plan || plan === 'admin').map(f => (
                        <div key={f.key} className="flex items-center gap-1.5">
                          <Check className={`w-3 h-3 shrink-0 ${plan === 'pro' || plan === 'admin' ? 'text-emerald-500' : f.default_plan === 'free' ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}/>
                          <span className="text-[11px] text-gray-600 dark:text-gray-400">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5 border-brand-200 dark:border-brand-700/50 bg-brand-50/30 dark:bg-brand-500/5">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">How to use feature flags</h4>
              <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Go to the <strong>Users</strong> tab and find the user</li>
                <li>Click "Override features" to expand their feature panel</li>
                <li>Toggle individual features ON (force-enable regardless of plan) or OFF (force-disable even for Pro)</li>
                <li>Click ↺ to remove the override and go back to plan defaults</li>
                <li>Changes take effect immediately — no restart needed</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
