export const WINDOW_MS = 5000
export type Outcome = 'correct' | 'incorrect' | 'missed'
export type Phase = 'reading' | 'buzz' | 'answer' | 'grade' | 'result' | 'summary'
export type Command = 'read' | 'buzz' | 'reveal' | 'correct' | 'incorrect' | 'next' | 'timeout' | 'pause' | 'resume'
export type Game = ReturnType<typeof startGame>

export function startGame(total: number) {
  return {
    phase: 'reading' as Phase, index: 0, total,
    counts: { correct: 0, incorrect: 0, missed: 0 },
    outcome: null as Outcome | null,
    deadline: null as number | null, paused: false, remaining: 0,
  }
}

function settle(game: Game, outcome: Outcome): Game {
  return {
    ...game, phase: 'result', outcome, deadline: null,
    counts: { ...game.counts, [outcome]: game.counts[outcome] + 1 },
  }
}

export function transition(game: Game, { command, now }: { command: Command; now: number }): Game {
  if (game.paused) {
    if (command !== 'resume') return game
    const timed = game.phase === 'buzz' || game.phase === 'answer'
    return { ...game, paused: false, deadline: timed ? now + game.remaining : null }
  }
  // Check the real deadline on input too. Background tabs can delay timer callbacks.
  if (game.deadline !== null && now >= game.deadline) {
    game = game.phase === 'buzz' ? settle(game, 'missed') : { ...game, phase: 'grade', deadline: null }
    if (command !== 'pause') return game
  }
  switch (command) {
    case 'pause':
      return { ...game, paused: true, remaining: game.deadline === null ? 0 : game.deadline - now, deadline: null }
    case 'read':
      return game.phase === 'reading' ? { ...game, phase: 'buzz', deadline: now + WINDOW_MS } : game
    case 'buzz':
      return game.phase === 'buzz' ? { ...game, phase: 'answer', deadline: now + WINDOW_MS } : game
    case 'reveal':
      if (game.phase === 'reading' || game.phase === 'buzz') return settle(game, 'missed')
      return game.phase === 'answer' ? { ...game, phase: 'grade', deadline: null } : game
    case 'correct':
    case 'incorrect':
      return game.phase === 'grade' ? settle(game, command) : game
    case 'next':
      if (game.phase !== 'result') return game
      if (game.index + 1 === game.total) return { ...game, phase: 'summary' }
      return { ...game, phase: 'reading', index: game.index + 1, outcome: null }
    default:
      return game
  }
}
