import { useRef, useState } from 'react'
import { library, parseSet, type TriviaSet } from './sets'
import buzzer from './assets/buzzer.png'
import { MuteButton, SettingsButton } from './AudioSettings'

export function BrandRail({ home = false }: { home?: boolean }) {
  return <header className="rail">
    <span className="brand" aria-label="Virtual Quiz Bowl"><span className="mark" aria-hidden="true"><i/><i/><i/></span>VQB</span>
    <div className="rail-tools"><span className="tag micro">Single-player trivia</span>
      {home && <><MuteButton/><SettingsButton/></>}
    </div>
  </header>
}

export function Home({ onPlay }: { onPlay: (set: TriviaSet) => void }) {
  const [choice, setChoice] = useState('0')
  const [imported, setImported] = useState<TriviaSet | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const request = useRef(0)
  const selected = choice === 'import' ? imported : library[Number(choice)]

  async function importFile(file: File) {
    const ticket = ++request.current
    setError('')
    setLoading(true)
    setChoice('import')
    setImported(null)
    try {
      const pack = parseSet(JSON.parse(await file.text()))
      if (ticket === request.current) setImported(pack)
    } catch (err) {
      if (ticket === request.current) setError(err instanceof SyntaxError ? 'This file contains invalid JSON.' : String(err instanceof Error ? err.message : err))
    } finally {
      if (ticket === request.current) setLoading(false)
    }
  }

  return <><BrandRail home/><main className="home-main">
    <div className="home-copy"><h1 className="home-title">Virtual<span>Quiz Bowl</span></h1>
      <div className="form">
        <label className="eyebrow" htmlFor="pack">Question set</label>
        <select id="pack" className="pack-select" value={choice} onChange={event => {
          request.current++
          setLoading(false)
          setChoice(event.target.value)
          setError('')
        }}>
          {library.map((set, index) => <option key={index} value={index}>{set.title}</option>)}
          {(imported || choice === 'import') && <option value="import">{imported?.title ?? 'Choose a valid file'}</option>}
        </select>
        <p className="pack-detail" role="status">{loading ? 'Loading set…' : selected && [selected.category, `${selected.questions.length} questions`].filter(Boolean).join(' · ')}</p>
        {error && <p className="file-error" role="alert">{error}</p>}
        <div className="actions home-actions">
          <button className="primary" disabled={!selected || loading} onClick={() => selected && onPlay(selected)}>Play <span aria-hidden="true">→</span></button>
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
