import { Fragment, useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { BrandRail } from './Home'
import { MuteButton, SettingsButton, useAudio } from './AudioSettings'
import { startGame, transition, type Command, type Game } from './game'
import type { TriviaSet } from './sets'
import { useNarration } from './useNarration'
import { useSpokenAnswer } from './spokenAnswers'

const shortcuts: Record<string, Command | undefined> = {
  a: 'buzz', r: 'reveal', c: 'correct', i: 'incorrect', n: 'next',
}

type RoundProps = { game: Game; set: TriviaSet; stream: MediaStream | null; send: (command: Command) => void; onQuit: () => void }

function PauseMenu({ resume, quit }: { resume: () => void; quit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog aria-labelledby="pause-title" ref={dialog} onCancel={event => { event.preventDefault(); resume() }}>
    <button className="icon close" aria-label="Close menu" autoFocus onClick={resume}>×</button>
    <span className="pause-symbol" aria-hidden="true"/>
    <h2 id="pause-title">Game paused</h2>
    <SettingsButton inMenu/>
    <button className="quit" onClick={quit}>Quit game <span aria-hidden="true">→</span></button>
  </dialog>
}

function useCountdown(deadline: number | null, send: RoundProps['send']) {
  const [seconds, setSeconds] = useState(5)
  useLayoutEffect(() => {
    if (deadline === null) return
    let timer: number
    const tick = () => {
      const left = deadline - performance.now()
      if (left <= 0) { send('timeout'); return }
      const secondsLeft = Math.ceil(left / 1000)
      setSeconds(secondsLeft)
      timer = window.setTimeout(tick, left - (secondsLeft - 1) * 1000)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [deadline, send])
  return seconds
}

function Round({ game, set, stream, send, onQuit }: RoundProps) {
  const { preferences } = useAudio()
  const question = set.questions[game.index]
  const { phase, outcome } = game
  const spoken = useSpokenAnswer(stream, question, game)
  const automatic = !!stream && !spoken.manual
  useEffect(() => {
    if (automatic && !game.paused && phase === 'grade' && spoken.verdict) {
      send(spoken.verdict.correct ? 'correct' : 'incorrect')
    }
  }, [automatic, phase, game.paused, spoken.verdict, send])
  useEffect(() => {
    if (game.paused) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return
      const command = shortcuts[event.key.toLowerCase()]
      if (!command || (automatic && (command === 'correct' || command === 'incorrect'))) return
      event.preventDefault()
      send(command)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [game.paused, automatic, send])
  const finishReading = useCallback(() => send('read'), [send])
  const narration = useNarration(question.question, phase === 'reading' && !game.paused, preferences, finishReading)
  const seconds = useCountdown(game.deadline, send)
  const menu = useRef<HTMLButtonElement>(null)
  const showingAnswer = (phase === 'grade' && !automatic) || phase === 'result'
  const timed = phase === 'buzz' || phase === 'answer'
  const label = {
    reading: preferences.muted || preferences.volume === 0 ? 'Reading silently' : narration.failed ? 'Voice unavailable' : 'Host is reading',
    buzz: 'Buzz window open',
    answer: automatic ? 'Recording answer' : 'Buzzed in',
    grade: automatic ? (spoken.error ? 'Could not check answer' : 'Checking answer') : 'Mark your answer',
    result: outcome === 'correct' ? 'Correct' : outcome === 'incorrect' ? 'Incorrect' : 'Never buzzed',
    summary: '',
  }[phase]

  function action(command: Command, text: string, key: string, primary = false, disabled = false) {
    return <button className={primary ? 'primary' : 'quiet'} disabled={disabled} aria-keyshortcuts={key} onClick={() => send(command)}>
      {text} <kbd aria-hidden="true">{key}</kbd>
    </button>
  }

  return <>
    <header className="rail"><div className="rail-group">
      <button ref={menu} className="icon" aria-label="Open pause menu" onClick={() => send('pause')}><span className="hamburger"/></button>
      <MuteButton/>
      <div className="clock"><span className="micro">{timed ? (phase === 'buzz' ? 'Buzz' : 'Answer') : 'Timer'}</span>
        <b>{timed ? `${String(game.paused ? Math.ceil(game.remaining/1000) : seconds).padStart(2,'0')} s` : '—'}</b></div>
    </div><div className="metric"><span className="micro">Score</span><b>{game.counts.correct * 5}</b></div></header>
    <main className="question-area">
      <div className="kicker"><span className="eyebrow">Question {game.index + 1} / {game.total}</span>
        {set.category && <span className="category micro">{set.category}</span>}</div>
      <h1 className="question" aria-label={question.question}><span aria-hidden="true">{question.question.split(' ').map((word, i) =>
        <Fragment key={i}>{i > 0 && ' '}<span className={phase === 'reading' && i === narration.word ? 'spoken active-word' : phase !== 'reading' || i < narration.word ? 'spoken' : undefined}>{word}</span></Fragment>
      )}</span></h1>
    </main>
    <footer className="dock">
      <div className="state">
        <span aria-hidden="true" className={`signal symbol ${outcome === 'correct' ? 'earned' : ''}`}>
          {phase === 'result' ? (outcome === 'correct' ? '+5' : '+0') : <span className="meter"><i/><i/><i/><i/><i/></span>}
        </span>
        <div aria-live="polite" aria-atomic="true"><h2>{label}</h2>
          {showingAnswer && <p className="answer-key">Answer · <strong>{question.answer}</strong></p>}
          {phase === 'result' && spoken.verdict && <p>{spoken.verdict.transcript ? `Heard “${spoken.verdict.transcript}”` : 'No speech detected.'}</p>}
          {phase === 'grade' && automatic && spoken.error && <p role="alert">{spoken.error}</p>}
          {phase === 'grade' && !automatic && !!question.aliases?.length && <p className="aliases">Also accepted · {question.aliases.join(', ')}</p>}
          {phase === 'answer' && <p>Say your answer.</p>}
          {phase === 'reading' && narration.failed && <p>Retry the host or read the question yourself.</p>}
        </div>
      </div>
      <div className="actions">
        {phase === 'reading' && narration.failed && <>
          <button className="quiet" onClick={narration.retry}>Retry voice</button>
          <button className="primary" onClick={finishReading}>I've read it</button></>}
        {(phase === 'buzz' || (phase === 'reading' && !narration.failed)) && action('buzz', 'Buzz in', 'A', true, phase === 'reading')}
        {(phase === 'reading' || phase === 'buzz') && action('reveal', 'Reveal & pass', 'R')}
        {phase === 'answer' && action('reveal', automatic ? 'Submit answer' : 'Reveal answer', 'R', true)}
        {phase === 'grade' && !automatic && <>{action('correct','Correct','C',true)}{action('incorrect','Incorrect','I')}</>}
        {phase === 'grade' && automatic && spoken.error && <>
          <button className="primary" onClick={spoken.markManually}>Mark manually</button>
          {spoken.canRetry && <button className="quiet" onClick={spoken.retry}>Retry scoring</button>}
        </>}
        {phase === 'result' && action('next', game.index + 1 === game.total ? 'View results' : 'Next question', 'N', true)}
      </div>
    </footer>
    {game.paused && <PauseMenu quit={onQuit} resume={() => { send('resume'); requestAnimationFrame(() => menu.current?.focus()) }}/>}
  </>
}

export function Session({ set, stream, onQuit }: { set: TriviaSet; stream: MediaStream | null; onQuit: () => void }) {
  const [game, dispatch] = useReducer(transition, set.questions.length, startGame)
  const send = useCallback((command: Command) => dispatch({ command, now: performance.now() }), [])
  const activeStream = game.phase === 'summary' ? null : stream
  useEffect(() => () => activeStream?.getTracks().forEach(track => track.stop()), [activeStream])
  if (game.phase !== 'summary') return <Round key={game.index} game={game} set={set} stream={stream} send={send} onQuit={onQuit}/>
  return <><BrandRail/><main className="summary">
    <span className="eyebrow">Set complete</span><h1>{set.title}</h1>
    <div className="total"><strong>{game.counts.correct * 5}</strong><span>points</span></div>
    <dl className="stats">
      <div><dt>Correct</dt><dd>{game.counts.correct}</dd></div>
      <div><dt>Wrong</dt><dd>{game.counts.incorrect}</dd></div>
      <div><dt>Never buzzed</dt><dd>{game.counts.missed}</dd></div>
    </dl>
    <button className="quiet" onClick={onQuit}>Back to home <span aria-hidden="true">→</span></button>
  </main></>
}
