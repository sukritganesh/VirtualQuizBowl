import { soundCues, soundLibrary, type AudioPreferences, type SoundCue } from './audio'
import { PreviewPicker } from './PreviewPicker'

type Props = {
  preferences: AudioPreferences
  playingFile: string | null
  failed: boolean
  preview: (cue: SoundCue, file: string) => void
  stopPreview: () => void
  choose: (cue: SoundCue, file: string) => void
}

export function SoundEffectPicker({ preferences, playingFile, failed, preview, stopPreview, choose }: Props) {
  return <details className="effect-settings">
    <summary>Sound effects <span className="disclosure-arrow" aria-hidden="true"/></summary>
    <div className="effect-list">
      {soundCues.map(cue => <PreviewPicker key={cue} id={'effect-' + cue} label={soundLibrary[cue].label}
        value={preferences.sounds[cue]} options={soundLibrary[cue].options.map(clip => ({ value: clip.file, label: clip.name }))}
        playing={playingFile} disabled={preferences.muted} stop={stopPreview}
        choose={file => choose(cue, file)} preview={file => preview(cue, file)}/>)}
      {failed && <p role="status" className="pack-detail">This sound could not play. Try previewing it again.</p>}
      <a className="effect-credits" href={import.meta.env.BASE_URL + 'sounds/CREDITS.md'} target="_blank" rel="noreferrer">Sound credits</a>
    </div>
  </details>
}
