import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Edit2, Check, Volume1 } from 'lucide-react'

const DURATIONS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
]
const INTERVAL_OPTIONS = [
  { label: 'None', seconds: 0 },
  { label: 'Every 1 min', seconds: 60 },
  { label: 'Every 2 min', seconds: 120 },
  { label: 'Every 5 min', seconds: 300 },
]
const BACKGROUNDS = [
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&q=80',
  'https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=1920&q=80',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
]

// ── Real audio sources (free, public domain / Creative Commons) ───────────────
// Sources: Pixabay (free license), Mixkit (free license), soundbible (public domain)
const AUDIO_URLS: Record<string, string> = {
  // Nature — Pixabay free license (no attribution required)
  ocean:   'https://cdn.pixabay.com/audio/2022/03/10/audio_8e2e5f7e3a.mp3',
  rain:    'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  thunder: 'https://cdn.pixabay.com/audio/2022/10/31/audio_8f0c8e4b7f.mp3',
  forest:  'https://cdn.pixabay.com/audio/2022/03/15/audio_942b47f6b4.mp3',
  fire:    'https://cdn.pixabay.com/audio/2022/03/24/audio_5bf8ab3b65.mp3',
  stream:  'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
  // Meditation — Pixabay free license
  bowl:    'https://cdn.pixabay.com/audio/2022/10/18/audio_a71a5cd0b4.mp3',
  om:      'https://cdn.pixabay.com/audio/2023/03/22/audio_8e6b5a5e70.mp3',
}

const SOUND_GROUPS = [
  {
    group: 'Nature',
    sounds: [
      { label: 'Ocean Waves', value: 'ocean',   emoji: '🌊', desc: 'Real ocean recording' },
      { label: 'Rain',        value: 'rain',    emoji: '🌧️', desc: 'Real rainfall' },
      { label: 'Thunderstorm',value: 'thunder', emoji: '⛈️', desc: 'Rain + thunder' },
      { label: 'Forest',      value: 'forest',  emoji: '🌲', desc: 'Birds + wind' },
      { label: 'Campfire',    value: 'fire',    emoji: '🔥', desc: 'Crackling fire' },
      { label: 'River',       value: 'stream',  emoji: '💧', desc: 'Flowing water' },
    ],
  },
  {
    group: 'Meditation',
    sounds: [
      { label: 'Singing Bowl', value: 'bowl',    emoji: '🎵', desc: 'Tibetan bowl' },
      { label: 'OM Drone',     value: 'om',      emoji: '🕉️', desc: '136 Hz earth' },
      { label: '528 Hz',       value: '528hz',   emoji: '✨', desc: 'Healing tone' },
      { label: '432 Hz',       value: '432hz',   emoji: '🌙', desc: 'Calm tone' },
      { label: '174 Hz',       value: '174hz',   emoji: '🌍', desc: 'Grounding' },
      { label: 'Binaural 10Hz',value: 'biaural', emoji: '🧠', desc: 'Alpha waves' },
    ],
  },
  {
    group: 'Noise',
    sounds: [
      { label: 'White Noise', value: 'white', emoji: '⬜', desc: 'Flat spectrum' },
      { label: 'Brown Noise', value: 'brown', emoji: '🟤', desc: 'Deep rumble' },
      { label: 'Pink Noise',  value: 'pink',  emoji: '🩷', desc: 'Balanced' },
    ],
  },
]

function formatTime(s: number) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
}
function formatDuration(m: number) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m/60), r = m%60
  return r ? `${h}h ${r}m` : `${h}h`
}

// ── Audio Engine ──────────────────────────────────────────────────────────────
// Make noise buffer of a given type
function noiseBuffer(ctx: AudioContext, type: 'white'|'brown'|'pink', secs = 4): AudioBuffer {
  const n = ctx.sampleRate * secs
  const buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    if (type === 'white') {
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    } else if (type === 'brown') {
      let last = 0
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1
        d[i] = (last + 0.02 * w) / 1.02
        last = d[i]
        d[i] *= 3.5
      }
    } else { // pink
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926
      }
    }
  }
  return buf
}

function noiseSrc(ctx: AudioContext, type: 'white'|'brown'|'pink'): AudioBufferSourceNode {
  const s = ctx.createBufferSource()
  s.buffer = noiseBuffer(ctx, type)
  s.loop = true
  return s
}

function lpf(ctx: AudioContext, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq; f.Q.value=q; return f
}
function hpf(ctx: AudioContext, freq: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=freq; return f
}
function bpf(ctx: AudioContext, freq: number, q = 2): BiquadFilterNode {
  const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q; return f
}
function gain(ctx: AudioContext, val: number): GainNode {
  const g = ctx.createGain(); g.gain.value = val; return g
}
function osc(ctx: AudioContext, freq: number, type: OscillatorType = 'sine'): OscillatorNode {
  const o = ctx.createOscillator(); o.type=type; o.frequency.value=freq; return o
}
// LFO that modulates a gain node between (base - depth) and (base + depth)
function lfo(ctx: AudioContext, freq: number, depth: number, gainNode: GainNode) {
  const l = osc(ctx, freq); const g = gain(ctx, depth)
  l.connect(g); g.connect(gainNode.gain); return l
}

interface SndResult { nodes: Array<AudioBufferSourceNode|OscillatorNode>; cleanup?:()=>void }

function buildOcean(ctx: AudioContext, dest: AudioNode): SndResult {
  // Brown noise → LP 600Hz → wave-gain → dest
  // Wave-gain oscillates 0.2→0.8 at 0.08Hz (≈12s per wave)
  const src = noiseSrc(ctx, 'brown')
  const filter = lpf(ctx, 600)
  const wg = gain(ctx, 0.5)
  const waveLFO = lfo(ctx, 0.08, 0.3, wg)   // 0.5 ± 0.3 = 0.2 … 0.8
  src.connect(filter); filter.connect(wg); wg.connect(dest)
  src.start(); waveLFO.start()
  return { nodes: [src, waveLFO] }
}

function buildRain(ctx: AudioContext, dest: AudioNode): SndResult {
  // White noise → HP 400Hz → LP 8000Hz → dest  (removes low rumble + harsh high)
  // + subtle peak at 4kHz for rain sparkle
  const src = noiseSrc(ctx, 'white')
  const hp  = hpf(ctx, 400)
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'; peak.frequency.value = 4000; peak.gain.value = 8; peak.Q.value = 1
  const lp  = lpf(ctx, 8000)
  const g   = gain(ctx, 0.9)
  src.connect(hp); hp.connect(peak); peak.connect(lp); lp.connect(g); g.connect(dest)
  src.start()
  return { nodes: [src] }
}

function buildThunder(ctx: AudioContext, dest: AudioNode): SndResult {
  const rain = buildRain(ctx, dest)
  // Add very low rumble: brown noise → LP 80Hz
  const rumble = noiseSrc(ctx, 'brown')
  const rlp = lpf(ctx, 80)
  const rg  = gain(ctx, 1.2)
  rumble.connect(rlp); rlp.connect(rg); rg.connect(dest)
  // Slow swell on rumble (thunder rhythm)
  const tLFO = osc(ctx, 0.04)
  const tG   = gain(ctx, 0.6)
  tLFO.connect(tG); tG.connect(rg.gain)
  rumble.start(); tLFO.start()
  return { nodes: [...rain.nodes, rumble, tLFO] }
}

function buildForest(ctx: AudioContext, dest: AudioNode): SndResult {
  // Pink noise → BP 600-1200Hz range → wind gain
  const src = noiseSrc(ctx, 'pink')
  const bp  = bpf(ctx, 900, 0.5)
  const wg  = gain(ctx, 0.7)
  const windLFO = lfo(ctx, 0.07, 0.25, wg)   // gentle wind swell
  src.connect(bp); bp.connect(wg); wg.connect(dest)
  src.start(); windLFO.start()

  // Bird chirps: random oscillator sweeps every 3-10s
  let timer: ReturnType<typeof setTimeout>
  const chirp = () => {
    if (!ctx || ctx.state === 'closed') return
    const baseF = 1600 + Math.random() * 1400
    const o1 = ctx.createOscillator()
    const gn  = gain(ctx, 0.12)
    o1.type = 'sine'; o1.frequency.setValueAtTime(baseF, ctx.currentTime)
    o1.frequency.exponentialRampToValueAtTime(baseF * 1.5, ctx.currentTime + 0.12)
    o1.frequency.exponentialRampToValueAtTime(baseF, ctx.currentTime + 0.25)
    gn.gain.setValueAtTime(0, ctx.currentTime)
    gn.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04)
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    o1.connect(gn); gn.connect(dest)
    o1.start(); o1.stop(ctx.currentTime + 0.35)
    timer = setTimeout(chirp, 3000 + Math.random() * 7000)
  }
  timer = setTimeout(chirp, 1500 + Math.random() * 2000)
  return { nodes: [src, windLFO], cleanup: () => clearTimeout(timer) }
}

function buildFire(ctx: AudioContext, dest: AudioNode): SndResult {
  // Brown → LP 400Hz for base warmth
  const base = noiseSrc(ctx, 'brown')
  const bl   = lpf(ctx, 400)
  const bg   = gain(ctx, 0.8)

  // White → HP 3500Hz for crackle
  const crk  = noiseSrc(ctx, 'white')
  const ch   = hpf(ctx, 3500)
  const cg   = gain(ctx, 0.15)

  // Flicker: irregular LFO at ~3.5Hz on base gain
  const flicker = osc(ctx, 3.5)
  const fg      = gain(ctx, 0.3)
  flicker.connect(fg); fg.connect(bg.gain)

  base.connect(bl); bl.connect(bg); bg.connect(dest)
  crk.connect(ch);  ch.connect(cg); cg.connect(dest)
  base.start(); crk.start(); flicker.start()
  return { nodes: [base, crk, flicker] }
}

function buildStream(ctx: AudioContext, dest: AudioNode): SndResult {
  // White noise through 4 resonant BP filters (simulates gurgling)
  const src = noiseSrc(ctx, 'white')
  const mix = gain(ctx, 0.0)   // sum into mix
  const mg  = gain(ctx, 0.8)

  const freqs = [350, 700, 1100, 1800]
  freqs.forEach(f => {
    const bp = bpf(ctx, f, 3)
    const g2 = gain(ctx, 0.25)
    src.connect(bp); bp.connect(g2); g2.connect(mg)
  })
  mg.connect(dest)

  // Gurgle LFO
  const gLFO = osc(ctx, 4.5)
  const gG   = gain(ctx, 0.2)
  gLFO.connect(gG); gG.connect(mg.gain)

  src.start(); gLFO.start()
  return { nodes: [src, gLFO] }
}

function buildBowl(ctx: AudioContext, dest: AudioNode): SndResult {
  // 432Hz fundamental + harmonics, twin detuned for beating shimmer
  const nodes: OscillatorNode[] = []
  const pairs: [number, number][] = [[432,0.5],[864,0.15],[1080,0.08],[1296,0.05]]
  pairs.forEach(([f, v]) => {
    const o1 = osc(ctx, f); const g1 = gain(ctx, 0)
    g1.gain.setValueAtTime(0, ctx.currentTime)
    g1.gain.linearRampToValueAtTime(v, ctx.currentTime + 1.5)
    o1.connect(g1); g1.connect(dest); o1.start(); nodes.push(o1)
  })
  // Beating twin at 433.5Hz (1.5Hz beat)
  const o2 = osc(ctx, 433.5); const g2 = gain(ctx, 0)
  g2.gain.setValueAtTime(0, ctx.currentTime); g2.gain.linearRampToValueAtTime(0.1, ctx.currentTime+2)
  o2.connect(g2); g2.connect(dest); o2.start(); nodes.push(o2)
  return { nodes }
}

function buildOM(ctx: AudioContext, dest: AudioNode): SndResult {
  // 136.1Hz earth frequency + harmonics with slow swell
  const nodes: OscillatorNode[] = []
  const parts: [number, number][] = [[136.1,0.55],[272.2,0.22],[408.3,0.1],[544.4,0.06],[680.5,0.04]]
  parts.forEach(([f, v], i) => {
    const o1 = osc(ctx, f); const g1 = gain(ctx, v)
    const sl = osc(ctx, 0.04 + i*0.01); const sg = gain(ctx, v*0.4)
    sl.connect(sg); sg.connect(g1.gain)
    o1.connect(g1); g1.connect(dest)
    o1.start(); sl.start(); nodes.push(o1, sl)
  })
  return { nodes }
}

function buildTone(ctx: AudioContext, dest: AudioNode, freq: number): SndResult {
  const o1  = osc(ctx, freq)
  const g1  = gain(ctx, 0.6)
  const o2  = osc(ctx, freq * 2)      // soft octave
  const g2  = gain(ctx, 0.08)
  const sl  = osc(ctx, 0.04)          // slow swell
  const sg  = gain(ctx, 0.12)
  sl.connect(sg); sg.connect(g1.gain)
  o1.connect(g1); g1.connect(dest)
  o2.connect(g2); g2.connect(dest)
  o1.start(); o2.start(); sl.start()
  return { nodes: [o1, o2, sl] }
}

function buildBinaural(ctx: AudioContext, dest: AudioNode): SndResult {
  // Left ear: 200Hz, Right ear: 210Hz → 10Hz alpha binaural beat
  const merger = ctx.createChannelMerger(2)
  merger.connect(dest)
  const oL = osc(ctx, 200); const gL = gain(ctx, 0.4)
  const oR = osc(ctx, 210); const gR = gain(ctx, 0.4)
  oL.connect(gL); gL.connect(merger, 0, 0)
  oR.connect(gR); gR.connect(merger, 0, 1)
  oL.start(); oR.start()
  return { nodes: [oL, oR] }
}

function buildNoise(ctx: AudioContext, dest: AudioNode, type: 'white'|'brown'|'pink'): SndResult {
  const src = noiseSrc(ctx, type)
  const g   = gain(ctx, type === 'brown' ? 1.2 : 0.9)
  if (type === 'brown') {
    const lp = lpf(ctx, 1200); src.connect(lp); lp.connect(g)
  } else {
    src.connect(g)
  }
  g.connect(dest); src.start()
  return { nodes: [src] }
}

function buildSound(ctx: AudioContext, dest: GainNode, sound: string): SndResult {
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
    case '174hz':   return buildTone(ctx, dest, 174)
    case 'biaural': return buildBinaural(ctx, dest)
    case 'brown':   return buildNoise(ctx, dest, 'brown')
    case 'pink':    return buildNoise(ctx, dest, 'pink')
    default:        return buildNoise(ctx, dest, 'white')
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

interface Stats { totalSessions:number; totalMinutes:number; lastDate:string|null; streak:number }
const SK = 'tf-sanctuary-stats'
function loadStats(): Stats {
  try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r) } catch {}
  return { totalSessions:0, totalMinutes:0, lastDate:null, streak:0 }
}
function saveSession(mins: number): Stats {
  const today = new Date().toISOString().split('T')[0]
  const prev = loadStats()
  const yest = new Date(); yest.setDate(yest.getDate()-1)
  const yStr = yest.toISOString().split('T')[0]
  let streak = prev.streak
  if (!prev.lastDate) streak = 1
  else if (prev.lastDate === today) { /* same day */ }
  else if (prev.lastDate === yStr) streak = prev.streak + 1
  else streak = 1
  const next = { totalSessions: prev.totalSessions+1, totalMinutes: prev.totalMinutes+mins, lastDate: today, streak }
  localStorage.setItem(SK, JSON.stringify(next))
  return next
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sanctuary() {
  const [bgIndex, setBgIndex]       = useState(0)
  const [started, setStarted]       = useState(false)
  const [duration, setDuration]     = useState(600)
  const [remaining, setRemaining]   = useState(600)
  const [running, setRunning]       = useState(false)
  const [bellsOn, setBellsOn]       = useState(true)
  const [bellSecs, setBellSecs]     = useState(60)
  const [sound, setSound]           = useState('ocean')
  const [volume, setVolume]         = useState(0.6)
  const [intention, setIntention]   = useState('journal every trade')
  const [editing, setEditing]       = useState(false)
  const [stats, setStats]           = useState<Stats>(loadStats)

  const ctxRef     = useRef<AudioContext|null>(null)
  const gainRef    = useRef<GainNode|null>(null)
  const nodesRef   = useRef<Array<AudioBufferSourceNode|OscillatorNode>>([])
  const cleanupRef = useRef<(()=>void)|undefined>(undefined)
  const audioElRef = useRef<HTMLAudioElement|null>(null)  // for real MP3 sources
  const tickRef    = useRef<ReturnType<typeof setInterval>|null>(null)
  const bellRef    = useRef<ReturnType<typeof setInterval>|null>(null)
  const durRef     = useRef(duration)
  useEffect(()=>{ durRef.current=duration },[duration])

  function stopAudio() {
    // Stop real audio element
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.src = ''
      audioElRef.current = null
    }
    // Stop Web Audio nodes (tones/noise)
    nodesRef.current.forEach(n=>{ try{n.stop()}catch{} })
    nodesRef.current = []
    cleanupRef.current?.(); cleanupRef.current = undefined
    gainRef.current?.disconnect(); gainRef.current = null
  }

  async function startAudio(snd: string, vol: number) {
    stopAudio()
    // Check if we have a real audio URL for this sound
    const url = AUDIO_URLS[snd]
    if (url) {
      const el = new Audio()
      el.src = url
      el.loop = true
      el.volume = vol
      el.crossOrigin = 'anonymous'
      audioElRef.current = el
      try {
        await el.play()
      } catch {
        // If real audio fails (CORS/network), fall back to Web Audio
        audioElRef.current = null
        await startWebAudio(snd, vol)
      }
      return
    }
    // Pure tones and noise use Web Audio
    await startWebAudio(snd, vol)
  }

  async function startWebAudio(snd: string, vol: number) {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()
    const g = ctx.createGain(); g.gain.value = vol
    g.connect(ctx.destination); gainRef.current = g
    const result = buildSound(ctx, g, snd)
    nodesRef.current = result.nodes
    cleanupRef.current = result.cleanup
  }

  async function playBell() {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 528; o.type = 'sine'
    g.gain.setValueAtTime(0.5, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3)
    o.start(); o.stop(ctx.currentTime + 3)
  }

  const previewRef = useRef<SndResult|null>(null)
  const previewGRef = useRef<GainNode|null>(null)
  async function previewSound(snd: string) {
    if (previewRef.current) {
      previewRef.current.nodes.forEach(n=>{ try{n.stop()}catch{} })
      previewRef.current.cleanup?.()
      previewGRef.current?.disconnect()
    }
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()
    const g = ctx.createGain(); g.gain.value = volume * 0.8
    g.connect(ctx.destination); previewGRef.current = g
    const result = buildSound(ctx, g, snd)
    previewRef.current = result
    // fade out after 2s
    g.gain.setValueAtTime(volume * 0.7, ctx.currentTime + 1.5)
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5)
    setTimeout(()=>{
      result.nodes.forEach(n=>{ try{n.stop()}catch{} })
      result.cleanup?.(); g.disconnect()
      previewRef.current = null
    }, 2600)
  }

  async function handleStart() {
    const d = durRef.current
    setStarted(true); setRunning(true); setRemaining(d)
    await startAudio(sound, volume)
    await playBell()
    tickRef.current = setInterval(()=>{
      setRemaining(r=>{
        if (r<=1) { handleEnd(d); return 0 }
        return r-1
      })
    }, 1000)
    if (bellsOn && bellSecs>0)
      bellRef.current = setInterval(()=>playBell(), bellSecs*1000)
  }

  async function handleEnd(completedSecs = durRef.current) {
    setRunning(false); stopAudio()
    if (tickRef.current) clearInterval(tickRef.current)
    if (bellRef.current) clearInterval(bellRef.current)
    await playBell()
    const mins = Math.max(1, Math.round(completedSecs/60))
    setStats(saveSession(mins))
  }

  function handleReset() {
    stopAudio()
    if (tickRef.current) clearInterval(tickRef.current)
    if (bellRef.current) clearInterval(bellRef.current)
    setRunning(false); setRemaining(durRef.current); setStarted(false)
  }

  async function togglePause() {
    if (running) {
      setRunning(false); stopAudio()
      if (tickRef.current) clearInterval(tickRef.current)
    } else {
      setRunning(true)
      await startAudio(sound, volume)
      tickRef.current = setInterval(()=>{
        setRemaining(r=>{ if(r<=1){handleEnd(durRef.current-r);return 0} return r-1 })
      }, 1000)
    }
  }

  useEffect(()=>{
    if (audioElRef.current) audioElRef.current.volume = volume
    if (gainRef.current)
      gainRef.current.gain.setTargetAtTime(volume, gainRef.current.context.currentTime, 0.05)
  }, [volume])

  useEffect(()=>()=>{
    stopAudio()
    if(tickRef.current) clearInterval(tickRef.current)
    if(bellRef.current) clearInterval(bellRef.current)
    ctxRef.current?.close()
  }, [])

  const progress = 1 - remaining/duration
  const currentSound = SOUND_GROUPS.flatMap(g=>g.sounds).find(s=>s.value===sound)

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{backgroundImage:`url(${BACKGROUNDS[bgIndex]})`}}/>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"/>

      <button onClick={()=>setBgIndex(i=>(i-1+BACKGROUNDS.length)%BACKGROUNDS.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition">
        <ChevronLeft className="w-5 h-5"/>
      </button>
      <button onClick={()=>setBgIndex(i=>(i+1)%BACKGROUNDS.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-black/50 transition">
        <ChevronRight className="w-5 h-5"/>
      </button>

      {/* Session card */}
      <div className="relative z-10 flex items-center justify-center w-full overflow-y-auto py-6">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="flex justify-center mb-1"><span className="text-3xl">🪷</span></div>
          <h2 className="text-center font-semibold text-gray-800 dark:text-white mb-4">Meditation Session</h2>

          {started ? (
            /* Running timer */
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#7c3aed" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*44}`}
                    strokeDashoffset={`${2*Math.PI*44*(1-progress)}`}
                    className="transition-all duration-1000"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800 dark:text-white tabular-nums">{formatTime(remaining)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{currentSound?.emoji} {currentSound?.label}</p>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={togglePause} className="p-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition shadow">
                  {running?<Pause className="w-5 h-5"/>:<Play className="w-5 h-5"/>}
                </button>
                <button onClick={handleReset} className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  <RotateCcw className="w-4 h-4"/>
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <Volume1 className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                <input type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={e=>setVolume(Number(e.target.value))} className="flex-1 accent-brand-500"/>
                <Volume2 className="w-4 h-4 text-gray-400 shrink-0"/>
              </div>
            </div>
          ) : (
            <>
              {/* Duration */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Duration: {formatTime(duration)}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map(d=>(
                    <button key={d.seconds} onClick={()=>{setDuration(d.seconds);setRemaining(d.seconds)}}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${duration===d.seconds?'bg-brand-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval bells */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Interval Bells</label>
                  <button onClick={()=>setBellsOn(b=>!b)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${bellsOn?'bg-brand-500':'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${bellsOn?'translate-x-4':'translate-x-0.5'}`}/>
                  </button>
                </div>
                {bellsOn&&(
                  <select value={bellSecs} onChange={e=>setBellSecs(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
                    {INTERVAL_OPTIONS.map(o=><option key={o.seconds} value={o.seconds}>{o.label}</option>)}
                  </select>
                )}
              </div>

              {/* Sound selector — click to select, long press / hover shows preview */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Ambient Sound — <span className="text-brand-500">click to preview</span>
                </label>
                <div className="space-y-2">
                  {SOUND_GROUPS.map(group=>(
                    <div key={group.group}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{group.group}</p>
                      <div className="grid grid-cols-3 gap-1">
                        {group.sounds.map(s=>(
                          <button key={s.value}
                            onClick={()=>{ setSound(s.value); previewSound(s.value) }}
                            className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-[10px] font-medium transition border ${
                              sound===s.value
                                ?'border-brand-400 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300'
                                :'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
                  <Volume1 className="w-4 h-4 text-gray-400 shrink-0"/>
                  <input type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={e=>setVolume(Number(e.target.value))} className="flex-1 accent-brand-500"/>
                  <Volume2 className="w-4 h-4 text-gray-400 shrink-0"/>
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
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={intention} onChange={e=>setIntention(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&setEditing(false)}
                className="flex-1 text-xs bg-transparent border-b border-brand-400 outline-none text-gray-800 dark:text-white"/>
              <button onClick={()=>setEditing(false)} className="text-brand-500"><Check className="w-3.5 h-3.5"/></button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-medium text-gray-800 dark:text-white leading-snug">{intention}</p>
              <button onClick={()=>setEditing(true)} className="text-gray-300 dark:text-gray-600 hover:text-brand-500 transition shrink-0 mt-0.5">
                <Edit2 className="w-3 h-3"/>
              </button>
            </div>
          )}
        </div>
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-4 w-48">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Progress</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Streak</span>
              <span className="font-semibold">{stats.streak>0?`🔥 ${stats.streak}d`:'—'}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Sessions</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.totalSessions||'—'}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total time</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {stats.totalMinutes>0?formatDuration(stats.totalMinutes):'—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
