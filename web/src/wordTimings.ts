export type WordCue = { word: number; seconds: number }

/** A local renderer may attach one millisecond onset per printed word to its WAV. */
export function readWordCues(headers: Headers, wordCount: number): WordCue[] {
  const encoded = headers.get('X-Narration-Word-Starts-Ms')
  if (!encoded) return []
  try {
    const starts: unknown = JSON.parse(encoded)
    if (!Array.isArray(starts) || starts.length !== wordCount) return []
    const cues: WordCue[] = []
    for (const [word, ms] of starts.entries()) {
      if (ms === null) continue
      if (!Number.isSafeInteger(ms)) return []
      const seconds = ms / 1000
      if (seconds < (cues.at(-1)?.seconds ?? 0)) return []
      cues.push({ word, seconds })
    }
    return cues
  } catch {
    return []
  }
}

/** Wake at each onset, checking the media clock so stalls or a late wakeup cannot cause drift. */
export function followWordCues(cues: WordCue[], player: HTMLAudioElement, onWord: (word: number) => void) {
  let next = 0
  let timer: number | undefined
  function update() {
    const now = player.currentTime
    const before = next
    while (next < cues.length && cues[next].seconds <= now) next++
    if (next > before) onWord(cues[next - 1].word)
    if (next < cues.length) timer = window.setTimeout(update, Math.max(16, (cues[next].seconds - now) * 1000))
  }
  update()
  return () => window.clearTimeout(timer)
}
