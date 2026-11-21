"""Local host voices. Each ONNX engine owns its phonemizer in a separate worker."""
import io
import json
import logging
import os
import subprocess
import sys
import sysconfig
import tempfile
import wave
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field, model_validator
from .kokoro_timing import word_starts_ms

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / ".models" / "narration"
CATALOG = json.loads((ROOT / "shared" / "narrators.json").read_text("utf-8"))
GPU_ORT_VERSION = "1.23.2"  # CUDA 12 and cuDNN 9, shared with Whisper.
KOKORO_RUNTIME = MODELS / "kokoro" / f"ort-{GPU_ORT_VERSION}-{sys.implementation.cache_tag}-{sysconfig.get_platform()}"
_kokoro = None
_dll_handles = []


@dataclass
class NarrationClip:
    wav: bytes
    # One onset per whitespace-delimited source word. None denotes an unspoken word.
    word_starts_ms: list[int | None] = field(default_factory=list)


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


def load_kokoro(cpu_only=False):
    # Only the Kokoro worker imports this GPU wheel. Whisper and Piper keep their own ORT.
    if KOKORO_RUNTIME.is_dir() and str(KOKORO_RUNTIME) not in sys.path:
        sys.path.insert(0, str(KOKORO_RUNTIME))
        if sys.platform == "win32":
            for root in (KOKORO_RUNTIME, Path(sysconfig.get_paths()["purelib"])):
                for directory in (root / "nvidia").glob("*/bin"):
                    _dll_handles.append(os.add_dll_directory(str(directory)))
                    os.environ["PATH"] = str(directory) + os.pathsep + os.environ["PATH"]
    import onnxruntime as ort
    from kokoro_onnx import Kokoro

    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    model = str(MODELS / "kokoro/model.onnx")
    session = None
    if not cpu_only and "CUDAExecutionProvider" in ort.get_available_providers():
        try:
            session = ort.InferenceSession(model, options, providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        except Exception:
            logging.getLogger(__name__).warning("Kokoro CUDA initialization failed; using CPU.", exc_info=True)
    if session is None:
        session = ort.InferenceSession(model, options, providers=["CPUExecutionProvider"])
    logging.getLogger(__name__).warning("Kokoro narrator using %s", session.get_providers()[0])
    return Kokoro.from_session(session, str(MODELS / "kokoro/voices.bin"))


def kokoro_samples(text, voice, language):
    global _kokoro
    if _kokoro is None:
        _kokoro = load_kokoro()
    try:
        return _kokoro.create_timed(text, voice=voice, lang=language)
    except Exception:
        if "CUDAExecutionProvider" not in _kokoro.sess.get_providers():
            raise
        # A driver can load successfully and still fail on the first inference (e.g. VRAM).
        logging.getLogger(__name__).warning("Kokoro CUDA render failed; retrying on CPU.", exc_info=True)
        _kokoro = None
    _kokoro = load_kokoro(cpu_only=True)
    return _kokoro.create_timed(text, voice=voice, lang=language)


@lru_cache(maxsize=1)
def piper_model(voice):
    from piper import PiperVoice
    return PiperVoice.load(MODELS / "piper" / (voice + ".onnx"))


def onnx_audio(engine, voice, speaker, text):
    buffer = io.BytesIO()
    starts = []
    with wave.open(buffer, "wb") as wav:
        if engine == "kokoro":
            import numpy as np
            language = "en-gb" if voice.startswith("b") else "en-us"
            samples, rate, marks = kokoro_samples(text, voice, language)
            try:
                starts = word_starts_ms(text, language, marks)
            except Exception:
                logging.getLogger(__name__).warning("Could not align Kokoro word timings.", exc_info=True)
            wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
            wav.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())
        else:
            from piper import SynthesisConfig
            piper_model(voice).synthesize_wav(text, wav, syn_config=SynthesisConfig(speaker_id=speaker))
    return NarrationClip(buffer.getvalue(), starts)


@lru_cache(maxsize=2)
def onnx_worker(engine):
    return ProcessPoolExecutor(max_workers=1)


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
        return NarrationClip(output.read_bytes())
