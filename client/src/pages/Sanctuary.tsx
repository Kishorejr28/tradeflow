import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Edit2, Check } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

const DURATIONS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
]

const SOUNDS = [
  { label: 'White Noise', value: 'white' },
  { label: 'Brown Noise', value: 'brown' },
  { label: 'Pink Noise', value: 'pink' },
  { label: '40 Hz Focus', value: '40hz' },
  { label: '528 Hz Healing', value: '528hz' },
  { label: '432 Hz Calm', value: '432hz' },
  { label: '174 Hz Pain Relief', value: '174hz' },
]

const INTERVAL_OPTIONS = [
  { label: 'None', seconds: 0 },
  { label: 'Every 1 Minute', seconds: 60 },
  { label: 'Every 2 Minutes', seconds: 120 },
  { label: 'Every 5 Minutes', seconds: 300 },
]

const BACKGROUNDS = [
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&q=80',
  'https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=1920&q=80',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
]

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes}m`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Audio engine ─────────────────────────────────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, type: string): AudioBufferSourceNode {
  const sampleRate = ctx.sampleRate
  const bufferSize = sampleRate * 3 // 3 seconds looped
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  } else if (type === 'brown') {
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (last + 0.02 * white) / 1.02
      last = data[i]
      data[i] *= 3.5
    }
  } else if (type === 'pink') {
    // Voss-McCartney pink noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createToneNode(ctx: AudioContext, freq: number): OscillatorNode {
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq
  return osc
}

function startAmbient(ctx: AudioContext, gainNode: GainNode, sound: string): AudioNode {
  const freqMap: Record<string, number> = {
    '40hz': 40, '528hz': 528, '432hz': 432, '174hz': 174,
  }

  if (freqMap[sound]) {
    const osc = createToneNode(ctx, freqMap[sound])
    // Add subtle harmonics for richness
    const osc2 = createToneNode(ctx, freqMap[sound] * 2)
    const g2 = ctx.createGain(); g2.gain.value = 0.15
    osc2.connect(g2); g2.connect(gainNode)
    osc.connect(gainNode)
    osc2.start(); osc.start()
    // Return osc as primary (we'll stop both via gainNode disconnect)
    return osc
  }

  // noise types: white, brown, pink
  const noiseType = ['white', 'brown', 'pink'].includes(sound) ? sound : 'white'
  const src = createNoiseBuffer(ctx, noiseType)
  src.connect(gainNode)
  src.start()
  return src
}

// ── Sanctuary stats (persisted) ───────────────────────────────────────────────

interface SanctuaryStats {
  totalSessions: number
  totalMinutes: number
  lastSessionDate: string | null
  streakDays: number
}

const STATS_KEY = 'tradeflow-sanctuary-stats'

function loadStats(): SanctuaryStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { totalSessions: 0, totalMinutes: 0, lastSessionDate: null, streakDays: 0 }
}

function saveStats(s: SanctuaryStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s))
}

function recordSession(minutesCompleted: number): SanctuaryStats {
  const today = new Date().toISOString().split('T')[0]
  const prev = loadStats()

  let newStreak = prev.streakDays
  if (prev.lastSessionDate === null) {
    newStreak = 1
  } else {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    if (prev.lastSessionDate === today) {
      // same day — keep streak
    } else if (prev.lastSessionDate === yStr) {
      newStreak = prev.streakDays + 1
    } else {
      newStreak = 1 // broke streak
    }
  }

  const next: SanctuaryStats = {
    totalSessions: prev.totalSessions + 1,
    totalMinutes: prev.totalMinutes + minutesCompleted,
    lastSessionDate: today,
    streakDays: newStreak,
  }
  saveStats(next)
  return next
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Sanctuary() {
  const [bgIndex, setBgIndex] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [duration, setDuration] = useState(600)
  const [remaining, setRemaining] = useState(600)
  const [running, setRunning] = useState(false)
  const [intervalBells, setIntervalBells] = useState(true)
  const [intervalSeconds, setIntervalSeconds] = useState(60)
  const [sound, setSound] = useState('white')
  const [volume, setVolume] = useState(0.5)
  const [intention, setIntention] = useState('journal every trade')
  const [editingIntention, setEditingIntention] = useState(false)
  const [stats, setStats] = useState<SanctuaryStats>(loadStats)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioNode | null>(null)
  const harmRef = useRef<AudioNode | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const playBell = useCallback(() => {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.frequency.value = 528
    osc.type = 'sine'
    g.gain.setValueAtTime(0.4, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 2.5)
  }, [getCtx])

  const stopAudio = useCallback(() => {
    try { (sourceRef.current as AudioBufferSourceNode | OscillatorNode)?.stop() } catch {}
    try { (harmRef.current as OscillatorNode)?.stop() } catch {}
    sourceRef.current = null
    harmRef.current = null
    gainRef.current?.disconnect()
    gainRef.current = null
  }, [])

  const startAudioEngine = useCallback(() => {
    stopAudio()
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)
    gainRef.current = gain
    sourceRef.current = startAmbient(ctx, gain, sound)
  }, [sound, volume, stopAudio, getCtx])

  const doEnd = useCallback((completedSecs: number) => {
    setRunning(false)
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
    playBell()
    const mins = Math.max(1, Math.round(completedSecs / 60))
    const updated = recordSession(mins)
    setStats(updated)
  }, [stopAudio, playBell])

  const handleStart = useCallback(() => {
    setSessionStarted(true)
    setRunning(true)
    setRemaining(duration)
    startTimeRef.current = duration
    startAudioEngine()
    playBell()

    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          // use the elapsed duration
          setTimeout(() => doEnd(startTimeRef.current), 0)
          return 0
        }
        return r - 1
      })
    }, 1000)

    if (intervalBells && intervalSeconds > 0) {
      bellIntervalRef.current = setInterval(playBell, intervalSeconds * 1000)
    }
  }, [duration, startAudioEngine, playBell, intervalBells, intervalSeconds, doEnd])

  const handleReset = useCallback(() => {
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
    setRunning(false)
    setRemaining(duration)
    setSessionStarted(false)
  }, [stopAudio, duration])

  const togglePause = useCallback(() => {
    if (running) {
      setRunning(false)
      stopAudio()
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else {
      setRunning(true)
      startAudioEngine()
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { setTimeout(() => doEnd(startTimeRef.current), 0); return 0 }
          return r - 1
        })
      }, 1000)
    }
  }, [running, stopAudio, startAudioEngine, doEnd])

  // Live volume update
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.setTargetAtTime(volume, gainRef.current.context.currentTime, 0.1)
  }, [volume])

  // Cleanup on unmount
  useEffect(() => () => {
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
  }, [])

  const progress = 1 - remaining / duration
  const elapsed = duration - remaining

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${BACKGROUNDS[bgIndex]})` }} />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      <button onClick={() => setBgIndex(i => (i - 1 + BACKGROUNDS.length) % BACKGROUNDS.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => setBgIndex(i => (i + 1) % BACKGROUNDS.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Session card */}
      <div className="relative z-10 flex items-center justify-center w-full">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-7">
          <div className="flex justify-center mb-2"><span className="text-3xl">🪷</span></div>
          <h2 className="text-center font-semibold text-gray-800 dark:text-white mb-5">Meditation Session</h2>

          {sessionStarted ? (
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-28 h-28 mb-3">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#7c3aed" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white tabular-nums">{formatTime(remaining)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">{SOUNDS.find(s => s.value === sound)?.label}</p>
              <div className="flex items-center gap-3">
                <button onClick={togglePause} className="p-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition shadow">
                  {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={handleReset} className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              {/* Volume during session */}
              <div className="flex items-center gap-2 mt-4 w-full">
                <Volume2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={e => setVolume(Number(e.target.value))} className="flex-1 accent-brand-500" />
              </div>
            </div>
          ) : (
            <>
              {/* Duration */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Duration</label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm mb-2">
                  🕐 {formatTime(duration)}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map(d => (
                    <button key={d.seconds} onClick={() => { setDuration(d.seconds); setRemaining(d.seconds) }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${duration === d.seconds ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval bells */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Interval Bells</label>
                  <button onClick={() => setIntervalBells(b => !b)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${intervalBells ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${intervalBells ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {intervalBells && (
                  <select value={intervalSeconds} onChange={e => setIntervalSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
                    {INTERVAL_OPTIONS.map(o => (
                      <option key={o.seconds} value={o.seconds}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ambient sound — visual selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ambient Sound</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SOUNDS.map(s => (
                    <button key={s.value} onClick={() => setSound(s.value)}
                      className={`px-2.5 py-2 text-xs rounded-lg font-medium text-left transition border ${
                        sound === s.value
                          ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume */}
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={e => setVolume(Number(e.target.value))} className="flex-1 accent-brand-500" />
                </div>
              </div>

              <button onClick={handleStart}
                className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-500/30">
                Start
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats panel */}
      <div className="absolute right-6 top-6 z-10 space-y-3">
        {/* Intention */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-48">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Today I Will</p>
          {editingIntention ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={intention}
                onChange={e => setIntention(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setEditingIntention(false)}
                className="flex-1 text-xs bg-transparent border-b border-brand-400 outline-none text-gray-800 dark:text-white"
              />
              <button onClick={() => setEditingIntention(false)} className="text-brand-500">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-medium text-gray-800 dark:text-white leading-snug">{intention}</p>
              <button onClick={() => setEditingIntention(true)} className="text-gray-300 dark:text-gray-600 hover:text-brand-500 transition shrink-0 mt-0.5">
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-48">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Your Progress</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Current Streak</span>
              <span className="font-semibold">
                {stats.streakDays > 0 ? `🔥 ${stats.streakDays} day${stats.streakDays > 1 ? 's' : ''}` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Sessions</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.totalSessions}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total time</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {stats.totalMinutes > 0 ? formatDuration(stats.totalMinutes) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
