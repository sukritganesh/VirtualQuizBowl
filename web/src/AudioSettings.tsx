import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { chooseVoice, defaultAudio, hostUtterance, playSound, readAudioPreferences, serializeAudioPreferences, type AudioPreferences, type SoundCue } from './audio'
import { SoundEffectPicker } from './SoundEffectPicker'

const storageKey = 'virtual-quiz-bowl.audio'
type AudioState = { preferences: AudioPreferences; update: Dispatch<SetStateAction<AudioPreferences>> }
const AudioContext = createContext<AudioState | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [preferences, update] = useState(() => {
    try { return readAudioPreferences(localStorage.getItem(storageKey)) }
    catch { return defaultAudio }
  })
  useEffect(() => {
    try { localStorage.setItem(storageKey, serializeAudioPreferences(preferences)) }
    catch { /* The controls still work for this session when storage is unavailable. */ }
  }, [preferences])
  useEffect(() => { window.speechSynthesis?.getVoices() }, [])
  return <AudioContext.Provider value={{ preferences, update }}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const audio = useContext(AudioContext)
  if (!audio) throw new Error('AudioProvider is required.')
  return audio
}

export function MuteButton() {
  const { preferences, update } = useAudio()
  const label = preferences.muted ? 'Unmute sound' : 'Mute sound'
  return <button className="quiet quick-mute" title={label} aria-label={label}
    onClick={() => update(previous => ({ ...previous, muted: !previous.muted }))}>
    <span aria-hidden="true" className={'speaker' + (preferences.muted ? ' muted' : '')}><i/></span>
  </button>
}

export function SettingsButton({ inMenu = false }: { inMenu?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <button aria-haspopup="dialog" className={inMenu ? 'quit menu-settings' : 'quiet settings-link'} onClick={() => setOpen(true)}>
      Settings {inMenu && <span aria-hidden="true">→</span>}
    </button>
    {open && createPortal(<SettingsPage showSoundEffects={!inMenu} back={() => setOpen(false)}/>, document.body)}
  </>
}

function SettingsPage({ back, showSoundEffects }: { back: () => void; showSoundEffects: boolean }) {
  const { preferences, update } = useAudio()
  const { muted, volume, voiceURI } = preferences
  const dialog = useRef<HTMLDialogElement>(null)
  const sample = useRef<SpeechSynthesisUtterance | null>(null)
  const synth = window.speechSynthesis
  const canSpeak = !!synth && typeof SpeechSynthesisUtterance !== 'undefined'
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [preview, setPreview] = useState<'idle' | 'playing' | 'failed'>('idle')
  const stopEffect = useRef<(() => void) | null>(null)
  const [playingFile, setPlayingFile] = useState<string | null>(null)
  const [effectFailed, setEffectFailed] = useState(false)

  const stopEffectPreview = useCallback(() => {
    stopEffect.current?.()
    stopEffect.current = null
    setPlayingFile(null)
    setEffectFailed(false)
  }, [])
  useEffect(() => {
    setPlayingFile(null)
    return () => { stopEffect.current?.(); stopEffect.current = null }
  }, [muted])

  function previewEffect(cue: SoundCue, file: string) {
    stopEffectPreview()
    if (playingFile === file) return
    if (sample.current) {
      sample.current = null
      synth.cancel()
      setPreview('idle')
    }
    setPlayingFile(file)
    stopEffect.current = playSound(cue, file, failed => {
      stopEffect.current = null
      setPlayingFile(null)
      setEffectFailed(failed)
    })
  }

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  useEffect(() => {
    if (!synth) return
    const refresh = () => setVoices([...synth.getVoices()].sort((a,b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)))
    refresh()
    synth.addEventListener?.('voiceschanged', refresh)
    return () => synth.removeEventListener?.('voiceschanged', refresh)
  }, [synth])

  useEffect(() => {
    setPreview('idle')
    return () => {
      if (sample.current) {
        sample.current = null
        synth?.cancel()
      }
    }
  }, [synth, voiceURI, muted, volume])

  function previewVoice() {
    stopEffectPreview()
    if (sample.current) {
      sample.current = null
      synth.cancel()
      setPreview('idle')
      return
    }
    const speech = hostUtterance('Welcome to Virtual Quiz Bowl. Here is your next question.', preferences)
    sample.current = speech
    function finish(state: 'idle' | 'failed') {
      if (sample.current !== speech) return
      sample.current = null
      setPreview(state)
    }
    speech.onend = () => finish('idle')
    speech.onerror = () => finish('failed')
    setPreview('playing')
    synth.speak(speech)
  }

  const selectedMissing = voiceURI && !voices.some(voice => voice.voiceURI === voiceURI)
  const automaticVoice = chooseVoice(voices, '')
  function volumeControl(field: 'volume' | 'musicVolume', id: string, label: string) {
    const level = muted ? 0 : preferences[field]
    return <div className="setting-row">
      <div className="setting-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{level}%</output></div>
      <input id={id} type="range" min="0" max="100" value={level} onChange={event => {
        const value = event.target.valueAsNumber
        update(previous => ({ ...previous, [field]: value, muted: previous.muted && value === 0 }))
      }}/>
    </div>
  }
  return <dialog ref={dialog} className="settings-page" aria-labelledby="settings-title"
    onCancel={event => { event.preventDefault(); event.stopPropagation(); back() }}>
    <div className="settings-inner">
      <header className="settings-rail"><button className="quiet" autoFocus onClick={back}>← Back</button><MuteButton/></header>
      <main className="settings-content">
        <h1 id="settings-title">Settings</h1>
        {volumeControl('volume', 'host-volume', 'Narration volume')}
        {volumeControl('musicVolume', 'music-volume', 'Music volume')}
        {showSoundEffects && <SoundEffectPicker preferences={preferences} playingFile={playingFile}
          preview={previewEffect} stopPreview={stopEffectPreview} failed={effectFailed}
          choose={(cue, file) => update(previous => ({ ...previous, sounds: { ...previous.sounds, [cue]: file } }))}/>}
        <div className="setting-row">
          <label htmlFor="host-voice">Host voice</label>
          <select id="host-voice" className="pack-select" value={voiceURI} disabled={!canSpeak}
            onChange={event => { const uri = event.target.value; update(previous => ({ ...previous, voiceURI: uri })) }}>
            <option value="">Automatic{automaticVoice ? ' · ' + automaticVoice.name : ''}</option>
            {selectedMissing && <option value={voiceURI} disabled>Saved voice unavailable · using automatic</option>}
            {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.localService ? '' : ' · Online'}</option>)}
          </select>
          <p className="pack-detail">{canSpeak ? 'Available voices depend on your browser and device.' : 'This browser does not provide speech synthesis.'}</p>
          <button className="quiet" disabled={muted || volume === 0 || !canSpeak} onClick={previewVoice}>{preview === 'playing' ? 'Stop preview' : 'Preview voice'}</button>
          {preview === 'failed' && <p role="status">This voice could not play. Try another voice.</p>}
        </div>
      </main>
    </div>
  </dialog>
}
