import { useEffect, useRef, useState } from 'react'
import { RefreshCw, ExternalLink, Clock, Globe, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'

// ── News RSS feeds ─────────────────────────────────────────────────────────────
interface Article { title:string; url:string; source:string; pubDate:string; description:string; thumbnail?:string }

const RSS_SOURCES = [
  { label:'CNBC Markets',    url:'https://www.cnbc.com/id/20910258/device/rss/rss.html' },
  { label:'CNBC Business',   url:'https://www.cnbc.com/id/10001147/device/rss/rss.html' },
  { label:'BBC Business',    url:'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { label:'CNBC Finance',    url:'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
  { label:'CNBC Technology', url:'https://www.cnbc.com/id/19854910/device/rss/rss.html' },
  { label:'The Guardian',    url:'https://www.theguardian.com/business/rss' },
]

async function fetchNews(feedUrl: string): Promise<Article[]> {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error()
    const data = await res.json()
    if (data.status !== 'ok') throw new Error()
    return (data.items as Record<string,any>[]).map(item => ({
      title:       item.title || '',
      url:         item.link || item.url || '',
      source:      data.feed?.title || 'News',
      pubDate:     item.pubDate || '',
      description: (item.description || item.content || '').replace(/<[^>]+>/g,'').slice(0,160),
      thumbnail:   item.thumbnail || item.enclosure?.link || undefined,
    })).filter(a => a.title && a.url)
  } catch { return [] }
}

// ── TradingView Economic Calendar widget ──────────────────────────────────────
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
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,jp,au,ca,ch,cn,nz',
    })

    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [isDark])

  return (
    <div ref={containerRef} className="w-full h-full tradingview-widget-container"/>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function News() {
  const [tab, setTab]           = useState<'news'|'calendar'>('news')
  const [articles, setArticles] = useState<Article[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [sourceIdx, setSourceIdx]     = useState(0)
  const [newsSearch, setNewsSearch]   = useState('')

  const loadNews = async (idx: number) => {
    setNewsLoading(true); setArticles([])
    setArticles(await fetchNews(RSS_SOURCES[idx].url))
    setNewsLoading(false)
  }

  useEffect(() => { loadNews(sourceIdx) }, [sourceIdx])
  useEffect(() => { if (tab === 'news' && articles.length === 0) loadNews(sourceIdx) }, [tab])

  const filteredArticles = newsSearch
    ? articles.filter(a =>
        a.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
        a.description.toLowerCase().includes(newsSearch.toLowerCase()))
    : articles

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex-wrap bg-white dark:bg-[#141414]">
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

        {/* News controls */}
        {tab==='news' && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select value={sourceIdx} onChange={e => setSourceIdx(Number(e.target.value))}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
              {RSS_SOURCES.map((s,i) => <option key={i} value={i}>{s.label}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"/>
              <input value={newsSearch} onChange={e => setNewsSearch(e.target.value)}
                placeholder="Search news…"
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none w-36"/>
            </div>
            <button onClick={() => loadNews(sourceIdx)} disabled={newsLoading}
              className="p-1.5 rounded text-gray-400 hover:text-brand-500 transition disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${newsLoading?'animate-spin':''}`}/>
            </button>
          </div>
        )}

        {/* Calendar info */}
        {tab==='calendar' && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span className="px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium">
              Powered by TradingView · Navigate inside the calendar
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-h-0 ${tab === 'news' ? 'overflow-y-auto' : 'overflow-hidden'}`}>

        {/* ── Market News ── */}
        {tab === 'news' && (
          <div className="px-6 py-4">
            {newsLoading ? (
              <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin"/>
                <p className="text-sm">Loading latest market news…</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Globe className="w-10 h-10 text-gray-200 dark:text-gray-700"/>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {newsSearch ? `No results for "${newsSearch}"` : 'No articles loaded'}
                </p>
                {newsSearch && <button onClick={() => setNewsSearch('')} className="text-xs text-brand-500 hover:underline">Clear search</button>}
                {!newsSearch && (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {RSS_SOURCES.map((s,i) => (
                      <button key={i} onClick={() => setSourceIdx(i)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition ${i===sourceIdx?'border-brand-400 bg-brand-50 dark:bg-brand-500/10 text-brand-600':'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map((a, i) => (
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
                              const d = new Date(a.pubDate), diff = (Date.now()-d.getTime())/1000
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

        {/* ── Economic Calendar (TradingView widget) ── */}
        {tab === 'calendar' && (
          <div className="w-full h-full">
            <TradingViewCalendar />
          </div>
        )}
      </div>
    </div>
  )
}
