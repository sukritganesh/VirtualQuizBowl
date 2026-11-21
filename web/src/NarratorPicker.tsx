import { useEffect, useState } from 'react'
import { chooseVoice, modelDefault, narrators, speakerNames, type Engine, type Narrator } from './audio'
import { PreviewPicker, type PreviewOption } from './PreviewPicker'

export function narrationKey(choice: Narrator) {
  return JSON.stringify([choice.engine, choice.voice, choice.speaker])
}

const modelOptions = Object.entries(narrators).map(([value, model]) => ({ value, label: model.name }))
const accents: Record<string, string> = { a: 'US', b: 'UK', j: 'Japanese', z: 'Mandarin', e: 'Spanish',
  f: 'French', h: 'Hindi', i: 'Italian', p: 'Brazilian' }
const title = (id: string) => id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

function voiceOptions({ engine, voice }: Narrator, browser: SpeechSynthesisVoice[]): PreviewOption[] {
  if (engine === 'browser') {
    const automatic = chooseVoice(browser, '')
    const choices: PreviewOption[] = [{ value: '', label: 'Automatic', detail: automatic?.name }]
    if (voice && !browser.some(item => item.voiceURI === voice)) choices.push({ value: voice, label: 'Saved voice', detail: 'Unavailable' })
    return choices.concat(browser.map(item => ({ value: item.voiceURI, label: item.name,
      detail: item.lang + (item.localService ? '' : ' · Online') })))
  }
  return narrators[engine].voices.map(value => {
    if (engine === 'kokoro') return { value, label: title(value.slice(3)), detail: accents[value[0]] }
    if (engine === 'piper') {
      const [locale, name, quality] = value.split('-')
      return { value, label: title(name) + ' · ' + quality, detail: locale === 'en_US' ? 'US' : 'UK' }
    }
    return { value, label: title(value) }
  })
}

type Props = {
  narrator: Narrator; choose: (choice: Narrator) => void; preview: (choice: Narrator) => void
  playing: string | null; stop: () => void; disabled: boolean; status: string | null
}

export function NarratorPicker({ narrator, choose, preview, playing, stop, disabled, status }: Props) {
  const [browser, setBrowser] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    const refresh = () => setBrowser([...synth.getVoices()].sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)))
    refresh()
    synth.addEventListener('voiceschanged', refresh)
    return () => synth.removeEventListener('voiceschanged', refresh)
  }, [])
  const voices = voiceOptions(narrator, browser)
  const speakers = narrator.engine === 'piper' ? speakerNames(narrator.voice) : []
  const selected = voices.find(option => option.value === narrator.voice)
  function row(label: string, value: string, options: PreviewOption[], choice: (id: string) => Narrator) {
    const active = playing ? options.find(option => narrationKey(choice(option.value)) === playing)?.value ?? null : null
    return <PreviewPicker id={'host-' + label.toLowerCase()} label={label} value={value} options={options}
      choose={id => choose(choice(id))} preview={id => preview(choice(id))} stop={stop} playing={active} disabled={disabled}/>
  }
  return <details className="effect-settings narrator-settings">
    <summary>Host voice <span className="narrator-current">{narrators[narrator.engine].name} · {selected?.label}</span>
      <span className="disclosure-arrow" aria-hidden="true"/></summary>
    <div className="effect-list">
      {row('Model', narrator.engine, modelOptions, id => id === narrator.engine ? narrator : modelDefault(id as Engine))}
      {row('Voice', narrator.voice, voices, id => id === narrator.voice ? narrator : { ...narrator, voice: id, speaker: 0 })}
      {speakers.length > 0 && row('Speaker', String(narrator.speaker), speakers.map((name, index) => ({
        value: String(index), label: name,
      })), id => ({ ...narrator, speaker: Number(id) }))}
      {status && <p className="pack-detail" role="status">{status}</p>}
    </div>
  </details>
}
