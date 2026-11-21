import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home, type RoundSession } from './Home'
import { AudioProvider } from './AudioSettings'
import { Session } from './Session'
import '../../design/trivia-ui/mockups/screen.css'
import './game.css'

function App() {
  const [session, play] = useState<RoundSession | null>(null)
  return <div className="stage">{session ? <Session {...session} onQuit={() => play(null)}/>
    : <Home onPlay={play}/>}</div>
}

createRoot(document.getElementById('root')!).render(<AudioProvider><App/></AudioProvider>)
