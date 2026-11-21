import soundLibrary from './soundLibrary.json' with { type: 'json' }

export { soundLibrary }
export type SoundCue = keyof typeof soundLibrary
export const soundCues = Object.keys(soundLibrary) as SoundCue[]
type SoundPicks = Record<SoundCue, string>

function readSoundPicks(saved: Partial<SoundPicks> | null = {}): SoundPicks {
  const picks = {} as SoundPicks
  for (const cue of soundCues) {
    const { options } = soundLibrary[cue]
    // The first clip is the chosen default for this cue.
    picks[cue] = (options.find(clip => clip.file === saved?.[cue]) ?? options[0]).file
  }
  return picks
}

export type AudioPreferences = { volume: number; musicVolume: number; muted: boolean; voiceURI: string; sounds: SoundPicks }
export const defaultAudio: AudioPreferences = { volume: 100, musicVolume: 30, muted: false, voiceURI: '', sounds: readSoundPicks() }

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
      voiceURI: typeof saved.voiceURI === 'string' ? saved.voiceURI : '',
      sounds: readSoundPicks(saved.sounds),
    }
  } catch {
    return defaultAudio
  }
}

/** Use the same clip and audition-level gain for a settings preview and a round. */
export function playSound(cue: SoundCue, picks: SoundPicks, onFinish?: (failed: boolean) => void) {
  const { options } = soundLibrary[cue]
  const clip = options.find(option => option.file === picks[cue]) ?? options[0]
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
  speech.voice = chooseVoice(window.speechSynthesis.getVoices(), preferences.voiceURI)
  speech.lang = speech.voice?.lang ?? 'en-US'
  speech.volume = preferences.muted ? 0 : preferences.volume / 100
  return speech
}

export function speakQuestion(text: string, preferences: AudioPreferences, events: {
  onWord: (index: number) => void
  onEnd: () => void
  onError: () => void
}) {
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
  speech.onstart = () => { if (active) allowPlayback() }
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
