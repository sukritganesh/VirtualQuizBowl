import { useEffect, useRef, useState } from 'react'
import { prepareMicrophone } from './spokenAnswers'
import { library, parseSet, type TriviaSet } from './sets'
import buzzer from './assets/buzzer.png'
import { MuteButton, SettingsButton, useAudio } from './AudioSettings'
import { RoundAudio } from './audio'
import { HomeMusic } from './HomeMusic'
import { SetBrowser } from './SetBrowser'

export function BrandRail({ home = false }: { home?: boolean }) {
  return <header className="rail">
    <span className="brand" aria-label="Virtual Quiz Bowl"><span className="mark" aria-hidden="true"><i/><i/><i/></span>VQB</span>
    <div className="rail-tools"><span className="tag micro">Single-player trivia</span>
      {home && <><MuteButton/><SettingsButton/></>}
    </div>
  </header>
}

export type RoundSession = { set: TriviaSet; stream: MediaStream | null; audio: RoundAudio }

export function Home({ onPlay }: { onPlay: (session: RoundSession) => void }) {
  const { preferences } = useAudio()
  const [ai, setAI] = useState(true)
  const [starting, setStarting] = useState('')
  const connection = useRef<AbortController | null>(null)
  useEffect(() => () => connection.current?.abort(), [])
  const [selected, setSelected] = useState<TriviaSet | null>(library[0]?.set ?? null)
  const [browsing, setBrowsing] = useState(false)
  const [imported, setImported] = useState<TriviaSet | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const request = useRef(0)

  async function play() {
    if (!selected || connection.current) return
    const audio = new RoundAudio()
    const localVoice = !preferences.muted && preferences.volume > 0 && preferences.narrator.engine !== 'browser'
    if (!ai && !localVoice) { onPlay({ set: selected, stream: null, audio }); return }
    const controller = new AbortController()
    connection.current = controller
    let stream: MediaStream | null = null
    controller.signal.addEventListener('abort', () => {
      audio.clear()
      stream?.getTracks().forEach(track => track.stop())
    }, { once: true })
    const hostStatus = 'Preparing the first question'
    const micStatus = 'Getting the microphone ready'
    setStarting(localVoice ? hostStatus : micStatus)
    setError('')
    try {
      const first = localVoice ? audio.prepare(selected.questions[0].question, preferences.narrator)
        .catch(() => { /* The round handles local-voice errors with browser speech or manual reading. */ }) : undefined
      const microphone = ai ? prepareMicrophone(controller.signal).then(ready => { stream = ready }) : undefined
      await Promise.all([microphone, first?.then(() => {
        if (ai && !stream && connection.current === controller) setStarting(micStatus)
      })])
      if (!controller.signal.aborted) {
        connection.current = null
        onPlay({ set: selected, stream, audio })
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Microphone unavailable.')
      controller.abort()
    } finally {
      if (connection.current === controller) {
        connection.current = null
        setStarting('')
      }
    }
  }

  async function importFile(file: File) {
    const ticket = ++request.current
    setError('')
    setLoading(true)
    setSelected(null)
    setImported(null)
    try {
      const pack = parseSet(JSON.parse(await file.text()))
      if (ticket === request.current) {
        setImported(pack)
        setSelected(pack)
      }
    } catch (err) {
      if (ticket === request.current) setError(err instanceof SyntaxError ? 'This file contains invalid JSON.' : String(err instanceof Error ? err.message : err))
    } finally {
      if (ticket === request.current) setLoading(false)
    }
  }

  if (starting && selected) return <><BrandRail/><main className="round-loading">
    <div className="loading-wave" aria-hidden="true">{[12, 20, 34, 48, 66, 44, 28, 38, 54, 34, 20, 12].map((height, i) =>
      <i key={i} style={{ height, animationDelay: `${i * -0.12}s` }}/>)}</div>
    <div className="loading-pack eyebrow">{selected.category && `${selected.category} · `}{selected.questions.length} questions</div>
    <h1>{selected.title}</h1>
    <p role="status"><span className="loading-light" aria-hidden="true"/>{starting}…</p>
    <button className="quiet" onClick={() => { connection.current?.abort(); connection.current = null; setStarting('') }}>Cancel</button>
  </main></>
  return <><HomeMusic/><BrandRail home/><main className="home-main">
    <div className="home-copy"><h1 className="home-title">Virtual<span>Quiz Bowl</span></h1>
      <div className="form">
        <label className="eyebrow" htmlFor="pack">Question set</label>
        <button id="pack" className="picker browse-trigger" aria-haspopup="dialog"
          aria-label={`Browse question sets${selected ? ', selected ' + selected.title : ''}`} onClick={() => setBrowsing(true)}>
          <span className="details"><strong>{selected?.title ?? 'Choose a question set'}</strong>
            <small>{loading ? 'Loading set…' : selected && [selected.category, `${selected.questions.length} questions`].filter(Boolean).join(' · ')}</small>
          </span><span className="browse-link">Browse <span aria-hidden="true">›</span></span>
        </button>
        {browsing && <SetBrowser selected={selected} imported={imported} onClose={() => setBrowsing(false)} onSelect={set => {
          request.current++
          setLoading(false)
          setSelected(set)
          setError('')
          setBrowsing(false)
        }}/>}
        <label className="scoring-mode"><input type="checkbox" checked={ai} onChange={event => { setAI(event.target.checked); setError('') }}/> Use local AI to score my spoken answers</label>
        {error && <p className="file-error" role="alert">{error}</p>}
        <div className="actions home-actions">
          <button className="primary" disabled={!selected || loading} onClick={() => void play()}>Play <span aria-hidden="true">→</span></button>
          <button className="quiet" onClick={() => fileInput.current?.click()}>Import JSON</button>
        </div>
        <input type="file" accept=".json,application/json" hidden ref={fileInput} onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void importFile(file)
        }}/>
      </div>
    </div><div className="art"><img src={buzzer} alt="" width="800" height="700"/></div>
  </main></>
}
