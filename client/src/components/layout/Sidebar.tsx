import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, BookOpen, FileText, NotebookPen,
  Newspaper, Leaf, Settings, ChevronLeft, Moon, Sun, LogOut,
  History, Shield, Sparkles, ArrowRight,
} from 'lucide-react'
import { useState } from 'react'
import { useAppStore, PLAN_NAMES, PLAN_COLORS } from '@/store/appStore'

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/trading',   icon: TrendingUp,     label: 'Trading' },
  { to: '/app/replay',    icon: History,         label: 'Replay' },
  { to: '/app/edge',      icon: BookOpen,        label: 'Edge' },
  { to: '/app/journal',   icon: FileText,        label: 'Journal' },
  { to: '/app/notebook',  icon: NotebookPen,     label: 'Notebook' },
  { to: '/app/news',      icon: Newspaper,       label: 'News' },
  { to: '/app/sanctuary', icon: Leaf,            label: 'Sanctuary' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme, user, userPlan, signOut } = useAppStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const planName  = PLAN_NAMES[userPlan]
  const isAdmin   = userPlan === 'admin'
  const isPro     = userPlan === 'pro' || userPlan === 'admin'

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} flex flex-col h-full bg-white dark:bg-[#141414] border-r border-gray-100 dark:border-gray-800/60 transition-all duration-200 shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100 dark:border-gray-800/60">
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-wide">TradeFlow</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              }`
            }>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Admin link — only shown to admin */}
        {isAdmin && (
          <NavLink to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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

      {/* Bottom controls */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-gray-100 dark:border-gray-800/60 pt-3">
        <NavLink to="/app/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }`
          }>
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors">
          {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0"/> : <Moon className="w-4 h-4 shrink-0"/>}
          {!collapsed && <span>Theme: {theme === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>

        {/* User + Plan badge */}
        <div className="mt-1">
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
              isAdmin ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
              isPro   ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        'bg-gradient-to-br from-gray-400 to-gray-600'
            }`}>
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'T'}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate leading-tight">
                  {user?.full_name || user?.email?.split('@')[0]}
                </p>
                {/* Plan badge */}
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${PLAN_COLORS[userPlan]}`}>
                  {isAdmin && <Shield className="w-2 h-2"/>}
                  {planName}
                </span>
              </div>
            )}

            {!collapsed && (
              <button onClick={handleSignOut}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                title="Sign out">
                <LogOut className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>
        </div>

        {/* Gentle upgrade banner — only for free users, hidden when collapsed */}
        {!collapsed && userPlan === 'free' && (
          <div className="mx-2 mb-2 p-3 rounded-xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 dark:border-brand-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-brand-400 shrink-0"/>
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">Upgrade to Edge Pro</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
              Unlock AI coach, unlimited journal & 2yr chart replay
            </p>
            <a href="/#pricing"
              className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-semibold transition">
              See plans <ArrowRight className="w-2.5 h-2.5"/>
            </a>
          </div>
        )}

        {/* Collapse */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`}/>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
