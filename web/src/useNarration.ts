import { useEffect, useRef, useState } from 'react'
import { hostUtterance, type AudioPreferences } from './audio'

// Each short phrase supplies a real completion boundary on voices without word events.
function nextPhrase(words: string[], start: number) {
  let end = start + 1
  while (end < words.length && end - start < 8 && !/[,;:]$/.test(words[end - 1])) end++
  return words.slice(start, end)
}

export function useNarration(text: string, enabled: boolean, preferences: AudioPreferences, onFinished: () => void) {
  const [word, setWord] = useState(-1)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const cursor = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const synth = window.speechSynthesis
    let watchdog: number
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
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      setFailed(true)
      return
    }
    const fail = () => {
      if (!active) return
      active = false
      window.clearTimeout(watchdog)
      synth.cancel()
      setFailed(true)
    }
    let utterance: SpeechSynthesisUtterance
    const speak = () => {
      const start = cursor.current
      const phrase = nextPhrase(words, start)
      utterance = hostUtterance(phrase.join(' '), preferences)
      utterance.onboundary = event => {
        if (!active || event.name === 'sentence') return
        const preceding = phrase.join(' ').slice(0, event.charIndex)
        cursor.current = start + Math.min(phrase.length - 1, preceding.split(' ').length - 1)
        setWord(cursor.current)
      }
      utterance.onend = () => {
        if (!active) return
        clearTimeout(watchdog)
        cursor.current = start + phrase.length
        setWord(cursor.current - 1)
        if (cursor.current === words.length) onFinished()
        else speak()
      }
      utterance.onerror = fail
      watchdog = window.setTimeout(fail, 12000)
      synth.speak(utterance)
    }
    speak()
    return () => {
      active = false
      window.clearTimeout(watchdog)
      synth.cancel()
    }
  }, [text, enabled, attempt, preferences, onFinished])

  function retry() {
    cursor.current = 0
    setWord(-1)
    setAttempt(value => value + 1)
  }
  return { word, failed, retry }
}
