import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseVoice, defaultAudio, readAudioPreferences, speakQuestion } from '../src/audio.ts'

test('saved audio keeps the last audible volume even while muted and tolerates old or damaged data', () => {
  const saved = { volume: 36, muted: true, voiceURI: 'host-2' }
  assert.deepEqual(readAudioPreferences(JSON.stringify(saved)), { ...saved, musicVolume: defaultAudio.musicVolume })
  assert.deepEqual(readAudioPreferences(JSON.stringify({ ...saved, musicVolume: 0 })), { ...saved, musicVolume: 0 })
  const musicOnly = { ...defaultAudio, volume: 0, musicVolume: 80 }
  assert.deepEqual(readAudioPreferences(JSON.stringify(musicOnly)), musicOnly)
  assert.equal(readAudioPreferences('{"musicVolume":101}').musicVolume, defaultAudio.musicVolume)
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

test('a whole question uses one utterance and only its end opens the buzzer', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const synth = { getVoices: () => [], speak: t.mock.fn(), cancel: t.mock.fn() }
  globalThis.window = { speechSynthesis: synth, setTimeout, clearTimeout }
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  t.after(() => { delete globalThis.window; delete globalThis.SpeechSynthesisUtterance })

  const text = 'Looking at a car head-on, what kind of camber makes the wheels lean inward?'
  const events = { onWord: t.mock.fn(), onEnd: t.mock.fn(), onError: t.mock.fn() }
  const cancel = speakQuestion(text, defaultAudio, events)
  const speech = synth.speak.mock.calls[0].arguments[0]
  assert.equal(speech.text, text)
  speech.onstart()
  speech.onboundary({ name: 'sentence', charIndex: 0 })
  t.mock.timers.tick(13000)
  assert.equal(events.onError.mock.callCount(), 0)
  assert.equal(events.onWord.mock.callCount(), 0)
  assert.equal(events.onEnd.mock.callCount(), 0)
  speech.onboundary({ name: 'word', charIndex: text.indexOf('camber') })
  assert.deepEqual(events.onWord.mock.calls[0].arguments, [8])
  speech.onend()
  cancel()
  speech.onend()
  assert.equal(events.onEnd.mock.callCount(), 1)
  assert.equal(synth.speak.mock.callCount(), 1)

  const stop = speakQuestion(text, defaultAudio, events)
  const interrupted = synth.speak.mock.calls[1].arguments[0]
  stop()
  interrupted.onend()
  interrupted.onerror()
  t.mock.timers.tick(30000)
  assert.equal(synth.cancel.mock.callCount(), 1)
  assert.equal(events.onEnd.mock.callCount(), 1)
  assert.equal(events.onError.mock.callCount(), 0)
})
