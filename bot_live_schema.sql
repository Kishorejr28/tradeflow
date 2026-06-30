-- Bot live positions table — updated every 30s by the trading bot
CREATE TABLE IF NOT EXISTS public.bot_live_positions (
  trade_id        text PRIMARY KEY,
  updated_at      timestamptz DEFAULT now(),
  instrument      text NOT NULL,
  direction       text NOT NULL,
  strategy_name   text NOT NULL,
  entry_price     numeric NOT NULL,
  current_price   numeric,
  stop_loss       numeric,
  take_profit     numeric,
  position_size   numeric,
  unrealized_pnl  numeric,
  unrealized_pct  numeric
);

-- Bot status table — single row, updated every 30s
CREATE TABLE IF NOT EXISTS public.bot_status (
  id              int PRIMARY KEY DEFAULT 1,
  updated_at      timestamptz DEFAULT now(),
  equity          numeric,
  cash            numeric,
  daily_pnl       numeric,
  realised_pnl    numeric,
  total_trades    integer,
  wins            integer,
  win_rate        numeric,
  profit_factor   numeric,
  is_running      boolean DEFAULT true,
  regimes         jsonb,
  recent_alerts   jsonb
);

-- Seed the single status row
INSERT INTO public.bot_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Disable RLS (bot writes as service role, TradeFlow reads as anon)
ALTER TABLE public.bot_live_positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_status DISABLE ROW LEVEL SECURITY;
