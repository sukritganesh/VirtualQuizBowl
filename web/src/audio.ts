import soundLibrary from './soundLibrary.json' with { type: 'json' }
import narrators from '../../shared/narrators.json' with { type: 'json' }
import { followWordCues, readWordCues, type WordCue } from './wordTimings.ts'

export { soundLibrary, narrators }
export type Engine = keyof typeof narrators
export type Narrator = { engine: Engine; voice: string; speaker: number }
export const voiceSample = 'The quick brown fox jumps over the lazy dog.'
export function modelDefault(engine: Engine): Narrator {
  return { engine, voice: narrators[engine].default, speaker: 0 }
}
export function speakerNames(voice: string): string[] {
  const names: Record<string, string[]> = narrators.piper.speakers
  return Object.hasOwn(names, voice) ? names[voice] : []
}
function readNarrator(saved?: Partial<Narrator>, legacyURI?: unknown): Narrator {
  if (typeof saved?.engine !== 'string' || !Object.hasOwn(narrators, saved.engine)) {
    return typeof legacyURI === 'string' && legacyURI
      ? { engine: 'browser', voice: legacyURI, speaker: 0 } : modelDefault('kokoro')
  }
  const { engine, voice, speaker } = saved
  if (typeof voice !== 'string' || (engine !== 'browser' && !narrators[engine].voices.includes(voice))) return modelDefault(engine)
  const validSpeaker = engine === 'piper' && typeof speaker === 'number' && Number.isInteger(speaker) && speaker >= 0 && speaker < speakerNames(voice).length
  return { engine, voice, speaker: validSpeaker ? speaker : 0 }
}
export type SoundCue = keyof typeof soundLibrary
export const soundCues = Object.keys(soundLibrary) as SoundCue[]
type SoundPicks = Record<SoundCue, string>

const originalSoundDefaults: SoundPicks = {
  buzzer: 'twoTone1.ogg', correct: 'confirmation_001.ogg', incorrect: 'lowDown.ogg', timeout: 'sfx_alarm_loop3.wav',
}

function readSoundPicks(saved?: Partial<SoundPicks> | null, legacy = false): SoundPicks {
  const picks = {} as SoundPicks
  for (const cue of soundCues) {
    const { options } = soundLibrary[cue]
    // The original picker saved every default even if the player never opened Settings.
    const file = saved?.[cue]
    const inherited = legacy && file === originalSoundDefaults[cue]
    picks[cue] = (inherited ? options[0] : options.find(clip => clip.file === file) ?? options[0]).file
  }
  return picks
}

export type AudioPreferences = { volume: number; musicVolume: number; muted: boolean; narrator: Narrator; sounds: SoundPicks }
export const defaultAudio: AudioPreferences = { volume: 100, musicVolume: 30, muted: false, narrator: modelDefault('kokoro'), sounds: readSoundPicks() }

export function serializeAudioPreferences(preferences: AudioPreferences) {
  return JSON.stringify({ ...preferences, soundDefaultsVersion: 2 })
}

function readVolume(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback
}

export function readAudioPreferences(raw: string | null): AudioPreferences {
  try {
    const saved = JSON.parse(raw ?? '{}')
    return {
      volume: readVolume(saved.volume, defaultAudio.volume),
      musicVolume: readVolume(saved.musicVolume, defaultAudio.musicVolume),
      muted: saved.muted === true,
      narrator: readNarrator(saved.narrator, saved.voiceURI),
      sounds: readSoundPicks(saved.sounds, saved.soundDefaultsVersion === undefined),
    }
  } catch {
    return defaultAudio
  }
}

/** Use the same clip and audition-level gain for a settings preview and a round. */
export function playSound(cue: SoundCue, file: string, onFinish?: (failed: boolean) => void) {
  const { options } = soundLibrary[cue]
  const clip = options.find(option => option.file === file) ?? options[0]
  const player = new Audio(import.meta.env.BASE_URL + 'sounds/' + clip.file)
  player.volume = 0.6 * clip.gain
  function finish(failed: boolean) {
    player.onended = player.onerror = null
    onFinish?.(failed)
    onFinish = undefined
  }
  player.onended = () => finish(false)
  player.onerror = () => finish(true)
  void player.play().catch(() => finish(true))
  return () => {
    onFinish = undefined
    player.onended = player.onerror = null
    player.pause()
  }
}

export function chooseVoice(voices: SpeechSynthesisVoice[], uri: string) {
  const selected = voices.find(voice => voice.voiceURI === uri)
  if (selected) return selected
  const english = voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang))
  const local = english.filter(voice => voice.localService)
  return local.find(voice => /\b(natural|neural|enhanced|premium)\b/i.test(voice.name))
    ?? local.find(voice => voice.default) ?? local[0] ?? english[0] ?? null
}

export function hostUtterance(text: string, preferences: AudioPreferences) {
  const speech = new SpeechSynthesisUtterance(text)
  speech.voice = chooseVoice(window.speechSynthesis.getVoices(), preferences.narrator.voice)
  speech.lang = speech.voice?.lang ?? 'en-US'
  speech.volume = preferences.muted ? 0 : preferences.volume / 100
  return speech
}

type SpeechEvents = {
  onWord: (index: number) => void
  onPlaying?: () => void
  onEnd: () => void
  onError: (message?: string) => void
  onPosition?: (seconds: number, duration: number, hasWordCues: boolean) => void
  onBrowserFallback?: () => void
}

function browserSpeech(text: string, preferences: AudioPreferences, events: SpeechEvents) {
  const synth = window.speechSynthesis
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    events.onError()
    return
  }
  const speech = hostUtterance(text, preferences)
  let active = true
  let watchdog = window.setTimeout(fail, 12000)
  function cancel() {
    if (!active) return
    active = false
    window.clearTimeout(watchdog)
    synth.cancel()
  }
  function fail() {
    if (!active) return
    cancel()
    events.onError()
  }
  // Some voices only report start and end. Allow time to read the entire question.
  function allowPlayback() {
    window.clearTimeout(watchdog)
    watchdog = window.setTimeout(fail, 12000 + text.length * 100)
  }
  speech.onstart = () => { if (active) { allowPlayback(); events.onPlaying?.() } }
  speech.onboundary = event => {
    if (!active || event.name === 'sentence') return
    allowPlayback()
    events.onWord(text.slice(0, event.charIndex).split(' ').length - 1)
  }
  speech.onend = () => {
    if (!active) return
    active = false
    window.clearTimeout(watchdog)
    events.onEnd()
  }
  speech.onerror = fail
  synth.speak(speech)
  return cancel
}

type NarrationClip = { wav: Blob; cues: WordCue[] }

async function fetchNarration(text: string, narrator: Narrator, signal: AbortSignal): Promise<NarrationClip> {
  const response = await fetch('/api/narration', { method: 'POST', signal, cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...narrator, text }) })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/wav')) {
    const error = await response.json().catch(() => null)
    throw new Error(typeof error?.detail === 'string' ? error.detail : 'The local narrator is unavailable.')
  }
  return { wav: await response.blob(), cues: readWordCues(response.headers, text.trim().split(/\s+/).length) }
}

/** A session owns the two requests so moving to the next question can join a render already in flight. */
export class RoundAudio {
  private clips = new Map<string, { controller: AbortController; audio: Promise<NarrationClip> }>()

  private key(text: string, { engine, voice, speaker }: Narrator) {
    return JSON.stringify([engine, voice, speaker, text])
  }

  keep(texts: string[], narrator: Narrator) {
    const wanted = new Set(texts.map(text => this.key(text, narrator)))
    for (const [key, clip] of this.clips) {
      if (!wanted.has(key)) {
        clip.controller.abort()
        this.clips.delete(key)
      }
    }
  }

  clear() {
    for (const clip of this.clips.values()) clip.controller.abort()
    this.clips.clear()
  }

  prepare(text: string, narrator: Narrator) {
    const key = this.key(text, narrator)
    const existing = this.clips.get(key)
    if (existing) return existing.audio
    const controller = new AbortController()
    const audio = fetchNarration(text, narrator, AbortSignal.any([controller.signal, AbortSignal.timeout(130000)]))
    this.clips.set(key, { controller, audio })
    return audio
  }

  async read(text: string, narrator: Narrator) {
    const audio = this.prepare(text, narrator)
    try { return await audio } catch (error) {
      // Deliver a failed preload to the normal fallback once. A later retry can render again.
      const key = this.key(text, narrator)
      if (this.clips.get(key)?.audio === audio) this.clips.delete(key)
      throw error
    }
  }
}

export function speakQuestion(text: string, preferences: AudioPreferences, events: SpeechEvents, offset = 0, round?: RoundAudio) {
  if (preferences.narrator.engine === 'browser') return browserSpeech(text, preferences, events)
  const controller = new AbortController()
  const player = new Audio()
  player.preload = 'auto'
  let url: string | undefined
  let fallback: (() => void) | undefined
  let clip: NarrationClip
  let stopFollowing: (() => void) | undefined
  let active = true
  let watchdog = window.setTimeout(() => fail('Narration timed out.'), 135000)
  function position() {
    if (player.currentTime > 0 && Number.isFinite(player.duration)) {
      events.onPosition?.(player.currentTime, player.duration, Boolean(clip?.cues.length))
    }
  }
  function stop() {
    if (!active) return
    active = false
    window.clearTimeout(watchdog)
    controller.abort()
    fallback?.()
    stopFollowing?.()
    position()
    player.onended = player.onerror = player.ontimeupdate = player.onloadedmetadata = player.onplaying = null
    player.pause()
    player.removeAttribute('src')
    player.load()
    if (url) URL.revokeObjectURL(url)
  }
  function fail(message?: string) {
    if (!active) return
    stop()
    events.onError(message)
  }
  function watchPlayback() {
    window.clearTimeout(watchdog)
    watchdog = window.setTimeout(() => fail('Audio playback stalled.'), 15000)
  }
  async function play() {
    try {
      clip = await (round ? round.read(text, preferences.narrator) : fetchNarration(text, preferences.narrator, controller.signal))
    } catch (error) {
      if (!active) return
      if (!events.onBrowserFallback) { fail(error instanceof Error ? error.message : undefined); return }
      // A static or offline game can still read questions. Previews always use the requested voice.
      window.clearTimeout(watchdog)
      events.onBrowserFallback()
      fallback = browserSpeech(text, { ...preferences, narrator: modelDefault('browser') }, events)
      return
    }
    if (!active) return
    url = URL.createObjectURL(clip.wav)
    player.volume = preferences.muted ? 0 : preferences.volume / 100
    player.onerror = () => fail('This voice could not play.')
    player.onplaying = () => {
      if (!active) return
      stopFollowing?.()
      stopFollowing = followWordCues(clip.cues, player, events.onWord)
      events.onPlaying?.()
    }
    player.onended = () => { if (active) { stop(); events.onEnd() } }
    player.ontimeupdate = () => { if (active) { position(); watchPlayback() } }
    player.onloadedmetadata = () => {
      if (!active) return
      if (offset > 0 && offset < player.duration) player.currentTime = offset
      void player.play().catch(() => fail('This voice could not play.'))
    }
    watchPlayback()
    player.src = url
  }
  void play()
  return stop
}
