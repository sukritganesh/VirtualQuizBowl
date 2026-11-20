import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Game } from './game'
import type { Question } from './sets'

export type Verdict = { transcript: string; correct: boolean }
const judgeTimedOut = "The judge couldn't finish in time. You can mark this answer manually."

async function apiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return new Error(typeof body?.detail === 'string' ? body.detail : fallback)
}

export async function prepareMicrophone(signal: AbortSignal) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Open the game on localhost in a browser with microphone recording support.')
  }
  const response = await fetch('/api/ready', { signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]) })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw await apiError(response, 'Start the local AI service, or choose manual scoring.')
  }
  signal.throwIfAborted()
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }, video: false })
  if (signal.aborted) {
    stream.getTracks().forEach(track => track.stop())
    signal.throwIfAborted()
  }
  stream.getAudioTracks().forEach(track => { track.enabled = false })
  return stream
}

// Round is keyed by question. Its clip, request and verdict belong to just this attempt.
export function useSpokenAnswer(stream: MediaStream | null, question: Question, game: Game) {
  const recorder = useRef<MediaRecorder | null>(null)
  const [clip, setClip] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [manual, setManual] = useState(false)
  const capturing = game.phase === 'answer'

  useLayoutEffect(() => {
    if (!stream || !capturing) return
    const tracks = stream.getAudioTracks()
    let failed = false
    const fail = () => {
      failed = true
      setError('The microphone could not finish recording. You can score this question manually.')
    }
    try {
      if (!tracks.some(track => track.readyState === 'live')) { fail(); return }
      const recording = new MediaRecorder(stream)
      recorder.current = recording
      const chunks: Blob[] = []
      recording.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recording.onerror = fail
      recording.onstop = () => {
        if (failed) return
        if (chunks.length) setClip(new Blob(chunks, { type: recording.mimeType }))
        else fail()
      }
      tracks.forEach(track => { track.addEventListener('ended', fail); track.enabled = true })
      recording.start()
    } catch { fail() }
    return () => {
      tracks.forEach(track => { track.enabled = false; track.removeEventListener('ended', fail) })
      if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
      recorder.current = null
    }
  }, [stream, capturing])

  useLayoutEffect(() => {
    const current = recorder.current
    if (!current || !stream) return
    if (game.paused && current.state === 'recording') current.pause()
    if (!game.paused && current.state === 'paused') current.resume()
    stream.getAudioTracks().forEach(track => { track.enabled = !game.paused && current.state === 'recording' })
  }, [stream, capturing, game.paused])

  useEffect(() => {
    if (!clip || game.phase !== 'grade' || manual) return
    const controller = new AbortController()
    const deadline = AbortSignal.timeout(120000)
    const data = new FormData()
    data.set('clip', clip, 'answer')
    data.set('key', JSON.stringify({ question: question.question, answer: question.answer, aliases: question.aliases ?? [] }))
    async function grade() {
      try {
        const response = await fetch('/api/answers', {
          method: 'POST', body: data, signal: AbortSignal.any([controller.signal, deadline]),
        })
        if (!response.ok) {
          const fallback = response.status === 504 ? judgeTimedOut : 'The local AI service could not check this recording.'
          throw await apiError(response, fallback)
        }
        const result = await response.json()
        if (typeof result.transcript !== 'string' || typeof result.correct !== 'boolean') throw new Error('Invalid verdict from the local AI service.')
        if (!controller.signal.aborted) setVerdict(result)
      } catch (err) {
        if (controller.signal.aborted) return
        if (deadline.aborted) setError(judgeTimedOut)
        else setError(err instanceof Error ? err.message : 'Unable to check this recording.')
      }
    }
    void grade()
    return () => controller.abort()
  }, [clip, question, game.phase, attempt, manual])

  return { verdict, error, canRetry: !!clip, manual,
    retry: () => { setError(''); setAttempt(value => value + 1) },
    markManually: () => { setError(''); setManual(true) },
  }
}
