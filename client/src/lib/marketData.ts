import type { OHLCV } from '@/pages/Replay'
import type { UTCTimestamp } from 'lightweight-charts'

// ── Symbol mapping: our symbols → Yahoo Finance symbols ───────────────────────
const YAHOO_MAP: Record<string, string> = {
  // Forex
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'JPY=X',
  AUDUSD: 'AUDUSD=X', USDCAD: 'CAD=X',    USDCHF: 'CHF=X',
  NZDUSD: 'NZDUSD=X', GBPJPY: 'GBPJPY=X', EURJPY: 'EURJPY=X',
  EURGBP: 'EURGBP=X', EURAUD: 'EURAUD=X', GBPAUD: 'GBPAUD=X',
  AUDJPY: 'AUDJPY=X', CADJPY: 'CADJPY=X', NZDJPY: 'NZDJPY=X',
  GBPCAD: 'GBPCAD=X', EURCAD: 'EURCAD=X', CHFJPY: 'CHFJPY=X',
  GBPCHF: 'GBPCHF=X', EURCHF: 'EURCHF=X',
  // US Stocks — direct ticker
  AAPL:'AAPL', MSFT:'MSFT', GOOGL:'GOOGL', AMZN:'AMZN', NVDA:'NVDA',
  META:'META', TSLA:'TSLA', AVGO:'AVGO', ORCL:'ORCL', NFLX:'NFLX',
  AMD:'AMD',   INTC:'INTC', QCOM:'QCOM', TXN:'TXN',   MU:'MU',
  AMAT:'AMAT', LRCX:'LRCX', ADI:'ADI',   KLAC:'KLAC',
  JPM:'JPM',  BAC:'BAC',  WFC:'WFC',  GS:'GS',   MS:'MS',
  C:'C',      BLK:'BLK',  V:'V',      MA:'MA',   AXP:'AXP', PYPL:'PYPL',
  JNJ:'JNJ',  UNH:'UNH',  LLY:'LLY',  PFE:'PFE', MRK:'MRK', ABBV:'ABBV',
  TMO:'TMO',  ABT:'ABT',  DHR:'DHR',  BMY:'BMY',
  XOM:'XOM',  CVX:'CVX',  COP:'COP',  SLB:'SLB', EOG:'EOG', OXY:'OXY',
  MPC:'MPC',  PSX:'PSX',  VLO:'VLO',
  WMT:'WMT',  COST:'COST', HD:'HD',   TGT:'TGT', AMGN:'AMGN', GILD:'GILD',
  BIIB:'BIIB', REGN:'REGN', VRTX:'VRTX',
  BA:'BA',    CAT:'CAT',  GE:'GE',    MMM:'MMM', HON:'HON', UPS:'UPS',
  RTX:'RTX',  LMT:'LMT',  NOC:'NOC',  GD:'GD',
  DIS:'DIS',  CMCSA:'CMCSA', T:'T',  VZ:'VZ',  TMUS:'TMUS',
  // Crypto
  BTCUSD:'BTC-USD',  ETHUSD:'ETH-USD',  SOLUSD:'SOL-USD',
  BNBUSD:'BNB-USD',  XRPUSD:'XRP-USD',  ADAUSD:'ADA-USD',
  DOTUSD:'DOT-USD',  AVAXUSD:'AVAX-USD', MATICUSD:'MATIC-USD',
  LINKUSD:'LINK-USD', UNIUSD:'UNI7083-USD', ATOMUSD:'ATOM-USD',
  LTCUSD:'LTC-USD',  BCHUSD:'BCH-USD',  XLMUSD:'XLM-USD',
  ALGOUSD:'ALGO-USD', NEARUSD:'NEAR-USD', APTUSD:'APT21794-USD',
  ARBUSD:'ARB11841-USD',
  // Indices
  SPX500:'^GSPC',   NDX100:'^NDX',   DJ30:'^DJI',    RUT2000:'^RUT',
  DAX40:'^GDAXI',   FTSE100:'^FTSE',  CAC40:'^FCHI',  NIKKEI:'^N225',
  ASX200:'^AXJO',   HSI:'^HSI',      IBEX35:'^IBEX',  SMI:'^SSMI',
  AEX:'^AEX',       OMX:'^OMX',      KOSPI:'^KS11',
  // Commodities (futures)
  XAUUSD:'GC=F',    XAGUSD:'SI=F',   USOIL:'CL=F',   UKOIL:'BZ=F',
  NATGAS:'NG=F',    COPPER:'HG=F',   WHEAT:'ZW=F',   CORN:'ZC=F',
  SOYBEAN:'ZS=F',   SUGAR:'SB=F',    COFFEE:'KC=F',  COCOA:'CC=F',
  PLATINUM:'PL=F',  PALLADIUM:'PA=F',
  // ETFs
  SPY:'SPY',  QQQ:'QQQ',  IWM:'IWM',  DIA:'DIA',  VTI:'VTI',  VOO:'VOO',
  GLD:'GLD',  SLV:'SLV',  TLT:'TLT',  HYG:'HYG',  EEM:'EEM',  FXI:'FXI',
  EWZ:'EWZ',  GDX:'GDX',  XLF:'XLF',  XLE:'XLE',  XLK:'XLK',  XLV:'XLV',
  XLI:'XLI',  ARKK:'ARKK', SQQQ:'SQQQ', TQQQ:'TQQQ',
}

// ── Interval mapping: our TF → Yahoo interval + range ────────────────────────
const YF_INTERVAL: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '1h', '1D': '1d',
}
const YF_RANGE: Record<string, string> = {
  '1m': '5d', '5m': '1mo', '15m': '3mo', '1h': '2y', '4h': '2y', '1D': '10y',
}

// ── Cache: avoid re-fetching same symbol+tf in same session ───────────────────
const CACHE = new Map<string, { data: OHLCV[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ── Fetch from Yahoo Finance ──────────────────────────────────────────────────
async function fetchYahoo(
  yahooSym: string,
  interval: string,
  range: string,
): Promise<OHLCV[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}&includePrePost=false`

  // Try direct first (works in many browsers due to CORS headers on Yahoo's CDN)
  const tryFetch = async (fetchUrl: string, parseAsProxy = false) => {
    const res = await fetch(fetchUrl, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const data = parseAsProxy ? JSON.parse(json.contents) : json
    return data
  }

  let json: any = null
  try {
    json = await tryFetch(url)
  } catch {
    // CORS blocked — try allorigins proxy
    try {
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      json = await tryFetch(proxy, true)
    } catch {
      return null
    }
  }

  return parseYahoo(json)
}

function parseYahoo(json: any): OHLCV[] | null {
  try {
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const ts: number[]    = result.timestamp ?? []
    const q               = result.indicators?.quote?.[0] ?? {}
    const opens: number[] = q.open   ?? []
    const highs: number[] = q.high   ?? []
    const lows:  number[] = q.low    ?? []
    const closes:number[] = q.close  ?? []
    const vols:  number[] = q.volume ?? []

    const out: OHLCV[] = []
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] == null || isNaN(closes[i])) continue
      out.push({
        time:   ts[i] as UTCTimestamp,
        open:   opens[i]  ?? closes[i],
        high:   highs[i]  ?? closes[i],
        low:    lows[i]   ?? closes[i],
        close:  closes[i],
        volume: vols[i]   ?? 0,
      })
    }
    return out.length > 10 ? out : null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DataSource = 'real' | 'synthetic'

export interface FetchResult {
  data: OHLCV[]
  source: DataSource
  symbol: string
}

export async function fetchCandles(
  sym: string,
  tf: string,
  fallback: (sym: string, tf: string) => OHLCV[],
): Promise<FetchResult> {
  const cacheKey = `${sym}-${tf}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { data: cached.data, source: 'real', symbol: sym }
  }

  const yahooSym = YAHOO_MAP[sym]
  if (yahooSym) {
    const interval = YF_INTERVAL[tf] ?? '1d'
    const range    = YF_RANGE[tf]    ?? '2y'
    try {
      const data = await fetchYahoo(yahooSym, interval, range)
      if (data && data.length > 50) {
        CACHE.set(cacheKey, { data, ts: Date.now() })
        return { data, source: 'real', symbol: sym }
      }
    } catch {
      // fall through to synthetic
    }
  }

  // Fallback to synthetic generator
  const data = fallback(sym, tf)
  return { data, source: 'synthetic', symbol: sym }
}

export function clearCache(sym?: string) {
  if (sym) {
    for (const key of CACHE.keys()) {
      if (key.startsWith(sym)) CACHE.delete(key)
    }
  } else {
    CACHE.clear()
  }
}
