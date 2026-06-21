# TradeFlow

A personal trading platform — dashboard, journal, edge plans, TradingView charts, economic calendar, notebook, and meditation sanctuary.

## Stack
- React + TypeScript + Vite
- Tailwind CSS
- Supabase (auth + database)
- TradingView chart widget

## Setup

```bash
cd client
cp .env.example .env.local   # fill in your Supabase credentials
npm install
npm run dev
```

## Deploy
Configured for Vercel. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel dashboard.
