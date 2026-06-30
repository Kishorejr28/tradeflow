import { useEffect, useRef, useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, BarChart2, X, RotateCcw, Star,
  ChevronUp, ChevronDown, Bell, Calculator, History, Trash2, Swords,
  Settings2, Plus, Loader2,
} from 'lucide-react'
import {
  createChart, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { useDemoStore, calcPnl } from '@/store/demoStore'
import { useLivePrices, getPipSize, BASE_PRICES } from '@/hooks/useLivePrices'
import { fetchCandles } from '@/lib/marketData'
import type { OHLCV } from '@/pages/Replay'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useNavigate } from 'react-router-dom'
import PracticeMode from '@/components/trading/PracticeMode'

// ── Constants ─────────────────────────────────────────────────────────────────
const SYMBOLS = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','XAUUSD','GBPJPY','EURJPY','EURGBP','GBPCHF']



const dec = (s: string) => s.includes('JPY') || s === 'XAUUSD' ? 2 : 4
const SPREADS: Record<string,number> = { EURUSD:0.8,GBPUSD:1.2,USDJPY:0.9,AUDUSD:1.1,XAUUSD:3.5,USDCAD:1.4,USDCHF:1.6,NZDUSD:1.8,GBPJPY:2.1,EURJPY:1.4,EURGBP:1.3,GBPCHF:2.4 }

type Layout = '1x1' | '2x1' | '1x2' | '2x2'
const LAYOUTS: { id: Layout; icon: string; label: string; slots: number }[] = [
  { id:'1x1', icon:'⬜', label:'Single', slots:1 },
  { id:'2x1', icon:'⬛⬛', label:'Side by side', slots:2 },
  { id:'1x2', icon:'🟫', label:'Stacked', slots:2 },
  { id:'2x2', icon:'⊞', label:'4 charts', slots:4 },
]

interface Alert { id:string; symbol:string; price:number; condition:'above'|'below'; triggered:boolean; note:string }

// ── Indicator math (same algorithms as Replay) ───────────────────────────────
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
  const out:{time:UTCTimestamp;upper:number;middle:number;lower:number}[] = []
  for (let i=p-1;i<d.length;i++){
    const sl=d.slice(i-p+1,i+1), mean=sl.reduce((s,c)=>s+c.close,0)/p
    const std=Math.sqrt(sl.reduce((s,c)=>s+Math.pow(c.close-mean,2),0)/p)
    out.push({time:d[i].time,upper:mean+m*std,middle:mean,lower:mean-m*std})
  }
  return out
}
function calcRSI(d: OHLCV[], p=14): {time:UTCTimestamp;value:number}[] {
  if (d.length<=p) return []
  const out:{time:UTCTimestamp;value:number}[] = []
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
function calcVWAP(d: OHLCV[]): {time:UTCTimestamp;value:number}[] {
  const out:{time:UTCTimestamp;value:number}[] = []
  let cumPV=0,cumV=0
  for (const c of d){
    const tp=(c.high+c.low+c.close)/3
    cumPV+=tp*c.volume;cumV+=c.volume
    out.push({time:c.time,value:cumV?cumPV/cumV:tp})
  }
  return out
}
function calcStoch(d: OHLCV[], kp=14, dp=3): {time:UTCTimestamp;k:number;d:number}[] {
  const out:{time:UTCTimestamp;k:number;d:number}[] = []
  for (let i=kp-1;i<d.length;i++){
    const sl=d.slice(i-kp+1,i+1)
    const lo=Math.min(...sl.map(c=>c.low)),hi=Math.max(...sl.map(c=>c.high))
    const k=hi===lo?50:((d[i].close-lo)/(hi-lo))*100
    out.push({time:d[i].time,k,d:0})
  }
  for (let i=dp-1;i<out.length;i++)
    out[i].d=out.slice(i-dp+1,i+1).reduce((s,c)=>s+c.k,0)/dp
  return out.filter((_,i)=>i>=dp-1)
}
function calcATR(d: OHLCV[], p=14): {time:UTCTimestamp;value:number}[] {
  const out:{time:UTCTimestamp;value:number}[] = []
  if (d.length<2) return out
  const trs:number[]=[]
  for (let i=1;i<d.length;i++)
    trs.push(Math.max(d[i].high-d[i].low,Math.abs(d[i].high-d[i-1].close),Math.abs(d[i].low-d[i-1].close)))
  let atr=trs.slice(0,p).reduce((s,v)=>s+v,0)/p
  out.push({time:d[p].time,value:atr})
  for (let i=p;i<trs.length;i++){atr=(atr*(p-1)+trs[i])/p;out.push({time:d[i+1].time,value:atr})}
  return out
}

// ── Indicator config types ────────────────────────────────────────────────────
type IndicatorType = 'SMA'|'EMA'|'BB'|'VWAP'|'RSI'|'MACD'|'Stoch'|'ATR'|'Volume'
interface IndicatorConfig {
  id: string
  type: IndicatorType
  period: number
  color: string
  enabled: boolean
}

const INDICATOR_DEFAULTS: Record<IndicatorType, {period:number;color:string;pane:'main'|'sub'}> = {
  SMA:    {period:20,  color:'#f59e0b', pane:'main'},
  EMA:    {period:50,  color:'#818cf8', pane:'main'},
  BB:     {period:20,  color:'#06b6d4', pane:'main'},
  VWAP:   {period:0,   color:'#a78bfa', pane:'main'},
  RSI:    {period:14,  color:'#f472b6', pane:'sub'},
  MACD:   {period:12,  color:'#34d399', pane:'sub'},
  Stoch:  {period:14,  color:'#fb923c', pane:'sub'},
  ATR:    {period:14,  color:'#94a3b8', pane:'sub'},
  Volume: {period:0,   color:'#4ade80', pane:'sub'},
}

const TIMEFRAMES = ['1m','5m','15m','1h','4h','1D']

// ── Main chart component ──────────────────────────────────────────────────────
function TFChart({ symbol }: { symbol: string }) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi|null>(null)
  const rsiChartRef  = useRef<IChartApi|null>(null)
  const subChartRef  = useRef<IChartApi|null>(null)

  // series refs for overlay indicators
  const candleRef  = useRef<ISeriesApi<'Candlestick'>|null>(null)
  const volRef     = useRef<ISeriesApi<'Histogram'>|null>(null)
  const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map())

  const [tf, setTF]             = useState('15m')
  const [loading, setLoading]   = useState(true)
  const [dataRef, setDataRef]   = useState<OHLCV[]>([])
  const [showIndPanel, setShowIndPanel] = useState(false)
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([
    {id:'i1',type:'EMA',period:20, color:'#818cf8',enabled:true},
    {id:'i2',type:'EMA',period:50, color:'#f59e0b',enabled:true},
    {id:'i3',type:'RSI',period:14, color:'#f472b6',enabled:false},
  ])

  const MAX_INDICATORS = 5

  // ── Load candles ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async (sym: string, timeframe: string) => {
    setLoading(true)
    try {
      const result = await fetchCandles(sym, timeframe, () => [])
      setDataRef(result.data)
    } catch {
      setDataRef([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData(symbol, tf) }, [symbol, tf])

  // ── Build / rebuild charts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !dataRef.length) return

    const bg   = isDark ? '#141414' : '#ffffff'
    const text = isDark ? '#9ca3af' : '#6b7280'
    const grid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'

    const totalH = containerRef.current.getBoundingClientRect().height || containerRef.current.offsetHeight || 400

    const baseOpts = {
      layout:     { background: { color: bg }, textColor: text, fontSize: 11 },
      grid:       { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair:  { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? '#2d2d2d' : '#e5e7eb' },
      timeScale:  { borderColor: isDark ? '#2d2d2d' : '#e5e7eb', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale:  true,
    }

    // Determine how many sub-panes we need
    const enabledSubs = indicators.filter(i => i.enabled && INDICATOR_DEFAULTS[i.type].pane === 'sub')
    const hasSubA = enabledSubs.length > 0
    const hasSubB = enabledSubs.length > 1

    const subH  = 110
    const mainH = Math.max(120, totalH - (hasSubA ? subH : 0) - (hasSubB ? subH : 0))

    // Destroy old charts
    chartRef.current?.remove()
    rsiChartRef.current?.remove()
    subChartRef.current?.remove()
    chartRef.current = null
    rsiChartRef.current = null
    subChartRef.current = null
    seriesRefs.current.clear()

    // Split container into divs
    containerRef.current.innerHTML = ''

    const mainDiv = document.createElement('div')
    mainDiv.style.height = `${mainH}px`
    mainDiv.style.width = '100%'
    containerRef.current.appendChild(mainDiv)

    let subADiv: HTMLDivElement|null = null
    if (hasSubA) {
      subADiv = document.createElement('div')
      subADiv.style.height = `${subH}px`
      subADiv.style.width = '100%'
      containerRef.current.appendChild(subADiv)
    }

    let subBDiv: HTMLDivElement|null = null
    if (hasSubB) {
      subBDiv = document.createElement('div')
      subBDiv.style.height = `${subH}px`
      subBDiv.style.width = '100%'
      containerRef.current.appendChild(subBDiv)
    }

    // Create main chart
    const chart = createChart(mainDiv, { ...baseOpts, width: mainDiv.clientWidth, height: mainH, timeScale: { ...baseOpts.timeScale, visible: !hasSubA } })
    chartRef.current = chart

    // Candles
    const cSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    })
    cSeries.setData(dataRef)
    candleRef.current = cSeries

    // Overlay indicators (main pane)
    indicators.filter(i => i.enabled && INDICATOR_DEFAULTS[i.type].pane === 'main').forEach(ind => {
      if (ind.type === 'SMA') {
        const s = chart.addLineSeries({ color: ind.color, lineWidth: 1, crosshairMarkerVisible: false })
        s.setData(calcSMA(dataRef, ind.period))
        seriesRefs.current.set(ind.id, s)
      } else if (ind.type === 'EMA') {
        const s = chart.addLineSeries({ color: ind.color, lineWidth: 1, crosshairMarkerVisible: false })
        s.setData(calcEMA(dataRef, ind.period))
        seriesRefs.current.set(ind.id, s)
      } else if (ind.type === 'BB') {
        const bb = calcBB(dataRef, ind.period)
        ;(['upper','middle','lower'] as const).forEach((band, bi) => {
          const s = chart.addLineSeries({
            color: ind.color,
            lineWidth: bi === 1 ? 1 : 1,
            lineStyle: bi === 1 ? LineStyle.Dashed : LineStyle.Solid,
            crosshairMarkerVisible: false,
          })
          s.setData(bb.map(b => ({time:b.time, value:b[band]})))
          seriesRefs.current.set(`${ind.id}-${band}`, s)
        })
      } else if (ind.type === 'VWAP') {
        const s = chart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false })
        s.setData(calcVWAP(dataRef))
        seriesRefs.current.set(ind.id, s)
      }
    })

    // Sub-pane charts
    const subInds = indicators.filter(i => i.enabled && INDICATOR_DEFAULTS[i.type].pane === 'sub')

    const buildSubChart = (div: HTMLDivElement, ind: IndicatorConfig, isLast: boolean) => {
      const sc = createChart(div, {
        ...baseOpts,
        width: div.clientWidth,
        height: subH,
        timeScale: { ...baseOpts.timeScale, visible: isLast },
        rightPriceScale: { borderColor: isDark ? '#2d2d2d' : '#e5e7eb', scaleMargins: { top: 0.1, bottom: 0.1 } },
      })

      if (ind.type === 'RSI') {
        const s = sc.addLineSeries({ color: ind.color, lineWidth: 1 })
        s.setData(calcRSI(dataRef, ind.period))
        // OB/OS lines
        ;[70, 30].forEach(level => {
          const line = sc.addLineSeries({ color: 'rgba(156,163,175,0.3)', lineWidth: 1, lineStyle: LineStyle.Dashed })
          line.setData(dataRef.map(d => ({ time: d.time, value: level })))
        })
      } else if (ind.type === 'MACD') {
        const {ml, sl, hist} = calcMACD(dataRef)
        const hSeries = sc.addHistogramSeries({ color: ind.color })
        hSeries.setData(hist)
        const mLine  = sc.addLineSeries({ color: ind.color, lineWidth: 1 })
        mLine.setData(ml)
        const sLine  = sc.addLineSeries({ color: '#f59e0b', lineWidth: 1 })
        sLine.setData(sl)
      } else if (ind.type === 'Stoch') {
        const st = calcStoch(dataRef, ind.period)
        const kLine = sc.addLineSeries({ color: ind.color, lineWidth: 1 })
        kLine.setData(st.map(x => ({time:x.time, value:x.k})))
        const dLine = sc.addLineSeries({ color: '#f59e0b', lineWidth: 1 })
        dLine.setData(st.map(x => ({time:x.time, value:x.d})))
      } else if (ind.type === 'ATR') {
        const s = sc.addLineSeries({ color: ind.color, lineWidth: 1 })
        s.setData(calcATR(dataRef, ind.period))
      } else if (ind.type === 'Volume') {
        const s = sc.addHistogramSeries({ color: ind.color })
        s.setData(dataRef.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
        })))
      }

      // Sync time scale with main chart
      chart.timeScale().subscribeVisibleTimeRangeChange(range => {
        if (range) sc.timeScale().setVisibleRange(range)
      })

      return sc
    }

    if (subADiv && subInds[0]) {
      rsiChartRef.current = buildSubChart(subADiv, subInds[0], !hasSubB)
    }
    if (subBDiv && subInds[1]) {
      subChartRef.current = buildSubChart(subBDiv, subInds[1], true)
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(entries => {
      if (!containerRef.current || !chartRef.current) return
      const w = entries[0]?.contentRect.width ?? mainDiv.clientWidth
      const newTotal = containerRef.current.getBoundingClientRect().height || containerRef.current.offsetHeight
      const newMain = Math.max(120, newTotal - (hasSubA ? subH : 0) - (hasSubB ? subH : 0))
      chart.resize(w, newMain)
      rsiChartRef.current?.resize(w, subH)
      subChartRef.current?.resize(w, subH)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [dataRef, isDark, indicators])

  // ── Indicator panel ───────────────────────────────────────────────────────────
  const addIndicator = (type: IndicatorType) => {
    if (indicators.length >= MAX_INDICATORS) return
    const def = INDICATOR_DEFAULTS[type]
    const colors = ['#818cf8','#f59e0b','#34d399','#f472b6','#fb923c']
    setIndicators(prev => [...prev, {
      id: `i${Date.now()}`,
      type,
      period: def.period,
      color: colors[prev.length % colors.length],
      enabled: true,
    }])
  }

  const removeIndicator = (id: string) => setIndicators(prev => prev.filter(i => i.id !== id))
  const toggleIndicator = (id: string) => setIndicators(prev => prev.map(i => i.id === id ? {...i, enabled: !i.enabled} : i))
  const updatePeriod    = (id: string, period: number) => setIndicators(prev => prev.map(i => i.id === id ? {...i, period} : i))

  const overlayInds = indicators.filter(i => INDICATOR_DEFAULTS[i.type].pane === 'main')
  const subInds     = indicators.filter(i => INDICATOR_DEFAULTS[i.type].pane === 'sub')

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141414]">
      {/* Chart toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap">
        {/* Timeframe selector */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTF(t)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${tf===t ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Active indicator pills */}
        {indicators.filter(i => i.enabled).map(ind => (
          <span key={ind.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
            style={{ borderColor: ind.color+'60', color: ind.color, background: ind.color+'18' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{background: ind.color}}/>
            {ind.type}{ind.period ? ` ${ind.period}` : ''}
          </span>
        ))}

        <button onClick={() => setShowIndPanel(p => !p)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition ml-auto border ${showIndPanel ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Settings2 className="w-3 h-3" />
          Indicators {indicators.filter(i=>i.enabled).length}/{MAX_INDICATORS}
        </button>

        {loading && <Loader2 className="w-3 h-3 text-brand-500 animate-spin shrink-0" />}
      </div>

      {/* Indicator config panel */}
      {showIndPanel && (
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a] px-3 py-2 shrink-0">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Add new indicator */}
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Add indicator ({MAX_INDICATORS - indicators.length} left)
              </p>
              <div className="flex flex-wrap gap-1">
                {/* Overlay */}
                <span className="text-[9px] text-gray-400 self-center">Overlay:</span>
                {(['SMA','EMA','BB','VWAP'] as IndicatorType[]).map(t => (
                  <button key={t} onClick={() => addIndicator(t)}
                    disabled={indicators.length >= MAX_INDICATORS}
                    className="px-2 py-0.5 text-[10px] rounded border border-brand-400 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    + {t}
                  </button>
                ))}
                <span className="text-[9px] text-gray-400 self-center ml-2">Sub-pane:</span>
                {(['RSI','MACD','Stoch','ATR','Volume'] as IndicatorType[]).map(t => (
                  <button key={t} onClick={() => addIndicator(t)}
                    disabled={indicators.length >= MAX_INDICATORS || subInds.length >= 2}
                    className="px-2 py-0.5 text-[10px] rounded border border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Current indicators */}
            {indicators.length > 0 && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Active</p>
                <div className="flex flex-wrap gap-2">
                  {indicators.map(ind => (
                    <div key={ind.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] transition ${ind.enabled ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50'}`}>
                      <span className="w-2 h-2 rounded-full shrink-0 cursor-pointer" style={{background: ind.color}}
                        onClick={() => toggleIndicator(ind.id)} title="Toggle" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{ind.type}</span>
                      {ind.period > 0 && (
                        <input type="number" value={ind.period} min={2} max={200}
                          onChange={e => updatePeriod(ind.id, parseInt(e.target.value)||ind.period)}
                          className="w-10 text-center text-[10px] border border-gray-200 dark:border-gray-600 rounded bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                      )}
                      <span className="text-[9px] text-gray-400 uppercase">
                        {INDICATOR_DEFAULTS[ind.type].pane === 'main' ? 'OVL' : 'SUB'}
                      </span>
                      <button onClick={() => removeIndicator(ind.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart container — lightweight-charts mounts here */}
      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#141414]/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              <span className="text-xs text-gray-400">Loading {symbol} {tf}...</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}

function ChartSlot({ symbol, onSymbolChange, prices }: {
  symbol: string
  onSymbolChange: (s: string) => void
  prices: Record<string, number>
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(symbol)
  const p = prices[symbol] ?? 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Slot header */}
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 shrink-0">
        {editing ? (
          <form onSubmit={e => { e.preventDefault(); onSymbolChange(input.toUpperCase()); setEditing(false) }}
            className="flex items-center gap-1 flex-1">
            <input autoFocus value={input} onChange={e => setInput(e.target.value)}
              className="flex-1 text-xs px-2 py-0.5 rounded border border-brand-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
            <button type="submit" className="text-[10px] px-2 py-0.5 bg-brand-500 text-white rounded">OK</button>
            <button type="button" onClick={() => setEditing(false)} className="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">✕</button>
          </form>
        ) : (
          <>
            <button onClick={() => { setInput(symbol); setEditing(true) }} className="text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-brand-500 transition">{symbol}</button>
            <span className={`text-[10px] font-mono tabular-nums ${p > (BASE_PRICES[symbol] ?? p) ? 'text-emerald-500' : 'text-red-500'}`}>
              {p.toFixed(dec(symbol))}
            </span>
            <div className="flex-1" />
            <select value={symbol} onChange={e => onSymbolChange(e.target.value)}
              className="text-[10px] bg-transparent text-gray-400 focus:outline-none cursor-pointer">
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
      </div>
      <div className="flex-1 min-h-0"><TFChart symbol={symbol} /></div>
    </div>
  )
}

// ── Alerts Panel ──────────────────────────────────────────────────────────────
function AlertsPanel({ prices }: { prices: Record<string, number> }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [sym, setSym] = useState('EURUSD')
  const [price, setPrice] = useState('')
  const [cond, setCond] = useState<'above'|'below'>('above')
  const [note, setNote] = useState('')
  const [permDenied, setPermDenied] = useState(false)

  const requestNotifPerm = async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const res = await Notification.requestPermission()
    if (res === 'denied') { setPermDenied(true); return false }
    return res === 'granted'
  }

  const addAlert = async () => {
    const p = parseFloat(price)
    if (!p) return
    const ok = await requestNotifPerm()
    setAlerts(prev => [...prev, { id: `al-${Date.now()}`, symbol: sym, price: p, condition: cond, triggered: false, note }])
    setPrice(''); setNote('')
  }

  // Check alerts against live prices
  useEffect(() => {
    setAlerts(prev => prev.map(al => {
      if (al.triggered) return al
      const cur = prices[al.symbol]
      if (!cur) return al
      const hit = (al.condition === 'above' && cur >= al.price) || (al.condition === 'below' && cur <= al.price)
      if (hit) {
        if (Notification.permission === 'granted') {
          new Notification(`🔔 TradeFlow Alert — ${al.symbol}`, {
            body: `Price ${al.condition === 'above' ? 'reached above' : 'fell below'} ${al.price.toFixed(dec(al.symbol))}${al.note ? `\n${al.note}` : ''}`,
            icon: '/logo.svg',
          })
        }
        return { ...al, triggered: true }
      }
      return al
    }))
  }, [prices])

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Price Alerts</p>
        {permDenied && <p className="text-[10px] text-red-400 mt-0.5">Notifications blocked — enable in browser settings</p>}
      </div>

      {/* Add alert form */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2 shrink-0">
        <div className="flex gap-1.5">
          <select value={sym} onChange={e => setSym(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none">
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={cond} onChange={e => setCond(e.target.value as 'above'|'below')}
            className="text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </div>
        <input value={price} onChange={e => setPrice(e.target.value)} placeholder={`Price (e.g. ${(prices[sym] ?? 1).toFixed(dec(sym))})`}
          className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note"
          className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400" />
        <button onClick={addAlert} className="w-full py-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition">
          + Set Alert
        </button>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {alerts.length === 0 && <p className="text-[11px] text-gray-400 text-center pt-4">No alerts set</p>}
        {alerts.map(al => (
          <div key={al.id} className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] ${al.triggered ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50'}`}>
            <span className={al.triggered ? 'text-emerald-500' : 'text-amber-400'}>{al.triggered ? '✅' : '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 dark:text-gray-300">{al.symbol} {al.condition} {al.price.toFixed(dec(al.symbol))}</p>
              {al.note && <p className="text-gray-400 truncate">{al.note}</p>}
              <p className="text-gray-400">Now: {(prices[al.symbol] ?? 0).toFixed(dec(al.symbol))}</p>
            </div>
            <button onClick={() => setAlerts(p => p.filter(a => a.id !== al.id))} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats / Calculator Panel ──────────────────────────────────────────────────
function StatsPanel({ prices, activeSymbol }: { prices: Record<string, number>; activeSymbol: string }) {
  const [pipSym, setPipSym] = useState(activeSymbol)
  const [lots, setLots] = useState('0.10')
  const [pips, setPips] = useState('10')
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const lotsN = parseFloat(lots) || 0
  const pipsN = parseFloat(pips) || 0
  const pipSz = getPipSize(pipSym)
  const pipVal = pipSym === 'XAUUSD' ? lotsN * 1 : lotsN * 10
  const dollarVal = (pipVal * pipsN).toFixed(2)
  const spread = SPREADS[pipSym] ?? 1.2

  const sessions = [
    { name: 'Sydney', open: 21, close: 6 },
    { name: 'Tokyo', open: 23, close: 8 },
    { name: 'London', open: 7, close: 16 },
    { name: 'New York', open: 12, close: 21 },
  ]
  const utcH = clock.getUTCHours() + clock.getUTCMinutes() / 60
  const isOpen = (open: number, close: number) => open < close ? utcH >= open && utcH < close : utcH >= open || utcH < close

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Session clock */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Market Sessions (UTC)</p>
        <p className="text-xs font-mono text-gray-600 dark:text-gray-300 mb-2">{format(clock, 'HH:mm:ss')} UTC</p>
        <div className="space-y-1">
          {sessions.map(s => (
            <div key={s.name} className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 dark:text-gray-400">{s.name}</span>
              <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${isOpen(s.open, s.close) ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                {isOpen(s.open, s.close) ? '● Open' : '○ Closed'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pip calculator */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Pip Calculator</p>
        <div className="space-y-2">
          <select value={pipSym} onChange={e => setPipSym(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none">
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Lots</label>
              <input value={lots} onChange={e => setLots(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Pips</label>
              <input value={pips} onChange={e => setPips(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Pip value</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">${pipVal.toFixed(2)}/pip</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{pips} pips =</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">${dollarVal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Spread</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{spread} pips</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live quotes for all symbols */}
      <div className="px-3 py-2 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Live Quotes</p>
        <div className="space-y-1">
          {SYMBOLS.map(s => (
            <div key={s} className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-gray-600 dark:text-gray-400">{s}</span>
              <span className="font-mono text-gray-800 dark:text-gray-200 tabular-nums">{(prices[s] ?? 0).toFixed(dec(s))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ symbol, price, onClose }: { symbol: string; price: number; onClose: () => void }) {
  const [direction, setDirection] = useState<'buy'|'sell'>('buy')
  const [lots, setLots] = useState('0.01')
  const [sl, setSl] = useState(''); const [tp, setTp] = useState('')
  const { openPosition, balance } = useDemoStore()
  const lotsN = parseFloat(lots) || 0
  const pipSz = getPipSize(symbol)
  const pipVal = symbol === 'XAUUSD' ? lotsN * 1 : lotsN * 10
  const margin = lotsN * (symbol === 'XAUUSD' ? price * 100 * 0.01 : 100000 * 0.03)
  const d = dec(symbol)
  const slPips = sl ? Math.abs((parseFloat(sl) - price) / pipSz).toFixed(1) : null
  const tpPips = tp ? Math.abs((parseFloat(tp) - price) / pipSz).toFixed(1) : null
  const slRisk = slPips ? (parseFloat(slPips) * pipVal).toFixed(2) : null
  const tpReward = tpPips ? (parseFloat(tpPips) * pipVal).toFixed(2) : null
  const rr = slRisk && tpReward ? (parseFloat(tpReward) / parseFloat(slRisk)).toFixed(2) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">New Order — {symbol}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Market @ {price.toFixed(d)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDirection('buy')} className={`py-3 rounded-xl text-sm font-bold transition ${direction === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>▲ BUY {price.toFixed(d)}</button>
            <button onClick={() => setDirection('sell')} className={`py-3 rounded-xl text-sm font-bold transition ${direction === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>▼ SELL {price.toFixed(d)}</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Volume (lots)</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setLots(l => Math.max(0.01, parseFloat(l) - 0.01).toFixed(2))} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 transition text-lg">−</button>
              <input value={lots} onChange={e => setLots(e.target.value)} className="flex-1 text-center py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              <button onClick={() => setLots(l => (parseFloat(l) + 0.01).toFixed(2))} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 transition text-lg">+</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-red-500 mb-1">Stop Loss</label>
              <input value={sl} onChange={e => setSl(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/30" />
              {slPips && <p className="text-[10px] text-red-400 mt-1">{slPips} pips · ${slRisk}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-600 mb-1">Take Profit</label>
              <input value={tp} onChange={e => setTp(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
              {tpPips && <p className="text-[10px] text-emerald-500 mt-1">{tpPips} pips · ${tpReward}</p>}
            </div>
          </div>
          <div className="text-xs bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between"><span className="text-gray-400">Pip value</span><span className="font-medium text-gray-700 dark:text-gray-300">${pipVal.toFixed(2)}/pip</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Margin</span><span className="font-medium text-gray-700 dark:text-gray-300">${margin.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Balance</span><span className="font-medium text-gray-700 dark:text-gray-300">${balance.toLocaleString()}</span></div>
            {rr && <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-400">Risk:Reward</span><span className={`font-bold ${parseFloat(rr) >= 1.5 ? 'text-emerald-500' : 'text-amber-500'}`}>1:{rr}</span></div>}
          </div>
          <button onClick={() => { if (lotsN <= 0) return; openPosition({ symbol, direction, lots: lotsN, entryPrice: price, sl: sl ? parseFloat(sl) : undefined, tp: tp ? parseFloat(tp) : undefined }); onClose() }}
            className={`w-full py-3 rounded-xl text-white text-sm font-bold transition shadow-lg ${direction === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}>
            Place {direction.toUpperCase()} — {lots} lots
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Starred bar ───────────────────────────────────────────────────────────────
function StarredBar({ starred, prices, direction, active, onSelect, onUnstar }: {
  starred: string[]; prices: Record<string,number>; direction: Record<string,'up'|'down'>
  active: string; onSelect: (s:string)=>void; onUnstar: (s:string)=>void
}) {
  if (!starred.length) return null
  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 overflow-x-auto shrink-0">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1 shrink-0">Starred</span>
      {starred.map(sym => (
        <div key={sym} onClick={() => onSelect(sym)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer group transition shrink-0 border ${active === sym ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/15' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}>
          <span className={`text-xs font-semibold ${active === sym ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>{sym}</span>
          <span className={`text-[10px] font-mono tabular-nums ${direction[sym] === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>{(prices[sym] ?? 0).toFixed(dec(sym))}</span>
          {direction[sym] === 'up' ? <ChevronUp className="w-2.5 h-2.5 text-emerald-500" /> : <ChevronDown className="w-2.5 h-2.5 text-red-500" />}
          <button onClick={e => { e.stopPropagation(); onUnstar(sym) }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition ml-0.5"><X className="w-2.5 h-2.5" /></button>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Trading() {
  const navigate = useNavigate()
  const [layout, setLayout] = useState<Layout>('1x1')
  const [slots, setSlots] = useState(['EURUSD','GBPUSD','USDJPY','XAUUSD'])
  const [activeSlot, setActiveSlot] = useState(0)
  const [showOrder, setShowOrder] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [activeTab, setActiveTab] = useState<'positions'|'history'>('positions')
  const [rightPanel, setRightPanel] = useState<'watchlist'|'alerts'|'stats'>('watchlist')
  const [starred, setStarred] = useState(['EURUSD','XAUUSD'])
  const [practiceMode, setPracticeMode] = useState(false)
  const { prices, direction } = useLivePrices(SYMBOLS)
  const { balance, positions, history, closePosition, resetAccount } = useDemoStore()

  const toggleStar = (s: string) => setStarred(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const activeSymbol = slots[activeSlot] ?? 'EURUSD'
  const openPnl = positions.reduce((sum, pos) => sum + calcPnl(pos, prices[pos.symbol] ?? pos.entryPrice), 0)
  const equity = balance + openPnl

  const gridClass: Record<Layout, string> = {
    '1x1': 'grid-cols-1 grid-rows-1',
    '2x1': 'grid-cols-2 grid-rows-1',
    '1x2': 'grid-cols-1 grid-rows-2',
    '2x2': 'grid-cols-2 grid-rows-2',
  }
  const activeCount = LAYOUTS.find(l => l.id === layout)!.slots

  // Trigger SL/TP auto-close
  useEffect(() => {
    positions.forEach(pos => {
      const p = prices[pos.symbol]; if (!p) return
      if (pos.tp && ((pos.direction==='buy'&&p>=pos.tp)||(pos.direction==='sell'&&p<=pos.tp))) closePosition(pos.id, p)
      if (pos.sl && ((pos.direction==='buy'&&p<=pos.sl)||(pos.direction==='sell'&&p>=pos.sl))) closePosition(pos.id, p)
    })
  }, [prices])

  return (
    <div className="flex h-full overflow-hidden">
      {showOrder && <OrderModal symbol={activeSymbol} price={prices[activeSymbol] ?? 1} onClose={() => setShowOrder(false)} />}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Reset Demo Account?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">All positions closed, balance reset to $100,000.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={() => { resetAccount(); setShowReset(false) }} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] shrink-0">
          <BarChart2 className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{activeSymbol}</span>
          <span className={`text-xs font-mono font-bold tabular-nums ${direction[activeSymbol]==='up'?'text-emerald-500':'text-red-500'}`}>
            {(prices[activeSymbol]??0).toFixed(dec(activeSymbol))}
          </span>
          <span className="flex items-center px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">DEMO</span>

          {/* Layout switcher — hidden in practice mode */}
          {!practiceMode && (
            <div className="flex items-center gap-0.5 ml-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {LAYOUTS.map(l => (
                <button key={l.id} onClick={() => setLayout(l.id)} title={l.label}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${layout===l.id ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  {l.id}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Balance: <strong className="text-gray-700 dark:text-gray-300">${balance.toLocaleString()}</strong></span>
            <span>P&L: <strong className={openPnl>=0?'text-emerald-600':'text-red-500'}>{openPnl>=0?'+':''}${openPnl.toFixed(2)}</strong></span>
            <span>Equity: <strong className="text-gray-700 dark:text-gray-300">${equity.toFixed(0)}</strong></span>
          </div>
          {!practiceMode && (
            <button onClick={() => setShowOrder(true)} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition shadow-sm">New Order</button>
          )}
          {/* Practice Mode toggle */}
          <button
            onClick={() => setPracticeMode(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              practiceMode
                ? 'bg-brand-500 text-white border-brand-500 shadow shadow-brand-500/30'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
            <Swords className="w-3.5 h-3.5" />
            {practiceMode ? 'Live Mode' : 'Practice'}
          </button>
          {!practiceMode && (
            <button onClick={() => setShowReset(true)} title="Reset demo" className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"><RotateCcw className="w-3.5 h-3.5" /></button>
          )}
        </div>

        {/* Practice mode fills the rest; live mode shows chart grid */}
        {practiceMode ? (
          <PracticeMode initialSymbol={activeSymbol} onClose={() => setPracticeMode(false)} />
        ) : (
          <>

        {/* Starred bar */}
        <StarredBar starred={starred} prices={prices} direction={direction} active={activeSymbol} onSelect={s => { setSlots(prev => { const n=[...prev]; n[activeSlot]=s; return n }); }} onUnstar={toggleStar} />

        {/* Multi-chart grid */}
        <div className={`flex-1 min-h-0 grid gap-0.5 p-0.5 bg-gray-200 dark:bg-gray-900 ${gridClass[layout]}`}>
          {Array.from({ length: activeCount }).map((_, i) => (
            <div key={i} onClick={() => setActiveSlot(i)}
              className={`relative min-h-0 rounded overflow-hidden ${activeSlot===i && activeCount>1 ? 'ring-2 ring-brand-500' : ''}`}>
              <ChartSlot symbol={slots[i] ?? SYMBOLS[i]} onSymbolChange={s => setSlots(prev => { const n=[...prev]; n[i]=s; return n })} prices={prices} />
            </div>
          ))}
        </div>

        {/* Positions/History strip */}
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#141414] shrink-0" style={{ height: 150 }}>
          <div className="flex items-center gap-4 px-4 py-1.5 border-b border-gray-100 dark:border-gray-800">
            {(['positions','history'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`text-xs font-medium pb-1 border-b-2 transition capitalize ${activeTab===t?'border-brand-500 text-brand-600 dark:text-brand-400':'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                {t}{t==='positions'&&positions.length>0?` (${positions.length})`:''}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto h-[calc(100%-28px)]">
            {activeTab==='positions' ? (
              positions.length===0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No open positions — click New Order to trade</div>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                    {['Symbol','Dir','Lots','Entry','Current','P&L','Pips','SL','TP','Action'].map(h=><th key={h} className="text-left px-3 py-1.5 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {positions.map(pos => {
                      const cur = prices[pos.symbol]??pos.entryPrice
                      const pnl = calcPnl(pos, cur)
                      const pips = pos.direction==='buy' ? (cur-pos.entryPrice)/getPipSize(pos.symbol) : (pos.entryPrice-cur)/getPipSize(pos.symbol)
                      const d = dec(pos.symbol)
                      return (
                        <tr key={pos.id} className="border-t border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/3">
                          <td className="px-3 py-1.5 font-semibold text-gray-800 dark:text-gray-200">{pos.symbol}</td>
                          <td className={`px-3 py-1.5 font-bold uppercase ${pos.direction==='buy'?'text-emerald-600':'text-red-500'}`}>{pos.direction}</td>
                          <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{pos.lots}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{pos.entryPrice.toFixed(d)}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-800 dark:text-gray-200">{cur.toFixed(d)}</td>
                          <td className={`px-3 py-1.5 font-semibold ${pnl>=0?'text-emerald-600':'text-red-500'}`}>{pnl>=0?'+':''}${pnl.toFixed(2)}</td>
                          <td className={`px-3 py-1.5 ${pips>=0?'text-emerald-600':'text-red-500'}`}>{pips.toFixed(1)}</td>
                          <td className="px-3 py-1.5 text-red-400 text-[11px]">{pos.sl?.toFixed(d)||'—'}</td>
                          <td className="px-3 py-1.5 text-emerald-500 text-[11px]">{pos.tp?.toFixed(d)||'—'}</td>
                          <td className="px-3 py-1.5">
                            <button onClick={() => closePosition(pos.id, cur)} className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 font-medium transition text-[11px]">Close</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            ) : (
              history.length===0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No closed trades</div>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                    {['Symbol','Dir','Lots','Entry','Exit','P&L','Pips','Closed'].map(h=><th key={h} className="text-left px-3 py-1.5 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {history.map(t => (
                      <tr key={t.id} className="border-t border-gray-50 dark:border-gray-800/60">
                        <td className="px-3 py-1.5 font-semibold text-gray-800 dark:text-gray-200">{t.symbol}</td>
                        <td className={`px-3 py-1.5 font-bold uppercase ${t.direction==='buy'?'text-emerald-600':'text-red-500'}`}>{t.direction}</td>
                        <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{t.lots}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{t.entryPrice.toFixed(dec(t.symbol))}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{t.exitPrice.toFixed(dec(t.symbol))}</td>
                        <td className={`px-3 py-1.5 font-semibold ${t.pnl>=0?'text-emerald-600':'text-red-500'}`}>{t.pnl>=0?'+':''}${t.pnl.toFixed(2)}</td>
                        <td className={`px-3 py-1.5 ${t.pips>=0?'text-emerald-600':'text-red-500'}`}>{t.pips.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-gray-400">{format(new Date(t.closeTime), 'MMM d HH:mm')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
        </> // end live mode
        )}
      </div>
      {!practiceMode && (
      <div className="w-52 border-l border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#141414] shrink-0">
        {/* Sidebar tab switcher */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
          {([
            { id: 'watchlist', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Watch' },
            { id: 'alerts', icon: <Bell className="w-3.5 h-3.5" />, label: 'Alerts' },
            { id: 'stats', icon: <Calculator className="w-3.5 h-3.5" />, label: 'Tools' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setRightPanel(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${rightPanel===tab.id ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Watchlist */}
          {rightPanel === 'watchlist' && (
            <div className="flex flex-col h-full">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">★ to pin above chart</p>
              <div className="flex-1 overflow-y-auto">
                {SYMBOLS.map(sym => (
                  <div key={sym} className={`flex items-center justify-between px-3 py-2 border-l-2 group transition ${activeSymbol===sym ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                    <button className="flex-1 text-left" onClick={() => setSlots(p => { const n=[...p]; n[activeSlot]=sym; return n })}>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{sym}</p>
                      <p className={`text-[11px] font-mono tabular-nums mt-0.5 ${direction[sym]==='up'?'text-emerald-600':'text-red-500'}`}>{(prices[sym]??0).toFixed(dec(sym))}</p>
                    </button>
                    <div className="flex items-center gap-1">
                      {direction[sym]==='up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                      <button onClick={() => toggleStar(sym)} className={`p-0.5 rounded transition ${starred.includes(sym) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}>
                        <Star className="w-3 h-3" fill={starred.includes(sym) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Balance</span><span className="font-medium text-gray-700 dark:text-gray-300">${balance.toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Open P&L</span><span className={`font-medium ${openPnl>=0?'text-emerald-600':'text-red-500'}`}>{openPnl>=0?'+':''}${openPnl.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Positions</span><span className="text-gray-700 dark:text-gray-300">{positions.length}</span></div>
              </div>
            </div>
          )}

          {rightPanel === 'alerts' && <AlertsPanel prices={prices} />}
          {rightPanel === 'stats' && <StatsPanel prices={prices} activeSymbol={activeSymbol} />}
        </div>
      </div>
      )} {/* end !practiceMode sidebar */}
    </div>
  )
}
