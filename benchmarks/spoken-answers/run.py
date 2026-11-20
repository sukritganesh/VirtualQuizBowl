"""Run one benchmark profile locally. Run the profiles sequentially for timing."""

import argparse
import hashlib
import json
import platform
import sys
from importlib.metadata import version
from pathlib import Path
from time import perf_counter
from unittest.mock import patch
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
WORK = ROOT / "scratch/spoken-answers"
sys.path.insert(0, str(ROOT))
from api import inference


def time_call(function, *args):
    start = perf_counter()
    result = function(*args)
    return result, round(perf_counter() - start, 4)


def ollama_state(endpoint):
    with urlopen(f"http://127.0.0.1:11434/api/{endpoint}", timeout=10) as response:
        return json.load(response)


def run(profile):
    cpu = profile == "laptop"
    model = "qwen2.5:1.5b" if cpu else "deepseek-r1:7b"
    whisper = "small.en" if cpu else "large-v3-turbo"
    device, precision = ("cpu", "int8") if cpu else ("cuda", "float16")
    cases = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))
    recordings = [(WORK / "audio" / f"{case['id']:02}.wav").read_bytes() for case in cases]
    rows = [{"id": case["id"], "audio_sha256": hashlib.sha256(audio).hexdigest()}
            for case, audio in zip(cases, recordings, strict=True)]
    recognizer = inference.WhisperModel(str(ROOT / ".models" / whisper), device=device,
                                       compute_type=precision, cpu_threads=4, local_files_only=True)
    with patch.object(inference, "whisper", return_value=recognizer):
        inference.transcribe(recordings[0])  # Exclude first use of the runtime from warm timings.
        for row, audio in zip(rows, recordings, strict=True):
            row["heard"], row["stt_s"] = time_call(inference.transcribe, audio)
            print(f"{profile} transcribed {row['id']:02} ({row['stt_s']} s)", flush=True)

    request = inference.ollama
    def local_request(path, payload, timeout=90):
        if cpu and path == "chat":
            payload = {**payload, "options": {**payload["options"], "num_gpu": 0, "num_thread": 4}}
        return request(path, payload, timeout)

    with patch.object(inference, "OLLAMA_MODEL", model), patch.object(inference, "ollama", local_request):
        inference.judge(inference.Key(question="What color is fresh grass?", answer="Green"),
                        "I think it is green")  # Warm both judges with the same unrelated question.
        resident = next(m for m in ollama_state("ps")["models"] if m["name"] == model)
        if (cpu and resident["size_vram"] != 0) or (not cpu and resident["size_vram"] == 0):
            raise RuntimeError(f"Unexpected placement for {model}: {resident['size_vram']} VRAM bytes")
        for mode in ("text", "audio"):
            for case, row in zip(cases, rows, strict=True):
                key = inference.Key(**{k: case[k] for k in ("question", "answer", "aliases")})
                reply = case["reply"] if mode == "text" else row["heard"]
                normalized = inference.normalize(reply)
                shortcut = not normalized or any(normalized == inference.normalize(a) for a in [key.answer, *key.aliases])
                started = perf_counter()
                try:
                    decision = inference.judge(key, reply).correct
                except inference.NotReady as error:
                    decision = None
                    row[mode + "_error"] = str(error)
                row[mode] = decision
                row[mode + "_judge_s"] = round(perf_counter() - started, 4)
                row[mode + "_shortcut"] = shortcut
                print(f"{profile} {mode} {row['id']:02} {decision} ({row[mode + '_judge_s']} s)", flush=True)

    result = {"profile": profile, "python": platform.python_version(),
              "faster_whisper": version("faster-whisper"), "ctranslate2": version("ctranslate2"),
              "whisper": whisper, "whisper_device": device, "whisper_compute": precision,
              "ollama_version": ollama_state("version")["version"], "judge": model,
              "judge_digest": resident["digest"], "judge_size_bytes": resident["size"],
              "judge_vram_bytes": resident["size_vram"], "rows": rows}
    (WORK / f"{profile}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", choices=["current", "laptop"])
    run(parser.parse_args().profile)
