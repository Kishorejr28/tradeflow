import { useState } from 'react'
import { Plus, MoreHorizontal, Edit2, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'

const PLAN_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2']

interface Plan {
  id: string
  name: string
  plan_type: string
  charting_steps: string[]
  entry_criteria: string[]
  invalidation: string
  is_active: boolean
  color: string
}

const DEMO_PLANS: Plan[] = [
  {
    id: '1',
    name: 'Market Mechanics Plan',
    plan_type: 'Under 5 Minutes',
    charting_steps: [
      'Mark HTF range + premium/discount.',
      'Mark liquidity (PDH/PDL + equal highs/lows)',
      'Decide continuation vs pullback vs reversal',
      'Pick ONE target (opposing zone/structure).',
      'Define invalidation: "My bias is wrong if price breaks + holds beyond X."',
    ],
    entry_criteria: ['LQ Sweep', 'Market Shift', 'Breakout Candle'],
    invalidation: 'My bias is wrong if price breaks + holds beyond X.',
    is_active: true,
    color: '#dc2626',
  },
  {
    id: '2',
    name: 'Asia Sweep Strategy',
    plan_type: 'Asia High/Low Sweep',
    charting_steps: [
      'Mark the Asia box.',
      'Wait for the swed/asep',
      'Wait for strong re-entry back inside',
      'Place stop loss below sweep wick + target 2R',
    ],
    entry_criteria: ['Price swept Asia High/Low', 'Clean displacement + momentum'],
    invalidation: 'Price breaks and closes outside Asia range.',
    is_active: true,
    color: '#dc2626',
  },
  {
    id: '3',
    name: 'Daily Bias',
    plan_type: 'Under 5 Minutes',
    charting_steps: [
      'Mark HTF range + premium/discount.',
      'Mark liquidity (PDH/PDL + equal highs/lows)',
      'Decide continuation vs pullback vs reversal',
      'Pick ONE target (opposing zone/structure).',
    ],
    entry_criteria: ['LQ Sweep', 'Market Shift'],
    invalidation: 'Price closes above/below key HTF level.',
    is_active: false,
    color: '#2563eb',
  },
]

function PlanCard({ plan, onSelect, selected }: { plan: Plan; onSelect: () => void; selected: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-2.5 group
        ${selected ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
      `}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: plan.color }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {plan.name}
        </p>
        <p className="text-xs text-gray-400 truncate">{plan.plan_type}</p>
      </div>
      {plan.is_active && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-medium shrink-0">
          Active
        </span>
      )}
      <MoreHorizontal className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
    </button>
  )
}

function PlanDetail({ plan }: { plan: Plan }) {
  const [stepsOpen, setStepsOpen] = useState(true)
  const [criteriaOpen, setCriteriaOpen] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full mt-1" style={{ background: plan.color }} />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h2>
            <p className="text-sm text-gray-500">Plan Type: {plan.plan_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Charting steps */}
      <div className="mb-5">
        <button
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 w-full"
          onClick={() => setStepsOpen(p => !p)}
        >
          <span>Charting Process</span>
          {stepsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {stepsOpen && (
          <div className="space-y-2">
            {plan.charting_steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry criteria */}
      <div className="mb-5">
        <button
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 w-full"
          onClick={() => setCriteriaOpen(p => !p)}
        >
          <span>Entry Criteria</span>
          {criteriaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {criteriaOpen && (
          <div className="space-y-2">
            {plan.entry_criteria.map((criterion, i) => {
              const key = `${plan.id}-${i}`
              return (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                  <button onClick={() => toggle(key)} className="text-gray-300 dark:text-gray-600 hover:text-brand-500 transition">
                    {checked[key]
                      ? <CheckCircle2 className="w-4 h-4 text-brand-500" />
                      : <Circle className="w-4 h-4" />
                    }
                  </button>
                  <span className={`text-sm ${checked[key] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {criterion}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Invalidation */}
      <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Invalidation</p>
        <p className="text-sm text-amber-800 dark:text-amber-300">{plan.invalidation}</p>
      </div>
    </div>
  )
}

function NewPlanModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [color, setColor] = useState(PLAN_COLORS[0])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">New Trading Plan</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Plan name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Market Mechanics Plan"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Plan type</label>
            <input
              value={type} onChange={e => setType(e.target.value)}
              placeholder="e.g. Under 5 Minutes, Scalp, Swing"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Color</label>
            <div className="flex gap-2">
              {PLAN_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancel
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition">
            Create Plan
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Edge() {
  const [selected, setSelected] = useState<Plan>(DEMO_PLANS[0])
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="flex h-full">
      {showNew && <NewPlanModal onClose={() => setShowNew(false)} />}

      {/* Sidebar */}
      <div className="w-60 border-r border-gray-100 dark:border-gray-800 flex flex-col p-3 shrink-0">
        <div className="flex items-center justify-between px-1 mb-4 mt-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">My Plans</h2>
          <button onClick={() => setShowNew(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-500 transition">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-0.5 flex-1 overflow-y-auto">
          {DEMO_PLANS.map(p => (
            <PlanCard key={p.id} plan={p} onSelect={() => setSelected(p)} selected={selected.id === p.id} />
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edge</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Build and refine your trading playbook</p>
          </div>
          <div className="card p-6">
            <PlanDetail plan={selected} />
          </div>
        </div>
      </div>
    </div>
  )
}
