import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home } from './Home'
import { AudioProvider } from './AudioSettings'
import { Session } from './Session'
import type { TriviaSet } from './sets'
import '../../design/trivia-ui/mockups/screen.css'
import './game.css'

function App() {
  const [set, play] = useState<TriviaSet | null>(null)
  return <div className="stage">{set ? <Session set={set} onQuit={() => play(null)}/> : <Home onPlay={play}/>}</div>
}

createRoot(document.getElementById('root')!).render(<AudioProvider><App/></AudioProvider>)
