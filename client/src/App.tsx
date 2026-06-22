import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAppStore, type Plan } from '@/store/appStore'
import { getUserPlan } from '@/lib/adminApi'
import Layout from '@/components/layout/Layout'
import AuthPage from '@/pages/AuthPage'
import LandingPage from '@/pages/LandingPage'
import Dashboard from '@/pages/Dashboard'
import Trading from '@/pages/Trading'
import Replay from '@/pages/Replay'
import Edge from '@/pages/Edge'
import Journal from '@/pages/Journal'
import Notebook from '@/pages/Notebook'
import News from '@/pages/News'
import Sanctuary from '@/pages/Sanctuary'
import Settings from '@/pages/Settings'
import AdminDashboard from '@/pages/AdminDashboard'

const ADMIN_EMAIL = 'kishorejr28@gmail.com'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const plan  = useAppStore((s) => s.userPlan)
  // Allow if admin email OR admin plan
  if (!user) return <Navigate to="/auth" replace />
  if (user.email !== ADMIN_EMAIL && plan !== 'admin') return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function AuthHandler() {
  const { setUser, setUserPlan, setShowTutorial, seenTutorial } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)

  const applySession = async (supaUser: any, event?: string) => {
    const u = {
      id: supaUser.id,
      email: supaUser.email!,
      full_name: supaUser.user_metadata?.full_name,
      avatar_url: supaUser.user_metadata?.avatar_url,
      timezone: 'UTC', account_currency: 'USD',
      created_at: supaUser.created_at,
    }
    setUser(u)

    // Load plan from Supabase (or default to 'free')
    try {
      const plan = await getUserPlan(supaUser.id) as Plan
      setUserPlan(plan)
    } catch {
      // If admin schema not set up yet, infer from email
      if (supaUser.email === ADMIN_EMAIL) setUserPlan('admin')
      else setUserPlan('free')
    }

    if (!seenTutorial[supaUser.id]) setShowTutorial(true)

    if (event === 'SIGNED_IN' || !event) {
      if (location.pathname === '/' || location.pathname === '/auth') {
        navigate('/app/dashboard', { replace: true })
      }
    }
  }

  useEffect(() => {
    if (!hasSupabaseConfig) { setLoading(false); return }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) applySession(session.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          applySession(session.user, event)
        }
      } else {
        setUser(null)
        setUserPlan('free')
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="trading"    element={<Trading />} />
          <Route path="replay"     element={<Replay />} />
          <Route path="edge"       element={<Edge />} />
          <Route path="journal"    element={<Journal />} />
          <Route path="notebook"   element={<Notebook />} />
          <Route path="news"       element={<News />} />
          <Route path="sanctuary"  element={<Sanctuary />} />
          <Route path="settings"   element={<Settings />} />
        </Route>
        {/* Admin — protected, requires admin email or plan */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
