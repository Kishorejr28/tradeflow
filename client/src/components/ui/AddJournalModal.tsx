import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'

const TEMPLATES = {
  'Post-Trade Reflection': `## Trade Details
- Pair:
- Direction:
- Entry: | Exit: | P&L:

## What happened?


## Did I follow my plan?
- [ ] Yes  [ ] No

## What I did well:


## What to improve:


## Key lesson:
`,
  'Daily Review': `## Session:
## Date:

### Summary Stats
- Trades: | Wins: | Losses:
- Net P&L: | Avg R:

### Market Conditions


### What worked today:


### Mistakes made:


### Tomorrow's focus:
`,
  'Pre-Market Prep': `## Date:
## Sleep score (1-10):
## Energy level (1-10):

### Today I will:


### Key levels to watch:


### News events today:


### My bias:


### I will NOT trade if:
`,
  'Blank Note': '',
}

interface Props {
  defaultTitle?: string
  defaultContent?: string
  onSave: (entry: { title: string; content: string; date: string }) => void
  onClose: () => void
}

export default function AddJournalModal({ defaultTitle = '', defaultContent = '', onSave, onClose }: Props) {
  const [title, setTitle] = useState(defaultTitle)
  const [content, setContent] = useState(defaultContent)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showTemplates, setShowTemplates] = useState(!defaultContent)

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key as keyof typeof TEMPLATES]
    setContent(t)
    if (!title) setTitle(key === 'Blank Note' ? '' : key)
    setShowTemplates(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">New Journal Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Template picker */}
          {showTemplates ? (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Choose a template to get started:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(TEMPLATES).map(key => (
                  <button key={key} onClick={() => applyTemplate(key)}
                    className="p-3 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition group">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">{key}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {key === 'Blank Note' ? 'Start from scratch' : TEMPLATES[key as keyof typeof TEMPLATES].slice(0, 50) + '...'}
                    </p>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline">
                Skip and write freely
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry title..."
                  className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition px-2 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-400">
                  Template <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <textarea value={content} onChange={e => setContent(e.target.value)} rows={16}
                placeholder="Start writing your journal entry..."
                className="w-full px-3 py-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono leading-relaxed" />
            </>
          )}
        </div>

        {!showTemplates && (
          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            <button onClick={() => { onSave({ title, content, date }); onClose() }}
              disabled={!content.trim()}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-50">
              Save Entry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
