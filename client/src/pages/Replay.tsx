import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { Play, Pause, SkipBack, SkipForward, RefreshCw, Scissors, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useSearchParams } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OHLCV {
  time: UTCTimestamp
  open: number; high: number; low: number; close: number; volume: number
}
interface RTrade {
  id: string; type: 'buy'|'sell'
  entryBar: number; entryPrice: number; lots: number
  exitBar?: number; exitPrice?: number; pnl?: number
}

// ── Indicators ────────────────────────────────────────────────────────────────
export function calcSMA(d: OHLCV[], p: number) {
  const out: {time:UTCTimestamp;value:number}[] = []
  for (let i=p-1;i<d.length;i++)
    out.push({time:d[i].time,value:d.slice(i-p+1,i+1).reduce((s,c)=>s+c.close,0)/p})
  return out
}
export function calcEMA(d: OHLCV[], p: number): {time:UTCTimestamp;value:number}[] {
  if (d.length<p) return []
  const k=2/(p+1); const out: {time:UTCTimestamp;value:number}[] = []
  let e=d.slice(0,p).reduce((s,c)=>s+c.close,0)/p
  out.push({time:d[p-1].time,value:e})
  for (let i=p;i<d.length;i++){e=d[i].close*k+e*(1-k);out.push({time:d[i].time,value:e})}
  return out
}
function calcBB(d: OHLCV[], p=20, m=2) {
  const out: {time:UTCTimestamp;upper:number;middle:number;lower:number}[] = []
  for (let i=p-1;i<d.length;i++) {
    const sl=d.slice(i-p+1,i+1),mean=sl.reduce((s,c)=>s+c.close,0)/p
    const std=Math.sqrt(sl.reduce((s,c)=>s+Math.pow(c.close-mean,2),0)/p)
    out.push({time:d[i].time,upper:mean+m*std,middle:mean,lower:mean-m*std})
  }
  return out
}
function calcRSI(d: OHLCV[], p=14): {time:UTCTimestamp;value:number}[] {
  if (d.length<=p) return []
  const out: {time:UTCTimestamp;value:number}[] = []
  let ag=0,al=0
  for (let i=1;i<=p;i++){const x=d[i].close-d[i-1].close;if(x>0)ag+=x;else al-=x}
  ag/=p;al/=p
  const rs=(g:number,l:number)=>l===0?100:100-100/(1+g/l)
  out.push({time:d[p].time,value:rs(ag,al)})
  for (let i=p+1;i<d.length;i++){
    const x=d[i].close-d[i-1].close
    ag=(ag*(p-1)+Math.max(x,0))/p;al=(al*(p-1)+Math.max(-x,0))/p
    out.push({time:d[i].time,value:rs(ag,al)})
  }
  return out
}
function calcMACD(d: OHLCV[], f=12, s=26, sg=9) {
  const fe=calcEMA(d,f),se=calcEMA(d,s),off=s-f
  const ml: {time:UTCTimestamp;value:number}[] = se
    .map((x,i)=>({time:x.time,value:(fe[i+off]?.value??0)-x.value}))
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

// ── Asset classes + prices ────────────────────────────────────────────────────
export const ASSET_GROUPS = [
  {
    group: 'Forex',
    assets: ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','GBPJPY','EURJPY','EURGBP'],
  },
  {
    group: 'Stocks',
    assets: ['AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL','AMD','NFLX','JPM'],
  },
  {
    group: 'Crypto',
    assets: ['BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','ADAUSD','DOTUSD','AVAXUSD'],
  },
  {
    group: 'Indices',
    assets: ['SPX500','NDX100','DJ30','DAX40','FTSE100','NIKKEI','CAC40','ASX200'],
  },
  {
    group: 'Commodities',
    assets: ['XAUUSD','XAGUSD','USOIL','UKOIL','NATGAS','COPPER','WHEAT','CORN'],
  },
]

export const ALL_ASSETS = ASSET_GROUPS.flatMap(g => g.assets)

export const BASE_PRICE: Record<string,number> = {
  // Forex
  EURUSD:1.1158,GBPUSD:1.2741,USDJPY:157.38,AUDUSD:0.6412,USDCAD:1.3592,
  USDCHF:0.8981,NZDUSD:0.5891,GBPJPY:200.54,EURJPY:175.63,EURGBP:0.8599,
  // Stocks
  AAPL:175.5,TSLA:248.3,NVDA:910.5,MSFT:415.2,AMZN:186.4,
  META:502.1,GOOGL:172.3,AMD:168.9,NFLX:628.4,JPM:198.7,
  // Crypto
  BTCUSD:67420,ETHUSD:3480,SOLUSD:171.5,BNBUSD:582.3,
  XRPUSD:0.524,ADAUSD:0.451,DOTUSD:7.82,AVAXUSD:36.4,
  // Indices
  SPX500:5312,NDX100:18620,DJ30:39480,DAX40:18240,
  FTSE100:8180,NIKKEI:38650,CAC40:8072,ASX200:7680,
  // Commodities
  XAUUSD:3324,XAGUSD:28.4,USOIL:75.2,UKOIL:79.8,
  NATGAS:2.41,COPPER:4.52,WHEAT:562,CORN:443,
}

const VOLATILITY: Record<string,number> = {
  EURUSD:0.0005,GBPUSD:0.0007,USDJPY:0.008,AUDUSD:0.0006,USDCAD:0.0005,
  USDCHF:0.0005,NZDUSD:0.0006,GBPJPY:0.012,EURJPY:0.010,EURGBP:0.0004,
  AAPL:0.012,TSLA:0.028,NVDA:0.025,MSFT:0.010,AMZN:0.015,
  META:0.018,GOOGL:0.012,AMD:0.022,NFLX:0.020,JPM:0.011,
  BTCUSD:0.025,ETHUSD:0.030,SOLUSD:0.035,BNBUSD:0.022,
  XRPUSD:0.030,ADAUSD:0.032,DOTUSD:0.028,AVAXUSD:0.033,
  SPX500:0.008,NDX100:0.010,DJ30:0.007,DAX40:0.009,
  FTSE100:0.006,NIKKEI:0.010,CAC40:0.008,ASX200:0.007,
  XAUUSD:0.004,XAGUSD:0.012,USOIL:0.015,UKOIL:0.014,
  NATGAS:0.025,COPPER:0.012,WHEAT:0.015,CORN:0.014,
}

const TF_SEC: Record<string,number> = {'1m':60,'5m':300,'15m':900,'1h':3600,'4h':14400,'1D':86400}

export function genCandles(sym: string, tf: string, n=600): OHLCV[] {
  const base=BASE_PRICE[sym]??100
  const vol=VOLATILITY[sym]??0.01
  const sec=TF_SEC[tf]??900
  const now=Math.floor(Date.now()/1000)
  // Deterministic seed based on symbol+tf for reproducibility
  let seed=sym.split('').reduce((s,c)=>s+c.charCodeAt(0),0)*31+tf.length*7
  const rng=()=>{seed=(seed*1664525+1013904223)&0x7fffffff;return seed/0x7fffffff}
  const out: OHLCV[]=[]
  let close=base
  // Add trend bias for more realistic looking charts
  let trend=0
  for (let i=0;i<n;i++){
    const time=(now-(n-i)*sec) as UTCTimestamp
    // Occasionally shift trend
    if (rng()<0.02) trend=(rng()-0.5)*0.001
    const open=close
    const move=(rng()-0.5+trend)*2*vol*close
    close=Math.max(open+move,base*0.3)
    const range=rng()*vol*close*1.5
    const high=Math.max(open,close)+range*rng()
    const low=Math.min(open,close)-range*rng()
    const volume=Math.floor((500+rng()*9500)*(1+Math.abs(move/close)*20))
    out.push({time,open,high:Math.max(high,open,close),low:Math.min(low,open,close),close,volume})
  }
  return out
}

// ── Decimal places per asset ──────────────────────────────────────────────────
export function assetDp(sym: string) {
  if (sym.includes('JPY')||sym==='USDJPY') return 2
  if (['XAUUSD','XAGUSD'].includes(sym)) return 2
  if (['BTCUSD','SPX500','NDX100','DJ30','DAX40','FTSE100','NIKKEI','CAC40','ASX200','WHEAT','CORN'].includes(sym)) return 0
  if (['ETHUSD','SOLUSD','BNBUSD','USOIL','UKOIL','NATGAS','COPPER','AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL','AMD','NFLX','JPM'].includes(sym)) return 2
  return 4
}

// ── Chart builder hook (shared between Replay page and Trading practice mode) ─
export interface ReplayChartOptions {
  showSMA: boolean; showEMA: boolean; showBB: boolean
  showVol: boolean; showRSI: boolean; showMACD: boolean
  isDark: boolean
}
export function useReplayChart(opts: ReplayChartOptions) {
  const mainRef = useRef<HTMLDivElement>(null)
  const rsiRef  = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  const cRef  = useRef<IChartApi|null>(null)
  const rcRef = useRef<IChartApi|null>(null)
  const mcRef = useRef<IChartApi|null>(null)
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
  const {showSMA,showEMA,showBB,showVol,showRSI,showMACD,isDark} = opts

  const col = {
    bg:isDark?'#141414':'#ffffff',txt:isDark?'#d1d5db':'#374151',
    grid:isDark?'#1f2937':'#f3f4f6',bdr:isDark?'#374151':'#e5e7eb',
  }

  const build = useCallback((onChartClick?: (param: {time?:UTCTimestamp}) => void) => {
    cRef.current?.remove(); rcRef.current?.remove(); mcRef.current?.remove()
    if (!mainRef.current) return
    const base={
      layout:{background:{color:col.bg},textColor:col.txt},
      grid:{vertLines:{color:col.grid},horzLines:{color:col.grid}},
      crosshair:{mode:CrosshairMode.Normal},
      rightPriceScale:{borderColor:col.bdr},
      timeScale:{borderColor:col.bdr,timeVisible:true,secondsVisible:false},
    }
    const chart=createChart(mainRef.current,{...base,width:mainRef.current.clientWidth,height:mainRef.current.clientHeight})
    cRef.current=chart
    csR.current=chart.addCandlestickSeries({upColor:'#22c55e',downColor:'#ef4444',borderUpColor:'#22c55e',borderDownColor:'#ef4444',wickUpColor:'#22c55e',wickDownColor:'#ef4444'})
    volR.current=chart.addHistogramSeries({color:'#60a5fa',priceFormat:{type:'volume'},priceScaleId:'vol'})
    chart.priceScale('vol').applyOptions({scaleMargins:{top:0.82,bottom:0}})
    s20R.current=chart.addLineSeries({color:'#f59e0b',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    e50R.current=chart.addLineSeries({color:'#3b82f6',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    bbUR.current=chart.addLineSeries({color:'#a78bfa',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:false})
    bbMR.current=chart.addLineSeries({color:'#a78bfa',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    bbLR.current=chart.addLineSeries({color:'#a78bfa',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:false})
    if (onChartClick) {
      chart.subscribeClick((p: any) => { if (p.time!=null) onChartClick({time:p.time as UTCTimestamp}) })
    }
    if (showRSI && rsiRef.current) {
      const rc=createChart(rsiRef.current,{...base,width:rsiRef.current.clientWidth,height:rsiRef.current.clientHeight,timeScale:{...base.timeScale,visible:false}})
      rcRef.current=rc
      rsiR.current=rc.addLineSeries({color:'#f59e0b',lineWidth:2,priceLineVisible:false,lastValueVisible:true})
    }
    if (showMACD && macdRef.current) {
      const mc=createChart(macdRef.current,{...base,width:macdRef.current.clientWidth,height:macdRef.current.clientHeight,timeScale:{...base.timeScale,visible:false}})
      mcRef.current=mc
      mlR.current=mc.addLineSeries({color:'#3b82f6',lineWidth:2,priceLineVisible:false,lastValueVisible:false})
      slR.current=mc.addLineSeries({color:'#f59e0b',lineWidth:2,priceLineVisible:false,lastValueVisible:false})
      mhR.current=mc.addHistogramSeries({priceScaleId:'right',priceLineVisible:false,lastValueVisible:false})
    }
    const ro=new ResizeObserver(()=>{
      if(mainRef.current&&cRef.current) cRef.current.resize(mainRef.current.clientWidth,mainRef.current.clientHeight)
      if(rsiRef.current&&rcRef.current) rcRef.current.resize(rsiRef.current.clientWidth,rsiRef.current.clientHeight)
      if(macdRef.current&&mcRef.current) mcRef.current.resize(macdRef.current.clientWidth,macdRef.current.clientHeight)
    })
    mainRef.current && ro.observe(mainRef.current)
    return ()=>ro.disconnect()
  },[isDark,showRSI,showMACD,col.bg,col.txt,col.grid,col.bdr])

  // Render a slice of data — data passed directly, no stale refs
  const render = useCallback((visible: OHLCV[]) => {
    if (!visible.length||!csR.current) return
    csR.current.setData(visible)
    if (volR.current) volR.current.setData(showVol?visible.map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'rgba(34,197,94,0.35)':'rgba(239,68,68,0.35)'})): [])
    if (s20R.current) s20R.current.setData(showSMA&&visible.length>=20?calcSMA(visible,20):[])
    if (e50R.current) e50R.current.setData(showEMA&&visible.length>=50?calcEMA(visible,50):[])
    if (bbUR.current&&bbMR.current&&bbLR.current) {
      const b=showBB&&visible.length>=20?calcBB(visible):[]
      bbUR.current.setData(b.map(x=>({time:x.time,value:x.upper})))
      bbMR.current.setData(b.map(x=>({time:x.time,value:x.middle})))
      bbLR.current.setData(b.map(x=>({time:x.time,value:x.lower})))
    }
    if (rsiR.current) rsiR.current.setData(showRSI&&visible.length>14?calcRSI(visible):[])
    if (mlR.current&&slR.current&&mhR.current) {
      const m=showMACD&&visible.length>35?calcMACD(visible):{ml:[],sl:[],hist:[]}
      mlR.current.setData(m.ml); slR.current.setData(m.sl); mhR.current.setData(m.hist)
    }
  },[showSMA,showEMA,showBB,showVol,showRSI,showMACD])

  const fitContent = () => cRef.current?.timeScale().fitContent()

  return { mainRef, rsiRef, macdRef, build, render, fitContent }
}

// ── Playback controls (shared UI) ─────────────────────────────────────────────
export function PlaybackBar({
  ph, total, playing, speed, scissorMode,
  onScrub, onPlay, onStepBack, onStepForward, onStep10, onSpeedChange, onScissorToggle,
}: {
  ph: number; total: number; playing: boolean; speed: number; scissorMode: boolean
  onScrub: (n:number)=>void; onPlay: ()=>void
  onStepBack: ()=>void; onStepForward: ()=>void; onStep10: ()=>void
  onSpeedChange: (s:number)=>void; onScissorToggle: ()=>void
}) {
  return (
    <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] px-3 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-gray-400 w-12 text-right shrink-0">Bar {ph}</span>
      <input type="range" min={50} max={total||500} value={ph}
        onChange={e=>{onScrub(Number(e.target.value))}}
        className="flex-1 min-w-[80px] accent-brand-500 h-1.5 cursor-pointer"/>
      <span className="text-[10px] text-gray-400 w-8 shrink-0">{total}</span>
      <button onClick={onStepBack} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipBack className="w-3.5 h-3.5"/></button>
      <button onClick={onPlay} className="p-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition shadow">
        {playing?<Pause className="w-3.5 h-3.5"/>:<Play className="w-3.5 h-3.5"/>}
      </button>
      <button onClick={onStepForward} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipForward className="w-3.5 h-3.5"/></button>
      <button onClick={onStep10} className="px-2 py-1 text-[11px] font-medium rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">+10</button>
      <div className="flex items-center gap-0.5">
        {[1,2,4,8,16,32].map(s=>(
          <button key={s} onClick={()=>onSpeedChange(s)}
            className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${speed===s?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {s}×
          </button>
        ))}
      </div>
      <button onClick={onScissorToggle}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition border ${scissorMode?'bg-amber-500 text-white border-amber-500 shadow shadow-amber-500/30':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
        <Scissors className="w-3 h-3"/>
        {scissorMode?'Click chart…':'Cut'}
      </button>
    </div>
  )
}

// ── Paper trading panel ───────────────────────────────────────────────────────
export function PaperPanel({
  sym, ph, cur, closed, openT, bal, lots, livePnl,
  onLots, onBuy, onSell, onClose,
}: {
  sym: string; ph: number; cur?: OHLCV; closed: RTrade[]; openT: RTrade|null
  bal: number; lots: string; livePnl: number|null
  onLots:(v:string)=>void; onBuy:()=>void; onSell:()=>void; onClose:()=>void
}) {
  const dp=assetDp(sym)
  const totalPnl=closed.reduce((s,t)=>s+(t.pnl??0),0)
  const wins=closed.filter(t=>(t.pnl??0)>0).length
  return (
    <div className="flex flex-col gap-0">
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2 space-y-1 text-[11px]">
        <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className={`font-bold ${bal>=10000?'text-emerald-600':'text-red-500'}`}>${bal.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Net P&L</span><span className={`font-semibold ${totalPnl>=0?'text-emerald-600':'text-red-500'}`}>{totalPnl>=0?'+':''}${totalPnl.toFixed(2)}</span></div>
        {closed.length>0&&<div className="flex justify-between"><span className="text-gray-500">Win rate</span><span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(wins/closed.length*100)}%</span></div>}
        {openT&&livePnl!==null&&<div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-500">Live P&L</span><span className={`font-bold ${livePnl>=0?'text-emerald-500':'text-red-500'}`}>{livePnl>=0?'+':''}${livePnl.toFixed(2)}</span></div>}
      </div>
      <div className="mb-2"><label className="block text-[10px] text-gray-400 mb-1">Lots / Units</label>
        <input value={lots} onChange={e=>onLots(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400"/>
      </div>
      {openT?(
        <div className="space-y-1.5">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
            <span className={`font-bold uppercase ${openT.type==='buy'?'text-emerald-600':'text-red-500'}`}>{openT.type}</span>
            {' '}@ {openT.entryPrice.toFixed(dp)} · {openT.lots} lots
          </div>
          <button onClick={onClose} className="w-full py-1.5 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">Close Trade</button>
        </div>
      ):(
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={onBuy} className="py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition">▲ BUY</button>
          <button onClick={onSell} className="py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">▼ SELL</button>
        </div>
      )}
      {closed.length>0&&(
        <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Trade Log</p>
          {closed.map(t=>(
            <div key={t.id} className={`p-2 rounded text-[11px] border ${(t.pnl??0)>=0?'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10':'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10'}`}>
              <div className="flex justify-between">
                <span className={`font-bold uppercase ${t.type==='buy'?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{t.type}</span>
                <span className={`font-bold ${(t.pnl??0)>=0?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{(t.pnl??0)>=0?'+':''}${t.pnl?.toFixed(2)}</span>
              </div>
              <span className="text-gray-400">{t.entryPrice.toFixed(dp)}→{t.exitPrice?.toFixed(dp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── usePaperTrading hook ──────────────────────────────────────────────────────
export function usePaperTrading(sym: string, cur: OHLCV|undefined) {
  const [bal,    setBal]    = useState(10000)
  const [openT,  setOpenT]  = useState<RTrade|null>(null)
  const [closed, setClosed] = useState<RTrade[]>([])
  const [lots,   setLots]   = useState('0.10')
  const phRef = useRef(0)

  const pipSz = ['USDJPY','GBPJPY','EURJPY'].includes(sym)?0.01:sym==='XAUUSD'?0.1:
    ['BTCUSD'].includes(sym)?1:['SPX500','NDX100','DJ30','DAX40','FTSE100','NIKKEI'].includes(sym)?0.1:0.0001
  const pipVal = ['BTCUSD','ETHUSD'].includes(sym)?(parseFloat(lots)||0.1)*0.01:
    ['AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL','AMD','NFLX','JPM'].includes(sym)?(parseFloat(lots)||1):
    (parseFloat(lots)||0.1)*10

  const livePnl = openT&&cur
    ? parseFloat(((openT.type==='buy'?(cur.close-openT.entryPrice):(openT.entryPrice-cur.close))/pipSz*pipVal).toFixed(2))
    : null

  const enter = (type:'buy'|'sell', ph: number) => {
    if (openT||!cur) return
    setOpenT({id:`r${Date.now()}`,type,entryBar:ph,entryPrice:cur.close,lots:parseFloat(lots)||0.1})
  }
  const exit = (ph: number) => {
    if (!openT||!cur) return
    const pips=(openT.type==='buy'?(cur.close-openT.entryPrice):(openT.entryPrice-cur.close))/pipSz
    const pnl=parseFloat((pips*pipVal).toFixed(2))
    setClosed(p=>[{...openT,exitBar:ph,exitPrice:cur.close,pnl},...p])
    setBal(b=>parseFloat((b+pnl).toFixed(2)))
    setOpenT(null)
  }
  const reset = () => { setBal(10000); setOpenT(null); setClosed([]) }

  return { bal, openT, closed, lots, setLots, livePnl, enter, exit, reset }
}

// ── Replay standalone page ────────────────────────────────────────────────────
const TIMEFRAMES = ['1m','5m','15m','1h','4h','1D']

export default function Replay() {
  const { theme } = useAppStore()
  const isDark = theme==='dark'
  const [searchParams] = useSearchParams()

  const [sym,  setSym]  = useState(()=>searchParams.get('symbol')||'EURUSD')
  const [tf,   setTf]   = useState(()=>searchParams.get('tf')||'15m')
  const [data, setData] = useState<OHLCV[]>([])
  const [ph,   setPH]   = useState(100)
  const [play, setPlay] = useState(false)
  const [spd,  setSpd]  = useState(1)
  const [scissor, setScissor] = useState(false)
  const [showSMA,  setShowSMA]  = useState(true)
  const [showEMA,  setShowEMA]  = useState(true)
  const [showBB,   setShowBB]   = useState(false)
  const [showVol,  setShowVol]  = useState(true)
  const [showRSI,  setShowRSI]  = useState(true)
  const [showMACD, setShowMACD] = useState(false)

  const spdRef = useRef(spd)
  useEffect(()=>{spdRef.current=spd},[spd])
  const scissorRef = useRef(scissor)
  useEffect(()=>{scissorRef.current=scissor},[scissor])

  const { mainRef, rsiRef, macdRef, build, render, fitContent } = useReplayChart({
    showSMA,showEMA,showBB,showVol,showRSI,showMACD,isDark,
  })

  const paper = usePaperTrading(sym, data[ph-1])

  const load = useCallback(()=>{
    setPlay(false); setScissor(false)
    const fresh = genCandles(sym, tf, 600)
    const startPH = Math.floor(fresh.length * 0.5)
    setData(fresh)
    setPH(startPH)
    // Pass fresh data directly — avoids stale state ref
    setTimeout(()=>{
      render(fresh.slice(0, startPH))
      fitContent()
    }, 30)
  },[sym, tf, render, fitContent])

  // Rebuild charts when indicator toggles or theme changes
  useEffect(()=>{
    const cleanup = build((p)=>{
      if (!scissorRef.current||p.time==null) return
      // Find bar index by time
      setData(d=>{
        const idx=d.findIndex(c=>c.time===p.time)
        if (idx>=0) { setPH(idx+1); setPlay(false); setScissor(false) }
        return d
      })
    })
    return cleanup
  },[build])

  // Load when symbol/tf changes
  useEffect(()=>{ load() },[load])

  // Playhead changes — render current data slice directly from state
  useEffect(()=>{
    if (data.length) render(data.slice(0,ph))
  },[ph, data, render])

  // Play loop
  useEffect(()=>{
    if (!play) return
    const id=setInterval(()=>{
      setPH(p=>{
        if (p>=data.length){setPlay(false);return p}
        return p+1
      })
    },Math.max(30,400/spdRef.current))
    return ()=>clearInterval(id)
  },[play,spd,data.length])

  const cur=data[ph-1], prev=data[ph-2]
  const dp=assetDp(sym)
  const chg=cur&&prev?cur.close-prev.close:0
  const chgP=prev?(chg/prev.close)*100:0

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#141414]">
      {/* Left panel */}
      <div className="w-52 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 space-y-2 border-b border-gray-100 dark:border-gray-800">
          {/* Asset class groups */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Instrument</p>
            {ASSET_GROUPS.map(g=>(
              <div key={g.group} className="mb-2">
                <p className="text-[10px] text-gray-400 font-medium mb-1">{g.group}</p>
                <div className="flex flex-wrap gap-1">
                  {g.assets.map(a=>(
                    <button key={a} onClick={()=>setSym(a)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition border ${sym===a?'bg-brand-500 text-white border-brand-500':'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-400'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Timeframe</p>
            <div className="flex flex-wrap gap-1">
              {TIMEFRAMES.map(t=>(
                <button key={t} onClick={()=>setTf(t)}
                  className={`px-2 py-1 text-[11px] rounded font-medium transition ${tf===t?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={load} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <RefreshCw className="w-3 h-3"/> Reload
          </button>
        </div>

        {/* Indicators */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Indicators</p>
          <div className="space-y-1.5">
            {([
              {label:'SMA 20',color:'bg-amber-400',val:showSMA,set:setShowSMA},
              {label:'EMA 50',color:'bg-blue-500',val:showEMA,set:setShowEMA},
              {label:'Bollinger Bands',color:'bg-purple-400',val:showBB,set:setShowBB},
              {label:'Volume',color:'bg-sky-400',val:showVol,set:setShowVol},
              {label:'RSI (14)',color:'bg-yellow-500',val:showRSI,set:setShowRSI},
              {label:'MACD',color:'bg-cyan-500',val:showMACD,set:setShowMACD},
            ] as const).map(({label,color,val,set})=>(
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <span className={`w-2 h-2 rounded-full shrink-0 ${color}`}/>
                <input type="checkbox" checked={val} onChange={e=>set(e.target.checked)} className="accent-brand-500 w-3.5 h-3.5"/>
                <span className="text-[11px] text-gray-600 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Paper trading */}
        <div className="p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Paper Trading</p>
          <PaperPanel
            sym={sym} ph={ph} cur={cur} closed={paper.closed} openT={paper.openT}
            bal={paper.bal} lots={paper.lots} livePnl={paper.livePnl}
            onLots={paper.setLots}
            onBuy={()=>paper.enter('buy',ph)}
            onSell={()=>paper.enter('sell',ph)}
            onClose={()=>paper.exit(ph)}
          />
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* OHLC bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-[#141414] flex-wrap">
          <span className="text-sm font-bold text-gray-800 dark:text-white">{sym}</span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{tf}</span>
          {cur&&(
            <>
              <span className="text-xs text-gray-500">O <span className="font-mono text-gray-700 dark:text-gray-300">{cur.open.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">H <span className="font-mono text-emerald-600">{cur.high.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">L <span className="font-mono text-red-500">{cur.low.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">C <span className={`font-mono font-semibold ${chg>=0?'text-emerald-600':'text-red-500'}`}>{cur.close.toFixed(dp)}</span></span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${chg>=0?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400'}`}>
                {chg>=0?'+':''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)
              </span>
            </>
          )}
          <div className="flex-1"/>
          <span className="text-[11px] text-gray-400">{ph} / {data.length} bars</span>
        </div>

        <div ref={mainRef} className={`flex-1 min-h-0 ${scissor?'cursor-crosshair':''}`}/>

        {showRSI&&(
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{height:90}}>
            <span className="absolute top-1 left-2 text-[10px] font-semibold text-amber-500 z-10 pointer-events-none">RSI</span>
            <div ref={rsiRef} className="w-full h-full"/>
          </div>
        )}
        {showMACD&&(
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{height:90}}>
            <span className="absolute top-1 left-2 text-[10px] font-semibold text-cyan-500 z-10 pointer-events-none">MACD</span>
            <div ref={macdRef} className="w-full h-full"/>
          </div>
        )}

        <PlaybackBar
          ph={ph} total={data.length} playing={play} speed={spd} scissorMode={scissor}
          onScrub={n=>{setPlay(false);setPH(n)}}
          onPlay={()=>setPlay(p=>!p)}
          onStepBack={()=>{setPlay(false);setPH(p=>Math.max(50,p-1))}}
          onStepForward={()=>{setPlay(false);setPH(p=>Math.min(data.length,p+1))}}
          onStep10={()=>{setPlay(false);setPH(p=>Math.min(data.length,p+10))}}
          onSpeedChange={setSpd}
          onScissorToggle={()=>{setPlay(false);setScissor(s=>!s)}}
        />
      </div>
    </div>
  )
}
