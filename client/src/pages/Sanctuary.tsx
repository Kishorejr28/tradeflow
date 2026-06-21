import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Edit2, Check } from 'lucide-react'

const DURATIONS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
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

const SOUND_GROUPS = [
  {
    group: 'Nature',
    sounds: [
      { label: 'Ocean Waves', value: 'ocean', emoji: '🌊' },
      { label: 'Rain', value: 'rain', emoji: '🌧️' },
      { label: 'Thunderstorm', value: 'thunder', emoji: '⛈️' },
      { label: 'Forest', value: 'forest', emoji: '🌲' },
      { label: 'Campfire', value: 'fire', emoji: '🔥' },
      { label: 'River Stream', value: 'stream', emoji: '💧' },
    ],
  },
  {
    group: 'Meditation',
    sounds: [
      { label: 'Singing Bowl', value: 'bowl', emoji: '🎵' },
      { label: 'OM Drone', value: 'om', emoji: '🕉️' },
      { label: '528 Hz Healing', value: '528hz', emoji: '✨' },
      { label: '432 Hz Calm', value: '432hz', emoji: '🌙' },
      { label: '40 Hz Focus', value: '40hz', emoji: '🧠' },
      { label: '174 Hz Grounding', value: '174hz', emoji: '🌍' },
    ],
  },
  {
    group: 'Noise',
    sounds: [
      { label: 'White Noise', value: 'white', emoji: '⬜' },
      { label: 'Brown Noise', value: 'brown', emoji: '🟤' },
      { label: 'Pink Noise', value: 'pink', emoji: '🩷' },
    ],
  },
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

// ── Noise buffers ─────────────────────────────────────────────────────────────

function makeWhiteBuffer(ctx: AudioContext, secs = 3) {
  const n = ctx.sampleRate * secs
  const buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  }
  return buf
}

function makeBrownBuffer(ctx: AudioContext, secs = 4) {
  const n = ctx.sampleRate * secs
  const buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let last = c * 0.1
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      d[i] = (last + 0.02 * w) / 1.02
      last = d[i]
      d[i] *= 3.5
    }
  }
  return buf
}

function makePinkBuffer(ctx: AudioContext, secs = 3) {
  const n = ctx.sampleRate * secs
  const buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926
    }
  }
  return buf
}

// ── Sound builders ────────────────────────────────────────────────────────────

type Stoppable = AudioBufferSourceNode | OscillatorNode

interface SoundResult { nodes: Stoppable[]; cleanup?: () => void }

function buildOcean(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []

  // Deep swell: brown noise + very low LP
  const swellSrc = ctx.createBufferSource()
  swellSrc.buffer = makeBrownBuffer(ctx, 5)
  swellSrc.loop = true
  nodes.push(swellSrc)
  const swellLP = ctx.createBiquadFilter()
  swellLP.type = 'lowpass'; swellLP.frequency.value = 300; swellLP.Q.value = 0.5

  // Surf layer: white noise + BP around 800Hz
  const surfSrc = ctx.createBufferSource()
  surfSrc.buffer = makeWhiteBuffer(ctx, 3)
  surfSrc.loop = true
  nodes.push(surfSrc)
  const surfBP = ctx.createBiquadFilter()
  surfBP.type = 'bandpass'; surfBP.frequency.value = 800; surfBP.Q.value = 0.8
  const surfGain = ctx.createGain(); surfGain.gain.value = 0.4

  // Wave LFO — slow amplitude modulation (~7s period)
  const lfo1 = ctx.createOscillator()
  lfo1.type = 'sine'; lfo1.frequency.value = 0.14
  nodes.push(lfo1)
  const lfoG1 = ctx.createGain(); lfoG1.gain.value = 0.45
  const waveAmp = ctx.createGain(); waveAmp.gain.value = 0.5

  // Second slower LFO for variation
  const lfo2 = ctx.createOscillator()
  lfo2.type = 'sine'; lfo2.frequency.value = 0.06
  nodes.push(lfo2)
  const lfoG2 = ctx.createGain(); lfoG2.gain.value = 0.1

  swellSrc.connect(swellLP); swellLP.connect(waveAmp)
  surfSrc.connect(surfBP); surfBP.connect(surfGain); surfGain.connect(waveAmp)
  lfo1.connect(lfoG1); lfoG1.connect(waveAmp.gain)
  lfo2.connect(lfoG2); lfoG2.connect(waveAmp.gain)
  waveAmp.connect(dest)

  swellSrc.start(); surfSrc.start(); lfo1.start(); lfo2.start()
  return { nodes }
}

function buildRain(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []

  // Main rain: white noise + HP to remove rumble + peaking at 3kHz (rain sparkle)
  const src = ctx.createBufferSource()
  src.buffer = makeWhiteBuffer(ctx, 3); src.loop = true
  nodes.push(src)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'; hp.frequency.value = 1200
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'; peak.frequency.value = 3000; peak.gain.value = 10; peak.Q.value = 1.5
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 8000

  // Pitter-patter variation LFO
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'; lfo.frequency.value = 2.5
  nodes.push(lfo)
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.08
  const mainG = ctx.createGain(); mainG.gain.value = 0.85

  src.connect(hp); hp.connect(peak); peak.connect(lp); lp.connect(mainG)
  lfo.connect(lfoG); lfoG.connect(mainG.gain)
  mainG.connect(dest)
  src.start(); lfo.start()
  return { nodes }
}

function buildThunder(ctx: AudioContext, dest: AudioNode): SoundResult {
  const { nodes, cleanup } = buildRain(ctx, dest)

  // Add low rumble: brown noise + very LP + slow LFO
  const rSrc = ctx.createBufferSource()
  rSrc.buffer = makeBrownBuffer(ctx, 6); rSrc.loop = true
  nodes.push(rSrc)
  const rlp = ctx.createBiquadFilter()
  rlp.type = 'lowpass'; rlp.frequency.value = 120
  const rg = ctx.createGain(); rg.gain.value = 0.6

  // Occasional thunder bursts
  const thunderLFO = ctx.createOscillator()
  thunderLFO.type = 'sine'; thunderLFO.frequency.value = 0.03
  nodes.push(thunderLFO)
  const tlg = ctx.createGain(); tlg.gain.value = 0.5

  rSrc.connect(rlp); rlp.connect(rg); rg.connect(dest)
  thunderLFO.connect(tlg); tlg.connect(rg.gain)
  rSrc.start(); thunderLFO.start()
  return { nodes }
}

function buildForest(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []

  // Wind through leaves: pink noise + BP
  const src = ctx.createBufferSource()
  src.buffer = makePinkBuffer(ctx, 4); src.loop = true
  nodes.push(src)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.4

  // Gentle wind swell LFO
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'; lfo.frequency.value = 0.08
  nodes.push(lfo)
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.25
  const windG = ctx.createGain(); windG.gain.value = 0.6

  src.connect(bp); bp.connect(windG)
  lfo.connect(lfoG); lfoG.connect(windG.gain)
  windG.connect(dest)
  src.start(); lfo.start()

  // Periodic bird chirps (short sine sweeps every 4-12s)
  let chirpTimer: ReturnType<typeof setTimeout>
  const scheduleChirp = () => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    const baseFreq = 1800 + Math.random() * 1200
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, ctx.currentTime + 0.15)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, ctx.currentTime + 0.3)
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(g); g.connect(dest)
    osc.start(); osc.stop(ctx.currentTime + 0.4)
    chirpTimer = setTimeout(scheduleChirp, 4000 + Math.random() * 8000)
  }
  chirpTimer = setTimeout(scheduleChirp, 2000 + Math.random() * 3000)

  return { nodes, cleanup: () => clearTimeout(chirpTimer) }
}

function buildFire(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []

  // Base: brown noise + LP for warmth
  const src = ctx.createBufferSource()
  src.buffer = makeBrownBuffer(ctx, 4); src.loop = true
  nodes.push(src)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 600

  // Crackle: white noise + HP + fast LFO
  const crSrc = ctx.createBufferSource()
  crSrc.buffer = makeWhiteBuffer(ctx, 2); crSrc.loop = true
  nodes.push(crSrc)
  const crHP = ctx.createBiquadFilter()
  crHP.type = 'highpass'; crHP.frequency.value = 3000
  const crG = ctx.createGain(); crG.gain.value = 0.15

  // Flicker LFO
  const flicker = ctx.createOscillator()
  flicker.type = 'sine'; flicker.frequency.value = 3.5
  nodes.push(flicker)
  const flickG = ctx.createGain(); flickG.gain.value = 0.2
  const fireG = ctx.createGain(); fireG.gain.value = 0.65

  src.connect(lp); lp.connect(fireG)
  crSrc.connect(crHP); crHP.connect(crG); crG.connect(fireG)
  flicker.connect(flickG); flickG.connect(fireG.gain)
  fireG.connect(dest)
  src.start(); crSrc.start(); flicker.start()
  return { nodes }
}

function buildStream(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []

  // Babbling brook: white noise + series of BP filters at different freqs
  const src = ctx.createBufferSource()
  src.buffer = makeWhiteBuffer(ctx, 3); src.loop = true
  nodes.push(src)

  const freqs = [400, 900, 1600, 2800]
  const mixer = ctx.createGain(); mixer.gain.value = 0.6
  freqs.forEach(f => {
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 2
    const g = ctx.createGain(); g.gain.value = 1 / freqs.length
    src.connect(bp); bp.connect(g); g.connect(mixer)
  })

  // Gurgling modulation
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'; lfo.frequency.value = 4.5
  nodes.push(lfo)
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.15
  lfo.connect(lfoG); lfoG.connect(mixer.gain)
  mixer.connect(dest)

  src.start(); lfo.start()
  return { nodes }
}

function buildBowl(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []
  // Tibetan bowl: fundamental 432Hz + harmonics, with slow amplitude envelope cycling
  const harmonics = [432, 864, 1080, 1296]
  harmonics.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'; osc.frequency.value = freq
    nodes.push(osc)
    const g = ctx.createGain(); g.gain.value = 0
    const level = [0.5, 0.15, 0.08, 0.05][i]
    // Ringing envelope: attack 0.5s, sustain, soft decay
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.5)
    osc.connect(g); g.connect(dest)
    osc.start()
  })
  // Slow beating LFO between two slightly detuned oscillators for shimmer
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'; osc2.frequency.value = 433.5 // 1.5Hz beat with 432
  nodes.push(osc2)
  const g2 = ctx.createGain(); g2.gain.value = 0
  g2.gain.setValueAtTime(0, ctx.currentTime)
  g2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2)
  osc2.connect(g2); g2.connect(dest); osc2.start()
  return { nodes }
}

function buildOM(ctx: AudioContext, dest: AudioNode): SoundResult {
  const nodes: Stoppable[] = []
  // OM drone: 136.1Hz (Earth frequency) with rich harmonics
  const freqs = [136.1, 272.2, 408.3, 544.4, 680.5]
  const gains = [0.6, 0.25, 0.12, 0.07, 0.04]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = i === 0 ? 'sine' : 'sine'
    osc.frequency.value = freq
    nodes.push(osc)
    const g = ctx.createGain(); g.gain.value = gains[i]
    // Slow swell
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'; lfo.frequency.value = 0.05 + i * 0.01
    nodes.push(lfo)
    const lg = ctx.createGain(); lg.gain.value = gains[i] * 0.3
    lfo.connect(lg); lg.connect(g.gain)
    osc.connect(g); g.connect(dest)
    osc.start(); lfo.start()
  })
  return { nodes }
}

function buildTone(ctx: AudioContext, dest: AudioNode, freq: number): SoundResult {
  const nodes: Stoppable[] = []
  const osc = ctx.createOscillator()
  osc.type = 'sine'; osc.frequency.value = freq
  nodes.push(osc)
  const g = ctx.createGain(); g.gain.value = 0.7
  // Soft harmonic
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'; osc2.frequency.value = freq * 2
  nodes.push(osc2)
  const g2 = ctx.createGain(); g2.gain.value = 0.1
  // Very slow swell
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'; lfo.frequency.value = 0.04
  nodes.push(lfo)
  const lg = ctx.createGain(); lg.gain.value = 0.08
  lfo.connect(lg); lg.connect(g.gain)
  osc.connect(g); g.connect(dest)
  osc2.connect(g2); g2.connect(dest)
  osc.start(); osc2.start(); lfo.start()
  return { nodes }
}

function buildNoise(ctx: AudioContext, dest: AudioNode, type: string): SoundResult {
  const nodes: Stoppable[] = []
  const src = ctx.createBufferSource()
  src.buffer = type === 'brown' ? makeBrownBuffer(ctx) : type === 'pink' ? makePinkBuffer(ctx) : makeWhiteBuffer(ctx)
  src.loop = true
  nodes.push(src)
  src.connect(dest); src.start()
  return { nodes }
}

function buildSound(ctx: AudioContext, dest: GainNode, sound: string): SoundResult {
  switch (sound) {
    case 'ocean':   return buildOcean(ctx, dest)
    case 'rain':    return buildRain(ctx, dest)
    case 'thunder': return buildThunder(ctx, dest)
    case 'forest':  return buildForest(ctx, dest)
    case 'fire':    return buildFire(ctx, dest)
    case 'stream':  return buildStream(ctx, dest)
    case 'bowl':    return buildBowl(ctx, dest)
    case 'om':      return buildOM(ctx, dest)
    case '528hz':   return buildTone(ctx, dest, 528)
    case '432hz':   return buildTone(ctx, dest, 432)
    case '40hz':    return buildTone(ctx, dest, 40)
    case '174hz':   return buildTone(ctx, dest, 174)
    case 'brown':   return buildNoise(ctx, dest, 'brown')
    case 'pink':    return buildNoise(ctx, dest, 'pink')
    default:        return buildNoise(ctx, dest, 'white')
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

interface SanctuaryStats {
  totalSessions: number; totalMinutes: number
  lastSessionDate: string | null; streakDays: number
}
const STATS_KEY = 'tradeflow-sanctuary-stats'
function loadStats(): SanctuaryStats {
  try { const r = localStorage.getItem(STATS_KEY); if (r) return JSON.parse(r) } catch {}
  return { totalSessions: 0, totalMinutes: 0, lastSessionDate: null, streakDays: 0 }
}
function recordSession(mins: number): SanctuaryStats {
  const today = new Date().toISOString().split('T')[0]
  const prev = loadStats()
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  const yStr = yest.toISOString().split('T')[0]
  let streak = prev.streakDays
  if (!prev.lastSessionDate) streak = 1
  else if (prev.lastSessionDate === today) { /* same day */ }
  else if (prev.lastSessionDate === yStr) streak = prev.streakDays + 1
  else streak = 1
  const next = { totalSessions: prev.totalSessions + 1, totalMinutes: prev.totalMinutes + mins, lastSessionDate: today, streakDays: streak }
  localStorage.setItem(STATS_KEY, JSON.stringify(next))
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
  const [sound, setSound] = useState('ocean')
  const [volume, setVolume] = useState(0.5)
  const [intention, setIntention] = useState('journal every trade')
  const [editingIntention, setEditingIntention] = useState(false)
  const [stats, setStats] = useState<SanctuaryStats>(loadStats)

  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const soundNodesRef = useRef<Stoppable[]>([])
  const cleanupFnRef = useRef<(() => void) | undefined>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(duration)
  useEffect(() => { durationRef.current = duration }, [duration])

  const stopAudio = useCallback(() => {
    soundNodesRef.current.forEach(n => { try { n.stop() } catch {} })
    soundNodesRef.current = []
    cleanupFnRef.current?.()
    cleanupFnRef.current = undefined
    gainRef.current?.disconnect()
    gainRef.current = null
  }, [])

  const startAudio = useCallback((snd: string, vol: number) => {
    stopAudio()
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    const gain = ctx.createGain()
    gain.gain.value = vol
    gain.connect(ctx.destination)
    gainRef.current = gain
    const result = buildSound(ctx, gain, snd)
    soundNodesRef.current = result.nodes
    cleanupFnRef.current = result.cleanup
  }, [stopAudio])

  const playBell = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.frequency.value = 528; osc.type = 'sine'
    g.gain.setValueAtTime(0.5, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3)
    osc.start(); osc.stop(ctx.currentTime + 3)
  }, [])

  const doEnd = useCallback((completedSecs: number) => {
    setRunning(false)
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
    setTimeout(playBell, 100)
    const mins = Math.max(1, Math.round(completedSecs / 60))
    setStats(recordSession(mins))
  }, [stopAudio, playBell])

  const handleStart = useCallback(() => {
    const d = durationRef.current
    setSessionStarted(true); setRunning(true); setRemaining(d)
    startAudio(sound, volume)
    setTimeout(playBell, 200)
    let elapsed = 0
    intervalRef.current = setInterval(() => {
      elapsed++
      setRemaining(r => {
        if (r <= 1) { setTimeout(() => doEnd(d), 0); return 0 }
        return r - 1
      })
    }, 1000)
    if (intervalBells && intervalSeconds > 0) {
      bellIntervalRef.current = setInterval(playBell, intervalSeconds * 1000)
    }
  }, [sound, volume, intervalBells, intervalSeconds, startAudio, playBell, doEnd])

  const handleReset = useCallback(() => {
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
    setRunning(false); setRemaining(durationRef.current); setSessionStarted(false)
  }, [stopAudio])

  const togglePause = useCallback(() => {
    if (running) {
      setRunning(false); stopAudio()
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else {
      setRunning(true); startAudio(sound, volume)
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { setTimeout(() => doEnd(durationRef.current), 0); return 0 }
          return r - 1
        })
      }, 1000)
    }
  }, [running, sound, volume, stopAudio, startAudio, doEnd])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.setTargetAtTime(volume, gainRef.current.context.currentTime, 0.05)
  }, [volume])

  useEffect(() => () => {
    stopAudio()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current)
    ctxRef.current?.close()
  }, [])

  const progress = 1 - remaining / duration
  const currentSound = SOUND_GROUPS.flatMap(g => g.sounds).find(s => s.value === sound)

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
      <div className="relative z-10 flex items-center justify-center w-full overflow-y-auto py-6">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <div className="flex justify-center mb-1"><span className="text-3xl">🪷</span></div>
          <h2 className="text-center font-semibold text-gray-800 dark:text-white mb-4">Meditation Session</h2>

          {sessionStarted ? (
            <div className="flex flex-col items-center">
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{currentSound?.emoji} {currentSound?.label}</p>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={togglePause} className="p-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition shadow">
                  {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={handleReset} className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
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
                    {INTERVAL_OPTIONS.map(o => <option key={o.seconds} value={o.seconds}>{o.label}</option>)}
                  </select>
                )}
              </div>

              {/* Ambient sound — grouped */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ambient Sound</label>
                <div className="space-y-2.5">
                  {SOUND_GROUPS.map(group => (
                    <div key={group.group}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{group.group}</p>
                      <div className="grid grid-cols-3 gap-1">
                        {group.sounds.map(s => (
                          <button key={s.value} onClick={() => setSound(s.value)}
                            className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] rounded-lg font-medium transition border ${
                              sound === s.value
                                ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300'
                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}>
                            <span className="text-base leading-none">{s.emoji}</span>
                            <span className="leading-tight text-center">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
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
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-48">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Today I Will</p>
          {editingIntention ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={intention} onChange={e => setIntention(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setEditingIntention(false)}
                className="flex-1 text-xs bg-transparent border-b border-brand-400 outline-none text-gray-800 dark:text-white" />
              <button onClick={() => setEditingIntention(false)} className="text-brand-500"><Check className="w-3.5 h-3.5" /></button>
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
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-48">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Your Progress</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Streak</span>
              <span className="font-semibold">{stats.streakDays > 0 ? `🔥 ${stats.streakDays}d` : '—'}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Sessions</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.totalSessions || '—'}</span>
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
