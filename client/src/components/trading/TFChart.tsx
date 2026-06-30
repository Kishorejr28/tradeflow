import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts'
import {
  MousePointer2, Minus, AlignCenter, TrendingUp, Triangle,
  Square, Type, Ruler, ZoomIn, ZoomOut, Trash2,
  Settings2, X, Plus, ChevronDown, Loader2, RefreshCw,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { fetchCandles } from '@/lib/marketData'
import type { OHLCV } from '@/pages/Replay'
import { assetDp } from '@/pages/Replay'

// ── Indicator math ─────────────────────────────────────────────────────────────
function calcSMA(d: OHLCV[], p: number) {
  const out: {time:UTCTimestamp;value:number}[] = []
  for (let i=p-1;i<d.length;i++)
    out.push({time:d[i].time, value:d.slice(i-p+1,i+1).reduce((s,c)=>s+c.close,0)/p})
  return out
}
function calcEMA(d: OHLCV[], p: number): {time:UTCTimestamp;value:number}[] {
  if (d.length<p) return []
  const k=2/(p+1); const out:{time:UTCTimestamp;value:number}[]=[]
  let e=d.slice(0,p).reduce((s,c)=>s+c.close,0)/p
  out.push({time:d[p-1].time,value:e})
  for (let i=p;i<d.length;i++){e=d[i].close*k+e*(1-k);out.push({time:d[i].time,value:e})}
  return out
}
function calcBB(d: OHLCV[], p=20, mult=2) {
  const out:{time:UTCTimestamp;upper:number;middle:number;lower:number}[]=[]
  for (let i=p-1;i<d.length;i++){
    const sl=d.slice(i-p+1,i+1), mean=sl.reduce((s,c)=>s+c.close,0)/p
    const std=Math.sqrt(sl.reduce((s,c)=>s+Math.pow(c.close-mean,2),0)/p)
    out.push({time:d[i].time,upper:mean+mult*std,middle:mean,lower:mean-mult*std})
  }
  return out
}
function calcRSI(d: OHLCV[], p=14):{time:UTCTimestamp;value:number}[] {
  if (d.length<=p) return []
  const out:{time:UTCTimestamp;value:number}[]=[]
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
  const ml:{time:UTCTimestamp;value:number}[]=se
    .map((x,i)=>({time:x.time,value:(fe[i+off]?.value??0)-x.value}))
    .filter((_,i)=>i+off<fe.length)
  if (ml.length<sg) return {ml:[],sl:[],hist:[]}
  const slArr:{time:UTCTimestamp;value:number}[]=[]
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
function calcVWAP(d: OHLCV[]):{time:UTCTimestamp;value:number}[] {
  const out:{time:UTCTimestamp;value:number}[]=[];let cumPV=0,cumV=0
  for (const c of d){const tp=(c.high+c.low+c.close)/3;cumPV+=tp*c.volume;cumV+=c.volume;out.push({time:c.time,value:cumV?cumPV/cumV:tp})}
  return out
}
function calcStoch(d: OHLCV[], kp=14, dp=3):{time:UTCTimestamp;k:number;dv:number}[] {
  const out:{time:UTCTimestamp;k:number;dv:number}[]=[]
  for (let i=kp-1;i<d.length;i++){
    const sl=d.slice(i-kp+1,i+1)
    const lo=Math.min(...sl.map(c=>c.low)),hi=Math.max(...sl.map(c=>c.high))
    out.push({time:d[i].time,k:hi===lo?50:((d[i].close-lo)/(hi-lo))*100,dv:0})
  }
  for (let i=dp-1;i<out.length;i++) out[i].dv=out.slice(i-dp+1,i+1).reduce((s,c)=>s+c.k,0)/dp
  return out.filter((_,i)=>i>=dp-1)
}
function calcATR(d: OHLCV[], p=14):{time:UTCTimestamp;value:number}[] {
  const out:{time:UTCTimestamp;value:number}[]=[]
  if (d.length<2) return out
  const trs:number[]=[]
  for (let i=1;i<d.length;i++) trs.push(Math.max(d[i].high-d[i].low,Math.abs(d[i].high-d[i-1].close),Math.abs(d[i].low-d[i-1].close)))
  let atr=trs.slice(0,p).reduce((s,v)=>s+v,0)/p
  out.push({time:d[p].time,value:atr})
  for (let i=p;i<trs.length;i++){atr=(atr*(p-1)+trs[i])/p;out.push({time:d[i+1].time,value:atr})}
  return out
}
function calcWMA(d: OHLCV[], p: number):{time:UTCTimestamp;value:number}[] {
  const out:{time:UTCTimestamp;value:number}[]=[]
  const denom=p*(p+1)/2
  for (let i=p-1;i<d.length;i++){
    let v=0;for (let j=0;j<p;j++) v+=(j+1)*d[i-p+1+j].close
    out.push({time:d[i].time,value:v/denom})
  }
  return out
}
function calcCCI(d: OHLCV[], p=20):{time:UTCTimestamp;value:number}[] {
  const out:{time:UTCTimestamp;value:number}[]=[]
  for (let i=p-1;i<d.length;i++){
    const sl=d.slice(i-p+1,i+1)
    const tps=sl.map(c=>(c.high+c.low+c.close)/3)
    const mean=tps.reduce((s,v)=>s+v,0)/p
    const mad=tps.reduce((s,v)=>s+Math.abs(v-mean),0)/p
    out.push({time:d[i].time,value:mad===0?0:((tps[tps.length-1]-mean)/(0.015*mad))})
  }
  return out
}

// ── Custom formula evaluator ──────────────────────────────────────────────────
// Safe sandbox: only exposes ema(), sma(), close[], high[], low[], open[], volume[]
function evalCustomFormula(formula: string, d: OHLCV[]): {time:UTCTimestamp;value:number}[] | null {
  try {
    const close  = d.map(c => c.close)
    const high   = d.map(c => c.high)
    const low    = d.map(c => c.low)
    const open   = d.map(c => c.open)
    const volume = d.map(c => c.volume)

    const sma = (src: number[], p: number) => {
      const arr = new Array(src.length).fill(NaN)
      for (let i=p-1;i<src.length;i++) arr[i]=src.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p
      return arr
    }
    const ema = (src: number[], p: number) => {
      const arr = new Array(src.length).fill(NaN)
      const k=2/(p+1); let e=src.slice(0,p).reduce((a,b)=>a+b,0)/p; arr[p-1]=e
      for (let i=p;i<src.length;i++){e=src[i]*k+e*(1-k);arr[i]=e}
      return arr
    }
    const highest = (src: number[], p: number) => src.map((_,i) => i<p-1?NaN:Math.max(...src.slice(i-p+1,i+1)))
    const lowest  = (src: number[], p: number) => src.map((_,i) => i<p-1?NaN:Math.min(...src.slice(i-p+1,i+1)))
    const abs = Math.abs; const sqrt = Math.sqrt; const log = Math.log

    // eslint-disable-next-line no-new-func
    const fn = new Function('close','high','low','open','volume','sma','ema','highest','lowest','abs','sqrt','log',
      `"use strict"; try { return (${formula}) } catch(e) { return null }`)
    const result = fn(close,high,low,open,volume,sma,ema,highest,lowest,abs,sqrt,log)

    if (!Array.isArray(result)) return null
    return result
      .map((v, i) => (typeof v === 'number' && isFinite(v)) ? {time: d[i].time, value: v} : null)
      .filter(Boolean) as {time:UTCTimestamp;value:number}[]
  } catch {
    return null
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type DrawTool = 'cursor'|'hline'|'vline'|'trendline'|'ray'|'rect'|'fib'|'text'|'measure'
type IndicatorType = 'SMA'|'EMA'|'WMA'|'BB'|'VWAP'|'RSI'|'MACD'|'Stoch'|'ATR'|'CCI'|'Volume'|'Custom'
interface IndicatorConfig {
  id: string
  type: IndicatorType
  period: number
  color: string
  enabled: boolean
  label: string
  // custom formula only
  formula?: string
  formulaError?: string
}
interface DrawObject {
  id: string
  tool: DrawTool
  p1: { time: number; price: number }
  p2?: { time: number; price: number }
  color: string
  text?: string
}

const TIMEFRAMES = ['1m','5m','15m','1h','4h','1D']
const COLORS = ['#818cf8','#f59e0b','#34d399','#f472b6','#fb923c','#38bdf8','#a78bfa','#4ade80']

const IND_PANE: Record<IndicatorType,'main'|'sub'> = {
  SMA:'main',EMA:'main',WMA:'main',BB:'main',VWAP:'main',
  RSI:'sub',MACD:'sub',Stoch:'sub',ATR:'sub',CCI:'sub',Volume:'sub',Custom:'main',
}
const IND_DEFAULT_PERIOD: Record<IndicatorType,number> = {
  SMA:20,EMA:20,WMA:20,BB:20,VWAP:0,RSI:14,MACD:12,Stoch:14,ATR:14,CCI:20,Volume:0,Custom:0,
}

// ── Drawing tool icon helper ──────────────────────────────────────────────────
const DRAW_TOOLS: { id: DrawTool; icon: React.ReactNode; title: string }[] = [
  { id:'cursor',    icon:<MousePointer2 className="w-4 h-4"/>,  title:'Select / Move' },
  { id:'hline',     icon:<Minus className="w-4 h-4"/>,           title:'Horizontal Line' },
  { id:'vline',     icon:<AlignCenter className="w-4 h-4 rotate-90"/>, title:'Vertical Line' },
  { id:'trendline', icon:<TrendingUp className="w-4 h-4"/>,     title:'Trend Line' },
  { id:'ray',       icon:<Triangle className="w-4 h-4 rotate-90"/>, title:'Ray' },
  { id:'rect',      icon:<Square className="w-4 h-4"/>,          title:'Rectangle' },
  { id:'fib',       icon:<Ruler className="w-4 h-4"/>,           title:'Fibonacci Retracement' },
  { id:'text',      icon:<Type className="w-4 h-4"/>,            title:'Text Label' },
  { id:'measure',   icon:<ZoomIn className="w-4 h-4"/>,          title:'Measure' },
]

// ── Main component ─────────────────────────────────────────────────────────────
interface TFChartProps {
  symbol: string
}

export default function TFChart({ symbol }: TFChartProps) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  // Chart refs
  const wrapRef    = useRef<HTMLDivElement>(null)   // outer wrapper with canvas overlay
  const mainDiv    = useRef<HTMLDivElement>(null)
  const subADiv    = useRef<HTMLDivElement>(null)
  const subBDiv    = useRef<HTMLDivElement>(null)
  const chartRef   = useRef<IChartApi|null>(null)
  const subARef    = useRef<IChartApi|null>(null)
  const subBRef    = useRef<IChartApi|null>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null) // drawing overlay

  // State
  const [tf, setTF]               = useState('15m')
  const [loading, setLoading]     = useState(true)
  const [data, setData]           = useState<OHLCV[]>([])
  const [activeTool, setActiveTool] = useState<DrawTool>('cursor')
  const [drawings, setDrawings]   = useState<DrawObject[]>([])
  const [showIndPanel, setShowIndPanel] = useState(false)
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([
    { id:'i1', type:'EMA', period:20, color:'#818cf8', enabled:true,  label:'EMA 20' },
    { id:'i2', type:'EMA', period:50, color:'#f59e0b', enabled:true,  label:'EMA 50' },
    { id:'i3', type:'RSI', period:14, color:'#f472b6', enabled:false, label:'RSI 14' },
  ])
  const drawingState = useRef<{drawing:boolean; p1:{x:number;y:number}|null}>({drawing:false,p1:null})

  // ── Load candle data ────────────────────────────────────────────────────────
  const load = useCallback(async (sym: string, timeframe: string) => {
    setLoading(true)
    try {
      const r = await fetchCandles(sym, timeframe, () => [])
      setData(r.data)
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(symbol, tf) }, [symbol, tf])

  // ── Build charts when data/theme/indicators change ──────────────────────────
  useEffect(() => {
    if (!mainDiv.current || !data.length) return

    const bg   = isDark ? '#141414' : '#ffffff'
    const text = isDark ? '#9ca3af' : '#6b7280'
    const grid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
    const border = isDark ? '#2a2a2a' : '#e5e7eb'

    const enabledSubs = indicators.filter(i => i.enabled && IND_PANE[i.type]==='sub')
    const hasSubA = enabledSubs.length > 0
    const hasSubB = enabledSubs.length > 1
    const SUB_H = 120

    const totalH = wrapRef.current?.getBoundingClientRect().height || 400
    const mainH  = Math.max(100, totalH - (hasSubA ? SUB_H : 0) - (hasSubB ? SUB_H : 0))

    // Destroy old
    chartRef.current?.remove(); chartRef.current = null
    subARef.current?.remove();  subARef.current = null
    subBRef.current?.remove();  subBRef.current = null

    const baseOpts = (h: number, showTime: boolean) => ({
      width: mainDiv.current!.clientWidth,
      height: h,
      layout:    { background:{color:bg}, textColor:text, fontSize:11 },
      grid:      { vertLines:{color:grid}, horzLines:{color:grid} },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false, visible: showTime },
      handleScroll: true,
      handleScale:  true,
    })

    // Main chart
    const chart = createChart(mainDiv.current!, baseOpts(mainH, !hasSubA))
    chartRef.current = chart

    const dp = assetDp(symbol)
    const minMoveMap: Record<number,number> = {5:0.00001,4:0.0001,3:0.001,2:0.01,1:0.1,0:1}
    const minMove = minMoveMap[dp] ?? 0.01
    const priceFormat = { type: 'price' as const, precision: dp, minMove }

    const candles = chart.addCandlestickSeries({
      upColor:'#26a69a', downColor:'#ef5350',
      borderUpColor:'#26a69a', borderDownColor:'#ef5350',
      wickUpColor:'#26a69a', wickDownColor:'#ef5350',
      priceFormat,
    })
    candles.setData(data)

    // Volume by default (on main, as tiny histogram at bottom)
    const volSeries = chart.addHistogramSeries({
      color:'rgba(38,166,154,0.3)',
      priceFormat:{type:'volume'},
      priceScaleId:'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins:{top:0.8,bottom:0}, visible:false })
    volSeries.setData(data.map(d=>({time:d.time,value:d.volume,color:d.close>=d.open?'rgba(38,166,154,0.25)':'rgba(239,83,80,0.25)'})))

    // Overlay indicators on main chart
    indicators.filter(i=>i.enabled && IND_PANE[i.type]==='main').forEach(ind => {
      if (ind.type==='SMA') {
        const s=chart.addLineSeries({color:ind.color,lineWidth:1,crosshairMarkerVisible:false,lastValueVisible:true,priceLineVisible:false})
        s.setData(calcSMA(data,ind.period))
      } else if (ind.type==='EMA') {
        const s=chart.addLineSeries({color:ind.color,lineWidth:1,crosshairMarkerVisible:false,lastValueVisible:true,priceLineVisible:false})
        s.setData(calcEMA(data,ind.period))
      } else if (ind.type==='WMA') {
        const s=chart.addLineSeries({color:ind.color,lineWidth:1,crosshairMarkerVisible:false,lastValueVisible:true,priceLineVisible:false})
        s.setData(calcWMA(data,ind.period))
      } else if (ind.type==='BB') {
        const bb=calcBB(data,ind.period)
        const mid=chart.addLineSeries({color:ind.color,lineWidth:1,lineStyle:LineStyle.Dashed,crosshairMarkerVisible:false,priceLineVisible:false})
        const up=chart.addLineSeries({color:ind.color,lineWidth:1,crosshairMarkerVisible:false,priceLineVisible:false})
        const dn=chart.addLineSeries({color:ind.color,lineWidth:1,crosshairMarkerVisible:false,priceLineVisible:false})
        mid.setData(bb.map(b=>({time:b.time,value:b.middle})))
        up.setData(bb.map(b=>({time:b.time,value:b.upper})))
        dn.setData(bb.map(b=>({time:b.time,value:b.lower})))
      } else if (ind.type==='VWAP') {
        const s=chart.addLineSeries({color:ind.color,lineWidth:1,lineStyle:LineStyle.Dashed,crosshairMarkerVisible:false,priceLineVisible:false})
        s.setData(calcVWAP(data))
      } else if (ind.type==='Custom' && ind.formula) {
        const result=evalCustomFormula(ind.formula,data)
        if (result && result.length) {
          const s=chart.addLineSeries({color:ind.color,lineWidth:1,crosshairMarkerVisible:false,priceLineVisible:false})
          s.setData(result)
        }
      }
    })

    // Sub-pane builder
    const buildSub = (div: HTMLDivElement, ind: IndicatorConfig, isLast: boolean) => {
      const sc = createChart(div, baseOpts(SUB_H, isLast))
      sc.priceScale('right').applyOptions({ scaleMargins:{top:0.1,bottom:0.1} })

      if (ind.type==='RSI') {
        const s=sc.addLineSeries({color:ind.color,lineWidth:1})
        s.setData(calcRSI(data,ind.period))
        ;[70,30].forEach(lvl=>{
          const l=sc.addLineSeries({color:'rgba(156,163,175,0.3)',lineWidth:1,lineStyle:LineStyle.Dashed})
          l.setData(data.map(d=>({time:d.time,value:lvl})))
        })
      } else if (ind.type==='MACD') {
        const {ml,sl,hist}=calcMACD(data)
        sc.addHistogramSeries({}).setData(hist)
        sc.addLineSeries({color:ind.color,lineWidth:1}).setData(ml)
        sc.addLineSeries({color:'#f59e0b',lineWidth:1}).setData(sl)
      } else if (ind.type==='Stoch') {
        const st=calcStoch(data,ind.period)
        sc.addLineSeries({color:ind.color,lineWidth:1}).setData(st.map(x=>({time:x.time,value:x.k})))
        sc.addLineSeries({color:'#f59e0b',lineWidth:1}).setData(st.map(x=>({time:x.time,value:x.dv})))
        ;[80,20].forEach(lvl=>{
          const l=sc.addLineSeries({color:'rgba(156,163,175,0.3)',lineWidth:1,lineStyle:LineStyle.Dashed})
          l.setData(data.map(d=>({time:d.time,value:lvl})))
        })
      } else if (ind.type==='ATR') {
        sc.addLineSeries({color:ind.color,lineWidth:1}).setData(calcATR(data,ind.period))
      } else if (ind.type==='CCI') {
        sc.addLineSeries({color:ind.color,lineWidth:1}).setData(calcCCI(data,ind.period))
        ;[100,-100].forEach(lvl=>{
          const l=sc.addLineSeries({color:'rgba(156,163,175,0.3)',lineWidth:1,lineStyle:LineStyle.Dashed})
          l.setData(data.map(d=>({time:d.time,value:lvl})))
        })
      } else if (ind.type==='Volume') {
        sc.addHistogramSeries({}).setData(
          data.map(d=>({time:d.time,value:d.volume,color:d.close>=d.open?'rgba(38,166,154,0.6)':'rgba(239,83,80,0.6)'}))
        )
      }

      // Sync time range
      chart.timeScale().subscribeVisibleTimeRangeChange(r => { if(r) sc.timeScale().setVisibleRange(r) })
      return sc
    }

    if (hasSubA && subADiv.current)  subARef.current = buildSub(subADiv.current, enabledSubs[0], !hasSubB)
    if (hasSubB && subBDiv.current)  subBRef.current = buildSub(subBDiv.current, enabledSubs[1], true)

    // Update sub-div heights via CSS
    if (subADiv.current) subADiv.current.style.height = hasSubA ? `${SUB_H}px` : '0'
    if (subBDiv.current) subBDiv.current.style.height = hasSubB ? `${SUB_H}px` : '0'
    if (mainDiv.current) mainDiv.current.style.height = `${mainH}px`

    chart.timeScale().fitContent()

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return
      const w = wrapRef.current.clientWidth
      const newTotal = wrapRef.current.getBoundingClientRect().height
      const newMain  = Math.max(100, newTotal - (hasSubA?SUB_H:0) - (hasSubB?SUB_H:0))
      chart.resize(w, newMain)
      subARef.current?.resize(w, SUB_H)
      subBRef.current?.resize(w, SUB_H)
    })
    ro.observe(wrapRef.current!)
    return () => ro.disconnect()
  }, [data, isDark, indicators])

  // ── Add / remove indicators ─────────────────────────────────────────────────
  const addIndicator = (type: IndicatorType) => {
    setIndicators(prev => {
      const color = COLORS[prev.length % COLORS.length]
      const period = IND_DEFAULT_PERIOD[type]
      const label = type==='Custom' ? 'Custom' : period ? `${type} ${period}` : type
      return [...prev, {id:`i${Date.now()}`,type,period,color,enabled:true,label,
        formula: type==='Custom' ? 'ema(close,9)' : undefined}]
    })
  }
  const removeInd   = (id:string) => setIndicators(p=>p.filter(i=>i.id!==id))
  const toggleInd   = (id:string) => setIndicators(p=>p.map(i=>i.id===id?{...i,enabled:!i.enabled}:i))
  const updateInd   = (id:string, patch: Partial<IndicatorConfig>) =>
    setIndicators(p=>p.map(i=>i.id===id?{...i,...patch,label:patch.type?`${patch.type||i.type} ${patch.period??i.period}`.trim():patch.label??i.label}:i))

  const enabledCount = indicators.filter(i=>i.enabled).length

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#141414]">
      {/* ── Left drawing toolbar ── */}
      <div className="flex flex-col items-center gap-0.5 py-2 px-1 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a] shrink-0 w-9">
        {DRAW_TOOLS.map(tool => (
          <button key={tool.id} title={tool.title} onClick={() => setActiveTool(tool.id)}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool===tool.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {tool.icon}
          </button>
        ))}

        <div className="w-5 h-px bg-gray-200 dark:bg-gray-700 my-1"/>

        {/* Clear drawings */}
        <button title="Clear all drawings" onClick={() => setDrawings([])}
          className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
          <Trash2 className="w-3.5 h-3.5"/>
        </button>

        {/* Zoom fit */}
        <button title="Fit content" onClick={() => chartRef.current?.timeScale().fitContent()}
          className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <ZoomIn className="w-3.5 h-3.5"/>
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] shrink-0 flex-wrap">
          {/* Timeframes */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
            {TIMEFRAMES.map(t => (
              <button key={t} onClick={() => setTF(t)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                  tf===t ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}>{t}</button>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>

          {/* Active indicator pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {indicators.filter(i=>i.enabled).map(ind => (
              <span key={ind.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer"
                style={{borderColor:ind.color+'50',color:ind.color,background:ind.color+'15'}}
                onClick={() => setShowIndPanel(true)}>
                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{background:ind.color}}/>
                {ind.label}
              </span>
            ))}
          </div>

          <div className="flex-1"/>

          {loading && <Loader2 className="w-3 h-3 text-brand-500 animate-spin shrink-0"/>}
          <button onClick={() => load(symbol, tf)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Reload data"><RefreshCw className="w-3 h-3"/></button>

          {/* Indicators button */}
          <button onClick={() => setShowIndPanel(p=>!p)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition border ${
              showIndPanel ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            <Settings2 className="w-3 h-3"/>
            Indicators{enabledCount > 0 ? ` (${enabledCount})` : ''}
          </button>
        </div>

        {/* Indicator panel */}
        {showIndPanel && (
          <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1c1c1c] p-3 shrink-0">
            <div className="flex items-start gap-6 flex-wrap">

              {/* Add panel */}
              <div className="shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Add Indicator</p>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] font-semibold text-gray-400 w-12 shrink-0">Overlay</span>
                    {(['SMA','EMA','WMA','BB','VWAP'] as IndicatorType[]).map(t => (
                      <button key={t} onClick={() => addIndicator(t)}
                        className="px-2 py-0.5 text-[10px] rounded border border-blue-400/50 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition font-medium">
                        + {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] font-semibold text-gray-400 w-12 shrink-0">Oscillator</span>
                    {(['RSI','MACD','Stoch','ATR','CCI','Volume'] as IndicatorType[]).map(t => (
                      <button key={t} onClick={() => addIndicator(t)}
                        disabled={indicators.filter(i=>IND_PANE[i.type]==='sub').length >= 2}
                        className="px-2 py-0.5 text-[10px] rounded border border-purple-400/50 text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition font-medium">
                        + {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold text-gray-400 w-12 shrink-0">Custom</span>
                    <button onClick={() => addIndicator('Custom')}
                      className="px-2 py-0.5 text-[10px] rounded border border-emerald-400/50 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition font-medium">
                      + Custom formula
                    </button>
                    <span className="text-[9px] text-gray-400 ml-1">e.g. <code className="font-mono text-gray-500">ema(close,9)-ema(close,21)</code></span>
                  </div>
                </div>
              </div>

              {/* Active indicators */}
              {indicators.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                    Active Indicators ({indicators.length})
                  </p>
                  <div className="space-y-1.5">
                    {indicators.map(ind => (
                      <div key={ind.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] transition ${
                          ind.enabled
                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            : 'bg-gray-100 dark:bg-gray-900 border-transparent opacity-50'
                        }`}>
                        {/* Color dot = toggle */}
                        <button onClick={() => toggleInd(ind.id)} title={ind.enabled ? 'Hide' : 'Show'}
                          className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-transparent hover:ring-current transition"
                          style={{background:ind.color}}/>

                        <span className="font-semibold text-gray-700 dark:text-gray-200 w-12 shrink-0">{ind.type}</span>

                        {/* Period (if applicable) */}
                        {IND_DEFAULT_PERIOD[ind.type] > 0 && (
                          <input type="number" min={2} max={500} value={ind.period}
                            onChange={e => updateInd(ind.id, {period: parseInt(e.target.value)||ind.period, label: `${ind.type} ${parseInt(e.target.value)||ind.period}`})}
                            className="w-12 text-center text-[10px] border border-gray-200 dark:border-gray-600 rounded bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400"/>
                        )}

                        {/* Pane badge */}
                        <span className={`text-[9px] px-1 rounded font-medium ${IND_PANE[ind.type]==='main' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                          {IND_PANE[ind.type]==='main' ? 'OVL' : 'SUB'}
                        </span>

                        {/* Custom formula input */}
                        {ind.type==='Custom' && (
                          <input
                            value={ind.formula ?? ''}
                            onChange={e => updateInd(ind.id, {formula: e.target.value, label: 'Custom'})}
                            placeholder="ema(close,9)-ema(close,21)"
                            className="flex-1 min-w-0 text-[10px] font-mono border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"/>
                        )}

                        {/* Color picker */}
                        <input type="color" value={ind.color}
                          onChange={e => updateInd(ind.id, {color:e.target.value})}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
                          title="Change color"/>

                        {/* Remove */}
                        <button onClick={() => removeInd(ind.id)}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition shrink-0">
                          <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart area */}
        <div ref={wrapRef} className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#141414]/80 z-20">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin"/>
                <span className="text-xs text-gray-400">Loading {symbol} {tf}...</span>
              </div>
            </div>
          )}
          {/* Active tool label */}
          {activeTool !== 'cursor' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-brand-500/90 text-white text-[10px] font-semibold pointer-events-none">
              {DRAW_TOOLS.find(t=>t.id===activeTool)?.title} — click chart to place
            </div>
          )}
          <div ref={mainDiv} className="w-full shrink-0"/>
          <div ref={subADiv} className="w-full shrink-0 overflow-hidden" style={{height:0}}/>
          <div ref={subBDiv} className="w-full shrink-0 overflow-hidden" style={{height:0}}/>
        </div>
      </div>
    </div>
  )
}
