import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseVoice, defaultAudio, readAudioPreferences } from '../src/audio.ts'

test('saved audio keeps the last audible volume even while muted and tolerates old or damaged data', () => {
  const saved = { volume: 36, muted: true, voiceURI: 'host-2' }
  assert.deepEqual(readAudioPreferences(JSON.stringify(saved)), saved)
  for (const raw of [null, '{', 'null', '{"volume":999,"voiceURI":false,"muted":"true"}']) {
    assert.deepEqual(readAudioPreferences(raw), defaultAudio)
  }
})

test('explicit selection wins and a missing voice falls back to local English narration', () => {
  const standard = { name: 'Standard', voiceURI: 'a', lang: 'en-US', localService: true, default: true }
  const natural = { ...standard, name: 'Host (Natural)', voiceURI: 'b', default: false }
  const remote = { ...standard, name: 'Online voice', voiceURI: 'c', lang: 'fr-FR', localService: false }
  const voices = [remote, standard, natural]
  assert.equal(chooseVoice(voices, 'c'), remote)
  assert.equal(chooseVoice(voices, 'a'), standard)
  assert.equal(chooseVoice(voices, 'missing'), natural)
  assert.equal(chooseVoice([], 'b'), null)
})
