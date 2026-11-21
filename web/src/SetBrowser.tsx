import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { categoryName, listCategory } from './catalog'
import { library, type TriviaSet } from './sets'

type Props = {
  selected: TriviaSet | null
  imported: TriviaSet | null
  onSelect: (set: TriviaSet) => void
  onClose: () => void
}

export function SetBrowser({ selected, imported, onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [trail, setTrail] = useState<string[]>([])
  const { categories, packs } = listCategory(library, trail)

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  useLayoutEffect(() => { heading.current?.focus() }, [trail])

  function packRow(set: TriviaSet, key: string) {
    return <button key={key} className="set-row" aria-current={selected === set || undefined} onClick={() => onSelect(set)}>
      <span>{set.title}</span>
      <small>{set.questions.length} {set.questions.length === 1 ? 'question' : 'questions'}</small>
      <span className="pack-mark" aria-hidden="true">{selected === set ? '✓' : ''}</span>
    </button>
  }

  return <dialog className="set-browser" ref={dialog} aria-labelledby="browser-title"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="browser-head">
      <nav className="browser-path" aria-label="Category path">
        {trail.length === 0 ? <span>All categories</span> : <button onClick={() => setTrail([])}>All categories</button>}
        {trail.slice(0, -1).map((slug, i) => <Fragment key={i}>
          <span aria-hidden="true">/</span>
          <button onClick={() => setTrail(trail.slice(0, i + 1))}>{categoryName(slug)}</button>
        </Fragment>)}
      </nav>
      <button className="icon close" aria-label="Close question sets" onClick={onClose}>×</button>
      <h2 id="browser-title" ref={heading} tabIndex={-1}>{trail.length ? categoryName(trail[trail.length - 1]) : 'Question sets'}</h2>
    </div>
    <div className="browser-list">
      {categories.map(({ slug, name, count }) => <button key={slug} className="set-row category-row" onClick={() => setTrail([...trail, slug])}>
        <span>{name}</span><small>{count} {count === 1 ? 'set' : 'sets'}</small>
        <span className="row-mark" aria-hidden="true">›</span>
      </button>)}
      {packs.map(({path, set}) => packRow(set, path))}
      {!trail.length && imported && <><p className="imported-label">Imported this session</p>{packRow(imported, 'import')}</>}
    </div>
  </dialog>
}
