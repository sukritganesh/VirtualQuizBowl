"""Synthesize identical five-second inputs for both profiles using offline Windows voices."""

import json
import wave
from pathlib import Path

from win32com.client import Dispatch

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "scratch/spoken-answers/audio"
VOICES = ["Microsoft David Desktop", "Microsoft Zira Desktop"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    speaker = Dispatch("SAPI.SpVoice")
    tokens = speaker.GetVoices()
    voices = {tokens.Item(i).GetDescription(): tokens.Item(i) for i in range(tokens.Count)}
    for case in json.loads((HERE / "cases.json").read_text(encoding="utf-8")):
        name = VOICES[(case["id"] - 1) % len(VOICES)]
        speaker.Voice = next(token for description, token in voices.items() if name in description)
        path = OUT / f"{case['id']:02}.wav"
        output = Dispatch("SAPI.SpFileStream")
        output.Format.Type = 18  # SAFT16kHz16BitMono
        output.Open(str(path), 3)  # SSFMCreateForWrite
        try:
            speaker.AudioOutputStream = output
            speaker.Speak(case["reply"])
        finally:
            output.Close()
        with wave.open(str(path), "rb") as wav:
            rate = wav.getframerate()
            assert (rate, wav.getsampwidth(), wav.getnchannels()) == (16000, 2, 1)
            frames = wav.readframes(wav.getnframes())
        if len(frames) > 5 * rate * 2:
            raise ValueError(f"Reply {case['id']} exceeds the five-second game window")
        with wave.open(str(path), "wb") as wav:
            wav.setparams((1, 2, rate, 0, "NONE", "uncompressed"))
            wav.writeframes(frames.ljust(5 * rate * 2, b"\0"))
    print(f"Audio ready in {OUT}")


if __name__ == "__main__":
    main()
