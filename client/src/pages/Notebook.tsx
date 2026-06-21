import { useState } from 'react'
import { Search, Pin, Plus, ChevronRight, FileText, BarChart2, Brain, Calendar } from 'lucide-react'

const TEMPLATE_CATEGORIES = [
  {
    name: 'Performance Review',
    icon: BarChart2,
    templates: [
      { name: 'Daily Review', description: 'Session breakdown: Asia / London / New York' },
      { name: 'Weekly Review', description: 'Week summary: stats, patterns, improvements' },
      { name: 'Monthly Review', description: 'Monthly performance deep-dive' },
      { name: 'Quarterly Review', description: 'Q1/Q2/Q3/Q4 analysis' },
      { name: 'Annual Review', description: 'Year-end reflection and goal setting' },
    ],
  },
  {
    name: 'Mindset',
    icon: Brain,
    templates: [
      { name: 'Pre-Market Mental Prep', description: 'Sleep score, intentions, bias check' },
      { name: 'Post-Trade Reflection', description: 'Emotion, decision quality, what you learned' },
      { name: 'Emotional Mapping Journal', description: 'Trigger → emotion → response analysis' },
      { name: 'Macro Trade Journal Template', description: 'Full trade documentation template' },
    ],
  },
]

const DEMO_NOTES = [
  { id: '1', title: 'Risk Management 101', preview: 'Risk Management Principles...', updated: '4 months ago', pinned: true, icon: '📌' },
  { id: '2', title: 'Japanese Candlesticks', preview: 'Each candlestick represents a singl...', updated: '4 months ago', pinned: false, icon: '📊' },
  { id: '3', title: 'Common mistakes to avoid', preview: 'Trying to predict the reversal too ea...', updated: '2 months ago', pinned: false, icon: '⚠️' },
  { id: '4', title: 'My A+ ENTRY CHECKLIST', preview: 'Rule: Miss 1 = no trade. No excepti...', updated: '2 months ago', pinned: false, icon: '✅' },
  { id: '5', title: 'How To Pass Prop Firm Challenges 101', preview: 'Common prop failure patterns and t...', updated: '3 months ago', pinned: false, icon: '🎯' },
  { id: '6', title: 'The 21-Day EdgeFlo Discipline Challenge', preview: 'Over the next 21 days, you\'re going...', updated: '3 months ago', pinned: false, icon: '💪' },
  { id: '7', title: 'How To Trade The News 101', preview: 'Option A: Avoid it completely (most...', updated: '3 months ago', pinned: false, icon: '📰' },
  { id: '8', title: 'IF/THEN Cheat Sheet', preview: 'Scenario-based decision tree...', updated: '3 months ago', pinned: false, icon: '📋' },
]

export default function Notebook() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'notes' | 'templates'>('notes')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const filtered = DEMO_NOTES.filter(n =>
    n.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'} border-r border-gray-100 dark:border-gray-800 flex flex-col transition-all duration-200 shrink-0 bg-white dark:bg-[#141414]`}>
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search in notes"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </div>

        {/* Pinned */}
        <div className="px-3 mb-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pinned Notes</p>
          {filtered.filter(n => n.pinned).map(note => (
            <button key={note.id} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{note.title}</p>
              <p className="text-[10px] text-gray-400 truncate">{note.preview}</p>
            </button>
          ))}
        </div>

        {/* All notes */}
        <div className="px-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">All Notes</p>
            <button className="text-gray-400 hover:text-brand-500 transition">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {filtered.filter(n => !n.pinned).map(note => (
              <button key={note.id} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition group">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{note.icon}</span>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{note.title}</p>
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{note.updated}</p>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Folders</p>
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition px-2 py-1">
              <Plus className="w-3 h-3" /> New folder
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notebook</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Think before you trade. Review before you repeat.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setView('notes')}
                className={`px-3 py-1.5 text-xs font-medium transition ${view === 'notes' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Notes
              </button>
              <button
                onClick={() => setView('templates')}
                className={`px-3 py-1.5 text-xs font-medium transition ${view === 'templates' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Templates
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> New note
            </button>
          </div>
        </div>

        {view === 'templates' ? (
          <div className="space-y-8">
            {TEMPLATE_CATEGORIES.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center gap-2 mb-4">
                  <cat.icon className="w-4 h-4 text-brand-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">{cat.name}</h2>
                  <span className="text-xs text-gray-400">{cat.templates.length}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {cat.templates.map(t => (
                    <button
                      key={t.name}
                      className="card p-4 text-left hover:border-brand-300 dark:hover:border-brand-600 transition group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition" />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Template</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {DEMO_NOTES.map(note => (
              <button key={note.id} className="card p-4 text-left hover:border-brand-300 dark:hover:border-brand-600 transition group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{note.icon}</span>
                  {note.pinned && <Pin className="w-3 h-3 text-brand-400" />}
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 truncate">{note.title}</p>
                <p className="text-xs text-gray-400 truncate">{note.preview}</p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2">{note.updated}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
