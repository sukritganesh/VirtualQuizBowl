import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareMicrophone } from '../src/spokenAnswers.ts'

// Each Node test file runs in its own process, without a real microphone.
globalThis.MediaRecorder = class {}
const devices = { getUserMedia() { throw new Error('Unexpected microphone request') } }
Object.defineProperty(navigator, 'mediaDevices', { value: devices })

test('an unavailable local service leaves the microphone alone', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'Start Ollama' }, { status: 503 }))
  await assert.rejects(prepareMicrophone(new AbortController().signal), /Start Ollama/)
})

test('permission prepares a disabled track until a valid buzz', async t => {
  const track = { enabled: true }
  const stream = { getAudioTracks: () => [track] }
  t.mock.method(globalThis, 'fetch', async () => Response.json({ device: 'cuda' }))
  t.mock.method(devices, 'getUserMedia', async () => stream)
  assert.equal(await prepareMicrophone(new AbortController().signal), stream)
  assert.equal(track.enabled, false)
})

test('cancelling while the permission prompt is open releases the late stream', async t => {
  const controller = new AbortController()
  const track = { stop: t.mock.fn() }
  t.mock.method(globalThis, 'fetch', async () => Response.json({ device: 'cuda' }))
  t.mock.method(devices, 'getUserMedia', async () => {
    controller.abort()
    return { getTracks: () => [track] }
  })
  await assert.rejects(prepareMicrophone(controller.signal), { name: 'AbortError' })
  assert.equal(track.stop.mock.callCount(), 1)
})
