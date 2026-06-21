export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  timezone?: string
  account_currency?: string
  broker?: string
  theme?: 'light' | 'dark'
  created_at: string
}

export interface Trade {
  id: string
  user_id: string
  symbol: string
  direction: 'long' | 'short'
  entry_price: number
  exit_price?: number
  quantity: number
  pnl?: number
  pnl_r?: number
  status: 'open' | 'closed'
  entry_time: string
  exit_time?: string
  plan_id?: string
  plan_followed?: boolean
  emotion_entry?: string
  emotion_exit?: string
  note?: string
  voice_note_url?: string
  tags?: string[]
  created_at: string
}

export interface TradingPlan {
  id: string
  user_id: string
  name: string
  plan_type: string
  description?: string
  charting_steps: string[]
  entry_criteria: string[]
  entry_models: string[]
  invalidation?: string
  is_active: boolean
  color: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  trade_id?: string
  date: string
  title?: string
  content: string
  emotion?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface NotebookNote {
  id: string
  user_id: string
  title: string
  content: string
  is_template: boolean
  template_category?: string
  folder_id?: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface NotebookFolder {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface DailyStat {
  date: string
  pnl: number
  trades: number
  wins: number
  losses: number
  win_rate: number
  avg_r: number
}
