import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { chooseVoice, defaultAudio, modelDefault, readAudioPreferences, RoundAudio, serializeAudioPreferences, soundLibrary, speakQuestion, voiceSample } from '../src/audio.ts'

test('saved audio keeps the last audible volume even while muted and tolerates old or damaged data', () => {
  const saved = { volume: 36, muted: true, voiceURI: 'host-2' }
  const migrated = { ...defaultAudio, volume: 36, muted: true, narrator: { engine: 'browser', voice: 'host-2', speaker: 0 } }
  assert.deepEqual(readAudioPreferences(JSON.stringify(saved)), migrated)
  assert.deepEqual(readAudioPreferences(JSON.stringify({ ...saved, musicVolume: 0 })), { ...migrated, musicVolume: 0 })
  const musicOnly = { ...defaultAudio, volume: 0, musicVolume: 80 }
  assert.deepEqual(readAudioPreferences(JSON.stringify(musicOnly)), musicOnly)
  assert.equal(readAudioPreferences('{"musicVolume":101}').musicVolume, defaultAudio.musicVolume)
  for (const raw of [null, '{', 'null', '{"volume":999,"voiceURI":false,"muted":"true"}']) {
    assert.deepEqual(readAudioPreferences(raw), defaultAudio)
  }
})

test('the default host is Liam and valid model, voice and speaker choices survive reload', () => {
  assert.deepEqual(readAudioPreferences('{"voiceURI":""}').narrator, { engine: 'kokoro', voice: 'am_liam', speaker: 0 })
  const narrator = { engine: 'piper', voice: 'en_US-arctic-medium', speaker: 2 }
  assert.deepEqual(readAudioPreferences(serializeAudioPreferences({ ...defaultAudio, narrator })).narrator, narrator)
  const load = narrator => readAudioPreferences(JSON.stringify({ narrator })).narrator
  assert.deepEqual(load({ ...narrator, speaker: 9999 }), { ...narrator, speaker: 0 })
  assert.deepEqual(load({ ...narrator, voice: 'missing' }), modelDefault('piper'))
  assert.deepEqual(load({ engine: '__proto__' }), defaultAudio.narrator)
})

test('missing and retired sounds use the new defaults while supported player choices survive', () => {
  const defaults = { buzzer: 'sfx_menu_select1.wav', correct: 'positive.wav', incorrect: 'lowDown.ogg', timeout: 'sfx_lowhealth_alarmloop2.wav' }
  assert.deepEqual(readAudioPreferences('{}').sounds, defaults)
  const saved = { sounds: { buzzer: 'switch_002.ogg', correct: 'confirmation_001.ogg', incorrect: 'positive.wav', timeout: 'threeTone2.ogg' } }
  assert.deepEqual(readAudioPreferences(JSON.stringify(saved)).sounds, { ...defaults, timeout: 'threeTone2.ogg' })
  const oldDefaults = { buzzer: 'twoTone1.ogg', correct: 'confirmation_001.ogg', incorrect: 'lowDown.ogg', timeout: 'sfx_alarm_loop3.wav' }
  assert.deepEqual(readAudioPreferences(JSON.stringify({ sounds: oldDefaults })).sounds, defaults)
  assert.deepEqual(readAudioPreferences(serializeAudioPreferences({ ...defaultAudio, sounds: oldDefaults })).sounds, oldDefaults)
})

test('each curated sound has a bundled audio file', () => {
  for (const group of Object.values(soundLibrary)) {
    for (const clip of group.options) {
      assert.ok(existsSync(new URL('../public/sounds/' + clip.file, import.meta.url)), clip.file)
    }
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
  const preferences = { ...defaultAudio, narrator: modelDefault('browser') }
  const cancel = speakQuestion(text, preferences, events)
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

  const stop = speakQuestion(text, preferences, events)
  const interrupted = synth.speak.mock.calls[1].arguments[0]
  stop()
  interrupted.onend()
  interrupted.onerror()
  t.mock.timers.tick(30000)
  assert.equal(synth.cancel.mock.callCount(), 1)
  assert.equal(events.onEnd.mock.callCount(), 1)
  assert.equal(events.onError.mock.callCount(), 0)
})

test('local narration uses the selected model and only the playback end completes the question', async t => {
  let player, request
  const ready = Promise.withResolvers()
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.Audio = class {
    constructor() { player = this; this.currentTime = 0; this.duration = 4 }
    set src(url) { ready.resolve(url) }
    async play() {}
    pause() {}
    load() {}
    removeAttribute() {}
  }
  t.after(() => { delete globalThis.window; delete globalThis.Audio })
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    request = options
    return { ok: true, headers: new Headers({ 'Content-Type': 'audio/wav' }), blob: async () => new Blob(['wave']) }
  })
  const events = { onWord() {}, onEnd: t.mock.fn(), onError: t.mock.fn() }
  assert.equal(voiceSample, 'The quick brown fox jumps over the lazy dog.')
  const stop = speakQuestion(voiceSample, defaultAudio, events, 1.25)
  await ready.promise
  assert.deepEqual(JSON.parse(request.body), { ...modelDefault('kokoro'), text: voiceSample })
  player.onloadedmetadata()
  assert.equal(player.currentTime, 1.25)
  assert.equal(events.onEnd.mock.callCount(), 0)
  const end = player.onended
  end()
  end()
  stop()
  assert.equal(events.onEnd.mock.callCount(), 1)
  const stopNext = speakQuestion('Next question?', defaultAudio, events)
  stopNext()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(request.signal.aborted, true)
  assert.equal(events.onEnd.mock.callCount(), 1)
  assert.equal(events.onError.mock.callCount(), 0)
})

test('the round shares pending clips, drops previous questions and discards superseded voices', async t => {
  const work = []
  t.mock.method(globalThis, 'fetch', (_, { signal }) => {
    const { promise, resolve, reject } = Promise.withResolvers()
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    work.push({ signal, resolve })
    return promise
  })
  const round = new RoundAudio()
  const liam = defaultAudio.narrator
  const first = round.prepare('First?', liam)
  const next = round.prepare('Second?', liam)
  const playing = round.read('Second?', liam)
  assert.equal(work.length, 2)
  round.keep(['Second?', 'Third?'], liam)
  await assert.rejects(first, { name: 'AbortError' })
  work[1].resolve(new Response('wave', { headers: { 'Content-Type': 'audio/wav' } }))
  assert.equal(await playing, await next)
  assert.equal(await round.read('Second?', liam), await next)
  const third = round.prepare('Third?', liam)
  round.keep(['Second?', 'Third?'], modelDefault('piper'))
  await assert.rejects(third, { name: 'AbortError' })
  const replacement = round.prepare('Third?', modelDefault('piper'))
  assert.equal(work.length, 4)
  round.clear()
  await assert.rejects(replacement, { name: 'AbortError' })
})

test('a failed speculative render is delivered once and the next attempt can recover', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  const round = new RoundAudio()
  await assert.rejects(round.prepare('Next?', defaultAudio.narrator))
  await assert.rejects(round.read('Next?', defaultAudio.narrator))
  assert.equal(fetch.mock.callCount(), 1)
  fetch.mock.mockImplementation(async () => new Response('ok', { headers: { 'Content-Type': 'audio/wav' } }))
  assert.equal(await (await round.read('Next?', defaultAudio.narrator)).text(), 'ok')
  assert.equal(fetch.mock.callCount(), 2)
  round.clear()
})
