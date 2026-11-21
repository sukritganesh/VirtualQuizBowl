import type { TriviaSet } from './sets'

export type LibraryPack = { path: string; set: TriviaSet }

export function categoryName(slug: string) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

// A directory can contain both playable packs and further categories.
export function listCategory(library: LibraryPack[], trail: string[]) {
  const prefix = trail.length ? trail.join('/') + '/' : ''
  const counts = new Map<string, number>()
  const packs: LibraryPack[] = []
  for (const pack of library) {
    if (!pack.path.startsWith(prefix)) continue
    const relative = pack.path.slice(prefix.length)
    const slash = relative.indexOf('/')
    if (slash === -1) {
      packs.push(pack)
    } else {
      const slug = relative.slice(0, slash)
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
  }
  const categories = Array.from(counts, ([slug, count]) => ({ slug, name: categoryName(slug), count }))
  categories.sort((a, b) => a.name.localeCompare(b.name))
  return { categories, packs }
}
