import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, BookOpen, FileText, NotebookPen,
  Newspaper, Leaf, Settings, ChevronLeft, Moon, Sun, LogOut,
  History, Shield, Sparkles, ArrowRight, Bot, Menu, X,
} from 'lucide-react'
import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, PLAN_NAMES, PLAN_COLORS } from '@/store/appStore'
import UpgradeModal from '@/components/ui/UpgradeModal'

// ── Mobile drawer context — lets any child component close the drawer ─────────
export const SidebarContext = createContext<{ close: () => void }>({ close: () => {} })

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/trading',   icon: TrendingUp,      label: 'Trading' },
  { to: '/app/aibot',     icon: Bot,             label: 'AI Bot' },
  { to: '/app/replay',    icon: History,          label: 'Replay' },
  { to: '/app/edge',      icon: BookOpen,         label: 'Edge' },
  { to: '/app/journal',   icon: FileText,         label: 'Journal' },
  { to: '/app/notebook',  icon: NotebookPen,      label: 'Notebook' },
  { to: '/app/news',      icon: Newspaper,        label: 'News' },
  { to: '/app/sanctuary', icon: Leaf,             label: 'Sanctuary' },
]

// ── Shared nav content ────────────────────────────────────────────────────────
function NavContent({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean
  onNavClick?: () => void
}) {
  const { theme, setTheme, user, userPlan, signOut } = useAppStore()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const navigate = useNavigate()
  const isAdmin = userPlan === 'admin'
  const isPro   = userPlan === 'pro' || userPlan === 'admin'
  const planName = PLAN_NAMES[userPlan]

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100 dark:border-gray-800/60 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-wide">TradeFlow</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              }`
            }>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin" onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-amber-500 dark:text-amber-500/80 hover:bg-amber-50 dark:hover:bg-amber-500/10'
              }`
            }>
            <Shield className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </NavLink>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-gray-100 dark:border-gray-800/60 pt-3 shrink-0">
        <NavLink to="/app/settings" onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }`
          }>
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all">
          {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>Theme: {theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>

        {/* User badge */}
        <div className="mt-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
              isAdmin ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
              isPro   ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        'bg-gradient-to-br from-gray-400 to-gray-600'
            }`}>
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'T'}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate leading-tight">
                    {user?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${PLAN_COLORS[userPlan]}`}>
                    {isAdmin && <Shield className="w-2 h-2" />}
                    {planName}
                  </span>
                </div>
                <button onClick={handleSignOut}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Upgrade banner */}
        {!collapsed && userPlan === 'free' && (
          <div className="mx-2 mb-2 p-3 rounded-xl bg-gradient-to-br from-yellow-400/10 to-amber-500/10 border border-yellow-400/30 dark:border-amber-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Upgrade to Edge Pro</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
              AI coach · unlimited journal · 2yr chart data
            </p>
            <button onClick={() => setShowUpgrade(true)}
              className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white text-[11px] font-semibold transition shadow-sm">
              🥇 Upgrade to Pro <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Desktop collapse toggle */}
        <button onClick={onNavClick}
          className="hidden md:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  )
}

// ── Main Sidebar export ───────────────────────────────────────────────────────
export default function Sidebar() {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <SidebarContext.Provider value={{ close: () => setMobileOpen(false) }}>

      {/* ── MOBILE hamburger button — top-left fixed ───────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <Menu className="w-4.5 h-4.5" />
      </button>

      {/* ── MOBILE drawer overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] flex flex-col bg-white dark:bg-[#141414] shadow-2xl"
            >
              {/* Close button inside drawer */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>

              <NavContent collapsed={false} onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── DESKTOP sidebar — hidden on mobile ───────────────────────────── */}
      <aside className={`
        hidden md:flex flex-col h-full shrink-0
        ${collapsed ? 'w-16' : 'w-56'}
        bg-white dark:bg-[#141414]
        border-r border-gray-100 dark:border-gray-800/60
        transition-all duration-200
      `}>
        <NavContent collapsed={collapsed} onNavClick={() => setCollapsed(c => !c)} />
      </aside>

    </SidebarContext.Provider>
  )
}
