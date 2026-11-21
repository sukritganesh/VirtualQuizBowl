import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { soundCues, soundLibrary, type AudioPreferences, type SoundCue } from './audio'

type Props = {
  preferences: AudioPreferences
  playingFile: string | null
  failed: boolean
  preview: (cue: SoundCue, file: string) => void
  stopPreview: () => void
  choose: (cue: SoundCue, file: string) => void
}

export function SoundEffectPicker({ preferences, playingFile, failed, preview, stopPreview, choose }: Props) {
  const [openCue, setOpenCue] = useState<SoundCue | null>(null)
  const openRow = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus = false) => {
    if (restoreFocus) openRow.current?.querySelector<HTMLButtonElement>('.effect-trigger')?.focus()
    setOpenCue(null)
    stopPreview()
  }, [stopPreview])

  useEffect(() => {
    if (!openCue) return
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !openRow.current?.contains(event.target)) close()
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [openCue, close])

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
      return
    }
    if (!(event.target instanceof HTMLButtonElement)) return
    const column = event.target.classList.contains('effect-preview') ? '.effect-preview' : '.effect-choice'
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(column))
    const index = buttons.indexOf(event.target)
    let next: number
    switch (event.key) {
      case 'ArrowDown': next = (index + 1) % buttons.length; break
      case 'ArrowUp': next = index < 1 ? buttons.length - 1 : index - 1; break
      case 'Home': next = 0; break
      case 'End': next = buttons.length - 1; break
      default: return
    }
    event.preventDefault()
    buttons[next]?.focus()
  }

  return <details className="effect-settings" onToggle={event => { if (!event.currentTarget.open) close() }}>
    <summary>Sound effects <span className="disclosure-arrow" aria-hidden="true"/></summary>
    <div className="effect-list">
      {soundCues.map(cue => {
        const { label, options } = soundLibrary[cue]
        const selected = options.find(option => option.file === preferences.sounds[cue]) ?? options[0]
        const open = openCue === cue
        const id = 'effect-' + cue
        return <div key={cue} className="effect-row" ref={open ? openRow : undefined}
          onKeyDown={open ? navigate : undefined}
          onBlur={event => {
            if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close()
          }}>
          <span id={id + '-label'} className="effect-label">{label}</span>
          <div className="effect-picker">
            <button type="button" className="effect-trigger" aria-expanded={open} aria-controls={id + '-options'}
              aria-labelledby={id + '-label ' + id + '-value'} onClick={() => {
                stopPreview()
                setOpenCue(open ? null : cue)
              }}>
              <span id={id + '-value'}>{selected.name}</span><span className="disclosure-arrow" aria-hidden="true"/>
            </button>
            <div id={id + '-options'} className="effect-options" role="group" aria-labelledby={id + '-label'} hidden={!open}>
              {options.map(({ file, name }) => {
                const current = file === selected.file
                const playing = file === playingFile
                return <div className="effect-option" key={file}>
                  <button type="button" className="effect-choice" aria-pressed={current} onClick={() => {
                    choose(cue, file)
                    close(true)
                  }}>
                    <span className="choice-check" aria-hidden="true">{current ? '✓' : ''}</span>{name}
                  </button>
                  <button type="button" className="effect-preview" aria-label={(playing ? 'Stop ' : 'Preview ') + name}
                    title={preferences.muted ? 'Unmute to preview' : (playing ? 'Stop ' : 'Preview ') + name}
                    disabled={preferences.muted} onClick={() => preview(cue, file)}>
                    <span className={playing ? 'stop-shape' : 'play-shape'} aria-hidden="true"/>
                  </button>
                </div>
              })}
            </div>
          </div>
        </div>
      })}
      {failed && <p role="status" className="pack-detail">This sound could not play. Try previewing it again.</p>}
      <a className="effect-credits" href={import.meta.env.BASE_URL + 'sounds/CREDITS.md'} target="_blank" rel="noreferrer">Sound credits</a>
    </div>
  </details>
}
