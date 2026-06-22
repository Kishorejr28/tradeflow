import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { hasFeature, getUserPlan, type Plan } from '@/lib/adminApi'

// Cached plan in memory
let planCache: { userId: string; plan: Plan; ts: number } | null = null

export function useFeature(featureKey: string): { allowed: boolean; loading: boolean; plan: Plan } {
  const user = useAppStore(s => s.user)
  const [allowed, setAllowed] = useState(true) // optimistic default
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan>('free')

  useEffect(() => {
    if (!user || user.id === 'demo') {
      // Demo user gets everything
      setAllowed(true)
      setPlan('pro')
      return
    }

    const check = async () => {
      setLoading(true)
      // Get plan (cached 5 min)
      if (!planCache || planCache.userId !== user.id || Date.now() - planCache.ts > 5 * 60 * 1000) {
        const p = await getUserPlan(user.id)
        planCache = { userId: user.id, plan: p, ts: Date.now() }
      }
      setPlan(planCache!.plan)

      // Admin always gets everything
      if (planCache!.plan === 'admin') {
        setAllowed(true)
        setLoading(false)
        return
      }

      const result = await hasFeature(user.id, featureKey)
      setAllowed(result)
      setLoading(false)
    }

    check()
  }, [user?.id, featureKey])

  return { allowed, loading, plan }
}

// HOC-style gate: shows an upgrade prompt if not allowed
export function FeatureGate({
  featureKey,
  children,
  fallback,
}: {
  featureKey: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { allowed, loading } = useFeature(featureKey)

  if (loading) return <>{children}</> // optimistic show while loading
  if (!allowed) {
    return (
      <>{fallback ?? <UpgradePrompt featureKey={featureKey} />}</>
    )
  }
  return <>{children}</>
}

function UpgradePrompt({ featureKey }: { featureKey: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4">
        <span className="text-2xl">🔒</span>
      </div>
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Pro Feature</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
        This feature is available on the Pro plan. Upgrade to unlock unlimited access.
      </p>
      <a href="/#pricing"
        className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-brand-500/20">
        Upgrade to Pro →
      </a>
      <p className="text-[10px] text-gray-400 mt-3">Feature: {featureKey}</p>
    </div>
  )
}
