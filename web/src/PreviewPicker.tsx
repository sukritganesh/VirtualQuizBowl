import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

export type PreviewOption = { value: string; label: string; detail?: string }
type Props = {
  id: string; label: string; value: string; options: PreviewOption[]
  playing: string | null; disabled: boolean
  choose: (value: string) => void; preview: (value: string) => void; stop: () => void
}

/** Both settings use the same interaction: select the name, or audition with the adjacent button. */
export function PreviewPicker({ id, label, value, options, playing, disabled, choose, preview, stop }: Props) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const row = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)
  const visible = filter ? options.filter(option =>
    (option.label + ' ' + (option.detail ?? '')).toLowerCase().includes(filter.trim().toLowerCase())) : options

  const close = useCallback((focus = false) => {
    if (focus) trigger.current?.focus()
    setOpen(false)
    setFilter('')
    stop()
  }, [stop])
  useEffect(() => {
    if (!open) return
    const group = row.current?.closest('details')
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !row.current?.contains(event.target)) close()
    }
    const collapse = () => { if (!group?.open) close() }
    group?.addEventListener('toggle', collapse)
    document.addEventListener('pointerdown', outside)
    const current = list.current?.querySelector<HTMLElement>('[aria-pressed=true]')
    if (current && list.current) list.current.scrollTop += current.getBoundingClientRect().top - list.current.getBoundingClientRect().top
    list.current?.scrollIntoView({ block: 'nearest' })
    return () => {
      group?.removeEventListener('toggle', collapse)
      document.removeEventListener('pointerdown', outside)
    }
  }, [open, close])

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
      return
    }
    if (event.target instanceof HTMLInputElement && event.key !== 'ArrowDown') return
    const previews = event.target instanceof Element && event.target.closest('.effect-preview')
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>(previews ? '.effect-preview' : '.effect-choice') ?? [])
    const index = buttons.indexOf(event.target as HTMLButtonElement)
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

  return <div className="effect-row" ref={row} onKeyDown={open ? navigate : undefined}
    onBlur={event => {
      if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close()
    }}>
    <span id={id + '-label'} className="effect-label">{label}</span>
    <div className="effect-picker">
      <button type="button" ref={trigger} className="effect-trigger" aria-expanded={open} aria-controls={id + '-options'}
        aria-labelledby={id + '-label ' + id + '-value'} onClick={() => { if (open) close(); else setOpen(true) }}>
        <span id={id + '-value'}>{selected?.label}</span><span className="disclosure-arrow" aria-hidden="true"/>
      </button>
      {open && options.length > 12 && <input className="picker-filter" type="search" value={filter}
        aria-label={'Filter ' + label.toLowerCase() + ' options'} placeholder={'Find a ' + label.toLowerCase() + '…'}
        onChange={event => setFilter(event.target.value)}/>}
      <div id={id + '-options'} ref={list} className="effect-options" role="group" aria-labelledby={id + '-label'} hidden={!open}>
        {open && visible.map(option => {
          const active = playing === option.value
          const action = (active ? 'Stop ' : 'Preview ') + option.label + (option.detail ? ' · ' + option.detail : '')
          return <div className="effect-option" key={option.value}>
            <button type="button" className="effect-choice" title={option.label} aria-pressed={option.value === value}
              onClick={() => { choose(option.value); close(true) }}>
              <span className="choice-check" aria-hidden="true">{option.value === value ? '✓' : ''}</span>
              <span className="choice-name">{option.label}</span>{option.detail && <small>{option.detail}</small>}
            </button>
            <button type="button" className="effect-preview" aria-label={action}
              title={disabled ? 'Enable sound to preview' : action} disabled={disabled} onClick={() => preview(option.value)}>
              <span className={active ? 'stop-shape' : 'play-shape'} aria-hidden="true"/>
            </button>
          </div>
        })}
        {open && !visible.length && <p className="picker-empty">No matches</p>}
      </div>
    </div>
  </div>
}
