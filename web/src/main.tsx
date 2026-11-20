import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home } from './Home'
import { AudioProvider } from './AudioSettings'
import { Session } from './Session'
import type { TriviaSet } from './sets'
import '../../design/trivia-ui/mockups/screen.css'
import './game.css'

function App() {
  const [session, play] = useState<{ set: TriviaSet; stream: MediaStream | null } | null>(null)
  return <div className="stage">{session ? <Session {...session} onQuit={() => play(null)}/>
    : <Home onPlay={(set, stream) => play({ set, stream })}/>}</div>
}

createRoot(document.getElementById('root')!).render(<AudioProvider><App/></AudioProvider>)
