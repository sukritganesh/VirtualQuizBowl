import { useEffect, useRef, useState } from 'react'
import { useAudio } from './AudioSettings'
import menuA from './assets/TriviaMateHomeMenuA.m4a'
import menuB from './assets/TriviaMateHomeMenuB.m4a'

export function HomeMusic() {
  const [track] = useState(() => Math.random() < 0.5 ? menuA : menuB)
  const player = useRef<HTMLAudioElement>(null)
  const { preferences } = useAudio()

  useEffect(() => {
    player.current!.volume = preferences.musicVolume / 100
  }, [preferences.musicVolume])

  useEffect(() => {
    const audio = player.current!
    // A fresh browser tab may need a click or keystroke before it can play audio.
    const play = () => {
      if (audio.paused) void audio.play().catch(() => {})
    }
    play()
    window.addEventListener('click', play)
    window.addEventListener('keydown', play)
    return () => {
      window.removeEventListener('click', play)
      window.removeEventListener('keydown', play)
      audio.pause()
    }
  }, [])

  return <audio ref={player} src={track} loop muted={preferences.muted} />
}
