import { useEffect, useRef, useState, useMemo } from 'react'
import { RefreshCw, ExternalLink, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { useAppStore } from '@/store/appStore'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Article {
  title: string; url: string; source: string
  pubDate: string; description: string; thumbnail?: string
  category?: string
}

// ── News sources by category & filter ─────────────────────────────────────────
// Each filter maps to one or more RSS feeds
const FILTER_SOURCES: Record<string, { label: string; feeds: { name: string; url: string }[] }> = {
  // Top-level categories
  'all':       { label: '🌐 All News', feeds: [
    { name: 'BBC Business',     url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
    { name: 'Financial Times',  url: 'https://www.ft.com/rss/home/uk' },
    { name: 'NY Times Biz',     url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  ]},

  // Forex
  'forex':     { label: '💱 Forex', feeds: [
    { name: 'FX Street',        url: 'https://www.fxstreet.com/rss/news' },
    { name: 'DailyFX',          url: 'https://www.dailyfx.com/feeds/all' },
    { name: 'Financial Times',  url: 'https://www.ft.com/rss/home/uk' },
  ]},

  // Stocks by country
  'stocks-us': { label: '🇺🇸 US Stocks', feeds: [
    { name: 'NY Times Business', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
    { name: 'NY Times Tech',     url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml' },
    { name: 'The Guardian US',   url: 'https://www.theguardian.com/us/business/rss' },
  ]},
  'stocks-uk': { label: '🇬🇧 UK Stocks', feeds: [
    { name: 'BBC Business',      url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
    { name: 'Financial Times',   url: 'https://www.ft.com/rss/home/uk' },
    { name: 'The Guardian UK',   url: 'https://www.theguardian.com/business/rss' },
  ]},
  'stocks-eu': { label: '🇪🇺 EU Stocks', feeds: [
    { name: 'Financial Times',   url: 'https://www.ft.com/rss/home/uk' },
    { name: 'The Guardian Biz',  url: 'https://www.theguardian.com/business/rss' },
  ]},
  'stocks-in': { label: '🇮🇳 India', feeds: [
    { name: 'Economic Times Markets', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
    { name: 'Economic Times Biz',     url: 'https://economictimes.indiatimes.com/rssfeeds/1715249553.cms' },
  ]},
  'stocks-jp': { label: '🇯🇵 Japan', feeds: [
    { name: 'BBC Asia',          url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' },
    { name: 'Financial Times',   url: 'https://www.ft.com/rss/home/uk' },
  ]},

  // Crypto
  'crypto':    { label: '₿ Crypto', feeds: [
    { name: 'CoinDesk',          url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { name: 'CryptoNews',        url: 'https://cryptonews.com/news/feed/' },
    { name: 'BBC Technology',    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  ]},

  // Indices / macro
  'indices':   { label: '📊 Indices & Macro', feeds: [
    { name: 'Financial Times',   url: 'https://www.ft.com/rss/home/uk' },
    { name: 'NY Times Economy',  url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml' },
    { name: 'The Guardian Biz',  url: 'https://www.theguardian.com/business/rss' },
  ]},

  // Commodities
  'commodities': { label: '🛢 Commodities', feeds: [
    { name: 'Financial Times',   url: 'https://www.ft.com/rss/home/uk' },
    { name: 'BBC Business',      url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  ]},
}

// Filter groups for the sidebar
const FILTER_GROUPS = [
  { label: 'General', keys: ['all'] },
  { label: 'Forex', keys: ['forex'] },
  { label: 'Stocks by Country', keys: ['stocks-us','stocks-uk','stocks-eu','stocks-in','stocks-jp'] },
  { label: 'Markets', keys: ['crypto','indices','commodities'] },
]

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchFeed(feedUrl: string, feedName: string): Promise<Article[]> {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (data.status !== 'ok' || !data.items?.length) throw new Error()
    return (data.items as Record<string,any>[]).map(item => ({
      title:       item.title || '',
      url:         item.link || item.url || '',
      source:      feedName,
      pubDate:     item.pubDate || '',
      description: (item.description || item.content || '').replace(/<[^>]+>/g,'').slice(0,160),
      thumbnail:   item.thumbnail || item.enclosure?.link || undefined,
    })).filter(a => a.title && a.url)
  } catch { return [] }
}

async function loadFilter(filterKey: string): Promise<Article[]> {
  const config = FILTER_SOURCES[filterKey]
  if (!config) return []
  // Try feeds in order, return first that works
  for (const feed of config.feeds) {
    const items = await fetchFeed(feed.url, feed.name)
    if (items.length > 0) return items
  }
  return []
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date())
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const pad  = getDay(startOfMonth(month)) === 0 ? 6 : getDay(startOfMonth(month)) - 1

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(m => subMonths(m,1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
          <ChevronLeft className="w-3.5 h-3.5"/>
        </button>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{format(month,'MMM yyyy')}</span>
        <button onClick={() => setMonth(m => addMonths(m,1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
          <ChevronRight className="w-3.5 h-3.5"/>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d,i) => (
          <div key={i} className="text-center text-[9px] font-medium text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array(pad).fill(null).map((_,i) => <div key={`p${i}`}/>)}
        {days.map(day => {
          const sel = isSameDay(day, selected)
          const tod = isToday(day)
          const wknd = [0,6].includes(day.getDay())
          return (
            <button key={day.toISOString()} onClick={() => { onSelect(day); setMonth(new Date(day)) }}
              className={`aspect-square flex items-center justify-center text-[10px] rounded font-medium transition
                ${sel ? 'bg-brand-500 text-white' : tod ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : wknd ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              {format(day,'d')}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        {isSameDay(selected, new Date()) ? 'Today' : format(selected, 'MMM d, yyyy')}
      </p>
    </div>
  )
}

// ── TradingView Economic Calendar ─────────────────────────────────────────────
function TradingViewCalendar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: isDark ? 'dark' : 'light',
      isTransparent: false,
      width: '100%', height: '100%',
      locale: 'en',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,jp,au,ca,ch,cn,nz,in',
    })
    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [isDark])

  return <div ref={containerRef} className="w-full h-full tradingview-widget-container"/>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function News() {
  const [tab,        setTab]        = useState<'news'|'calendar'>('news')
  const [filterKey,  setFilterKey]  = useState('all')
  const [articles,   setArticles]   = useState<Article[]>([])
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [selDate,    setSelDate]    = useState(new Date())

  const loadNews = async (key: string) => {
    setLoading(true); setArticles([])
    const items = await loadFilter(key)
    setArticles(items)
    setLoading(false)
  }

  useEffect(() => { loadNews(filterKey) }, [filterKey])

  // When date is selected, auto-switch to news tab and filter if possible
  const handleDateSelect = (d: Date) => {
    setSelDate(d)
    setTab('news')
  }

  const filtered = useMemo(() =>
    search ? articles.filter(a =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
    ) : articles,
  [articles, search])

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 bg-white dark:bg-[#141414] overflow-y-auto">

        {/* Mini Calendar */}
        <MiniCalendar selected={selDate} onSelect={handleDateSelect} />

        {/* Filter groups */}
        <div className="p-3 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">News Filter</p>
          {FILTER_GROUPS.map(group => (
            <div key={group.label} className="mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.keys.map(key => (
                  <button key={key} onClick={() => { setFilterKey(key); setTab('news') }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      filterKey === key
                        ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-600/30'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                    {FILTER_SOURCES[key]?.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap bg-white dark:bg-[#141414]">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">News & Calendar</h1>

          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['news','calendar'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-xs font-medium transition ${tab===t?'bg-brand-500 text-white':'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {t==='news'?'📰 Market News':'📅 Economic Calendar'}
              </button>
            ))}
          </div>

          {tab==='news' && (
            <div className="flex items-center gap-2 ml-auto">
              {/* Active filter badge */}
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium border border-brand-200 dark:border-brand-600/30">
                {FILTER_SOURCES[filterKey]?.label}
              </span>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none w-32"/>
              </div>
              <button onClick={() => loadNews(filterKey)} disabled={loading}
                className="p-1.5 rounded text-gray-400 hover:text-brand-500 transition disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/>
              </button>
            </div>
          )}
          {tab==='calendar' && (
            <span className="ml-auto text-xs text-gray-400 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800">
              Navigate dates inside the calendar · Powered by TradingView
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 ${tab==='news'?'overflow-y-auto':'overflow-hidden'}`}>

          {/* ── NEWS ── */}
          {tab==='news' && (
            <div className="px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin"/>
                  <p className="text-sm">Loading {FILTER_SOURCES[filterKey]?.label} news…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {search ? `No results for "${search}"` : 'No articles found — try another filter'}
                  </p>
                  {search
                    ? <button onClick={() => setSearch('')} className="text-xs text-brand-500 hover:underline">Clear search</button>
                    : <button onClick={() => loadNews(filterKey)} className="text-xs text-brand-500 hover:underline">Retry</button>
                  }
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="card p-4 flex gap-4 hover:border-brand-300 dark:hover:border-brand-700 transition group block no-underline">
                      {a.thumbnail && (
                        <img src={a.thumbnail} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800"
                          onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition line-clamp-2 leading-snug">
                            {a.title}
                          </h3>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition shrink-0 mt-0.5"/>
                        </div>
                        {a.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{a.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-medium text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded">{a.source}</span>
                          {a.pubDate && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock className="w-2.5 h-2.5"/>
                              {(() => { try {
                                const d=new Date(a.pubDate), diff=(Date.now()-d.getTime())/1000
                                return diff<3600?`${Math.floor(diff/60)}m ago`:diff<86400?`${Math.floor(diff/3600)}h ago`:format(d,'MMM d')
                              } catch { return '' } })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CALENDAR ── */}
          {tab==='calendar' && <TradingViewCalendar />}
        </div>
      </div>
    </div>
  )
}
