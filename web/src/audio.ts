export type AudioPreferences = { volume: number; muted: boolean; voiceURI: string }
export const defaultAudio: AudioPreferences = { volume: 100, muted: false, voiceURI: '' }

export function readAudioPreferences(raw: string | null): AudioPreferences {
  try {
    const saved = JSON.parse(raw ?? '{}')
    return {
      volume: Number.isInteger(saved.volume) && saved.volume >= 1 && saved.volume <= 100 ? saved.volume : defaultAudio.volume,
      muted: saved.muted === true,
      voiceURI: typeof saved.voiceURI === 'string' ? saved.voiceURI : '',
    }
  } catch {
    return defaultAudio
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
