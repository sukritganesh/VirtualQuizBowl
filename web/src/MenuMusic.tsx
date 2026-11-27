import { useLayoutEffect, useRef, useState } from 'react'
import menuA from './assets/TriviaMateHomeMenuA.m4a'
import menuB from './assets/TriviaMateHomeMenuB.m4a'
import settingsA from './assets/SettingsMusicA.m4a'
import settingsB from './assets/SettingsMusicB.m4a'

const tracks = { home: [menuA, menuB], settings: [settingsA, settingsB] }
export type MusicMenu = keyof typeof tracks

type Props = { menu: MusicMenu; active: boolean; volume: number; muted: boolean }

export function MenuMusic({ menu, active, volume, muted }: Props) {
  const [index, setIndex] = useState(() => Math.random() < 0.5 ? 0 : 1)
  const player = useRef<HTMLAudioElement>(null)

  useLayoutEffect(() => {
    player.current!.volume = volume / 100
  }, [volume])

  useLayoutEffect(() => {
    if (!active) return
    const audio = player.current!
    // A fresh browser tab may need a click or keystroke before it can play audio.
    const play = () => {
      if (audio.paused && !audio.ended) void audio.play().catch(() => {})
    }
    play()
    window.addEventListener('click', play)
    window.addEventListener('keydown', play)
    return () => {
      window.removeEventListener('click', play)
      window.removeEventListener('keydown', play)
      audio.pause()
    }
  }, [active, index])

  return <audio ref={player} src={tracks[menu][index]} preload="none" muted={muted}
    onEnded={() => setIndex(previous => 1 - previous)} />
}
