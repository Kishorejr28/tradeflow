import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, BookOpen, FileText,
  NotebookPen, Newspaper, Leaf, X, ArrowRight, ArrowLeft, CheckCircle2,
} from 'lucide-react'

const STEPS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Your trading home base. See your monthly calendar with P&L for each day, equity curve, win rate, and key stats — all at a glance.',
    route: '/dashboard',
    color: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Trading',
    description: 'Live TradingView chart with your watchlist. Monitor price action and log your trades directly from here.',
    route: '/trading',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: BookOpen,
    title: 'Edge',
    description: 'Build your trading playbook. Create step-by-step trading plans with entry criteria, charting process, and invalidation rules.',
    route: '/edge',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: FileText,
    title: 'Journal',
    description: 'After every trade, a popup asks how you feel and whether you followed your plan. All entries appear on a calendar so you can spot patterns.',
    route: '/journal',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    icon: NotebookPen,
    title: 'Notebook',
    description: 'Your personal trading library. Write notes, use templates like Daily Review or Pre-Market Prep, and keep everything organised in folders.',
    route: '/notebook',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
  {
    icon: Newspaper,
    title: 'News',
    description: 'Economic calendar with filters by currency and impact level. Know exactly what events could move your pairs before you trade.',
    route: '/news',
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-500/10',
  },
  {
    icon: Leaf,
    title: 'Sanctuary',
    description: 'Reset your mind before or after a session. Meditation timer with ambient sounds, interval bells, and streak tracking.',
    route: '/sanctuary',
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
  },
]

export default function TutorialModal() {
  const { showTutorial, tutorialStep, setTutorialStep, setShowTutorial, markTutorialSeen, user } = useAppStore()
  const navigate = useNavigate()

  if (!showTutorial) return null

  const step = STEPS[tutorialStep]
  const isLast = tutorialStep === STEPS.length - 1
  const Icon = step.icon

  const handleNext = () => {
    navigate(step.route)
    if (isLast) {
      handleClose()
    } else {
      setTutorialStep(tutorialStep + 1)
    }
  }

  const handleBack = () => {
    setTutorialStep(tutorialStep - 1)
  }

  const handleClose = () => {
    if (user) markTutorialSeen(user.id)
    setShowTutorial(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-1 bg-brand-500 transition-all duration-300"
            style={{ width: `${((tutorialStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-7">
          {/* Close */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-gray-400">
              {tutorialStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center mb-5`}>
            <Icon className={`w-7 h-7 ${step.color}`} />
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {step.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            {step.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-7">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTutorialStep(i)}
                className={`rounded-full transition-all ${
                  i === tutorialStep
                    ? 'w-5 h-1.5 bg-brand-500'
                    : i < tutorialStep
                    ? 'w-1.5 h-1.5 bg-brand-300 dark:bg-brand-700'
                    : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {tutorialStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Get started
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-4 transition"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
