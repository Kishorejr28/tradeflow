import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAppStore, type Plan } from '@/store/appStore'
import { getUserPlan } from '@/lib/adminApi'
import Layout from '@/components/layout/Layout'
import AuthPage from '@/pages/AuthPage'
import LandingPage from '@/pages/LandingPage'
import PremiumLandingPage from '@/pages/PremiumLandingPage'
import NewHomePage from '@/pages/NewHomePage'
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
  const user = useAppStore(s => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  // If user already in localStorage, don't show spinner — start as not loading
  const [loading, setLoading] = useState(!user)

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

    try {
      const plan = await getUserPlan(supaUser.id) as Plan
      setUserPlan(plan)
    } catch {
      if (supaUser.email === ADMIN_EMAIL) setUserPlan('admin')
      else setUserPlan('free')
    }

    if (!seenTutorial[supaUser.id]) setShowTutorial(true)

    // Only redirect to dashboard on explicit sign-in event
    // NEVER redirect when just restoring session on page load/refresh
    if (event === 'SIGNED_IN') {
      // Only redirect away from auth page, never from landing page
      if (location.pathname === '/auth') {
        navigate('/app/dashboard', { replace: true })
      }
    }
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false)
      // For local admin bypass — user already in store, just unblock
      return
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          // On refresh: restore session silently, never redirect
          // Only redirect if user explicitly navigated to /auth
          const onAuthPage = location.pathname === '/auth'
          applySession(session.user, onAuthPage ? 'SIGNED_IN' : undefined)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          applySession(session.user, 'SIGNED_IN')
        } else if (event === 'TOKEN_REFRESHED') {
          // Silent token refresh — just update user, don't navigate
          applySession(session.user, undefined)
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear user on explicit sign-out, not on initial load
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
        <Route path="/" element={<PremiumLandingPage />} />
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
