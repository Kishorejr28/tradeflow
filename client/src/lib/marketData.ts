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
const YF_INTERVAL: Record<string, string> = {
  '1m':'1m','5m':'5m','15m':'15m','1h':'1h','4h':'1h','1D':'1d',
}
const YF_RANGE: Record<string, string> = {
  '1m':'5d','5m':'1mo','15m':'3mo','1h':'2y','4h':'2y','1D':'10y',
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

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE = new Map<string, { data: OHLCV[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchYahoo(yahooSym: string, interval: string, range: string): Promise<OHLCV[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}&includePrePost=false`

  const tryFetch = async (fetchUrl: string, parseAsProxy = false) => {
    const res = await fetch(fetchUrl, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return parseAsProxy ? JSON.parse(json.contents) : json
  }

  let json: any = null
  try {
    json = await tryFetch(url)
  } catch {
    try {
      json = await tryFetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, true)
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
    return out.length > 10 ? out : null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export type DataSource = 'real' | 'synthetic'
export interface FetchResult { data: OHLCV[]; source: DataSource; symbol: string }

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

  const yahooSym = resolveYahooSymbol(sym)
  const interval = YF_INTERVAL[tf] ?? '1d'
  const range    = YF_RANGE[tf]    ?? '2y'

  try {
    const data = await fetchYahoo(yahooSym, interval, range)
    if (data && data.length > 20) {
      CACHE.set(cacheKey, { data, ts: Date.now() })
      return { data, source: 'real', symbol: sym }
    }
  } catch { /* fall through */ }

  return { data: fallback(sym, tf), source: 'synthetic', symbol: sym }
}

export function clearCache(sym?: string) {
  if (sym) { for (const k of CACHE.keys()) { if (k.startsWith(sym)) CACHE.delete(k) } }
  else CACHE.clear()
}

// ── Market exchange reference for the search UI ───────────────────────────────
export const MARKET_SUFFIXES = [
  { flag:'🇮🇳', name:'India (NSE)',     suffix:'.NS', example:'RELIANCE.NS' },
  { flag:'🇩🇪', name:'Germany (XETRA)', suffix:'.DE', example:'SAP.DE' },
  { flag:'🇬🇧', name:'UK (LSE)',         suffix:'.L',  example:'SHEL.L' },
  { flag:'🇯🇵', name:'Japan (TSE)',      suffix:'.T',  example:'7203.T' },
  { flag:'🇭🇰', name:'Hong Kong (HKEx)',suffix:'.HK', example:'0700.HK' },
  { flag:'🇦🇺', name:'Australia (ASX)', suffix:'.AX', example:'BHP.AX' },
  { flag:'🇨🇦', name:'Canada (TSX)',     suffix:'.TO', example:'RY.TO' },
  { flag:'🇫🇷', name:'France (Euronext)',suffix:'.PA', example:'MC.PA' },
  { flag:'🇪🇸', name:'Spain (BME)',      suffix:'.MC', example:'ITX.MC' },
  { flag:'🇰🇷', name:'Korea (KRX)',      suffix:'.KS', example:'005930.KS' },
  { flag:'🇧🇷', name:'Brazil (B3)',      suffix:'.SA', example:'VALE3.SA' },
  { flag:'🇺🇸', name:'USA (NASDAQ/NYSE)',suffix:'',    example:'AAPL' },
]
