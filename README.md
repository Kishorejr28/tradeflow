# TradeFlow

A personal trading platform built for serious traders — real charts, real data, journaling, edge plan builder, economic calendar, notebook, AI bot dashboard, and email price alerts. All in one place.

Live demo: [tradeflow-one-ruddy.vercel.app](https://tradeflow-one-ruddy.vercel.app)

---

## Features

| Feature | What it does |
|---|---|
| **Chart Replay** | Replay real historical data for 150+ instruments (stocks, forex, crypto, indices, commodities) — practice without risking money |
| **Live Trading** | Multi-layout charts with watchlist, price alerts, pip calculator and a $100k demo account |
| **Email Price Alerts** | Set a price target on any instrument — get an instant email the moment it's hit, even when away from the screen |
| **Trading Journal** | Log every trade with emotions, plan adherence, notes and voice reflections. Calendar view shows patterns |
| **Edge Plans** | Build your trading playbook with step-by-step charting processes, entry criteria and invalidation rules |
| **Economic Calendar** | Live economic events filtered by currency and impact — never get caught by high-impact news |
| **Notebook** | Personal trading library — notes, templates (Daily Review, Pre-Market Prep), saved lessons |
| **Sanctuary** | Meditation timer with guided ambient audio — ocean, rain, forest, binaural beats |
| **Performance Stats** | Dashboard with equity curve, win rate, average R, P&L calendar |
| **AI Bot Dashboard** | Live tab showing trades, scores, and P&L from your [ai-trading-bot](https://github.com/Kishorejr28/ai-trading-bot) |

---

## Supported Markets

- 🇺🇸 US Stocks — AAPL, NVDA, TSLA, MSFT, GOOGL...
- 🇮🇳 India (NSE) — RELIANCE.NS, TCS.NS, NIFTY...
- 🌍 Forex — EURUSD, GBPJPY, USDJPY, XAUUSD...
- ₿ Crypto — BTCUSD, ETHUSD, SOLUSD...
- 🇩🇪 Germany, 🇬🇧 UK, 🇯🇵 Japan, 🇭🇰 Hong Kong, 🇦🇺 Australia, 🇧🇷 Brazil
- 📊 Indices — SPX500, NIKKEI, DAX40, FTSE100...
- 🪙 Commodities — XAUUSD, USOIL, WHEAT, NATGAS...

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Charts | Lightweight-Charts (TradingView) + Recharts |
| State | Zustand (persisted to localStorage) |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Market Data | Yahoo Finance (free, 150+ instruments, 10yr history) |
| Email | Resend (free tier — 3,000 emails/month) |
| Routing | React Router v6 |
| Rich Text | Tiptap |
| Audio | Howler.js |

---

## Project Structure

```
tradeflow/
├── client/                        # React frontend
│   ├── src/
│   │   ├── pages/                 # Route-level pages
│   │   │   ├── LandingPage.tsx    # Public marketing page
│   │   │   ├── Trading.tsx        # Live trading + charts + alerts
│   │   │   ├── Journal.tsx        # Trade journal
│   │   │   ├── Replay.tsx         # Chart replay
│   │   │   ├── Edge.tsx           # Edge plans
│   │   │   ├── Dashboard.tsx      # Performance stats
│   │   │   ├── Notebook.tsx       # Notes + templates
│   │   │   ├── News.tsx           # Economic calendar
│   │   │   └── Sanctuary.tsx      # Meditation timer
│   │   ├── components/
│   │   │   ├── trading/
│   │   │   │   ├── TFChart.tsx    # Chart component (indicators, drawing tools)
│   │   │   │   └── PracticeMode.tsx
│   │   │   └── BotDashboard.tsx   # AI trading bot live dashboard
│   │   ├── store/
│   │   │   ├── appStore.ts        # User auth + trades + plans (Zustand)
│   │   │   └── demoStore.ts       # Demo account state (Zustand)
│   │   ├── lib/
│   │   │   ├── supabase.ts        # Supabase client
│   │   │   ├── marketData.ts      # Yahoo Finance data fetching + cache
│   │   │   ├── email.ts           # Resend email (waitlist + price alerts)
│   │   │   ├── botApi.ts          # Trading bot REST client
│   │   │   └── adminApi.ts        # Admin queries
│   │   ├── hooks/
│   │   │   └── useLivePrices.ts   # Simulated live price feed
│   │   └── types/index.ts         # TypeScript interfaces
│   ├── .env.example
│   └── package.json
└── supabase_schema.sql            # Database schema
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/Kishorejr28/tradeflow.git
cd tradeflow/client
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Add your credentials to `.env.local`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=re_your_resend_key   # optional — for email price alerts
```

- **Supabase** — free at [supabase.com](https://supabase.com). Run `supabase_schema.sql` in the SQL editor.
- **Resend** — free at [resend.com](https://resend.com) (3,000 emails/month, no credit card).

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## AI Bot Integration

The Trading page has an **AI Bot** tab that connects to the [ai-trading-bot](https://github.com/Kishorejr28/ai-trading-bot) backend. Start the bot's API server first:

```bash
# In the ai-trading-bot directory
python api/bot_api.py   # starts on http://localhost:8000
```

Then open the Trading page and click **AI Bot** in the top bar.

---

## Email Price Alerts

1. Log in and open the Trading page
2. Click the **🔔 Alert** button in the chart top bar (or open the Alerts sidebar tab)
3. Set your symbol, condition (above/below), and target price
4. Toggle "Email me" — uses your account email
5. When the price is hit, an email fires instantly via Resend

No server required — the email is sent directly from the browser using your Resend API key.

---

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com) — set root to `client/`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RESEND_API_KEY`
4. Deploy

---

## Disclaimer

TradeFlow uses a simulated demo account for practice trading. No real money is involved. Market data is sourced from Yahoo Finance and is provided for educational purposes only.
