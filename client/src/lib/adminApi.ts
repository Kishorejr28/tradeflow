import { supabase } from '@/lib/supabase'

export type Plan = 'free' | 'pro' | 'admin'

export interface UserPlan {
  user_id: string
  plan: Plan
  plan_started_at: string
  plan_ends_at?: string
  notes?: string
}

export interface WaitlistEntry {
  id: string
  email: string
  name?: string
  source: string
  plan_interest: string
  converted: boolean
  created_at: string
}

export interface FeatureDefinition {
  key: string
  label: string
  description: string
  default_plan: Plan
  category: string
}

export interface UserFlag {
  feature_key: string
  user_id: string
  enabled: boolean
}

// ── Waitlist ───────────────────────────────────────────────────────────────────
export async function joinWaitlist(email: string, name?: string) {
  const { error } = await supabase.from('waitlist').insert({
    email, name, source: 'landing', plan_interest: 'pro',
  })
  return { error }
}

// ── User plan ─────────────────────────────────────────────────────────────────
export async function getUserPlan(userId: string): Promise<Plan> {
  const { data } = await supabase
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .single()
  return (data?.plan as Plan) ?? 'free'
}

// ── Feature access (client-side, uses Supabase function) ──────────────────────
const featureCache = new Map<string, boolean>()

export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  const cacheKey = `${userId}:${featureKey}`
  if (featureCache.has(cacheKey)) return featureCache.get(cacheKey)!

  const { data } = await supabase.rpc('user_has_feature', {
    p_user_id: userId,
    p_feature_key: featureKey,
  })
  const result = data === true
  featureCache.set(cacheKey, result)
  // Expire cache after 5 minutes
  setTimeout(() => featureCache.delete(cacheKey), 5 * 60 * 1000)
  return result
}

export function clearFeatureCache(userId?: string) {
  if (userId) {
    for (const k of featureCache.keys()) {
      if (k.startsWith(userId)) featureCache.delete(k)
    }
  } else {
    featureCache.clear()
  }
}

// ── Admin APIs ────────────────────────────────────────────────────────────────
export async function adminGetAllUsers() {
  const { data, error } = await supabase
    .from('user_plans')
    .select(`
      user_id, plan, plan_started_at, plan_ends_at, notes, created_at
    `)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function adminGetWaitlist() {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function adminUpdateUserPlan(userId: string, plan: Plan, notes?: string) {
  clearFeatureCache(userId)
  const { error } = await supabase
    .from('user_plans')
    .upsert({ user_id: userId, plan, notes, updated_at: new Date().toISOString() })
  return { error }
}

export async function adminGetFeatureDefinitions() {
  const { data, error } = await supabase
    .from('feature_definitions')
    .select('*')
    .order('category')
  return { data, error }
}

export async function adminGetUserFlags(userId: string) {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export async function adminSetUserFlag(userId: string, featureKey: string, enabled: boolean) {
  clearFeatureCache(userId)
  const { error } = await supabase
    .from('feature_flags')
    .upsert({ user_id: userId, feature_key: featureKey, enabled })
  return { error }
}

export async function adminMarkWaitlistConverted(id: string) {
  const { error } = await supabase
    .from('waitlist')
    .update({ converted: true, converted_at: new Date().toISOString() })
    .eq('id', id)
  return { error }
}

export async function adminGetStats() {
  const [plans, waitlist] = await Promise.all([
    supabase.from('user_plans').select('plan'),
    supabase.from('waitlist').select('converted'),
  ])
  const planData = plans.data ?? []
  const wlData = waitlist.data ?? []
  return {
    total: planData.length,
    free: planData.filter(p => p.plan === 'free').length,
    pro: planData.filter(p => p.plan === 'pro').length,
    waitlist: wlData.length,
    waitlistConverted: wlData.filter(w => w.converted).length,
  }
}
