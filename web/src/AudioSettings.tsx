import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { defaultAudio, playSound, speakQuestion, voiceSample, readAudioPreferences, serializeAudioPreferences, type AudioPreferences, type Narrator, type SoundCue } from './audio'
import { NarratorPicker, narrationKey } from './NarratorPicker'
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
  const { muted, volume } = preferences
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<(() => void) | undefined>(undefined)
  const generation = useRef(0)
  const [playing, setPlaying] = useState<string | null>(null)
  const [preparingVoice, setPreparingVoice] = useState(false)
  const [error, setError] = useState<{ kind: 'effect' | 'voice'; message: string } | null>(null)

  const stopPreview = useCallback(() => {
    generation.current++
    cancel.current?.()
    cancel.current = undefined
    setPlaying(null)
    setPreparingVoice(false)
    setError(null)
  }, [])

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  useEffect(() => {
    stopPreview()
    return () => { generation.current++; cancel.current?.(); cancel.current = undefined }
  }, [muted, volume, stopPreview])

  function audition(key: string, kind: 'effect' | 'voice', play: (finish: (message?: string) => void) => (() => void) | undefined) {
    stopPreview()
    if (playing === key) return
    const ticket = generation.current
    setPlaying(key)
    setPreparingVoice(kind === 'voice')
    cancel.current = play(message => {
      if (ticket !== generation.current) return
      setPlaying(null)
      setPreparingVoice(false)
      setError(message ? { kind, message } : null)
    })
  }

  function previewEffect(cue: SoundCue, file: string) {
    audition(file, 'effect', finish => playSound(cue, file, failed => finish(failed ? 'This sound could not play.' : undefined)))
  }
  function previewVoice(narrator: Narrator) {
    audition(narrationKey(narrator), 'voice', finish => speakQuestion(voiceSample, { ...preferences, narrator }, {
      onWord() {}, onPlaying: () => setPreparingVoice(false),
      onEnd: () => finish(), onError: message => finish(message ?? 'This voice could not play.'),
    }))
  }

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
        {showSoundEffects && <SoundEffectPicker preferences={preferences} playingFile={playing}
          preview={previewEffect} stopPreview={stopPreview} failed={error?.kind === 'effect'}
          choose={(cue, file) => update(previous => ({ ...previous, sounds: { ...previous.sounds, [cue]: file } }))}/>}
        <NarratorPicker narrator={preferences.narrator} choose={narrator => update(previous => ({ ...previous, narrator }))}
          preview={previewVoice} stop={stopPreview} playing={playing} disabled={muted || volume === 0}
          status={error?.kind === 'voice' ? error.message : preparingVoice ? 'Preparing voice preview…' : null}/>
      </main>
    </div>
  </dialog>
}
