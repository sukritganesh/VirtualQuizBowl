import { useEffect, useRef, useState } from 'react'
import { speakQuestion, type AudioPreferences, type RoundAudio } from './audio'

export function useNarration(text: string, enabled: boolean, preferences: AudioPreferences, onFinished: () => void,
  round: RoundAudio, onLocalPlaying: () => void) {
  const [word, setWord] = useState(-1)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [browserFallback, setBrowserFallback] = useState(false)
  const cursor = useRef(0)
  const recording = useRef<{ key: string; start: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!enabled) return
    setFailed(false)
    setBrowserFallback(false)
    const words = text.split(' ')
    if (cursor.current >= words.length) { onFinished(); return }
    if (preferences.muted || preferences.volume === 0) {
      recording.current = null
      // Keep the read-along and both game windows playable even without a speech engine.
      let timer: number
      const advance = () => {
        setWord(cursor.current)
        timer = window.setTimeout(() => {
          cursor.current++
          if (cursor.current === words.length) onFinished()
          else advance()
        }, 320)
      }
      advance()
      return () => window.clearTimeout(timer)
    }
    const key = JSON.stringify([text, preferences.narrator])
    const saved = recording.current?.key === key ? recording.current : null
    const start = saved?.start ?? cursor.current
    let local = preferences.narrator.engine !== 'browser'
    setPreparing(preferences.narrator.engine !== 'browser')
    if (preferences.narrator.engine !== 'browser') setWord(-1)
    return speakQuestion(words.slice(start).join(' '), preferences, {
      onPlaying() { setPreparing(false); if (local) onLocalPlaying() },
      onPosition(seconds, duration) {
        recording.current = { key, start, seconds }
        // WAV has no word boundaries. Estimate a resume word only for switches to silent reading or another voice.
        cursor.current = Math.min(words.length - 1, start + Math.floor(seconds / duration * (words.length - start)))
      },
      onBrowserFallback() { local = false; recording.current = null; setPreparing(false); setBrowserFallback(true) },
      onWord(index) {
        cursor.current = start + index
        setWord(cursor.current)
      },
      onEnd() {
        cursor.current = words.length
        setWord(cursor.current - 1)
        onFinished()
      },
      onError() { setFailed(true) },
    }, saved?.seconds, start === 0 ? round : undefined)
  }, [text, enabled, attempt, preferences, onFinished, round, onLocalPlaying])

  function retry() {
    cursor.current = 0
    recording.current = null
    setWord(-1)
    setAttempt(value => value + 1)
  }
  return { word, failed, retry, preparing, browserFallback }
}
