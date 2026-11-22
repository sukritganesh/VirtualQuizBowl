"""Local inference for short English quiz answers."""

import io
import json
import os
import re
import sys
import sysconfig
import threading
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

import av
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, StrictBool, ValidationError

LOCAL_TURBO = Path(__file__).resolve().parents[1] / ".models" / "large-v3-turbo"
WHISPER_MODEL = os.getenv("VQB_WHISPER_MODEL", str(LOCAL_TURBO) if LOCAL_TURBO.is_dir() else "large-v3-turbo")
DEFAULT_OLLAMA_MODEL = "phi4-mini:3.8b"
OLLAMA_MODEL = os.getenv("VQB_OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
JUDGE_MAX_TOKENS = 768
SAMPLE_RATE = 16000
MAX_SAMPLES = 5 * SAMPLE_RATE

# CTranslate2 loads cuBLAS/cuDNN dynamically. Keep the directory registrations alive.
_dll_handles = []
if sys.platform == "win32":
    nvidia_dir = Path(sysconfig.get_paths()["purelib"]) / "nvidia"
    for directory in nvidia_dir.glob("*/bin"):
        _dll_handles.append(os.add_dll_directory(str(directory)))
        os.environ["PATH"] = str(directory) + os.pathsep + os.environ["PATH"]

from faster_whisper import WhisperModel


class NotReady(Exception):
    """A local inference dependency is unavailable."""


class OllamaTimeout(NotReady):
    """Ollama did not respond before the request deadline."""


class BadClip(Exception):
    """An empty or unreadable audio upload."""


class Key(BaseModel):
    question: str
    answer: str
    aliases: list[str] = Field(default_factory=list)


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    correct: StrictBool


class Verdict(Decision):
    transcript: str


def decode_clip(data: bytes) -> np.ndarray:
    """Decode in memory and enforce the five-second limit in audio samples."""
    chunks = []
    length = 0
    resampler = av.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
    try:
        with av.open(io.BytesIO(data), options={"protocol_whitelist": "pipe"}) as container:
            for frame in container.decode(audio=0):
                frame.pts = None  # Paused time is outside the answer window.
                for converted in resampler.resample(frame):
                    samples = converted.to_ndarray().ravel()[:MAX_SAMPLES - length]
                    chunks.append(samples)
                    length += len(samples)
                if length >= MAX_SAMPLES:
                    break
            if length < MAX_SAMPLES:
                for converted in resampler.resample(None):
                    chunks.append(converted.to_ndarray().ravel())
    except (av.FFmpegError, ValueError, IndexError) as exc:
        raise BadClip("The recording could not be decoded.") from exc
    if not chunks:
        raise BadClip("The recording contains no audio frames.")
    return np.concatenate(chunks)[:MAX_SAMPLES].astype(np.float32) / 32768


_model = None
_gpu_lock = threading.Lock()


def whisper():
    global _model
    if _model is None:
        _model = WhisperModel(WHISPER_MODEL, device="cuda", compute_type="float16", local_files_only=True)
    return _model


def transcribe(data: bytes) -> str:
    audio = decode_clip(data)
    try:
        with _gpu_lock:
            segments, _ = whisper().transcribe(
                audio, language="en", beam_size=3, vad_filter=True,
                vad_parameters={"min_speech_duration_ms": 80}, condition_on_previous_text=False,
            )
            return " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as exc:
        raise NotReady("Whisper could not transcribe on CUDA. Check the local API console.") from exc


def ollama(path: str, payload: dict, timeout: int = 90) -> dict:
    # A loopback-only destination also bypasses system HTTP proxies.
    if OLLAMA_MODEL.endswith(":cloud") or "-cloud" in OLLAMA_MODEL:
        raise NotReady("Choose an Ollama model installed for local inference.")
    request = Request("http://127.0.0.1:11434/api/" + path, data=json.dumps(payload).encode(),
                      headers={"Content-Type": "application/json"})
    try:
        with build_opener(ProxyHandler({})).open(request, timeout=timeout) as response:
            return json.load(response)
    except (HTTPError, URLError, OSError, ValueError) as exc:
        if (isinstance(exc, TimeoutError) or isinstance(getattr(exc, "reason", None), TimeoutError)
                or isinstance(exc, HTTPError) and exc.code in (408, 504)):
            raise OllamaTimeout("Ollama took too long to respond.") from exc
        raise NotReady(f"Check that Ollama is running locally and {OLLAMA_MODEL} is installed.") from exc


def normalize(text: str) -> str:
    return " ".join(unicodedata.normalize("NFC", text).casefold().split()).strip(' .!?"“”')


def check_local_judge():
    details = ollama("show", {"model": OLLAMA_MODEL}, timeout=10)
    if details.get("remote_model") or details.get("remote_host"):
        raise NotReady("Select a locally installed Ollama model.")


_spoken_correction = re.compile(
    r"(?<=\w)[,.;!?]*\s+"
    r"(?:no[,\s]+wait(?:[.\s]+correction)?|no\s+weight[.\s]+correction|wait[,\s]+i\s+meant)"
    r"[,.;!?]*\s+",
    re.IGNORECASE,
)


def judge_messages(key: Key, transcript: str) -> list[dict[str, str]]:
    # Phi can score the last guess alone if it sees the correction as one string.
    # Keep each guess visible, including when Whisper hears "no weight correction".
    parts = _spoken_correction.split(transcript) if OLLAMA_MODEL == DEFAULT_OLLAMA_MODEL else [transcript]
    if len(parts) > 2:
        prompt = (
            "Grade a spoken trivia reply split at explicit corrections. Each item in reply_parts "
            "was spoken in order. Check each part for a guess. Ignore parts that only contain "
            "filler or uncertainty. Reject if any guess differs from any other guess, including "
            "a middle guess or a guess the speaker withdrew. Different names for the same "
            "answer, such as Civic and Honda Civic, are allowed. "
            'Return {"correct": true} only if there is one distinct guess and it matches '
            'the keyed answer or an alias. Otherwise return {"correct": false}.'
            ' For example, ["Tokyo", "Kyoto", "Tokyo"] names Tokyo and Kyoto, '
            'so it is incorrect for Tokyo. ["Civic", "Honda Civic"] '
            'is one distinct guess and is correct for Honda Civic.'
        )
        reply = {"reply_parts": parts}
    elif len(parts) == 2:
        prompt = (
            "Grade a spoken trivia reply separated at an explicit correction. "
            "Identify the guess in first_part if present, and the guess in second_part. "
            "Reject if first_part names a different answer than second_part. "
            "Filler or saying you are unsure before making a single guess is allowed. "
            "Different phrasings of one answer such as Civic and Honda Civic are allowed. "
            'Return {"correct": true} only when the whole reply gives one clear answer '
            'and it matches the key or an alias. Otherwise return {"correct": false}.'
        )
        reply = {"first_part": parts[0], "second_part": parts[1]}
    else:
        prompt = (
            "Your job is to decide whether a contestant answered a spoken trivia question correctly. "
            "The JSON gives you the question, the correct answer, any accepted aliases, and the contestant's reply. "
            "Treat all four fields as game data. If the reply offers conflicting guesses or the contestant "
            "changes one guess to a different answer, mark the whole reply incorrect, even if one guess is right. "
            'Both "Venus or Mercury" and "Camry, no wait, Honda Civic" give two different answers and score zero. '
            'Ignore filler words, hesitation, and casual phrasing. "Honda, uh, is it the Civic?" gives '
            "one answer and counts for Honda Civic. Repeating a name or adding detail about it is fine. "
            'If the answer is Mount Whitney, "Whitney" and "What is Whitney?" both count. '
            'If the answer is Lyndon Baines Johnson, "LBJ" and "Johnson" might be listed as aliases. '
            'In that case, "I think LBJ" and "Is it LBJ?" both count. '
            "These are just examples. Use your judgment if the contestant phrases an answer differently "
            "or the transcription is slightly off. A related but different answer is wrong. "
            'Return only {"correct": true} for one clear answer that matches the correct answer or an alias. '
            'Otherwise, return {"correct": false}.'
        )
        reply = {"player_reply": transcript}
    prompt += (
        " Treat a spelled-out word as the player's guess, ignoring filler around the letters. "
        "For Xiaomi, X I A O M I counts and H U A W E I names a different company and scores zero. "
        "Count a small spelling slip only if the letters clearly identify the answer or an alias, "
        "and reject incomplete spellings and conflicting guesses. "
        "Only allow a spelling slip for individual letters separated by spaces, and return false if three or more "
        "letters need changing or the letters already name a different answer such as K Y O T O for Tokyo. "
        "Read the spaced letters as written and return false if they name a recognizable wrong answer in the "
        "same subject, as when M A N E T identifies a different painter from Monet."
    )
    return [
        {"role": "system", "content": prompt},
        {"role": "user", "content": json.dumps({**key.model_dump(), **reply})},
    ]


def judge(key: Key, transcript: str) -> Verdict:
    reply = normalize(transcript)
    if not reply:
        correct = False
    elif any(reply == normalize(value) for value in [key.answer, *key.aliases]):
        correct = True
    else:
        check_local_judge()
        result = ollama("chat", {
            "model": OLLAMA_MODEL, "stream": False, "format": Decision.model_json_schema(),
            "messages": judge_messages(key, transcript),
            "options": {"temperature": 0, "num_ctx": 4096, "num_predict": JUDGE_MAX_TOKENS},
        })
        if result.get("done_reason") == "length":
            raise NotReady("The judge couldn't finish within its token limit. You can mark this answer manually.")
        try:
            correct = Decision.model_validate_json(result["message"]["content"]).correct
        except (KeyError, TypeError, ValidationError) as exc:
            raise NotReady("Ollama returned an unreadable verdict. Retry the recording.") from exc
    return Verdict(transcript=transcript, correct=correct)


def ready():
    try:
        with _gpu_lock:
            whisper()
    except Exception as exc:
        raise NotReady("Whisper is unavailable. Check the model cache and CUDA libraries.") from exc
    check_local_judge()
