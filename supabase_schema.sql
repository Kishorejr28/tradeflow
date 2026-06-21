-- TradeFlow Supabase Schema
-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  account_currency text default 'USD',
  broker text,
  risk_per_trade numeric(5,2) default 1.0,
  max_daily_drawdown numeric(5,2) default 5.0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trading plans
create table public.trading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  plan_type text,
  description text,
  charting_steps jsonb default '[]',
  entry_criteria jsonb default '[]',
  entry_models jsonb default '[]',
  invalidation text,
  is_active boolean default true,
  color text default '#dc2626',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trading_plans enable row level security;
create policy "Users can manage own plans" on public.trading_plans for all using (auth.uid() = user_id);

-- Trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  direction text check (direction in ('long', 'short')) not null,
  entry_price numeric not null,
  exit_price numeric,
  quantity numeric not null,
  pnl numeric,
  pnl_r numeric,
  status text check (status in ('open', 'closed')) default 'open',
  entry_time timestamptz not null,
  exit_time timestamptz,
  plan_id uuid references public.trading_plans(id),
  plan_followed boolean,
  emotion_entry text,
  emotion_exit text,
  note text,
  voice_note_url text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.trades enable row level security;
create policy "Users can manage own trades" on public.trades for all using (auth.uid() = user_id);

-- Journal entries
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  trade_id uuid references public.trades(id),
  date date not null,
  title text,
  content text not null,
  emotion text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.journal_entries enable row level security;
create policy "Users can manage own journal" on public.journal_entries for all using (auth.uid() = user_id);

-- Notebook folders
create table public.notebook_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table public.notebook_folders enable row level security;
create policy "Users can manage own folders" on public.notebook_folders for all using (auth.uid() = user_id);

-- Notebook notes
create table public.notebook_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  folder_id uuid references public.notebook_folders(id),
  title text not null,
  content text default '',
  is_template boolean default false,
  template_category text,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notebook_notes enable row level security;
create policy "Users can manage own notes" on public.notebook_notes for all using (auth.uid() = user_id);

-- Meditation sessions
create table public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  duration_seconds integer not null,
  completed_seconds integer not null,
  sound text,
  intention text,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.meditation_sessions enable row level security;
create policy "Users can manage own sessions" on public.meditation_sessions for all using (auth.uid() = user_id);

-- Storage bucket for voice notes
insert into storage.buckets (id, name, public) values ('voice-notes', 'voice-notes', false);
create policy "Users can upload own voice notes" on storage.objects for insert with check (auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can read own voice notes" on storage.objects for select using (auth.uid()::text = (storage.foldername(name))[1]);
