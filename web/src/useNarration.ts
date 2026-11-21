import { useEffect, useRef, useState } from 'react'
import { speakQuestion, type AudioPreferences } from './audio'

export function useNarration(text: string, enabled: boolean, preferences: AudioPreferences, onFinished: () => void) {
  const [word, setWord] = useState(-1)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const cursor = useRef(0)

  useEffect(() => {
    if (!enabled) return
    setFailed(false)
    const words = text.split(' ')
    if (cursor.current >= words.length) { onFinished(); return }
    if (preferences.muted) {
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
    const start = cursor.current
    return speakQuestion(words.slice(start).join(' '), preferences, {
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
    })
  }, [text, enabled, attempt, preferences, onFinished])

  function retry() {
    cursor.current = 0
    setWord(-1)
    setAttempt(value => value + 1)
  }
  return { word, failed, retry }
}
