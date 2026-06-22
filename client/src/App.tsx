import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

// Handles post-auth redirect inside the Router context
function AuthHandler() {
  const { setUser, setShowTutorial, seenTutorial } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabaseConfig) { setLoading(false); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          timezone: 'UTC', account_currency: 'USD',
          created_at: session.user.created_at,
        })
        if (!seenTutorial[session.user.id]) setShowTutorial(true)
        // If on landing or auth page, redirect to app
        if (location.pathname === '/' || location.pathname === '/auth') {
          navigate('/app/dashboard', { replace: true })
        }
      }
    }).catch(() => {}).finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          timezone: 'UTC', account_currency: 'USD',
          created_at: session.user.created_at,
        })
        if (!seenTutorial[session.user.id]) setShowTutorial(true)
        // Redirect to app on sign-in events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (location.pathname === '/' || location.pathname === '/auth') {
            navigate('/app/dashboard', { replace: true })
          }
        }
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        <Route
          path="/app"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trading" element={<Trading />} />
          <Route path="replay" element={<Replay />} />
          <Route path="edge" element={<Edge />} />
          <Route path="journal" element={<Journal />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="news" element={<News />} />
          <Route path="sanctuary" element={<Sanctuary />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

