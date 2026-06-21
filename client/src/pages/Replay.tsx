import { useEffect, useRef, useState } from 'react'
import {
  createChart, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { Play, Pause, SkipBack, SkipForward, Search, RefreshCw, Scissors, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useSearchParams } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OHLCV {
  time: UTCTimestamp
  open: number; high: number; low: number; close: number; volume: number
}
export interface RTrade {
  id: string; type: 'buy' | 'sell'
  entryBar: number; entryPrice: number; lots: number
  exitBar?: number; exitPrice?: number; pnl?: number
}

// ── Asset classes ─────────────────────────────────────────────────────────────
export const ASSET_GROUPS = [
  {
    group: 'Forex',
    assets: ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD',
             'GBPJPY','EURJPY','EURGBP','EURAUD','GBPAUD','AUDJPY','CADJPY',
             'NZDJPY','GBPCAD','EURCAD','CHFJPY','GBPCHF','EURCHF'],
  },
  {
    group: 'US Stocks',
    assets: ['AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','AVGO','ORCL',
             'NFLX','AMD','INTC','QCOM','TXN','MU','AMAT','LRCX','ADI','KLAC',
             'JPM','BAC','WFC','GS','MS','C','BLK','V','MA','AXP','PYPL',
             'JNJ','UNH','LLY','PFE','MRK','ABBV','TMO','ABT','DHR','BMY',
             'XOM','CVX','COP','SLB','EOG','OXY','MPC','PSX','VLO',
             'WMT','COST','HD','TGT','AMGN','GILD','BIIB','REGN','VRTX',
             'BA','CAT','GE','MMM','HON','UPS','RTX','LMT','NOC','GD',
             'NFLX','DIS','CMCSA','T','VZ','TMUS'],
  },
  {
    group: 'Crypto',
    assets: ['BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','ADAUSD','DOTUSD',
             'AVAXUSD','MATICUSD','LINKUSD','UNIUSD','ATOMUSD','LTCUSD',
             'BCHUSD','XLMUSD','ALGOUSD','NEARUSD','APTUSD','ARBUSD'],
  },
  {
    group: 'Indices',
    assets: ['SPX500','NDX100','DJ30','RUT2000','DAX40','FTSE100','CAC40',
             'NIKKEI','ASX200','HSI','IBEX35','SMI','AEX','OMX','KOSPI'],
  },
  {
    group: 'Commodities',
    assets: ['XAUUSD','XAGUSD','USOIL','UKOIL','NATGAS','COPPER',
             'WHEAT','CORN','SOYBEAN','SUGAR','COFFEE','COCOA',
             'PLATINUM','PALLADIUM','ALUMINUM','NICKEL'],
  },
  {
    group: 'ETFs',
    assets: ['SPY','QQQ','IWM','DIA','VTI','VOO','GLD','SLV',
             'TLT','HYG','EEM','FXI','EWZ','GDX','XLF','XLE',
             'XLK','XLV','XLI','ARKK','SQQQ','TQQQ'],
  },
  {
    group: 'Futures',
    assets: ['ES','NQ','YM','RTY','GC','SI','CL','NG','ZB','ZN',
             'ZC','ZS','ZW','HG','PL','PA','6E','6B','6J','6A'],
  },
]
export const ALL_ASSETS = ASSET_GROUPS.flatMap(g => g.assets)

const BASE_PRICE: Record<string, number> = {
  EURUSD:1.1158,GBPUSD:1.2741,USDJPY:157.38,AUDUSD:0.6412,USDCAD:1.3592,
  USDCHF:0.8981,NZDUSD:0.5891,GBPJPY:200.54,EURJPY:175.63,EURGBP:0.8599,
  EURAUD:1.7380,GBPAUD:1.9820,AUDJPY:100.95,CADJPY:115.82,NZDJPY:92.41,
  GBPCAD:1.7215,EURCAD:1.5162,CHFJPY:175.20,GBPCHF:1.1440,EURCHF:1.0548,
  AAPL:175.5,MSFT:415.2,GOOGL:172.3,AMZN:186.4,NVDA:910.5,META:502.1,
  TSLA:248.3,AVGO:168.2,ORCL:142.8,NFLX:628.4,AMD:168.9,INTC:30.2,
  QCOM:175.6,TXN:192.4,MU:124.3,AMAT:208.7,LRCX:985.4,ADI:228.9,KLAC:782.1,
  JPM:198.7,BAC:38.4,WFC:52.8,GS:462.3,MS:98.7,C:62.4,BLK:824.5,
  V:279.8,MA:472.6,AXP:225.4,PYPL:68.9,
  JNJ:158.4,UNH:524.7,LLY:802.3,PFE:26.8,MRK:128.4,ABBV:172.6,
  TMO:562.3,ABT:108.7,DHR:238.9,BMY:52.4,
  XOM:112.4,CVX:158.2,COP:114.8,SLB:47.2,EOG:128.4,OXY:62.8,
  MPC:174.2,PSX:162.8,VLO:148.6,
  WMT:68.4,COST:752.3,HD:342.8,TGT:152.4,AMGN:314.6,GILD:84.2,
  BIIB:242.8,REGN:1024.6,VRTX:468.2,
  BA:192.4,CAT:342.8,GE:168.4,MMM:102.8,HON:212.4,UPS:148.6,
  RTX:112.4,LMT:482.6,NOC:462.8,GD:282.4,
  DIS:112.4,CMCSA:42.8,T:18.4,VZ:42.6,TMUS:182.4,
  BTCUSD:67420,ETHUSD:3480,SOLUSD:171.5,BNBUSD:582.3,
  XRPUSD:0.524,ADAUSD:0.451,DOTUSD:7.82,AVAXUSD:36.4,
  MATICUSD:0.892,LINKUSD:18.4,UNIUSD:12.8,ATOMUSD:8.42,
  LTCUSD:82.4,BCHUSD:482.6,XLMUSD:0.142,ALGOUSD:0.192,
  NEARUSD:7.82,APTUSD:12.4,ARBUSD:1.24,
  SPX500:5312,NDX100:18620,DJ30:39480,RUT2000:2082,DAX40:18240,
  FTSE100:8180,CAC40:8072,NIKKEI:38650,ASX200:7680,HSI:17840,
  IBEX35:11240,SMI:11820,AEX:882,OMX:2482,KOSPI:2682,
  XAUUSD:3324,XAGUSD:28.4,USOIL:75.2,UKOIL:79.8,NATGAS:2.41,
  COPPER:4.52,WHEAT:562,CORN:443,SOYBEAN:1182,SUGAR:24.8,
  COFFEE:242,COCOA:8824,PLATINUM:982,PALLADIUM:1024,ALUMINUM:2.48,NICKEL:18.4,
  SPY:528,QQQ:462,IWM:208,DIA:392,VTI:248,VOO:524,GLD:228,SLV:28.4,
  TLT:88.4,HYG:78.2,EEM:42.8,FXI:28.4,EWZ:32.8,GDX:32.4,
  XLF:42.8,XLE:92.4,XLK:212.8,XLV:148.2,XLI:128.4,ARKK:52.8,
  SQQQ:12.4,TQQQ:52.8,
  ES:5312,NQ:18620,YM:39480,RTY:2082,GC:3324,SI:28.4,
  CL:75.2,NG:2.41,ZB:108.4,ZN:108.2,ZC:443,ZS:1182,
  ZW:562,HG:4.52,PL:982,PA:1024,
  '6E':1.1158,'6B':1.2741,'6J':0.00634,'6A':0.6412,
}
const VOL: Record<string, number> = {
  EURUSD:0.0004,GBPUSD:0.0006,USDJPY:0.007,AUDUSD:0.0005,USDCAD:0.0005,
  USDCHF:0.0004,NZDUSD:0.0005,GBPJPY:0.011,EURJPY:0.009,EURGBP:0.0003,
  EURAUD:0.0008,GBPAUD:0.0009,AUDJPY:0.008,CADJPY:0.008,NZDJPY:0.008,
  GBPCAD:0.0009,EURCAD:0.0007,CHFJPY:0.009,GBPCHF:0.0007,EURCHF:0.0005,
  AAPL:0.011,MSFT:0.010,GOOGL:0.012,AMZN:0.014,NVDA:0.025,META:0.018,
  TSLA:0.028,AVGO:0.018,ORCL:0.014,NFLX:0.020,AMD:0.022,INTC:0.020,
  QCOM:0.015,TXN:0.012,MU:0.022,AMAT:0.020,LRCX:0.018,ADI:0.014,KLAC:0.018,
  JPM:0.011,BAC:0.014,WFC:0.014,GS:0.014,MS:0.015,C:0.016,BLK:0.014,
  V:0.009,MA:0.010,AXP:0.013,PYPL:0.022,
  JNJ:0.008,UNH:0.012,LLY:0.018,PFE:0.014,MRK:0.012,ABBV:0.014,
  TMO:0.012,ABT:0.010,DHR:0.012,BMY:0.014,
  XOM:0.012,CVX:0.012,COP:0.015,SLB:0.018,EOG:0.016,OXY:0.018,
  MPC:0.015,PSX:0.014,VLO:0.015,
  WMT:0.009,COST:0.010,HD:0.011,TGT:0.015,AMGN:0.012,GILD:0.014,
  BIIB:0.018,REGN:0.015,VRTX:0.016,
  BA:0.020,CAT:0.014,GE:0.016,MMM:0.014,HON:0.011,UPS:0.013,
  RTX:0.012,LMT:0.010,NOC:0.010,GD:0.011,
  DIS:0.015,CMCSA:0.013,T:0.012,VZ:0.012,TMUS:0.013,
  BTCUSD:0.024,ETHUSD:0.030,SOLUSD:0.035,BNBUSD:0.022,
  XRPUSD:0.030,ADAUSD:0.032,DOTUSD:0.028,AVAXUSD:0.033,
  MATICUSD:0.035,LINKUSD:0.030,UNIUSD:0.032,ATOMUSD:0.030,
  LTCUSD:0.025,BCHUSD:0.028,XLMUSD:0.030,ALGOUSD:0.032,
  NEARUSD:0.035,APTUSD:0.038,ARBUSD:0.038,
  SPX500:0.007,NDX100:0.009,DJ30:0.006,RUT2000:0.010,DAX40:0.008,
  FTSE100:0.006,CAC40:0.007,NIKKEI:0.009,ASX200:0.006,HSI:0.012,
  IBEX35:0.009,SMI:0.007,AEX:0.008,OMX:0.009,KOSPI:0.010,
  XAUUSD:0.004,XAGUSD:0.012,USOIL:0.015,UKOIL:0.014,NATGAS:0.025,
  COPPER:0.012,WHEAT:0.015,CORN:0.014,SOYBEAN:0.013,SUGAR:0.018,
  COFFEE:0.018,COCOA:0.020,PLATINUM:0.010,PALLADIUM:0.014,ALUMINUM:0.012,NICKEL:0.016,
  SPY:0.007,QQQ:0.009,IWM:0.010,DIA:0.006,VTI:0.007,VOO:0.007,GLD:0.006,SLV:0.012,
  TLT:0.006,HYG:0.005,EEM:0.011,FXI:0.014,EWZ:0.018,GDX:0.018,
  XLF:0.010,XLE:0.012,XLK:0.010,XLV:0.008,XLI:0.008,ARKK:0.025,
  SQQQ:0.025,TQQQ:0.025,
  ES:0.007,NQ:0.009,YM:0.006,RTY:0.010,GC:0.004,SI:0.012,
  CL:0.015,NG:0.025,ZB:0.005,ZN:0.004,ZC:0.014,ZS:0.013,
  ZW:0.015,HG:0.012,PL:0.010,PA:0.014,
  '6E':0.0004,'6B':0.0006,'6J':0.0005,'6A':0.0005,
}
const TF_SEC: Record<string, number> = { '1m':60,'5m':300,'15m':900,'1h':3600,'4h':14400,'1D':86400 }
const TIMEFRAMES = ['1m','5m','15m','1h','4h','1D']
const SPEEDS = [1,2,4,8,16,32]

export function assetDp(sym: string) {
  if (['USDJPY','GBPJPY','EURJPY','AUDJPY','CADJPY','NZDJPY','CHFJPY'].includes(sym)) return 2
  if (['XAUUSD','XAGUSD','XRPUSD','ADAUSD','DOTUSD','AVAXUSD','XLMUSD',
       'MATICUSD','LINKUSD','UNIUSD','ATOMUSD','NEARUSD','APTUSD','ARBUSD','6J'].includes(sym)) return 4
  if (['BTCUSD','ETHUSD','SOLUSD','BNBUSD','LTCUSD','BCHUSD',
       'SPX500','NDX100','DJ30','RUT2000','DAX40','FTSE100','CAC40','NIKKEI',
       'ASX200','HSI','IBEX35','SMI','AEX','OMX','KOSPI',
       'ES','NQ','YM','RTY','GC','COCOA','REGN','VRTX',
       'WHEAT','CORN','SOYBEAN','COFFEE'].includes(sym)) return 0
  return 2
}

export function genCandles(sym: string, tf: string, n = 600): OHLCV[] {
  const base = BASE_PRICE[sym] ?? 100
  const vol  = VOL[sym] ?? 0.01
  const sec  = TF_SEC[tf] ?? 900
  const now  = Math.floor(Date.now() / 1000)
  let seed   = sym.split('').reduce((s,c) => s + c.charCodeAt(0), 0) * 31 + tf.length * 7
  const rng  = () => { seed = (seed*1664525+1013904223)&0x7fffffff; return seed/0x7fffffff }
  const out: OHLCV[] = []
  let close = base, trend = 0
  for (let i = 0; i < n; i++) {
    if (rng() < 0.02) trend = (rng()-0.5)*0.001
    const time  = (now - (n-i)*sec) as UTCTimestamp
    const open  = close
    const move  = (rng()-0.5+trend)*2*vol*close
    close = Math.max(open+move, base*0.3)
    const range = rng()*vol*close*1.5
    out.push({
      time,
      open,
      high: Math.max(open,close)+range*rng(),
      low:  Math.min(open,close)-range*rng(),
      close,
      volume: Math.floor((500+rng()*9500)*(1+Math.abs(move/close)*20)),
    })
  }
  return out
}

// ── Indicators ────────────────────────────────────────────────────────────────
function calcSMA(d: OHLCV[], p: number) {
  const out: {time:UTCTimestamp;value:number}[] = []
  for (let i=p-1;i<d.length;i++)
    out.push({time:d[i].time, value:d.slice(i-p+1,i+1).reduce((s,c)=>s+c.close,0)/p})
  return out
}
function calcEMA(d: OHLCV[], p: number): {time:UTCTimestamp;value:number}[] {
  if (d.length<p) return []
  const k=2/(p+1); const out: {time:UTCTimestamp;value:number}[] = []
  let e=d.slice(0,p).reduce((s,c)=>s+c.close,0)/p
  out.push({time:d[p-1].time,value:e})
  for (let i=p;i<d.length;i++){e=d[i].close*k+e*(1-k);out.push({time:d[i].time,value:e})}
  return out
}
function calcBB(d: OHLCV[], p=20, m=2) {
  const out: {time:UTCTimestamp;upper:number;middle:number;lower:number}[] = []
  for (let i=p-1;i<d.length;i++){
    const sl=d.slice(i-p+1,i+1), mean=sl.reduce((s,c)=>s+c.close,0)/p
    const std=Math.sqrt(sl.reduce((s,c)=>s+Math.pow(c.close-mean,2),0)/p)
    out.push({time:d[i].time, upper:mean+m*std, middle:mean, lower:mean-m*std})
  }
  return out
}
function calcRSI(d: OHLCV[], p=14): {time:UTCTimestamp;value:number}[] {
  if (d.length<=p) return []
  const out: {time:UTCTimestamp;value:number}[] = []
  let ag=0, al=0
  for (let i=1;i<=p;i++){const x=d[i].close-d[i-1].close; if(x>0)ag+=x; else al-=x}
  ag/=p; al/=p
  const rs=(g:number,l:number)=>l===0?100:100-100/(1+g/l)
  out.push({time:d[p].time, value:rs(ag,al)})
  for (let i=p+1;i<d.length;i++){
    const x=d[i].close-d[i-1].close
    ag=(ag*(p-1)+Math.max(x,0))/p; al=(al*(p-1)+Math.max(-x,0))/p
    out.push({time:d[i].time, value:rs(ag,al)})
  }
  return out
}
function calcMACD(d: OHLCV[], f=12, s=26, sg=9) {
  const fe=calcEMA(d,f), se=calcEMA(d,s), off=s-f
  const ml: {time:UTCTimestamp;value:number}[] = se
    .map((x,i)=>({time:x.time, value:(fe[i+off]?.value??0)-x.value}))
    .filter((_,i)=>i+off<fe.length)
  if (ml.length<sg) return {ml:[],sl:[],hist:[]}
  const slArr: {time:UTCTimestamp;value:number}[] = []
  let e=ml.slice(0,sg).reduce((s,c)=>s+c.value,0)/sg
  slArr.push({time:ml[sg-1].time,value:e})
  const k=2/(sg+1)
  for (let i=sg;i<ml.length;i++){e=ml[i].value*k+e*(1-k);slArr.push({time:ml[i].time,value:e})}
  const hist=slArr.map((x,i)=>{
    const v=ml[i+ml.length-slArr.length].value-x.value
    return {time:x.time,value:v,color:v>=0?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)'}
  })
  return {ml,sl:slArr,hist}
}

// ── Symbol Search ─────────────────────────────────────────────────────────────
function SymbolSearch({ current, onSelect }: { current:string; onSelect:(s:string)=>void }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const fn = (e:MouseEvent)=>{ if(wrapRef.current&&!wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',fn)
    return ()=>document.removeEventListener('mousedown',fn)
  },[])

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-600 bg-gray-800 cursor-text"
           onClick={()=>setOpen(true)}>
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
        <input
          value={query}
          onChange={e=>{setQuery(e.target.value);setOpen(true)}}
          onFocus={()=>setOpen(true)}
          placeholder={current}
          className="w-28 text-xs bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none"
        />
        {query&&<button onClick={()=>setQuery('')}><X className="w-3 h-3 text-gray-400"/></button>}
      </div>
      {open&&(
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {ASSET_GROUPS.map(g=>{
              const items = g.assets.filter(a=>!query||a.toLowerCase().includes(query.toLowerCase()))
              if(!items.length) return null
              return (
                <div key={g.group}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-800 sticky top-0">{g.group}</div>
                  {items.map(a=>(
                    <button key={a} onClick={()=>{onSelect(a);setQuery('');setOpen(false)}}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition flex items-center justify-between ${a===current?'text-brand-400':'text-gray-300'}`}>
                      <span className="font-medium">{a}</span>
                      {a===current&&<span className="text-[10px] text-brand-500">●</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Replay() {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'
  const [searchParams] = useSearchParams()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sym,     setSym]     = useState(()=>searchParams.get('symbol')||'EURUSD')
  const [tf,      setTf]      = useState('15m')
  const [ph,      setPH]      = useState(300)
  const [total,   setTotal]   = useState(600)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(1)
  const [scissor, setScissor] = useState(false)
  const [showSMA,  setShowSMA]  = useState(true)
  const [showEMA,  setShowEMA]  = useState(true)
  const [showBB,   setShowBB]   = useState(false)
  const [showVol,  setShowVol]  = useState(true)
  const [showRSI,  setShowRSI]  = useState(false)
  const [showMACD, setShowMACD] = useState(false)
  // Paper trading
  const [bal,    setBal]    = useState(10000)
  const [openT,  setOpenT]  = useState<RTrade|null>(null)
  const [closed, setClosed] = useState<RTrade[]>([])
  const [lots,   setLots]   = useState('0.10')
  // Current bar display
  const [curBar, setCurBar] = useState<OHLCV|null>(null)

  // ── All refs — no stale closures ──────────────────────────────────────────
  const mainRef  = useRef<HTMLDivElement>(null)
  const rsiRef   = useRef<HTMLDivElement>(null)
  const macdRef  = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi|null>(null)
  const rsiCR    = useRef<IChartApi|null>(null)
  const macdCR   = useRef<IChartApi|null>(null)
  const csR   = useRef<ISeriesApi<'Candlestick'>|null>(null)
  const volR  = useRef<ISeriesApi<'Histogram'>|null>(null)
  const s20R  = useRef<ISeriesApi<'Line'>|null>(null)
  const e50R  = useRef<ISeriesApi<'Line'>|null>(null)
  const bbUR  = useRef<ISeriesApi<'Line'>|null>(null)
  const bbMR  = useRef<ISeriesApi<'Line'>|null>(null)
  const bbLR  = useRef<ISeriesApi<'Line'>|null>(null)
  const rsiR  = useRef<ISeriesApi<'Line'>|null>(null)
  const mlR   = useRef<ISeriesApi<'Line'>|null>(null)
  const slR   = useRef<ISeriesApi<'Line'>|null>(null)
  const mhR   = useRef<ISeriesApi<'Histogram'>|null>(null)

  // These refs hold the live values — avoids ALL stale closure bugs
  const dataRef    = useRef<OHLCV[]>([])
  const phRef      = useRef(300)
  const playRef    = useRef(false)
  const speedRef   = useRef(1)
  const scissorRef = useRef(false)
  const showSMARef  = useRef(showSMA)
  const showEMARef  = useRef(showEMA)
  const showBBRef   = useRef(showBB)
  const showVolRef  = useRef(showVol)
  const showRSIRef  = useRef(showRSI)
  const showMACDRef = useRef(showMACD)

  // Keep refs in sync
  useEffect(()=>{phRef.current=ph},[ph])
  useEffect(()=>{playRef.current=playing},[playing])
  useEffect(()=>{speedRef.current=speed},[speed])
  useEffect(()=>{scissorRef.current=scissor},[scissor])
  useEffect(()=>{showSMARef.current=showSMA},[showSMA])
  useEffect(()=>{showEMARef.current=showEMA},[showEMA])
  useEffect(()=>{showBBRef.current=showBB},[showBB])
  useEffect(()=>{showVolRef.current=showVol},[showVol])
  useEffect(()=>{showRSIRef.current=showRSI},[showRSI])
  useEffect(()=>{showMACDRef.current=showMACD},[showMACD])

  const bg   = isDark ? '#141414' : '#ffffff'
  const txt  = isDark ? '#d1d5db' : '#374151'
  const grid = isDark ? '#1f2937' : '#f3f4f6'
  const bdr  = isDark ? '#374151' : '#e5e7eb'

  // ── Render function — uses only refs, never state ─────────────────────────
  function renderBars(d: OHLCV[], n: number) {
    if (!csR.current || !d.length) return
    const v = d.slice(0, n)
    if (!v.length) return

    csR.current.setData(v)
    setCurBar(v[v.length-1])

    if (volR.current)
      volR.current.setData(showVolRef.current
        ? v.map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'rgba(34,197,94,0.35)':'rgba(239,68,68,0.35)'}))
        : [])
    if (s20R.current) s20R.current.setData(showSMARef.current&&v.length>=20?calcSMA(v,20):[])
    if (e50R.current) e50R.current.setData(showEMARef.current&&v.length>=50?calcEMA(v,50):[])
    if (bbUR.current&&bbMR.current&&bbLR.current){
      const b=showBBRef.current&&v.length>=20?calcBB(v):[]
      bbUR.current.setData(b.map(x=>({time:x.time,value:x.upper})))
      bbMR.current.setData(b.map(x=>({time:x.time,value:x.middle})))
      bbLR.current.setData(b.map(x=>({time:x.time,value:x.lower})))
    }
    if (rsiR.current) rsiR.current.setData(showRSIRef.current&&v.length>14?calcRSI(v):[])
    if (mlR.current&&slR.current&&mhR.current){
      const m=showMACDRef.current&&v.length>35?calcMACD(v):{ml:[],sl:[],hist:[]}
      mlR.current.setData(m.ml); slR.current.setData(m.sl); mhR.current.setData(m.hist)
    }
  }

  // ── Build charts ──────────────────────────────────────────────────────────
  function buildCharts() {
    chartRef.current?.remove(); rsiCR.current?.remove(); macdCR.current?.remove()
    if (!mainRef.current) return

    const base = {
      layout:{background:{color:bg},textColor:txt},
      grid:{vertLines:{color:grid},horzLines:{color:grid}},
      crosshair:{mode:CrosshairMode.Normal},
      rightPriceScale:{borderColor:bdr},
      timeScale:{borderColor:bdr,timeVisible:true,secondsVisible:false},
    }

    const chart = createChart(mainRef.current,{...base,width:mainRef.current.clientWidth,height:mainRef.current.clientHeight})
    chartRef.current = chart

    csR.current = chart.addCandlestickSeries({upColor:'#22c55e',downColor:'#ef4444',borderUpColor:'#22c55e',borderDownColor:'#ef4444',wickUpColor:'#22c55e',wickDownColor:'#ef4444'})
    volR.current = chart.addHistogramSeries({color:'#60a5fa',priceFormat:{type:'volume'},priceScaleId:'vol'})
    chart.priceScale('vol').applyOptions({scaleMargins:{top:0.82,bottom:0}})
    s20R.current = chart.addLineSeries({color:'#f59e0b',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    e50R.current = chart.addLineSeries({color:'#3b82f6',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    bbUR.current = chart.addLineSeries({color:'#a78bfa',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:false})
    bbMR.current = chart.addLineSeries({color:'#a78bfa',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    bbLR.current = chart.addLineSeries({color:'#a78bfa',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:false})

    // Click to cut
    chart.subscribeClick((p: any) => {
      if (!scissorRef.current || p.time==null) return
      const d = dataRef.current
      const idx = d.findIndex(c=>c.time===p.time)
      if (idx>=0) {
        const n = idx+1
        phRef.current = n
        setPH(n)
        setPlaying(false); setScissor(false)
        renderBars(d, n)
      }
    })

    if (showRSI && rsiRef.current) {
      const rc = createChart(rsiRef.current,{...base,width:rsiRef.current.clientWidth,height:rsiRef.current.clientHeight,timeScale:{...base.timeScale,visible:false}})
      rsiCR.current = rc
      rsiR.current = rc.addLineSeries({color:'#f59e0b',lineWidth:2,priceLineVisible:false,lastValueVisible:true})
    }
    if (showMACD && macdRef.current) {
      const mc = createChart(macdRef.current,{...base,width:macdRef.current.clientWidth,height:macdRef.current.clientHeight,timeScale:{...base.timeScale,visible:false}})
      macdCR.current = mc
      mlR.current = mc.addLineSeries({color:'#3b82f6',lineWidth:2,priceLineVisible:false,lastValueVisible:false})
      slR.current  = mc.addLineSeries({color:'#f59e0b',lineWidth:2,priceLineVisible:false,lastValueVisible:false})
      mhR.current  = mc.addHistogramSeries({priceScaleId:'right',priceLineVisible:false,lastValueVisible:false})
    }

    const ro = new ResizeObserver(()=>{
      if(mainRef.current&&chartRef.current)  chartRef.current.resize(mainRef.current.clientWidth,mainRef.current.clientHeight)
      if(rsiRef.current&&rsiCR.current)      rsiCR.current.resize(rsiRef.current.clientWidth,rsiRef.current.clientHeight)
      if(macdRef.current&&macdCR.current)    macdCR.current.resize(macdRef.current.clientWidth,macdRef.current.clientHeight)
    })
    mainRef.current && ro.observe(mainRef.current)
    return ()=>ro.disconnect()
  }

  // ── Load data ─────────────────────────────────────────────────────────────
  function loadData(newSym: string, newTf: string) {
    setPlaying(false)
    const fresh = genCandles(newSym, newTf, 600)
    const n = Math.floor(fresh.length * 0.5)
    dataRef.current = fresh
    phRef.current = n
    setTotal(fresh.length)
    setPH(n)
    // render after a tick so chart is ready
    requestAnimationFrame(()=>{
      renderBars(fresh, n)
      chartRef.current?.timeScale().fitContent()
    })
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  // Build on mount and when theme/indicator panes change
  useEffect(()=>{
    const cleanup = buildCharts()
    // Re-render current data into new chart
    if (dataRef.current.length) {
      requestAnimationFrame(()=>{
        renderBars(dataRef.current, phRef.current)
        chartRef.current?.timeScale().fitContent()
      })
    }
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isDark, showRSI, showMACD])

  // Load when sym or tf changes
  useEffect(()=>{
    loadData(sym, tf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sym, tf])

  // Re-render indicators when toggles change (no rebuild needed)
  useEffect(()=>{
    if (dataRef.current.length) renderBars(dataRef.current, phRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showSMA, showEMA, showBB, showVol])

  // Play loop — uses only refs
  useEffect(()=>{
    if (!playing) return
    const id = setInterval(()=>{
      const d = dataRef.current
      const n = phRef.current + 1
      if (n > d.length) { setPlaying(false); return }
      phRef.current = n
      setPH(n)
      renderBars(d, n)
    }, Math.max(30, 400/speedRef.current))
    return ()=>clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing, speed])

  // ── Seek (slider + step buttons) ─────────────────────────────────────────
  function seek(n: number) {
    const clamped = Math.max(1, Math.min(dataRef.current.length, n))
    phRef.current = clamped
    setPH(clamped)
    renderBars(dataRef.current, clamped)
  }

  // ── Paper trading ─────────────────────────────────────────────────────────
  const dp = assetDp(sym)
  const pipSz = ['USDJPY','GBPJPY','EURJPY'].includes(sym)?0.01:sym==='XAUUSD'?0.1:
    sym==='BTCUSD'?1:['SPX500','NDX100','DJ30','DAX40','FTSE100','NIKKEI'].includes(sym)?0.1:0.0001
  const lotN = parseFloat(lots)||0.1
  const pipVal = ['AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL','AMD','NFLX','JPM'].includes(sym)?lotN:lotN*10

  const livePnl = openT&&curBar
    ? parseFloat(((openT.type==='buy'?(curBar.close-openT.entryPrice):(openT.entryPrice-curBar.close))/pipSz*pipVal).toFixed(2))
    : null
  const totalPnl = closed.reduce((s,t)=>s+(t.pnl??0),0)
  const wins = closed.filter(t=>(t.pnl??0)>0).length

  function enterTrade(type:'buy'|'sell') {
    if (openT||!curBar) return
    setOpenT({id:`r${Date.now()}`,type,entryBar:phRef.current,entryPrice:curBar.close,lots:lotN})
  }
  function closeTrade() {
    if (!openT||!curBar) return
    const pips=(openT.type==='buy'?(curBar.close-openT.entryPrice):(openT.entryPrice-curBar.close))/pipSz
    const pnl=parseFloat((pips*pipVal).toFixed(2))
    setClosed(p=>[{...openT,exitBar:phRef.current,exitPrice:curBar.close,pnl},...p])
    setBal(b=>parseFloat((b+pnl).toFixed(2)))
    setOpenT(null)
  }

  // ── Derived display ───────────────────────────────────────────────────────
  const prev  = dataRef.current[ph-2]
  const chg   = curBar&&prev ? curBar.close-prev.close : 0
  const chgP  = prev ? (chg/prev.close)*100 : 0

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#141414]">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414] overflow-y-auto">

        {/* Symbol search */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Search Instrument</p>
          <SymbolSearch current={sym} onSelect={s=>{setSym(s)}} />
          <p className="text-[10px] text-gray-500 mt-1.5">Current: <span className="font-semibold text-brand-500">{sym}</span></p>
        </div>

        {/* Asset groups */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Instrument</p>
          {ASSET_GROUPS.map(g=>(
            <div key={g.group} className="mb-2.5">
              <p className="text-[10px] text-gray-400 font-semibold mb-1">{g.group}</p>
              <div className="flex flex-wrap gap-1">
                {g.assets.map(a=>(
                  <button key={a} onClick={()=>setSym(a)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition border ${sym===a?'bg-brand-500 text-white border-brand-500':'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-400 dark:hover:border-brand-600'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Timeframe */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Timeframe</p>
          <div className="flex flex-wrap gap-1">
            {TIMEFRAMES.map(t=>(
              <button key={t} onClick={()=>setTf(t)}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${tf===t?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Indicators</p>
          <div className="space-y-1.5">
            {[
              {label:'SMA 20',         color:'bg-amber-400',  val:showSMA,  set:setShowSMA},
              {label:'EMA 50',         color:'bg-blue-500',   val:showEMA,  set:setShowEMA},
              {label:'Bollinger Bands',color:'bg-purple-400', val:showBB,   set:setShowBB},
              {label:'Volume',         color:'bg-sky-400',    val:showVol,  set:setShowVol},
              {label:'RSI (14)',       color:'bg-yellow-500', val:showRSI,  set:setShowRSI},
              {label:'MACD',           color:'bg-cyan-500',   val:showMACD, set:setShowMACD},
            ].map(({label,color,val,set})=>(
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <span className={`w-2 h-2 rounded-full shrink-0 ${color}`}/>
                <input type="checkbox" checked={val} onChange={e=>set(e.target.checked)} className="accent-brand-500 w-3.5 h-3.5"/>
                <span className="text-[11px] text-gray-600 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Reload */}
        <div className="p-3">
          <button onClick={()=>loadData(sym,tf)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <RefreshCw className="w-3.5 h-3.5"/> Reload chart
          </button>
        </div>
      </div>

      {/* ── Main chart area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* OHLC info bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap bg-white dark:bg-[#141414]">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{sym}</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">{tf}</span>
          {curBar ? (
            <>
              <span className="text-xs text-gray-500">O <span className="font-mono text-gray-700 dark:text-gray-300">{curBar.open.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">H <span className="font-mono text-emerald-600">{curBar.high.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">L <span className="font-mono text-red-500">{curBar.low.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">C <span className={`font-mono font-bold ${chg>=0?'text-emerald-600':'text-red-500'}`}>{curBar.close.toFixed(dp)}</span></span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${chg>=0?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-red-50 dark:bg-red-500/10 text-red-500'}`}>
                {chg>=0?'+':''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)
              </span>
            </>
          ) : <span className="text-xs text-gray-400">Loading…</span>}
          <div className="flex-1"/>
          <span className="text-[11px] text-gray-400 font-mono">{ph} / {total} bars</span>
        </div>

        {/* Chart */}
        <div ref={mainRef} className={`flex-1 min-h-0 ${scissor?'cursor-crosshair':''}`}/>

        {/* RSI pane */}
        {showRSI&&(
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{height:90}}>
            <span className="absolute top-1 left-2 text-[10px] font-semibold text-amber-500 z-10 pointer-events-none select-none">RSI (14)</span>
            <div ref={rsiRef} className="w-full h-full"/>
          </div>
        )}
        {/* MACD pane */}
        {showMACD&&(
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{height:90}}>
            <span className="absolute top-1 left-2 text-[10px] font-semibold text-cyan-500 z-10 pointer-events-none select-none">MACD (12/26/9)</span>
            <div ref={macdRef} className="w-full h-full"/>
          </div>
        )}

        {/* ── Playback bar ─────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] px-3 py-2 flex items-center gap-2">
          {/* Scrubber — works via seek() which calls renderBars immediately */}
          <span className="text-[10px] text-gray-400 shrink-0 w-12 text-right font-mono">{ph}</span>
          <input
            type="range"
            min={1}
            max={total}
            value={ph}
            onMouseDown={()=>setPlaying(false)}
            onChange={e=>seek(Number(e.target.value))}
            className="flex-1 accent-brand-500 cursor-pointer"
            style={{height:'4px'}}
          />
          <span className="text-[10px] text-gray-400 shrink-0 w-10 font-mono">{total}</span>

          {/* Step back */}
          <button onClick={()=>seek(ph-1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipBack className="w-4 h-4"/></button>

          {/* Play/Pause */}
          <button onClick={()=>setPlaying(p=>!p)}
            className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition shadow-lg shadow-brand-500/30">
            {playing?<Pause className="w-4 h-4"/>:<Play className="w-4 h-4"/>}
          </button>

          {/* Step forward */}
          <button onClick={()=>seek(ph+1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipForward className="w-4 h-4"/></button>

          {/* +10 */}
          <button onClick={()=>seek(ph+10)}
            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            +10
          </button>

          {/* Speed */}
          <div className="flex items-center gap-0.5">
            {SPEEDS.map(s=>(
              <button key={s} onClick={()=>setSpeed(s)}
                className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${speed===s?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {s}×
              </button>
            ))}
          </div>

          {/* Scissor */}
          <button onClick={()=>{setPlaying(false);setScissor(s=>!s)}}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition border ${scissor?'bg-amber-500 text-white border-amber-500':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Scissors className="w-3.5 h-3.5"/>
            {scissor?'Click candle…':'Cut point'}
          </button>
        </div>
      </div>

      {/* ── Right panel — like Trading page ──────────────────────────────── */}
      <div className="w-52 border-l border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#141414] shrink-0">

        {/* Live price card */}
        <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-800 dark:text-white">{sym}</span>
            <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">PRACTICE</span>
          </div>
          {curBar&&(
            <>
              <div className="text-lg font-bold tabular-nums font-mono text-gray-900 dark:text-white">{curBar.close.toFixed(dp)}</div>
              <div className={`text-xs font-medium ${chg>=0?'text-emerald-600':'text-red-500'}`}>
                {chg>=0?'+':''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)
              </div>
            </>
          )}
        </div>

        {/* OHLCV detail */}
        {curBar&&(
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 space-y-1">
            {[
              {label:'Open',  val:curBar.open.toFixed(dp),  color:'text-gray-700 dark:text-gray-300'},
              {label:'High',  val:curBar.high.toFixed(dp),  color:'text-emerald-600 dark:text-emerald-400'},
              {label:'Low',   val:curBar.low.toFixed(dp),   color:'text-red-500 dark:text-red-400'},
              {label:'Close', val:curBar.close.toFixed(dp), color:chg>=0?'text-emerald-600 dark:text-emerald-400':'text-red-500 dark:text-red-400'},
              {label:'Volume',val:curBar.volume.toLocaleString(),color:'text-sky-500'},
            ].map(row=>(
              <div key={row.label} className="flex justify-between text-[11px]">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-mono font-semibold ${row.color}`}>{row.val}</span>
              </div>
            ))}
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">Bar</span>
              <span className="font-mono text-gray-600 dark:text-gray-400">{ph} / {total}</span>
            </div>
          </div>
        )}

        {/* Paper trading */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Paper Trading</p>
          <div className="space-y-1.5 text-[11px] mb-2">
            <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className={`font-bold ${bal>=10000?'text-emerald-600':'text-red-500'}`}>${bal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Net P&L</span><span className={`font-semibold ${totalPnl>=0?'text-emerald-600':'text-red-500'}`}>{totalPnl>=0?'+':''}${totalPnl.toFixed(2)}</span></div>
            {closed.length>0&&<div className="flex justify-between"><span className="text-gray-500">Win rate</span><span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(wins/closed.length*100)}%</span></div>}
            {livePnl!==null&&<div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-500">Live P&L</span><span className={`font-bold ${livePnl>=0?'text-emerald-500':'text-red-500'}`}>{livePnl>=0?'+':''}${livePnl.toFixed(2)}</span></div>}
          </div>
          <div className="mb-2">
            <label className="block text-[10px] text-gray-400 mb-1">Lots / Units</label>
            <input value={lots} onChange={e=>setLots(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400"/>
          </div>
          {openT?(
            <div className="space-y-1.5">
              <div className="p-2 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">
                <span className={`font-bold uppercase ${openT.type==='buy'?'text-emerald-600':'text-red-500'}`}>{openT.type}</span>
                {' '}@ {openT.entryPrice.toFixed(dp)} · {openT.lots}L
              </div>
              <button onClick={closeTrade} className="w-full py-1.5 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">Close Trade</button>
            </div>
          ):(
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={()=>enterTrade('buy')} className="py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition">▲ BUY</button>
              <button onClick={()=>enterTrade('sell')} className="py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">▼ SELL</button>
            </div>
          )}
        </div>

        {/* Trade log */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Trade Log</p>
          {closed.length===0
            ? <p className="text-[11px] text-gray-400">No trades yet</p>
            : closed.map(t=>(
                <div key={t.id} className={`mb-1.5 p-2 rounded text-[11px] border ${(t.pnl??0)>=0?'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10':'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10'}`}>
                  <div className="flex justify-between">
                    <span className={`font-bold uppercase ${t.type==='buy'?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{t.type}</span>
                    <span className={`font-bold ${(t.pnl??0)>=0?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{(t.pnl??0)>=0?'+':''}${t.pnl?.toFixed(2)}</span>
                  </div>
                  <div className="text-gray-400 font-mono">{t.entryPrice.toFixed(dp)}→{t.exitPrice?.toFixed(dp)}</div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
