import type { OHLCV } from '@/pages/Replay'
import type { UTCTimestamp } from 'lightweight-charts'

// ── Known symbol → Yahoo Finance ticker mappings ─────────────────────────────
const YAHOO_MAP: Record<string, string> = {
  // Forex
  EURUSD:'EURUSD=X',GBPUSD:'GBPUSD=X',USDJPY:'JPY=X',AUDUSD:'AUDUSD=X',
  USDCAD:'CAD=X',USDCHF:'CHF=X',NZDUSD:'NZDUSD=X',GBPJPY:'GBPJPY=X',
  EURJPY:'EURJPY=X',EURGBP:'EURGBP=X',EURAUD:'EURAUD=X',GBPAUD:'GBPAUD=X',
  AUDJPY:'AUDJPY=X',CADJPY:'CADJPY=X',NZDJPY:'NZDJPY=X',GBPCAD:'GBPCAD=X',
  EURCAD:'EURCAD=X',CHFJPY:'CHFJPY=X',GBPCHF:'GBPCHF=X',EURCHF:'EURCHF=X',
  // US Stocks
  AAPL:'AAPL',MSFT:'MSFT',GOOGL:'GOOGL',AMZN:'AMZN',NVDA:'NVDA',META:'META',
  TSLA:'TSLA',AVGO:'AVGO',ORCL:'ORCL',NFLX:'NFLX',AMD:'AMD',INTC:'INTC',
  QCOM:'QCOM',TXN:'TXN',MU:'MU',AMAT:'AMAT',LRCX:'LRCX',ADI:'ADI',KLAC:'KLAC',
  JPM:'JPM',BAC:'BAC',WFC:'WFC',GS:'GS',MS:'MS',C:'C',BLK:'BLK',
  V:'V',MA:'MA',AXP:'AXP',PYPL:'PYPL',
  JNJ:'JNJ',UNH:'UNH',LLY:'LLY',PFE:'PFE',MRK:'MRK',ABBV:'ABBV',
  TMO:'TMO',ABT:'ABT',DHR:'DHR',BMY:'BMY',
  XOM:'XOM',CVX:'CVX',COP:'COP',SLB:'SLB',EOG:'EOG',OXY:'OXY',
  MPC:'MPC',PSX:'PSX',VLO:'VLO',
  WMT:'WMT',COST:'COST',HD:'HD',TGT:'TGT',AMGN:'AMGN',GILD:'GILD',
  BIIB:'BIIB',REGN:'REGN',VRTX:'VRTX',
  BA:'BA',CAT:'CAT',GE:'GE',MMM:'MMM',HON:'HON',UPS:'UPS',
  RTX:'RTX',LMT:'LMT',NOC:'NOC',GD:'GD',
  DIS:'DIS',CMCSA:'CMCSA',T:'T',VZ:'VZ',TMUS:'TMUS',
  // Crypto
  BTCUSD:'BTC-USD',ETHUSD:'ETH-USD',SOLUSD:'SOL-USD',BNBUSD:'BNB-USD',
  XRPUSD:'XRP-USD',ADAUSD:'ADA-USD',DOTUSD:'DOT-USD',AVAXUSD:'AVAX-USD',
  MATICUSD:'MATIC-USD',LINKUSD:'LINK-USD',UNIUSD:'UNI7083-USD',ATOMUSD:'ATOM-USD',
  LTCUSD:'LTC-USD',BCHUSD:'BCH-USD',XLMUSD:'XLM-USD',ALGOUSD:'ALGO-USD',
  NEARUSD:'NEAR-USD',APTUSD:'APT21794-USD',ARBUSD:'ARB11841-USD',
  // Indices
  SPX500:'^GSPC',NDX100:'^NDX',DJ30:'^DJI',RUT2000:'^RUT',DAX40:'^GDAXI',
  FTSE100:'^FTSE',CAC40:'^FCHI',NIKKEI:'^N225',ASX200:'^AXJO',HSI:'^HSI',
  IBEX35:'^IBEX',SMI:'^SSMI',AEX:'^AEX',KOSPI:'^KS11',
  SENSEX:'^BSESN',NIFTY50:'^NSEI',
  // Commodities
  XAUUSD:'GC=F',XAGUSD:'SI=F',USOIL:'CL=F',UKOIL:'BZ=F',NATGAS:'NG=F',
  COPPER:'HG=F',WHEAT:'ZW=F',CORN:'ZC=F',SOYBEAN:'ZS=F',SUGAR:'SB=F',
  COFFEE:'KC=F',COCOA:'CC=F',PLATINUM:'PL=F',PALLADIUM:'PA=F',
  // ETFs
  SPY:'SPY',QQQ:'QQQ',IWM:'IWM',DIA:'DIA',VTI:'VTI',VOO:'VOO',
  GLD:'GLD',SLV:'SLV',TLT:'TLT',HYG:'HYG',EEM:'EEM',FXI:'FXI',
  EWZ:'EWZ',GDX:'GDX',XLF:'XLF',XLE:'XLE',XLK:'XLK',XLV:'XLV',
  XLI:'XLI',ARKK:'ARKK',SQQQ:'SQQQ',TQQQ:'TQQQ',
  // Indian stocks (NSE)
  RELIANCE:'RELIANCE.NS',TCS:'TCS.NS',INFY:'INFY.NS',HDFCBANK:'HDFCBANK.NS',
  ICICIBANK:'ICICIBANK.NS',HINDUNILVR:'HINDUNILVR.NS',WIPRO:'WIPRO.NS',
  BAJFINANCE:'BAJFINANCE.NS',SBIN:'SBIN.NS',ADANIENT:'ADANIENT.NS',
  // German stocks (XETRA)
  SAP:'SAP.DE',SIEMENS:'SIE.DE',VOLKSWAGEN:'VOW3.DE',BMW:'BMW.DE',
  BAYER:'BAYN.DE',BASF:'BAS.DE',DEUTSCHE_BANK:'DBK.DE',ALLIANZ:'ALV.DE',
  // UK stocks
  SHELL:'SHEL.L',HSBC:'HSBA.L',BP:'BP.L',ASTRAZENECA:'AZN.L',
  VODAFONE:'VOD.L',LLOYDS:'LLOY.L',BARCLAYS:'BARC.L',
  // Japanese stocks
  TOYOTA:'7203.T',SONY:'6758.T',SOFTBANK:'9984.T',NINTENDO:'7974.T',
  // Chinese stocks
  ALIBABA:'9988.HK',TENCENT:'0700.HK',BIDU:'BIDU',
  // Australian stocks
  BHP:'BHP.AX',CBA:'CBA.AX',ANZ:'ANZ.AX',
}

// ── Interval + range mapping ──────────────────────────────────────────────────
// Yahoo Finance actual limits (tested):
//   1m  → max 7d       5m  → max 60d
//   15m → max 60d      1h  → max 730d (2y)
//   1d  → 10y+         1wk → 20y+
//
// Strategy: use the highest-resolution data available for each TF,
// then we slice to free(6mo) or pro(2y) in the app layer.

const YF_INTERVAL: Record<string, string> = {
  '1m':  '1m',
  '5m':  '5m',
  '15m': '15m',
  '1h':  '60m',   // Yahoo uses '60m' not '1h'
  '4h':  '60m',   // We'll aggregate 4 × 1h candles client-side
  '1D':  '1d',
}

// Maximum range Yahoo will actually return for each interval
const YF_RANGE_MAX: Record<string, string> = {
  '1m':  '7d',
  '5m':  '60d',
  '15m': '60d',
  '1h':  '730d',
  '4h':  '730d',
  '1D':  '10y',
}

// All users get 2 years of data — no artificial free/pro split on data depth
const CANDLE_LIMITS: Record<string, number> = {
  '1m':  3000,    // limited by Yahoo (7d max for 1m anyway)
  '5m':  99999,   // ~2 years
  '15m': 99999,   // ~2 years
  '1h':  5000,    // ~2 years hourly
  '4h':  1300,    // ~2 years in 4h bars
  '1D':  750,     // ~3 years of daily bars
}

// ── Resolve any user-typed symbol to a Yahoo ticker ───────────────────────────
// This is the key function that makes ANY global stock work:
// - Known symbols use the map above
// - Forex patterns (EURUSD, GBPJPY etc) get =X suffix
// - Crypto patterns (BTCUSD) become BTC-USD
// - Everything else is passed through as-is (AAPL, RELIANCE.NS, 7203.T etc)
export function resolveYahooSymbol(sym: string): string {
  const upper = sym.toUpperCase().trim()

  // Check known map first
  if (YAHOO_MAP[upper]) return YAHOO_MAP[upper]

  // Forex: 6 uppercase letters, both parts are known currencies
  const CURRENCIES = new Set(['USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD','HKD','SGD','SEK','NOK','DKK','ZAR','MXN','INR','CNY','BRL','RUB','TRY'])
  if (/^[A-Z]{6}$/.test(upper)) {
    const base = upper.slice(0,3), quote = upper.slice(3)
    if (CURRENCIES.has(base) && CURRENCIES.has(quote)) {
      if (quote === 'USD') return `${base}=X`
      return `${upper}=X`
    }
  }

  // Crypto: ends in USD and 5-10 chars
  if (upper.endsWith('USD') && upper.length >= 5 && upper.length <= 10) {
    const base = upper.slice(0, -3)
    if (base.length >= 2 && /^[A-Z0-9]+$/.test(base)) {
      return `${base}-USD`
    }
  }

  // Ends in -USD already
  if (upper.endsWith('-USD')) return upper

  // Has exchange suffix (e.g. RELIANCE.NS, SIE.DE, 7203.T) — pass through
  if (upper.includes('.')) return upper

  // Index with ^ prefix
  if (sym.startsWith('^')) return sym

  // US stock or ETF — pass through as-is
  return upper
}

// ── Cache — keyed by sym+tf+plan so free/pro get different slices ─────────────
const CACHE = new Map<string, { data: OHLCV[]; ts: number }>()
const CACHE_TTL = 10 * 60 * 1000  // 10 minutes

// ── 4h aggregation from 1h candles ────────────────────────────────────────────
function aggregateTo4h(candles: OHLCV[]): OHLCV[] {
  const out: OHLCV[] = []
  for (let i = 0; i < candles.length; i += 4) {
    const slice = candles.slice(i, i + 4)
    if (!slice.length) continue
    out.push({
      time:   slice[0].time,
      open:   slice[0].open,
      high:   Math.max(...slice.map(c => c.high)),
      low:    Math.min(...slice.map(c => c.low)),
      close:  slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    })
  }
  return out
}

// ── Fetch from Yahoo Finance ───────────────────────────────────────────────────
// Uses query2 first (fewer rate limits), falls back to allorigins CORS proxy
async function fetchYahoo(yahooSym: string, interval: string, range: string): Promise<OHLCV[] | null> {
  // Try query2 first (less rate-limited than query1 in browser context)
  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}&includePrePost=false`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}&includePrePost=false`,
  ]

  for (const url of urls) {
    let json: any = null
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      })
      if (res.ok) { json = await res.json() }
    } catch { /* try proxy */ }

    if (!json) {
      try {
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        const res = await fetch(proxy)
        if (res.ok) {
          const wrapper = await res.json()
          json = JSON.parse(wrapper.contents)
        }
      } catch { continue }
    }

    if (json) {
      const parsed = parseYahoo(json)
      if (parsed && parsed.length > 10) return parsed
    }
  }
  return null
}

function parseYahoo(json: any): OHLCV[] | null {
  try {
    const result = json?.chart?.result?.[0]
    if (!result) return null
    const ts: number[] = result.timestamp ?? []
    const q = result.indicators?.quote?.[0] ?? {}
    const out: OHLCV[] = []
    for (let i = 0; i < ts.length; i++) {
      if (q.close[i] == null || isNaN(q.close[i])) continue
      out.push({
        time:   ts[i] as UTCTimestamp,
        open:   q.open[i]   ?? q.close[i],
        high:   q.high[i]   ?? q.close[i],
        low:    q.low[i]    ?? q.close[i],
        close:  q.close[i],
        volume: q.volume[i] ?? 0,
      })
    }
    // Sort by time (some feeds return out of order)
    out.sort((a, b) => (a.time as number) - (b.time as number))
    return out.length > 10 ? out : null
  } catch {
    return null
  }
}

// ── Live quote (current price only, for watchlist) ────────────────────────────
export async function fetchLiveQuote(sym: string): Promise<number | null> {
  const yahooSym = resolveYahooSymbol(sym)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=1d`
  const tryFetch = async (fetchUrl: string, asProxy = false) => {
    const res = await fetch(fetchUrl, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error()
    const json = await res.json()
    return asProxy ? JSON.parse(json.contents) : json
  }
  let json: any = null
  try { json = await tryFetch(url) } catch {
    try { json = await tryFetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, true) } catch { return null }
  }
  try {
    const result = json?.chart?.result?.[0]
    const meta   = result?.meta
    return meta?.regularMarketPrice ?? meta?.previousClose ?? null
  } catch { return null }
}

// ── Public API ────────────────────────────────────────────────────────────────
export type DataSource = 'real' | 'synthetic'
export interface FetchResult {
  data: OHLCV[]
  source: DataSource
  symbol: string
  totalCandles: number   // full dataset size
  isPro: boolean
  dataLimitNote?: string // shown in UI
}

export async function fetchCandles(
  sym: string,
  tf: string,
  fallback: (sym: string, tf: string) => OHLCV[],
  isPro = false,
): Promise<FetchResult> {
  const cacheKey = `${sym}-${tf}-full`
  const cached = CACHE.get(cacheKey)

  let fullData: OHLCV[] | null = null

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    fullData = cached.data
  } else {
    const yahooSym = resolveYahooSymbol(sym)
    const interval = YF_INTERVAL[tf] ?? '1d'
    const range    = YF_RANGE_MAX[tf] ?? '2y'

    try {
      let raw = await fetchYahoo(yahooSym, interval, range)
      if (raw && raw.length > 20) {
        // 4h needs aggregation from 1h source
        if (tf === '4h') raw = aggregateTo4h(raw)
        fullData = raw
        CACHE.set(cacheKey, { data: raw, ts: Date.now() })
      }
    } catch { /* fall through */ }
  }

  if (!fullData || fullData.length < 20) {
    const fb = fallback(sym, tf)
    return { data: fb, source: 'synthetic', symbol: sym, totalCandles: fb.length, isPro, dataLimitNote: 'Simulated data — real data unavailable for this instrument' }
  }

  const totalCandles = fullData.length
  const limit = CANDLE_LIMITS[tf] ?? 750
  const sliced = fullData.slice(-Math.min(limit, totalCandles))

  return {
    data: sliced,
    source: 'real',
    symbol: sym,
    totalCandles,
    isPro,
    dataLimitNote: undefined,
  }
}
