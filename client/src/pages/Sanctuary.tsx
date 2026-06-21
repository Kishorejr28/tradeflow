import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Bell, BellOff, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'

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
  { label: 'Rain', value: 'rain' },
  { label: 'Forest', value: 'forest' },
  { label: 'Ocean Waves', value: 'ocean' },
  { label: '528 Hz', value: '528hz' },
  { label: '432 Hz', value: '432hz' },
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

// Simple noise generator using Web Audio API
function createNoiseNode(ctx: AudioContext, type: string): AudioNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  if (type === 'brown') {
    // Brown noise: integrate white noise
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
  }

  return source
}

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
  const [streakDays] = useState(3)
  const [totalSessions] = useState(8)
  const [totalMinutes] = useState(120)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioNode | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const playBell = useCallback(() => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g)
    g.connect(ctx.destination)
    osc.frequency.value = 528
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
    osc.start()
    osc.stop(ctx.currentTime + 2)
  }, [])

  const startAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    gainRef.current = ctx.createGain()
    gainRef.current.gain.value = volume
    gainRef.current.connect(ctx.destination)

    const source = createNoiseNode(ctx, sound) as AudioBufferSourceNode
    source.connect(gainRef.current)
    source.start()
    sourceRef.current = source
  }, [sound, volume])

  const stopAudio = useCallback(() => {
    try {
      (sourceRef.current as AudioBufferSourceNode)?.stop()
    } catch {}
    sourceRef.current = null
  }, [])

  const handleStart = () => {
    setSessionStarted(true)
    setRunning(true)
    setRemaining(duration)
    startAudio()
    playBell()

    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          handleEnd()
          return 0
        }
        return r - 1
      })
    }, 1000)

    if (intervalBells && intervalSeconds > 0) {
      bellIntervalRef.current = setInterval(playBell, intervalSeconds * 1000)
    }
  }

  const handleEnd = () => {
    setRunning(false)
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
    playBell()
  }

  const handleReset = () => {
    handleEnd()
    setRunning(false)
    setRemaining(duration)
    setSessionStarted(false)
  }

  const togglePause = () => {
    if (running) {
      setRunning(false)
      stopAudio()
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else {
      setRunning(true)
      startAudio()
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { handleEnd(); return 0 }
          return r - 1
        })
      }, 1000)
    }
  }

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  const progress = 1 - remaining / duration

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${BACKGROUNDS[bgIndex]})` }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* Left: bg navigation */}
      <button
        onClick={() => setBgIndex(i => (i - 1 + BACKGROUNDS.length) % BACKGROUNDS.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => setBgIndex(i => (i + 1) % BACKGROUNDS.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Main session modal */}
      <div className="relative z-10 flex items-center justify-center w-full">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-7">
          {/* Lotus icon */}
          <div className="flex justify-center mb-2">
            <span className="text-3xl">🪷</span>
          </div>
          <h2 className="text-center font-semibold text-gray-800 dark:text-white mb-5">Meditation Session</h2>

          {/* Timer display */}
          {sessionStarted ? (
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-28 h-28 mb-3">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="#7c3aed" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white tabular-nums">
                    {formatTime(remaining)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={togglePause} className="p-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition shadow">
                  {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={handleReset} className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Duration selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Duration:</label>
                <div className="flex items-center gap-1.5 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm mb-2">
                  🕐 {formatTime(duration)}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map(d => (
                    <button
                      key={d.seconds}
                      onClick={() => { setDuration(d.seconds); setRemaining(d.seconds) }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${duration === d.seconds ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval bells */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Interval Bells:</label>
                  <button
                    onClick={() => setIntervalBells(b => !b)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${intervalBells ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${intervalBells ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {intervalBells && (
                  <select
                    value={intervalSeconds}
                    onChange={e => setIntervalSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                  >
                    {INTERVAL_OPTIONS.map(o => (
                      <option key={o.seconds} value={o.seconds}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ambient sound */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Ambient Sound:</label>
                <select
                  value={sound}
                  onChange={e => setSound(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                >
                  {SOUNDS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Volume */}
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={volume}
                    onChange={e => setVolume(Number(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                </div>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-500/30"
              >
                Start
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats panel (right) */}
      <div className="absolute right-6 top-6 z-10 space-y-3">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-44">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Today I Will</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white">journal every trade</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-44">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Your Progress</p>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Current Streak</span>
              <span className="font-semibold text-brand-500">🔥 {streakDays} Days</span>
            </div>
            <div className="flex justify-between">
              <span>Total Sessions</span>
              <span className="font-semibold">{totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span>Minutes</span>
              <span className="font-semibold">{totalMinutes}m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
