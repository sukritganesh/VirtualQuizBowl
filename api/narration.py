"""CPU host voices. Each ONNX engine owns its eSpeak state in a separate worker."""
import io
import json
import logging
import os
import subprocess
import tempfile
import wave
from concurrent.futures import ProcessPoolExecutor
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / ".models" / "narration"
CATALOG = json.loads((ROOT / "shared" / "narrators.json").read_text("utf-8"))


class SpeechRequest(BaseModel):
    engine: str
    voice: str
    speaker: int = Field(default=0, ge=0, strict=True)
    text: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def check_choice(self):
        model = CATALOG.get(self.engine)
        if not model or self.voice not in model["voices"]:
            raise ValueError("Unknown narrator voice.")
        speakers = model.get("speakers", {}).get(self.voice, [0])
        if self.speaker >= len(speakers) or not self.text.strip():
            raise ValueError("Invalid speaker or empty narration.")
        return self


@lru_cache(maxsize=1)
def kokoro_model():
    from kokoro_onnx import Kokoro
    import onnxruntime as ort

    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(MODELS / "kokoro/model.onnx"), options, providers=["CPUExecutionProvider"])
    return Kokoro.from_session(session, str(MODELS / "kokoro/voices.bin"))


@lru_cache(maxsize=1)
def piper_model(voice):
    from piper import PiperVoice
    return PiperVoice.load(MODELS / "piper" / (voice + ".onnx"))


def onnx_audio(engine, voice, speaker, text):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        if engine == "kokoro":
            import numpy as np
            samples, rate = kokoro_model().create(text, voice=voice, lang="en-gb" if voice.startswith("b") else "en-us")
            wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
            wav.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())
        else:
            from piper import SynthesisConfig
            piper_model(voice).synthesize_wav(text, wav, syn_config=SynthesisConfig(speaker_id=speaker))
    return buffer.getvalue()


@lru_cache(maxsize=2)
def onnx_worker(engine):
    return ProcessPoolExecutor(max_workers=1)


@lru_cache(maxsize=32)
def render(engine, voice, speaker, text):
    if engine in ("kokoro", "piper"):
        # Fail before spawning a worker or opening a WAV when setup is incomplete.
        required = MODELS / ("kokoro/model.onnx" if engine == "kokoro" else f"piper/{voice}.onnx")
        if not required.is_file():
            raise FileNotFoundError(required)
        return onnx_worker(engine).submit(onnx_audio, engine, voice, speaker, text).result()

    directory = MODELS / engine
    with tempfile.TemporaryDirectory() as temp:
        output = Path(temp) / "speech.wav"
        if engine == "qwen":
            command = [directory / "qwen-tts.exe", "--model", "talker.gguf", "--codec", "codec.gguf",
                       "--device", "CPU", "--speaker", voice, "--lang", "English", "--seed", "42", "-o", output]
        else:
            command = [directory / "pocket-tts.exe", "generate", "--config", "english.yaml", "--voice",
                       str(directory / (voice + ".safetensors")), "--text", text, "--output-path", output]
        result = subprocess.run(command, cwd=directory, input=text.encode(), stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=120,
                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        if result.returncode:
            logging.getLogger(__name__).warning("%s renderer: %s", engine, os.fsdecode(result.stdout[-1000:]))
            raise RuntimeError("Speech synthesis failed.")
        return output.read_bytes()
