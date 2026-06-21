import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { User, Bell, Shield, Palette, Globe, CreditCard } from 'lucide-react'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'trading', label: 'Trading', icon: Globe },
]

export default function Settings() {
  const { user, theme, setTheme } = useAppStore()
  const [section, setSection] = useState('profile')
  const [name, setName] = useState(user?.full_name || '')
  const [timezone, setTimezone] = useState('UTC+8')
  const [currency, setCurrency] = useState('USD')
  const [riskPerTrade, setRiskPerTrade] = useState('1')
  const [maxDrawdown, setMaxDrawdown] = useState('10')

  return (
    <div className="flex h-full overflow-hidden">
      {/* Nav */}
      <div className="w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col p-3 shrink-0 bg-white dark:bg-[#141414]">
        <div className="px-2 py-3 mb-2">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
        <div className="space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                section === s.id
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-xl">
          {section === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Profile</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 p-4 card">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">
                  {name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'T'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{name || 'Trader'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <button className="text-xs text-brand-500 hover:text-brand-600 mt-1">Change avatar</button>
                </div>
              </div>

              <div className="card p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Full name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
                  <input value={user?.email || ''} disabled className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Timezone</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none">
                    {['UTC-8', 'UTC-5', 'UTC+0', 'UTC+1', 'UTC+3', 'UTC+5', 'UTC+8'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <button className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition">
                  Save changes
                </button>
              </div>
            </div>
          )}

          {section === 'appearance' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Appearance</h2>
              <div className="card p-5 space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['light', 'dark'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`p-4 rounded-xl border-2 transition ${theme === t ? 'border-brand-500' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <div className={`w-full h-12 rounded-lg mb-2 ${t === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-900 border border-gray-700'}`}>
                          <div className={`h-3 rounded-t-lg ${t === 'light' ? 'bg-gray-100' : 'bg-gray-800'} flex items-center px-2 gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t === 'light' ? 'bg-gray-300' : 'bg-gray-600'}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${t === 'light' ? 'bg-gray-300' : 'bg-gray-600'}`} />
                          </div>
                        </div>
                        <p className={`text-xs font-medium capitalize ${theme === t ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {t} {theme === t && '✓'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Account Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none">
                    {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {section === 'trading' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Trading Settings</h2>
              <div className="card p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Default risk per trade (%)</label>
                  <input type="number" value={riskPerTrade} onChange={e => setRiskPerTrade(e.target.value)} min="0.1" max="100" step="0.1"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Max daily drawdown (%)</label>
                  <input type="number" value={maxDrawdown} onChange={e => setMaxDrawdown(e.target.value)} min="0.1" max="100" step="0.1"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Default broker</label>
                  <input type="text" placeholder="e.g. FTMO, IC Markets, Oanda"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Instruments traded</label>
                  <input type="text" placeholder="e.g. EURUSD, GBPUSD, XAUUSD"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <button className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition">
                  Save trading settings
                </button>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Notifications</h2>
              <div className="card p-5 space-y-4">
                {[
                  { label: 'Post-trade journal reminder', desc: 'Prompt to journal after every closed trade' },
                  { label: 'Daily review reminder', desc: 'End of day review notification' },
                  { label: 'Pre-market routine', desc: 'Morning routine reminder before market open' },
                  { label: 'High-impact news alerts', desc: 'Notify before high-impact economic events' },
                ].map(n => (
                  <label key={n.label} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-0.5 accent-brand-500 w-4 h-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{n.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{n.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {section === 'account' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Account & Security</h2>
              <div className="card p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">New password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Confirm password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <button className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition">
                  Update password
                </button>

                <hr className="border-gray-100 dark:border-gray-800" />
                <div>
                  <p className="text-sm font-medium text-red-500 mb-1">Danger Zone</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Permanently delete your account and all data. This cannot be undone.</p>
                  <button className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
