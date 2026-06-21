import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

// ── Types ─────────────────────────────────────────────────────────────────────
interface OHLCV {
  time: UTCTimestamp
  open: number; high: number; low: number; close: number; volume: number
}
interface RTrade {
  id: string; type: 'buy'|'sell'
  entryBar: number; entryPrice: number; lots: number
  exitBar?: number; exitPrice?: number; pnl?: number
}

// ── Pure indicator functions ──────────────────────────────────────────────────
function sma(d: OHLCV[], p: number) {
  const out: {time:UTCTimestamp;value:number}[] = []
  for (let i = p-1; i < d.length; i++) {
    out.push({ time: d[i].time, value: d.slice(i-p+1,i+1).reduce((s,c)=>s+c.close,0)/p })
  }
  return out
}
function ema(d: OHLCV[], p: number) {
  if (d.length < p) return []
  const k = 2/(p+1)
  const out: {time:UTCTimestamp;value:number}[] = []
  let e = d.slice(0,p).reduce((s,c)=>s+c.close,0)/p
  out.push({time:d[p-1].time,value:e})
  for (let i=p;i<d.length;i++) { e=d[i].close*k+e*(1-k); out.push({time:d[i].time,value:e}) }
  return out
}
function bb(d: OHLCV[], p=20, m=2) {
  const out: {time:UTCTimestamp;upper:number;middle:number;lower:number}[] = []
  for (let i=p-1;i<d.length;i++) {
    const sl=d.slice(i-p+1,i+1), mean=sl.reduce((s,c)=>s+c.close,0)/p
    const std=Math.sqrt(sl.reduce((s,c)=>s+Math.pow(c.close-mean,2),0)/p)
    out.push({time:d[i].time,upper:mean+m*std,middle:mean,lower:mean-m*std})
  }
  return out
}
function rsi(d: OHLCV[], p=14) {
  if (d.length<=p) return []
  const out: {time:UTCTimestamp;value:number}[] = []
  let ag=0,al=0
  for (let i=1;i<=p;i++){const x=d[i].close-d[i-1].close; if(x>0)ag+=x;else al-=x}
  ag/=p; al/=p
  const calc=(g:number,l:number)=>l===0?100:100-100/(1+g/l)
  out.push({time:d[p].time,value:calc(ag,al)})
  for (let i=p+1;i<d.length;i++){
    const x=d[i].close-d[i-1].close
    ag=(ag*(p-1)+Math.max(x,0))/p; al=(al*(p-1)+Math.max(-x,0))/p
    out.push({time:d[i].time,value:calc(ag,al)})
  }
  return out
}
function macd(d: OHLCV[], f=12, s=26, sg=9) {
  const fe=ema(d,f), se=ema(d,s), off=s-f
  const ml: {time:UTCTimestamp;value:number}[] = se
    .map((x,i)=>({time:x.time,value:(fe[i+off]?.value??0)-x.value}))
    .filter((_,i)=>i+off<fe.length)
  if (ml.length<sg) return {ml:[],sl:[],hist:[]}
  const slArr: {time:UTCTimestamp;value:number}[] = []
  let e=ml.slice(0,sg).reduce((s,c)=>s+c.value,0)/sg
  slArr.push({time:ml[sg-1].time,value:e})
  const k=2/(sg+1)
  for (let i=sg;i<ml.length;i++){e=ml[i].value*k+e*(1-k); slArr.push({time:ml[i].time,value:e})}
  const hist=slArr.map((x,i)=>{
    const v=ml[i+ml.length-slArr.length].value-x.value
    return {time:x.time,value:v,color:v>=0?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)'}
  })
  return {ml,sl:slArr,hist}
}

// ── Historical data generator ─────────────────────────────────────────────────
const TF_SEC: Record<string,number> = {'1m':60,'5m':300,'15m':900,'1h':3600,'4h':14400,'1D':86400}
const BASE: Record<string,number> = {EURUSD:1.1158,GBPUSD:1.2741,USDJPY:157.38,XAUUSD:3324,AUDUSD:0.6412,USDCAD:1.3592,USDCHF:0.8981,NZDUSD:0.5891,GBPJPY:200.54,EURJPY:175.63}

function genCandles(sym: string, tf: string, n=500): OHLCV[] {
  const base=BASE[sym]??1.1, vol=sym==='XAUUSD'?0.004:sym.includes('JPY')?0.002:0.0006
  const sec=TF_SEC[tf]??900, now=Math.floor(Date.now()/1000)
  let seed=sym.split('').reduce((s,c)=>s+c.charCodeAt(0),0)
  const rng=()=>{seed=(seed*1664525+1013904223)&0x7fffffff;return seed/0x7fffffff}
  const out: OHLCV[]=[]
  let close=base
  for (let i=0;i<n;i++){
    const time=(now-(n-i)*sec) as UTCTimestamp
    const open=close, move=(rng()-0.5)*2*vol*close
    close=Math.max(open+move,base*0.7)
    const r=rng()*vol*close
    out.push({time,open,high:Math.max(open,close)+r*rng(),low:Math.min(open,close)-r*rng(),close,volume:Math.floor(1000+rng()*9000)})
  }
  return out
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SYMBOLS=['EURUSD','GBPUSD','USDJPY','XAUUSD','AUDUSD','USDCAD','USDCHF','NZDUSD','GBPJPY','EURJPY']
const TFS=['1m','5m','15m','1h','4h','1D']
const SPEEDS=[1,2,4,8,16,32]

// ── Component ─────────────────────────────────────────────────────────────────
export default function Replay() {
  const { theme } = useAppStore()
  const isDark = theme==='dark'

  // DOM refs
  const mainRef = useRef<HTMLDivElement>(null)
  const rsiRef  = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)

  // Chart API refs
  const cRef  = useRef<IChartApi|null>(null)
  const rcRef = useRef<IChartApi|null>(null)
  const mcRef = useRef<IChartApi|null>(null)

  // Series refs
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

  // State
  const [sym,  setSym]  = useState('EURUSD')
  const [tf,   setTf]   = useState('15m')
  const [data, setData] = useState<OHLCV[]>([])
  const [ph,   setPH]   = useState(100)
  const [play, setPlay] = useState(false)
  const [spd,  setSpd]  = useState(1)

  const [showSMA,  setShowSMA]  = useState(true)
  const [showEMA,  setShowEMA]  = useState(true)
  const [showBB,   setShowBB]   = useState(false)
  const [showVol,  setShowVol]  = useState(true)
  const [showRSI,  setShowRSI]  = useState(true)
  const [showMACD, setShowMACD] = useState(false)

  const [bal,    setBal]    = useState(10000)
  const [openT,  setOpenT]  = useState<RTrade|null>(null)
  const [closed, setClosed] = useState<RTrade[]>([])
  const [lots,   setLots]   = useState('0.10')

  const dataRef  = useRef(data)
  const playRef  = useRef(play)
  const spdRef   = useRef(spd)
  useEffect(()=>{dataRef.current=data},[data])
  useEffect(()=>{playRef.current=play},[play])
  useEffect(()=>{spdRef.current=spd},[spd])

  const col = {bg:isDark?'#141414':'#ffffff',txt:isDark?'#d1d5db':'#374151',grid:isDark?'#1f2937':'#f3f4f6',bdr:isDark?'#374151':'#e5e7eb'}

  // ── Build charts ──────────────────────────────────────────────────────────────
  const build = useCallback(()=>{
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
      if(mainRef.current&&cRef.current)  cRef.current.resize(mainRef.current.clientWidth,mainRef.current.clientHeight)
      if(rsiRef.current&&rcRef.current)  rcRef.current.resize(rsiRef.current.clientWidth,rsiRef.current.clientHeight)
      if(macdRef.current&&mcRef.current) mcRef.current.resize(macdRef.current.clientWidth,macdRef.current.clientHeight)
    })
    if(mainRef.current) ro.observe(mainRef.current)
    return ()=>ro.disconnect()
  },[isDark,showRSI,showMACD,col.bg,col.txt,col.grid,col.bdr])

  useEffect(()=>{ build() },[build])

  // ── Load data ─────────────────────────────────────────────────────────────────
  const load = useCallback(()=>{
    setPlay(false)
    const c=genCandles(sym,tf,500)
    setData(c); setPH(Math.floor(c.length*0.5))
  },[sym,tf])
  useEffect(()=>{ load() },[load])

  // ── Render to playhead ────────────────────────────────────────────────────────
  const render = useCallback((n: number)=>{
    const d=dataRef.current
    if(!d.length||!csR.current) return
    const v=d.slice(0,n); if(!v.length) return
    csR.current.setData(v)
    if(volR.current) volR.current.setData(showVol?v.map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'rgba(34,197,94,0.35)':'rgba(239,68,68,0.35)'})):[])
    if(s20R.current) s20R.current.setData(showSMA&&v.length>=20?sma(v,20):[])
    if(e50R.current) e50R.current.setData(showEMA&&v.length>=50?ema(v,50):[])
    if(bbUR.current&&bbMR.current&&bbLR.current){
      const b=showBB&&v.length>=20?bb(v):[]
      bbUR.current.setData(b.map(x=>({time:x.time,value:x.upper})))
      bbMR.current.setData(b.map(x=>({time:x.time,value:x.middle})))
      bbLR.current.setData(b.map(x=>({time:x.time,value:x.lower})))
    }
    if(rsiR.current) rsiR.current.setData(showRSI&&v.length>14?rsi(v):[])
    if(mlR.current&&slR.current&&mhR.current){
      const m=showMACD&&v.length>35?macd(v):{ml:[],sl:[],hist:[]}
      mlR.current.setData(m.ml); slR.current.setData(m.sl); mhR.current.setData(m.hist)
    }
  },[showSMA,showEMA,showBB,showVol,showRSI,showMACD])

  useEffect(()=>{ render(ph) },[ph,render])

  // ── Play loop ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!play) return
    const id=setInterval(()=>{
      setPH(p=>{
        if(p>=dataRef.current.length){setPlay(false);return p}
        return p+1
      })
    },Math.max(30,400/spdRef.current))
    return ()=>clearInterval(id)
  },[play,spd])

  // ── Current bar ───────────────────────────────────────────────────────────────
  const cur=data[ph-1], prev=data[ph-2]
  const dp=sym.includes('JPY')||sym==='XAUUSD'?2:4
  const chg=cur&&prev?cur.close-prev.close:0
  const chgP=prev?(chg/prev.close)*100:0
  const pipSz=sym.includes('JPY')?0.01:sym==='XAUUSD'?0.1:0.0001
  const pipVal=sym==='XAUUSD'?(parseFloat(lots)||0.1):(parseFloat(lots)||0.1)*10

  // ── Paper trading ─────────────────────────────────────────────────────────────
  const livePnl=openT&&cur?(openT.type==='buy'?(cur.close-openT.entryPrice)/pipSz*pipVal:(openT.entryPrice-cur.close)/pipSz*pipVal):null
  const enter=(t:'buy'|'sell')=>{if(openT||!cur)return;setOpenT({id:`r${Date.now()}`,type:t,entryBar:ph,entryPrice:cur.close,lots:parseFloat(lots)||0.1})}
  const exit=()=>{
    if(!openT||!cur)return
    const pips=openT.type==='buy'?(cur.close-openT.entryPrice)/pipSz:(openT.entryPrice-cur.close)/pipSz
    const pnl=parseFloat((pips*pipVal).toFixed(2))
    setClosed(p=>[{...openT,exitBar:ph,exitPrice:cur.close,pnl},...p])
    setBal(b=>parseFloat((b+pnl).toFixed(2)))
    setOpenT(null)
  }
  const totalPnl=closed.reduce((s,t)=>s+(t.pnl??0),0)
  const wins=closed.filter(t=>(t.pnl??0)>0).length

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#141414]">

      {/* ── Left panel ─────────────────────────────────────────────────────────── */}
      <div className="w-52 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0">

        {/* Symbol + TF */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Symbol</p>
            <select value={sym} onChange={e=>setSym(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none">
              {SYMBOLS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Timeframe</p>
            <div className="flex flex-wrap gap-1">
              {TFS.map(t=>(
                <button key={t} onClick={()=>setTf(t)}
                  className={`px-2 py-1 text-[11px] rounded font-medium transition ${tf===t?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={load}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <RefreshCw className="w-3 h-3"/> Reload chart
          </button>
        </div>

        {/* Indicators */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Indicators</p>
          <div className="space-y-1.5">
            {([
              {label:'SMA 20',         color:'bg-amber-400',  val:showSMA,  set:setShowSMA},
              {label:'EMA 50',         color:'bg-blue-500',   val:showEMA,  set:setShowEMA},
              {label:'Bollinger Bands',color:'bg-purple-400', val:showBB,   set:setShowBB},
              {label:'Volume',         color:'bg-sky-400',    val:showVol,  set:setShowVol},
              {label:'RSI (14)',       color:'bg-yellow-500', val:showRSI,  set:setShowRSI},
              {label:'MACD',          color:'bg-cyan-500',   val:showMACD, set:setShowMACD},
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
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Paper Trading</p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Balance</span>
              <span className={`font-bold ${bal>=10000?'text-emerald-600':'text-red-500'}`}>${bal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Net P&L</span>
              <span className={`font-semibold ${totalPnl>=0?'text-emerald-600':'text-red-500'}`}>{totalPnl>=0?'+':''}${totalPnl.toFixed(2)}</span>
            </div>
            {closed.length>0&&(
              <div className="flex justify-between">
                <span className="text-gray-500">Win rate</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(wins/closed.length*100)}%</span>
              </div>
            )}
            {openT&&livePnl!==null&&(
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Live P&L</span>
                <span className={`font-bold ${livePnl>=0?'text-emerald-500':'text-red-500'}`}>{livePnl>=0?'+':''}${livePnl.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="mb-2">
            <label className="block text-[10px] text-gray-400 mb-1">Lots</label>
            <input value={lots} onChange={e=>setLots(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400"/>
          </div>
          {openT?(
            <div className="space-y-1.5">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
                <span className={`font-bold uppercase ${openT.type==='buy'?'text-emerald-600':'text-red-500'}`}>{openT.type}</span>
                {' '}@ {openT.entryPrice.toFixed(dp)} · {openT.lots} lots
              </div>
              <button onClick={exit} className="w-full py-1.5 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">
                Close Trade
              </button>
            </div>
          ):(
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={()=>enter('buy')} className="py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition">▲ BUY</button>
              <button onClick={()=>enter('sell')} className="py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">▼ SELL</button>
            </div>
          )}
        </div>

        {/* Trade log */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Trade Log</p>
          {closed.length===0
            ? <p className="text-[11px] text-gray-400 text-center pt-3">No trades yet</p>
            : <div className="space-y-1.5">
                {closed.map(t=>(
                  <div key={t.id} className={`p-2 rounded-lg text-[11px] border ${(t.pnl??0)>=0?'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10':'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10'}`}>
                    <div className="flex justify-between">
                      <span className={`font-bold uppercase ${t.type==='buy'?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{t.type}</span>
                      <span className={`font-bold ${(t.pnl??0)>=0?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{(t.pnl??0)>=0?'+':''}${t.pnl?.toFixed(2)}</span>
                    </div>
                    <div className="text-gray-400 mt-0.5">{t.entryPrice.toFixed(dp)} → {t.exitPrice?.toFixed(dp)}</div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── Chart area ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* OHLC bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-[#141414] flex-wrap">
          <span className="text-sm font-bold text-gray-800 dark:text-white">{sym}</span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{tf}</span>
          {cur&&(
            <>
              <span className="text-xs text-gray-500">O<span className="text-gray-700 dark:text-gray-300 font-mono ml-1">{cur.open.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">H<span className="text-emerald-600 font-mono ml-1">{cur.high.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">L<span className="text-red-500 font-mono ml-1">{cur.low.toFixed(dp)}</span></span>
              <span className="text-xs text-gray-500">C<span className={`font-mono font-semibold ml-1 ${chg>=0?'text-emerald-600':'text-red-500'}`}>{cur.close.toFixed(dp)}</span></span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${chg>=0?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400'}`}>
                {chg>=0?'+':''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)
              </span>
            </>
          )}
          <div className="flex-1"/>
          <span className="text-[11px] text-gray-400">{ph} / {data.length} bars</span>
        </div>

        {/* Main candle chart */}
        <div ref={mainRef} className="flex-1 min-h-0"/>

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

        {/* Playback controls */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] px-4 py-2.5 flex items-center gap-2">
          <span className="text-[10px] text-gray-400 shrink-0 w-14 text-right">Bar {ph}</span>
          <input type="range" min={50} max={data.length||500} value={ph}
            onChange={e=>{setPlay(false);setPH(Number(e.target.value))}}
            className="flex-1 accent-brand-500 h-1.5 cursor-pointer"/>
          <span className="text-[10px] text-gray-400 shrink-0 w-10">{data.length}</span>

          {/* Step −1 */}
          <button onClick={()=>{setPlay(false);setPH(p=>Math.max(50,p-1))}}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition">
            <SkipBack className="w-4 h-4"/>
          </button>

          {/* Play/Pause */}
          <button onClick={()=>setPlay(p=>!p)}
            className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition shadow-lg shadow-brand-500/30">
            {play?<Pause className="w-4 h-4"/>:<Play className="w-4 h-4"/>}
          </button>

          {/* Step +1 */}
          <button onClick={()=>{setPlay(false);setPH(p=>Math.min(data.length,p+1))}}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition">
            <SkipForward className="w-4 h-4"/>
          </button>

          {/* +10 bars */}
          <button onClick={()=>{setPlay(false);setPH(p=>Math.min(data.length,p+10))}}
            className="px-2 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            +10
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-gray-400 font-medium mr-1">Speed</span>
            {SPEEDS.map(s=>(
              <button key={s} onClick={()=>setSpd(s)}
                className={`px-1.5 py-1 text-[11px] rounded font-medium transition ${spd===s?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
