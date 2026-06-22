-- TradeFlow Admin Schema Extension
-- Run this in Supabase SQL editor AFTER the main schema

-- ── User plans ─────────────────────────────────────────────────────────────────
create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  plan text not null default 'free' check (plan in ('free','pro','admin')),
  plan_started_at timestamptz default now(),
  plan_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_plans enable row level security;
-- Users can read their own plan
create policy "Users read own plan" on public.user_plans for select using (auth.uid() = user_id);
-- Only service role / admin can write
create policy "Admin full access plans" on public.user_plans for all
  using (exists (select 1 from public.user_plans p where p.user_id = auth.uid() and p.plan = 'admin'));

-- ── Feature flags (per user overrides) ──────────────────────────────────────
-- Global defaults + per-user overrides
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  plan_required text default 'free' check (plan_required in ('free','pro','admin')),
  created_at timestamptz default now(),
  unique(feature_key, user_id)
);

alter table public.feature_flags enable row level security;
create policy "Users read own flags" on public.feature_flags for select using (auth.uid() = user_id or user_id is null);
create policy "Admin full access flags" on public.feature_flags for all
  using (exists (select 1 from public.user_plans p where p.user_id = auth.uid() and p.plan = 'admin'));

-- ── Waitlist ──────────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  source text default 'landing',
  plan_interest text default 'pro',
  notes text,
  converted boolean default false,
  converted_at timestamptz,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;
-- Anyone can insert (join waitlist)
create policy "Anyone can join waitlist" on public.waitlist for insert with check (true);
-- Only admin can read/update
create policy "Admin read waitlist" on public.waitlist for select
  using (exists (select 1 from public.user_plans p where p.user_id = auth.uid() and p.plan = 'admin'));
create policy "Admin update waitlist" on public.waitlist for update
  using (exists (select 1 from public.user_plans p where p.user_id = auth.uid() and p.plan = 'admin'));

-- ── Feature definitions (master list) ────────────────────────────────────────
create table if not exists public.feature_definitions (
  key text primary key,
  label text not null,
  description text,
  default_plan text not null default 'free' check (default_plan in ('free','pro','admin')),
  category text default 'general'
);

alter table public.feature_definitions enable row level security;
create policy "Anyone read definitions" on public.feature_definitions for select using (true);
create policy "Admin write definitions" on public.feature_definitions for all
  using (exists (select 1 from public.user_plans p where p.user_id = auth.uid() and p.plan = 'admin'));

-- Insert default feature definitions
insert into public.feature_definitions (key, label, description, default_plan, category) values
  ('journal_unlimited',    'Unlimited Journal Entries', 'Remove 5/day limit on journal entries',       'pro',   'journal'),
  ('edge_plans_unlimited', 'Unlimited Edge Plans',      'Remove 3 plan limit',                         'pro',   'edge'),
  ('ai_coach',             'AI Trade Coach',            'AI-powered journal analysis and suggestions',  'pro',   'ai'),
  ('prop_simulator',       'Prop Firm Simulator',       'FTMO/MyForexFunds challenge simulation',       'pro',   'trading'),
  ('monte_carlo',          'Monte Carlo Analysis',      'Strategy stress testing via simulation',        'pro',   'analytics'),
  ('csv_import',           'MT4/MT5 CSV Import',        'Import trades from MetaTrader exports',         'pro',   'journal'),
  ('multi_account',        'Multi-Account Tracking',    'Track multiple trading accounts',               'pro',   'trading'),
  ('voice_notes',          'Voice Note Transcription',  'Auto-transcribe voice journal notes',           'pro',   'journal'),
  ('advanced_charts',      'Advanced Chart Replay',     'Tick-level data and seconds timeframes',        'pro',   'replay'),
  ('export_data',          'Export Data',               'Export journal/stats as CSV/PDF',               'pro',   'general'),
  ('replay_basic',         'Basic Chart Replay',        '150+ instruments, real historical data',        'free',  'replay'),
  ('sanctuary',            'Sanctuary Meditation',      'Meditation timer and ambient sounds',           'free',  'general'),
  ('economic_calendar',    'Economic Calendar',         'Live forex factory calendar',                   'free',  'general'),
  ('demo_trading',         'Demo Trading Account',      '$100k demo account in trading page',            'free',  'trading')
on conflict (key) do nothing;

-- ── Auto-assign free plan on signup ──────────────────────────────────────────
create or replace function public.handle_new_user_plan()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.user_plans (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_plan on auth.users;
create trigger on_auth_user_plan
  after insert on auth.users
  for each row execute procedure public.handle_new_user_plan();

-- ── Helper function: check if user has feature access ────────────────────────
create or replace function public.user_has_feature(p_user_id uuid, p_feature_key text)
returns boolean language plpgsql security definer
as $$
declare
  v_plan text;
  v_required_plan text;
  v_override boolean;
begin
  -- Get user plan
  select plan into v_plan from public.user_plans where user_id = p_user_id;
  v_plan := coalesce(v_plan, 'free');

  -- Check per-user override first
  select enabled into v_override from public.feature_flags
    where user_id = p_user_id and feature_key = p_feature_key;
  if found then return v_override; end if;

  -- Fall back to plan-based access
  select default_plan into v_required_plan from public.feature_definitions where key = p_feature_key;
  if not found then return true; end if; -- unknown feature = allow

  return case
    when v_plan = 'admin' then true
    when v_plan = 'pro' and v_required_plan in ('free','pro') then true
    when v_plan = 'free' and v_required_plan = 'free' then true
    else false
  end;
end;
$$;

-- ── Make yourself admin (run once with your user ID) ─────────────────────────
-- After signing up, find your user ID in Supabase Auth > Users, then run:
-- update public.user_plans set plan = 'admin' where user_id = 'YOUR-USER-ID-HERE';
-- Or use service role key from the admin panel to do it via the UI
