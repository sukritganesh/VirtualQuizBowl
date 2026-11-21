import test from 'node:test'
import assert from 'node:assert/strict'
import { startGame, transition } from '../src/game.ts'

const act = (game, command, now) => transition(game, { command, now })

test('late valid buzz grants a full answer window and grading is required exactly once', () => {
  let game = startGame(1)
  assert.equal(act(game, 'buzz', 0), game)
  game = act(game, 'read', 100)
  game = act(game, 'buzz', 5099)
  assert.equal(game.cue, 'buzzer')
  assert.equal(game.deadline, 10099)
  assert.equal(act(game, 'correct', 10098), game)
  game = act(game, 'timeout', 10099)
  assert.equal(game.cue, 'timeout')
  assert.equal(act(game, 'next', 10100), game)
  game = act(game, 'correct', 10101)
  assert.equal(game.cue, 'correct')
  assert.equal(act(game, 'incorrect', 10102), game)
  assert.deepEqual(game.counts, { correct: 1, incorrect: 0, missed: 0 })
  assert.equal(act(game, 'next', 10103).phase, 'summary')
})

test('deadline wins against a late shortcut, and passing counts as never buzzed', () => {
  let game = act(startGame(2), 'read', 0)
  game = act(game, 'buzz', 5000)
  assert.equal(game.outcome, 'missed')
  assert.equal(game.cue, 'timeout')
  assert.equal(act(game, 'correct', 5001), game)
  game = act(game, 'next', 5010)
  assert.equal(game.index, 1)
  game = act(game, 'reveal', 5020)
  assert.equal(game.cue, null)
  assert.equal(game.counts.missed, 2)
})

test('pause preserves time, blocks inputs, and early reveal allows a manual incorrect mark', () => {
  let game = act(startGame(1), 'read', 0)
  game = act(game, 'buzz', 1000)
  game = act(game, 'pause', 4500)
  for (const command of ['timeout','correct','reveal','next']) assert.equal(act(game,command,9200),game)
  game = act(game, 'resume', 10000)
  assert.equal(game.deadline, 11500)
  game = act(game, 'reveal', 10500)
  assert.equal(game.cue, null)
  assert.equal(game.phase, 'grade')
  assert.equal(act(game, 'incorrect', 10510).cue, 'incorrect')
  assert.equal(act(game, 'incorrect', 10510).counts.incorrect, 1)
})
