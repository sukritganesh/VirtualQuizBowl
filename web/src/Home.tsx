import { useEffect, useRef, useState } from 'react'
import { prepareMicrophone } from './spokenAnswers'
import { library, parseSet, type TriviaSet } from './sets'
import buzzer from './assets/buzzer.png'
import { MuteButton, SettingsButton } from './AudioSettings'
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

export function Home({ onPlay }: { onPlay: (set: TriviaSet, stream: MediaStream | null) => void }) {
  const [ai, setAI] = useState(true)
  const [starting, setStarting] = useState(false)
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
    if (!ai) { onPlay(selected, null); return }
    const controller = new AbortController()
    connection.current = controller
    setStarting(true)
    setError('')
    try {
      const stream = await prepareMicrophone(controller.signal)
      onPlay(selected, stream)
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Microphone unavailable.')
    } finally {
      if (connection.current === controller) {
        connection.current = null
        setStarting(false)
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

  return <><HomeMusic/><BrandRail home/><main className="home-main">
    <div className="home-copy"><h1 className="home-title">Virtual<span>Quiz Bowl</span></h1>
      <div className="form">
        <label className="eyebrow" htmlFor="pack">Question set</label>
        <button id="pack" className="picker browse-trigger" aria-haspopup="dialog" disabled={starting}
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
        <label className="scoring-mode"><input type="checkbox" checked={ai} disabled={starting} onChange={event => { setAI(event.target.checked); setError('') }}/> Use local AI to score my spoken answers</label>
        {error && <p className="file-error" role="alert">{error}</p>}
        <div className="actions home-actions">
          <button className="primary" disabled={!selected || loading || starting} onClick={() => void play()}>{starting ? 'Preparing…' : 'Play'} <span aria-hidden="true">→</span></button>
          {starting ? <button className="quiet" onClick={() => { connection.current?.abort(); connection.current = null; setStarting(false) }}>Cancel</button>
            : <button className="quiet" onClick={() => fileInput.current?.click()}>Import JSON</button>}
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
