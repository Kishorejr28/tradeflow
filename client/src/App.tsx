import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  const { setUser, setShowTutorial, seenTutorial } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          const u = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            timezone: 'UTC',
            account_currency: 'USD',
            created_at: session.user.created_at,
          }
          setUser(u)
          // Show tutorial for first-time real users
          if (!seenTutorial[session.user.id]) {
            setShowTutorial(true)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          timezone: 'UTC',
          account_currency: 'USD',
          created_at: session.user.created_at,
        }
        setUser(u)
        if (!seenTutorial[session.user.id]) {
          setShowTutorial(true)
        }
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setShowTutorial, seenTutorial])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0f0f0f]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
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
