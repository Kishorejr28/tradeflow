import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  ChevronLeft, ChevronRight, RefreshCw, ExternalLink,
  Info, Clock, TrendingUp, Globe,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday, addMonths, subMonths, addDays, subDays,
} from 'date-fns'

const CURRENCIES = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD','CNY']
const FLAG: Record<string,string> = {
  USD:'🇺🇸',EUR:'🇪🇺',GBP:'🇬🇧',JPY:'🇯🇵',
  AUD:'🇦🇺',CAD:'🇨🇦',CHF:'🇨🇭',NZD:'🇳🇿',CNY:'🇨🇳',
}
const COUNTRY_MAP: Record<string,string> = {
  usd:'USD',eur:'EUR',gbp:'GBP',jpy:'JPY',
  aud:'AUD',cad:'CAD',chf:'CHF',nzd:'NZD',cny:'CNY',
}
type Impact = 'high'|'medium'|'low'
const IMPACT_COLOR: Record<Impact,string> = {
  high:'bg-red-500',medium:'bg-amber-400',low:'bg-gray-300 dark:bg-gray-600',
}

// ── Forex Factory calendar ────────────────────────────────────────────────────
interface CalEvent {
  id:string; time:string; currency:string; impact:Impact
  event:string; actual?:string; forecast?:string; previous?:string
  _date:string
}

let ffCache: {events:CalEvent[];ts:number}|null = null

async function fetchFF(): Promise<CalEvent[]> {
  if (ffCache && Date.now()-ffCache.ts < 15*60*1000) return ffCache.events
  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json',{cache:'no-store'})
    if (!res.ok) throw new Error()
    const raw = await res.json() as Array<{title:string;country:string;date:string;time:string;impact:string;forecast:string;previous:string;actual:string}>
    const events: CalEvent[] = raw.map((e,i)=>{
      const m = e.date?.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
      const cur = COUNTRY_MAP[e.country?.toLowerCase()]||e.country?.toUpperCase().slice(0,3)||'?'
      return {
        id:String(i),
        time:m?m[2]:'All Day',
        currency:cur,
        impact:(e.impact==='High'?'high':e.impact==='Medium'?'medium':'low') as Impact,
        event:e.title,
        actual:e.actual||undefined,
        forecast:e.forecast||undefined,
        previous:e.previous||undefined,
        _date:m?m[1]:'',
      }
    })
    ffCache={events,ts:Date.now()}
    return events
  } catch { return [] }
}

// ── News articles via rss2json ────────────────────────────────────────────────
interface Article {
  title:string; url:string; source:string
  pubDate:string; description:string; thumbnail?:string
}

// Multiple free RSS feeds with CORS proxy — tries each until one works
const RSS_SOURCES = [
  { label:'Reuters',      url:'https://feeds.reuters.com/reuters/businessNews' },
  { label:'Investing.com',url:'https://www.investing.com/rss/news.rss' },
  { label:'MarketWatch',  url:'https://feeds.marketwatch.com/marketwatch/topstories' },
  { label:'Yahoo Finance',url:'https://finance.yahoo.com/news/rssindex' },
  { label:'CNBC Markets', url:'https://www.cnbc.com/id/20910258/device/rss/rss.html' },
  { label:'FT Markets',   url:'https://www.ft.com/markets?format=rss' },
]

async function fetchNews(feedUrl: string): Promise<Article[]> {
  // Try rss2json API (generous free tier)
  const apis = [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=25&api_key=`,
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=25`,
  ]
  for (const api of apis) {
    try {
      const res = await fetch(api)
      if (!res.ok) continue
      const data = await res.json()
      if (data.status !== 'ok' || !data.items?.length) continue
      return (data.items as Record<string,string>[]).map(item=>({
        title: item.title||'',
        url: item.link||item.url||'',
        source: data.feed?.title||feedUrl,
        pubDate: item.pubDate||'',
        description: (item.description||item.content||'').replace(/<[^>]+>/g,'').slice(0,150),
        thumbnail: item.thumbnail||item['media:thumbnail']||undefined,
      })).filter(a=>a.title&&a.url)
    } catch { continue }
  }
  return []
}

// Mini calendar
function MiniCalendar({selected,onSelect,hasEvents}:{selected:Date;onSelect:(d:Date)=>void;hasEvents:Set<string>}) {
  const [month,setMonth] = useState(new Date(selected))
  const days = eachDayOfInterval({start:startOfMonth(month),end:endOfMonth(month)})
  const startPad = getDay(startOfMonth(month))===0?6:getDay(startOfMonth(month))-1
  return (
    <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <button onClick={()=>setMonth(m=>subMonths(m,1))} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"><ChevronLeft className="w-3.5 h-3.5"/></button>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{format(month,'MMM yyyy')}</span>
        <button onClick={()=>setMonth(m=>addMonths(m,1))} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"><ChevronRight className="w-3.5 h-3.5"/></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d,i)=><div key={i} className="text-center text-[9px] font-medium text-gray-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array(startPad).fill(null).map((_,i)=><div key={`p${i}`}/>)}
        {days.map(day=>{
          const ds=format(day,'yyyy-MM-dd')
          const isSel=isSameDay(day,selected)
          const todayDay=isToday(day)
          const isWknd=[0,6].includes(day.getDay())
          const hasDot=hasEvents.has(ds)
          return (
            <button key={ds} onClick={()=>{onSelect(day);setMonth(new Date(day))}}
              className={`relative aspect-square flex items-center justify-center text-[10px] rounded font-medium transition
                ${isSel?'bg-brand-500 text-white':todayDay?'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400':isWknd?'text-gray-300 dark:text-gray-600':'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
              `}>
              {format(day,'d')}
              {hasDot&&!isSel&&<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400"/>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function News() {
  const {theme} = useAppStore()
  const [selectedDate,setSelectedDate] = useState(new Date())
  const [selectedCurrencies,setSelectedCurrencies] = useState(['USD','EUR','GBP','JPY','AUD','CAD'])
  const [importance,setImportance] = useState<Impact[]>(['high','medium','low'])
  const [tab,setTab] = useState<'calendar'|'news'>('news')  // default to news
  const [allEvents,setAllEvents] = useState<CalEvent[]>([])
  const [calLoading,setCalLoading] = useState(false)
  const [articles,setArticles] = useState<Article[]>([])
  const [newsLoading,setNewsLoading] = useState(false)
  const [sourceIdx,setSourceIdx] = useState(0)
  const [showInfo,setShowInfo] = useState(false)

  const loadCalendar = async ()=>{
    setCalLoading(true)
    const events = await fetchFF()
    setAllEvents(events as (CalEvent & {_date:string})[])
    setCalLoading(false)
  }

  const loadNews = async (idx:number)=>{
    setNewsLoading(true)
    setArticles([])
    const items = await fetchNews(RSS_SOURCES[idx].url)
    setArticles(items)
    setNewsLoading(false)
  }

  useEffect(()=>{ loadCalendar() },[])
  useEffect(()=>{ loadNews(sourceIdx) },[sourceIdx])
  // Reload news when switching to news tab
  useEffect(()=>{ if(tab==='news'&&articles.length===0) loadNews(sourceIdx) },[tab])

  const eventDates = useMemo(()=>{
    const s=new Set<string>()
    allEvents.forEach(e=>{ if((e as any)._date) s.add((e as any)._date) })
    return s
  },[allEvents])

  const dateStr = format(selectedDate,'yyyy-MM-dd')
  const isWknd = [0,6].includes(selectedDate.getDay())

  const dayEvents = useMemo(()=>
    allEvents
      .filter(e=>(e as any)._date===dateStr)
      .filter(e=>selectedCurrencies.includes(e.currency))
      .filter(e=>importance.includes(e.impact))
      .sort((a,b)=>a.time.localeCompare(b.time)),
    [allEvents,dateStr,selectedCurrencies,importance]
  )

  const toggleCurrency = (c:string)=>setSelectedCurrencies(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])
  const toggleImpact = (i:Impact)=>setImportance(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414] overflow-y-auto">
        <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} hasEvents={eventDates}/>

        <div className="p-3 space-y-4">
          {/* Impact */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Impact</p>
            <div className="space-y-1.5">
              {(['high','medium','low'] as Impact[]).map(i=>(
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={importance.includes(i)} onChange={()=>toggleImpact(i)} className="accent-brand-500 w-3.5 h-3.5"/>
                  <span className={`w-2 h-2 rounded-full ${IMPACT_COLOR[i]}`}/>
                  <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{i}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Currencies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Currencies</p>
              <button onClick={()=>setSelectedCurrencies(selectedCurrencies.length===CURRENCIES.length?[]:CURRENCIES.slice())}
                className="text-[10px] text-brand-500 hover:text-brand-600">
                {selectedCurrencies.length===CURRENCIES.length?'Clear':'All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {CURRENCIES.map(c=>(
                <button key={c} onClick={()=>toggleCurrency(c)}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition border ${
                    selectedCurrencies.includes(c)
                      ?'border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      :'border-gray-200 dark:border-gray-700 text-gray-400'
                  }`}>
                  <span>{FLAG[c]}</span>{c}
                </button>
              ))}
            </div>
          </div>

          <button onClick={()=>setShowInfo(p=>!p)} className="flex items-start gap-1.5 text-left w-full group">
            <Info className="w-3 h-3 text-gray-400 group-hover:text-brand-500 mt-0.5 shrink-0 transition"/>
            <p className="text-[10px] text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition">How are future events shown?</p>
          </button>
          {showInfo&&(
            <p className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 leading-relaxed">
              Central banks pre-announce schedules months ahead. NFP is always first Friday of the month. Fed meets 8 fixed dates/year. Forecasts are analyst consensus.
            </p>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header + tabs */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">News & Calendar</h1>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['news','calendar'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`px-4 py-1.5 text-xs font-medium capitalize transition ${tab===t?'bg-brand-500 text-white':'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {t==='news'?'📰 Market News':'📅 Economic Calendar'}
              </button>
            ))}
          </div>

          {tab==='calendar'&&(
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={()=>setSelectedDate(d=>subDays(d,1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><ChevronLeft className="w-4 h-4"/></button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[180px] text-center">{format(selectedDate,'EEEE, MMM d yyyy')}</span>
              <button onClick={()=>setSelectedDate(d=>addDays(d,1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><ChevronRight className="w-4 h-4"/></button>
              <button onClick={loadCalendar} disabled={calLoading} className="p-1.5 rounded text-gray-400 hover:text-brand-500 transition disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${calLoading?'animate-spin':''}`}/>
              </button>
            </div>
          )}

          {tab==='news'&&(
            <div className="flex items-center gap-2 ml-auto">
              <select value={sourceIdx} onChange={e=>setSourceIdx(Number(e.target.value))}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
                {RSS_SOURCES.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
              </select>
              <button onClick={()=>loadNews(sourceIdx)} disabled={newsLoading}
                className="p-1.5 rounded text-gray-400 hover:text-brand-500 transition disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${newsLoading?'animate-spin':''}`}/>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── NEWS ── */}
          {tab==='news'&&(
            newsLoading?(
              <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin"/>
                <p className="text-sm">Loading latest market news…</p>
              </div>
            ):articles.length===0?(
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Globe className="w-10 h-10 text-gray-200 dark:text-gray-700"/>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No articles loaded</p>
                  <p className="text-xs text-gray-400 mt-1">Try a different source or refresh</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {RSS_SOURCES.map((s,i)=>(
                    <button key={i} onClick={()=>setSourceIdx(i)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${i===sourceIdx?'border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-600':'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>loadNews(sourceIdx)} className="text-xs text-brand-500 hover:text-brand-600 underline">Retry</button>
              </div>
            ):(
              <div className="space-y-3">
                {articles.map((a,i)=>(
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="card p-4 flex gap-4 hover:border-brand-300 dark:hover:border-brand-700 transition group cursor-pointer block no-underline">
                    {a.thumbnail&&(
                      <img src={a.thumbnail} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800"
                        onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition line-clamp-2 leading-snug">
                          {a.title}
                        </h3>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition shrink-0 mt-0.5"/>
                      </div>
                      {a.description&&(
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{a.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-medium text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded">{a.source}</span>
                        {a.pubDate&&(
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="w-2.5 h-2.5"/>
                            {(() => {
                              try {
                                const d = new Date(a.pubDate)
                                const diff = (Date.now() - d.getTime()) / 1000
                                if (diff < 3600) return `${Math.floor(diff/60)}m ago`
                                if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
                                return format(d, 'MMM d')
                              } catch { return '' }
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )
          )}

          {/* ── CALENDAR ── */}
          {tab==='calendar'&&(
            <div className="card overflow-hidden">
              <div className="grid text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-100 dark:border-gray-800"
                style={{gridTemplateColumns:'70px 90px 60px 1fr 80px 80px 80px'}}>
                <span>Time</span><span>Currency</span><span>Impact</span>
                <span>Event</span>
                <span className="text-right">Actual</span><span className="text-right">Forecast</span><span className="text-right">Previous</span>
              </div>
              {calLoading?(
                <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin"/>
                  <p className="text-sm">Loading events…</p>
                </div>
              ):isWknd?(
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Markets closed on weekends</p>
                  <p className="text-xs text-gray-400 mt-1">No economic events scheduled for {format(selectedDate,'EEEE')}</p>
                </div>
              ):dayEvents.length===0?(
                <div className="py-12 flex flex-col items-center gap-2 text-center px-8">
                  <TrendingUp className="w-8 h-8 text-gray-200 dark:text-gray-700"/>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {eventDates.size>0?'No events match your filters':'No events found for this date'}
                  </p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    {eventDates.size>0
                      ?'Try changing the currency or impact filters, or select a date with a blue dot.'
                      :'The ForexFactory feed covers the current week. Days with events show a blue dot on the calendar.'}
                  </p>
                </div>
              ):(
                <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {dayEvents.map(event=>(
                    <div key={event.id}
                      className="grid px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/3 transition items-center text-sm"
                      style={{gridTemplateColumns:'70px 90px 60px 1fr 80px 80px 80px'}}>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">{event.time}</span>
                      <div className="flex items-center gap-1.5">
                        <span>{FLAG[event.currency]||'🌐'}</span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{event.currency}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${IMPACT_COLOR[event.impact]}`}/>
                      </div>
                      <span className="text-gray-800 dark:text-gray-200 pr-4 text-xs">{event.event}</span>
                      <span className={`text-right text-xs font-semibold ${
                        event.actual?(event.forecast&&parseFloat(event.actual)>=parseFloat(event.forecast)?'text-emerald-600 dark:text-emerald-400':'text-red-500 dark:text-red-400'):'text-gray-300 dark:text-gray-600'
                      }`}>{event.actual||'—'}</span>
                      <span className="text-right text-xs text-gray-500 dark:text-gray-400">{event.forecast||'—'}</span>
                      <span className="text-right text-xs text-gray-500 dark:text-gray-400">{event.previous||'—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
