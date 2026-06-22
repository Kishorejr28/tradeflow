import { useEffect, useRef, useState } from 'react'
import { Search, X, Play, Pause, SkipBack, SkipForward, Scissors, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { genCandles, assetDp, ASSET_GROUPS, type OHLCV, type RTrade } from '@/pages/Replay'
import { fetchCandles } from '@/lib/marketData'
import {
  createChart, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'

const TIMEFRAMES = ['1m','5m','15m','1h','4h','1D']
const SPEEDS = [1,2,4,8,16,32]
const ALL = ASSET_GROUPS.flatMap(g => g.assets)

// ── Indicators ────────────────────────────────────────────────────────────────
function sma(d: OHLCV[], p: number) {
  const o: {time:UTCTimestamp;value:number}[] = []
  for (let i=p-1;i<d.length;i++) o.push({time:d[i].time,value:d.slice(i-p+1,i+1).reduce((s,c)=>s+c.close,0)/p})
  return o
}
function ema(d: OHLCV[], p: number): {time:UTCTimestamp;value:number}[] {
  if (d.length<p) return []
  const k=2/(p+1); const o: {time:UTCTimestamp;value:number}[] = []
  let e=d.slice(0,p).reduce((s,c)=>s+c.close,0)/p
  o.push({time:d[p-1].time,value:e})
  for (let i=p;i<d.length;i++){e=d[i].close*k+e*(1-k);o.push({time:d[i].time,value:e})}
  return o
}
function bb(d: OHLCV[]) {
  const o: {time:UTCTimestamp;u:number;m:number;l:number}[] = []
  for (let i=19;i<d.length;i++){
    const sl=d.slice(i-19,i+1), mean=sl.reduce((s,c)=>s+c.close,0)/20
    const std=Math.sqrt(sl.reduce((s,c)=>s+Math.pow(c.close-mean,2),0)/20)
    o.push({time:d[i].time,u:mean+2*std,m:mean,l:mean-2*std})
  }
  return o
}
function rsi(d: OHLCV[]): {time:UTCTimestamp;value:number}[] {
  if (d.length<=14) return []
  const o: {time:UTCTimestamp;value:number}[] = []
  let ag=0,al=0
  for (let i=1;i<=14;i++){const x=d[i].close-d[i-1].close;if(x>0)ag+=x;else al-=x}
  ag/=14;al/=14
  const rs=(g:number,l:number)=>l===0?100:100-100/(1+g/l)
  o.push({time:d[14].time,value:rs(ag,al)})
  for (let i=15;i<d.length;i++){
    const x=d[i].close-d[i-1].close
    ag=(ag*13+Math.max(x,0))/14;al=(al*13+Math.max(-x,0))/14
    o.push({time:d[i].time,value:rs(ag,al)})
  }
  return o
}
function macd(d: OHLCV[]) {
  const fe=ema(d,12),se=ema(d,26)
  const ml: {time:UTCTimestamp;value:number}[] = se.map((x,i)=>({time:x.time,value:(fe[i+14]?.value??0)-x.value})).filter((_,i)=>i+14<fe.length)
  if (ml.length<9) return {ml:[],sl:[],hist:[]}
  const sl: {time:UTCTimestamp;value:number}[] = []
  let e=ml.slice(0,9).reduce((s,c)=>s+c.value,0)/9
  sl.push({time:ml[8].time,value:e})
  const k=2/10
  for (let i=9;i<ml.length;i++){e=ml[i].value*k+e*(1-k);sl.push({time:ml[i].time,value:e})}
  const hist=sl.map((x,i)=>{const v=ml[i+ml.length-sl.length].value-x.value;return{time:x.time,value:v,color:v>=0?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)'}})
  return {ml,sl,hist}
}

// ── Symbol Search ─────────────────────────────────────────────────────────────
function SymSearch({current,onSelect}:{current:string;onSelect:(s:string)=>void}) {
  const [q,setQ]=useState('')
  const [open,setOpen]=useState(false)
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const fn=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)}
    document.addEventListener('mousedown',fn)
    return ()=>document.removeEventListener('mousedown',fn)
  },[])
  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-text" onClick={()=>setOpen(true)}>
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
        <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
          placeholder={current} className="w-24 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none"/>
        {q&&<button onClick={()=>setQ('')}><X className="w-3 h-3 text-gray-400"/></button>}
      </div>
      {open&&(
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {ASSET_GROUPS.map(g=>{
              const items=g.assets.filter(a=>!q||a.toLowerCase().includes(q.toLowerCase()))
              if(!items.length) return null
              return (
                <div key={g.group}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 sticky top-0">{g.group}</div>
                  {items.map(a=>(
                    <button key={a} onClick={()=>{onSelect(a);setQ('');setOpen(false)}}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-brand-50 dark:hover:bg-brand-500/10 transition flex justify-between ${a===current?'text-brand-600 dark:text-brand-400':'text-gray-700 dark:text-gray-300'}`}>
                      <span className="font-medium">{a}</span>
                      {a===current&&<span className="text-brand-500">●</span>}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PracticeMode({initialSymbol,onClose}:{initialSymbol:string;onClose:()=>void}) {
  const {theme}=useAppStore()
  const isDark=theme==='dark'

  const [sym,setSym]=useState(initialSymbol)
  const [tf,setTf]=useState('15m')
  const [ph,setPH]=useState(300)
  const [total,setTotal]=useState(600)
  const [playing,setPlaying]=useState(false)
  const [speed,setSpeed]=useState(1)
  const [scissor,setScissor]=useState(false)
  const [loading,setLoading]=useState(false)
  const [dataSource,setDataSource]=useState<'real'|'synthetic'>('synthetic')
  const [showSMA,setShowSMA]=useState(true)
  const [showEMA,setShowEMA]=useState(true)
  const [showBB,setShowBB]=useState(false)
  const [showVol,setShowVol]=useState(true)
  const [showRSI,setShowRSI]=useState(false)
  const [showMACD,setShowMACD]=useState(false)
  const [bal,setBal]=useState(10000)
  const [openT,setOpenT]=useState<RTrade|null>(null)
  const [closed,setClosed]=useState<RTrade[]>([])
  const [lots,setLots]=useState('0.10')
  const [curBar,setCurBar]=useState<OHLCV|null>(null)

  const mainRef=useRef<HTMLDivElement>(null)
  const rsiRef=useRef<HTMLDivElement>(null)
  const macdRef=useRef<HTMLDivElement>(null)
  const cR=useRef<IChartApi|null>(null)
  const rcR=useRef<IChartApi|null>(null)
  const mcR=useRef<IChartApi|null>(null)
  const csR=useRef<ISeriesApi<'Candlestick'>|null>(null)
  const volR=useRef<ISeriesApi<'Histogram'>|null>(null)
  const s20R=useRef<ISeriesApi<'Line'>|null>(null)
  const e50R=useRef<ISeriesApi<'Line'>|null>(null)
  const bbUR=useRef<ISeriesApi<'Line'>|null>(null)
  const bbMR=useRef<ISeriesApi<'Line'>|null>(null)
  const bbLR=useRef<ISeriesApi<'Line'>|null>(null)
  const rsiR=useRef<ISeriesApi<'Line'>|null>(null)
  const mlR=useRef<ISeriesApi<'Line'>|null>(null)
  const slR=useRef<ISeriesApi<'Line'>|null>(null)
  const mhR=useRef<ISeriesApi<'Histogram'>|null>(null)

  const dataRef=useRef<OHLCV[]>([])
  const phRef=useRef(300)
  const speedRef=useRef(1)
  const scissorRef=useRef(false)
  const showSMARef=useRef(showSMA);const showEMARef=useRef(showEMA)
  const showBBRef=useRef(showBB);const showVolRef=useRef(showVol)
  const showRSIRef=useRef(showRSI);const showMACDRef=useRef(showMACD)

  useEffect(()=>{phRef.current=ph},[ph])
  useEffect(()=>{speedRef.current=speed},[speed])
  useEffect(()=>{scissorRef.current=scissor},[scissor])
  useEffect(()=>{showSMARef.current=showSMA},[showSMA])
  useEffect(()=>{showEMARef.current=showEMA},[showEMA])
  useEffect(()=>{showBBRef.current=showBB},[showBB])
  useEffect(()=>{showVolRef.current=showVol},[showVol])
  useEffect(()=>{showRSIRef.current=showRSI},[showRSI])
  useEffect(()=>{showMACDRef.current=showMACD},[showMACD])

  const bg=isDark?'#141414':'#ffffff',txt=isDark?'#d1d5db':'#374151'
  const grid=isDark?'#1f2937':'#f3f4f6',bdr=isDark?'#374151':'#e5e7eb'

  function renderBars(d:OHLCV[],n:number){
    if(!csR.current||!d.length) return
    const v=d.slice(0,n); if(!v.length) return
    csR.current.setData(v); setCurBar(v[v.length-1])
    if(volR.current) volR.current.setData(showVolRef.current?v.map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'rgba(34,197,94,0.35)':'rgba(239,68,68,0.35)'})):[])
    if(s20R.current) s20R.current.setData(showSMARef.current&&v.length>=20?sma(v,20):[])
    if(e50R.current) e50R.current.setData(showEMARef.current&&v.length>=50?ema(v,50):[])
    if(bbUR.current&&bbMR.current&&bbLR.current){
      const b=showBBRef.current&&v.length>=20?bb(v):[]
      bbUR.current.setData(b.map(x=>({time:x.time,value:x.u})))
      bbMR.current.setData(b.map(x=>({time:x.time,value:x.m})))
      bbLR.current.setData(b.map(x=>({time:x.time,value:x.l})))
    }
    if(rsiR.current) rsiR.current.setData(showRSIRef.current&&v.length>14?rsi(v):[])
    if(mlR.current&&slR.current&&mhR.current){
      const m=showMACDRef.current&&v.length>35?macd(v):{ml:[],sl:[],hist:[]}
      mlR.current.setData(m.ml);slR.current.setData(m.sl);mhR.current.setData(m.hist)
    }
  }

  function buildCharts(){
    cR.current?.remove();rcR.current?.remove();mcR.current?.remove()
    if(!mainRef.current) return
    const base={layout:{background:{color:bg},textColor:txt},grid:{vertLines:{color:grid},horzLines:{color:grid}},crosshair:{mode:CrosshairMode.Normal},rightPriceScale:{borderColor:bdr},timeScale:{borderColor:bdr,timeVisible:true,secondsVisible:false}}
    const chart=createChart(mainRef.current,{...base,width:mainRef.current.clientWidth,height:mainRef.current.clientHeight})
    cR.current=chart
    csR.current=chart.addCandlestickSeries({upColor:'#22c55e',downColor:'#ef4444',borderUpColor:'#22c55e',borderDownColor:'#ef4444',wickUpColor:'#22c55e',wickDownColor:'#ef4444'})
    volR.current=chart.addHistogramSeries({color:'#60a5fa',priceFormat:{type:'volume'},priceScaleId:'vol'})
    chart.priceScale('vol').applyOptions({scaleMargins:{top:0.82,bottom:0}})
    s20R.current=chart.addLineSeries({color:'#f59e0b',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    e50R.current=chart.addLineSeries({color:'#3b82f6',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    bbUR.current=chart.addLineSeries({color:'#a78bfa',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:false})
    bbMR.current=chart.addLineSeries({color:'#a78bfa',lineWidth:1,priceLineVisible:false,lastValueVisible:false})
    bbLR.current=chart.addLineSeries({color:'#a78bfa',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:false})
    chart.subscribeClick((p:any)=>{
      if(!scissorRef.current||p.time==null) return
      const d=dataRef.current,idx=d.findIndex(c=>c.time===p.time)
      if(idx>=0){phRef.current=idx+1;setPH(idx+1);setPlaying(false);setScissor(false);renderBars(d,idx+1)}
    })
    if(showRSI&&rsiRef.current){
      const rc=createChart(rsiRef.current,{...base,width:rsiRef.current.clientWidth,height:rsiRef.current.clientHeight,timeScale:{...base.timeScale,visible:false}})
      rcR.current=rc;rsiR.current=rc.addLineSeries({color:'#f59e0b',lineWidth:2,priceLineVisible:false,lastValueVisible:true})
    }
    if(showMACD&&macdRef.current){
      const mc=createChart(macdRef.current,{...base,width:macdRef.current.clientWidth,height:macdRef.current.clientHeight,timeScale:{...base.timeScale,visible:false}})
      mcR.current=mc
      mlR.current=mc.addLineSeries({color:'#3b82f6',lineWidth:2,priceLineVisible:false,lastValueVisible:false})
      slR.current=mc.addLineSeries({color:'#f59e0b',lineWidth:2,priceLineVisible:false,lastValueVisible:false})
      mhR.current=mc.addHistogramSeries({priceScaleId:'right',priceLineVisible:false,lastValueVisible:false})
    }
    const ro=new ResizeObserver(()=>{
      if(mainRef.current&&cR.current) cR.current.resize(mainRef.current.clientWidth,mainRef.current.clientHeight)
      if(rsiRef.current&&rcR.current)  rcR.current.resize(rsiRef.current.clientWidth,rsiRef.current.clientHeight)
      if(macdRef.current&&mcR.current) mcR.current.resize(macdRef.current.clientWidth,macdRef.current.clientHeight)
    })
    mainRef.current&&ro.observe(mainRef.current)
    return ()=>ro.disconnect()
  }

  async function loadData(s:string,t:string){
    setPlaying(false)
    setLoading(true)
    setCurBar(null)
    const result = await fetchCandles(s, t, genCandles)
    const fresh = result.data
    setDataSource(result.source)
    setLoading(false)
    const n=Math.floor(fresh.length*0.5)
    dataRef.current=fresh;phRef.current=n;setTotal(fresh.length);setPH(n)
    requestAnimationFrame(()=>{renderBars(fresh,n);cR.current?.timeScale().fitContent()})
  }

  function seek(n:number){
    const c=Math.max(1,Math.min(dataRef.current.length,n))
    phRef.current=c;setPH(c);renderBars(dataRef.current,c)
  }

  useEffect(()=>{
    const cleanup=buildCharts()
    if(dataRef.current.length) requestAnimationFrame(()=>{renderBars(dataRef.current,phRef.current);cR.current?.timeScale().fitContent()})
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isDark,showRSI,showMACD])

  useEffect(()=>{loadData(sym,tf)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ,[sym,tf])

  useEffect(()=>{if(dataRef.current.length) renderBars(dataRef.current,phRef.current)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ,[showSMA,showEMA,showBB,showVol])

  useEffect(()=>{
    if(!playing) return
    const id=setInterval(()=>{
      const d=dataRef.current,n=phRef.current+1
      if(n>d.length){setPlaying(false);return}
      phRef.current=n;setPH(n);renderBars(d,n)
    },Math.max(30,400/speedRef.current))
    return ()=>clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,speed])

  const dp=assetDp(sym)
  const prev=dataRef.current[ph-2]
  const chg=curBar&&prev?curBar.close-prev.close:0
  const chgP=prev?(chg/prev.close)*100:0

  const pipSz=['USDJPY','GBPJPY','EURJPY'].includes(sym)?0.01:sym==='XAUUSD'?0.1:sym==='BTCUSD'?1:0.0001
  const lotN=parseFloat(lots)||0.1
  const pipVal=['AAPL','TSLA','NVDA','MSFT','AMZN','META','GOOGL','AMD','NFLX','JPM'].includes(sym)?lotN:lotN*10
  const livePnl=openT&&curBar?parseFloat(((openT.type==='buy'?(curBar.close-openT.entryPrice):(openT.entryPrice-curBar.close))/pipSz*pipVal).toFixed(2)):null
  const totalPnl=closed.reduce((s,t)=>s+(t.pnl??0),0)
  const wins=closed.filter(t=>(t.pnl??0)>0).length

  function enterTrade(type:'buy'|'sell'){
    if(openT||!curBar) return
    setOpenT({id:`p${Date.now()}`,type,entryBar:phRef.current,entryPrice:curBar.close,lots:lotN})
  }
  function closeTrade(){
    if(!openT||!curBar) return
    const pips=(openT.type==='buy'?(curBar.close-openT.entryPrice):(openT.entryPrice-curBar.close))/pipSz
    const pnl=parseFloat((pips*pipVal).toFixed(2))
    setClosed(p=>[{...openT,exitBar:phRef.current,exitPrice:curBar.close,pnl},...p])
    setBal(b=>parseFloat((b+pnl).toFixed(2)));setOpenT(null)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] shrink-0 flex-wrap">
        <SymSearch current={sym} onSelect={s=>{setSym(s)}}/>
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {TIMEFRAMES.map(t=>(
            <button key={t} onClick={()=>setTf(t)} className={`px-2 py-1 text-[11px] rounded font-medium transition ${tf===t?'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm':'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>{t}</button>
          ))}
        </div>
        {/* Indicator toggles */}
        {[{l:'SMA',c:'bg-amber-400',v:showSMA,s:setShowSMA},{l:'EMA',c:'bg-blue-500',v:showEMA,s:setShowEMA},{l:'BB',c:'bg-purple-400',v:showBB,s:setShowBB},{l:'Vol',c:'bg-sky-400',v:showVol,s:setShowVol},{l:'RSI',c:'bg-yellow-500',v:showRSI,s:setShowRSI},{l:'MACD',c:'bg-cyan-500',v:showMACD,s:setShowMACD}]
          .map(ind=>(
            <button key={ind.l} onClick={()=>ind.s((x:boolean)=>!x)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition border ${ind.v?'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200':'border-transparent text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ind.c}`}/>{ind.l}
            </button>
          ))}
        <div className="flex-1"/>
        {dataSource==='real'
          ? <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Wifi className="w-2.5 h-2.5"/> Live data</span>
          : <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"><WifiOff className="w-2.5 h-2.5"/> Simulated</span>
        }
        {curBar&&(
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-800 dark:text-white">{sym}</span>
            <span className="text-gray-400">O<span className="font-mono ml-1 text-gray-700 dark:text-gray-300">{curBar.open.toFixed(dp)}</span></span>
            <span className="text-gray-400">H<span className="font-mono ml-1 text-emerald-600">{curBar.high.toFixed(dp)}</span></span>
            <span className="text-gray-400">L<span className="font-mono ml-1 text-red-500">{curBar.low.toFixed(dp)}</span></span>
            <span className="text-gray-400">C<span className={`font-mono ml-1 font-bold ${chg>=0?'text-emerald-600':'text-red-500'}`}>{curBar.close.toFixed(dp)}</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${chg>=0?'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600':'bg-red-50 dark:bg-red-500/10 text-red-500'}`}>{chg>=0?'+':''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)</span>
          </div>
        )}
        <span className="text-[10px] text-gray-400 font-mono">{ph}/{total}</span>
        <button onClick={()=>loadData(sym,tf)} className="p-1.5 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"><RefreshCw className="w-3.5 h-3.5"/></button>
        <button onClick={onClose} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-medium border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-500/20 transition">
          <X className="w-3.5 h-3.5"/> Exit Practice
        </button>
      </div>

      {/* Charts + right panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative">
            <div ref={mainRef} className={`w-full h-full ${scissor?'cursor-crosshair':''}`}/>
            {loading&&(
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-[#141414]/80 backdrop-blur-sm z-10">
                <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mb-2"/>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Fetching real data…</p>
              </div>
            )}
          </div>
          {showRSI&&<div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{height:80}}><span className="absolute top-1 left-2 text-[9px] font-semibold text-amber-500 z-10 pointer-events-none">RSI</span><div ref={rsiRef} className="w-full h-full"/></div>}
          {showMACD&&<div className="shrink-0 border-t border-gray-100 dark:border-gray-800 relative" style={{height:80}}><span className="absolute top-1 left-2 text-[9px] font-semibold text-cyan-500 z-10 pointer-events-none">MACD</span><div ref={macdRef} className="w-full h-full"/></div>}
          {/* Playback */}
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-10 text-right font-mono shrink-0">{ph}</span>
            <input type="range" min={1} max={total} value={ph}
              onMouseDown={()=>setPlaying(false)}
              onChange={e=>seek(Number(e.target.value))}
              className="flex-1 accent-brand-500 cursor-pointer" style={{height:'4px'}}/>
            <span className="text-[10px] text-gray-400 w-8 font-mono shrink-0">{total}</span>
            <button onClick={()=>seek(ph-1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipBack className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setPlaying(p=>!p)} className="p-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition shadow">
              {playing?<Pause className="w-3.5 h-3.5"/>:<Play className="w-3.5 h-3.5"/>}
            </button>
            <button onClick={()=>seek(ph+1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"><SkipForward className="w-3.5 h-3.5"/></button>
            <button onClick={()=>seek(ph+10)} className="px-2 py-1 text-[11px] font-medium rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">+10</button>
            <div className="flex items-center gap-0.5">
              {SPEEDS.map(s=><button key={s} onClick={()=>setSpeed(s)} className={`px-1.5 py-1 text-[10px] rounded font-medium transition ${speed===s?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{s}×</button>)}
            </div>
            <button onClick={()=>{setPlaying(false);setScissor(s=>!s)}}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition border ${scissor?'bg-amber-500 text-white border-amber-500':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Scissors className="w-3 h-3"/>{scissor?'Click candle…':'Cut point'}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-44 border-l border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414]">
          {curBar&&(
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="text-sm font-bold tabular-nums font-mono text-gray-900 dark:text-white">{curBar.close.toFixed(dp)}</div>
              <div className={`text-xs font-semibold ${chg>=0?'text-emerald-600':'text-red-500'}`}>{chg>=0?'+':''}{chg.toFixed(dp)} ({chgP.toFixed(2)}%)</div>
              <div className="mt-1.5 space-y-1">
                {[['O',curBar.open.toFixed(dp),'text-gray-600 dark:text-gray-300'],['H',curBar.high.toFixed(dp),'text-emerald-600'],['L',curBar.low.toFixed(dp),'text-red-500'],['Vol',curBar.volume.toLocaleString(),'text-sky-500']].map(([k,v,c])=>(
                  <div key={String(k)} className="flex justify-between text-[11px]">
                    <span className="text-gray-400">{k}</span>
                    <span className={`font-mono font-semibold ${c}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="px-3 py-2 flex-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Paper Trading</p>
            <div className="space-y-1 text-[11px] mb-2">
              <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className={`font-bold ${bal>=10000?'text-emerald-600':'text-red-500'}`}>${bal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">P&L</span><span className={`font-semibold ${totalPnl>=0?'text-emerald-600':'text-red-500'}`}>{totalPnl>=0?'+':''}${totalPnl.toFixed(2)}</span></div>
              {closed.length>0&&<div className="flex justify-between"><span className="text-gray-500">Win%</span><span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(wins/closed.length*100)}%</span></div>}
              {livePnl!==null&&<div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-500">Live</span><span className={`font-bold ${livePnl>=0?'text-emerald-500':'text-red-500'}`}>{livePnl>=0?'+':''}${livePnl.toFixed(2)}</span></div>}
            </div>
            <input value={lots} onChange={e=>setLots(e.target.value)} placeholder="Lots" className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400 mb-2"/>
            {openT?(
              <div className="space-y-1.5">
                <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]"><span className={`font-bold uppercase ${openT.type==='buy'?'text-emerald-600':'text-red-500'}`}>{openT.type}</span> @ {openT.entryPrice.toFixed(dp)}</div>
                <button onClick={closeTrade} className="w-full py-1.5 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">Close</button>
              </div>
            ):(
              <div className="grid grid-cols-2 gap-1">
                <button onClick={()=>enterTrade('buy')} className="py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition">▲BUY</button>
                <button onClick={()=>enterTrade('sell')} className="py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition">▼SELL</button>
              </div>
            )}
            {closed.length>0&&(
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Log</p>
                {closed.map(t=>(
                  <div key={t.id} className={`p-1.5 rounded text-[10px] border ${(t.pnl??0)>=0?'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10':'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10'}`}>
                    <div className="flex justify-between"><span className={`font-bold uppercase ${t.type==='buy'?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{t.type}</span><span className={`font-bold ${(t.pnl??0)>=0?'text-emerald-700 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{(t.pnl??0)>=0?'+':''}${t.pnl?.toFixed(2)}</span></div>
                    <span className="text-gray-400 font-mono">{t.entryPrice.toFixed(dp)}→{t.exitPrice?.toFixed(dp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
