"""Install the selected local host models under .models/narration (Windows x64)."""
import argparse
import hashlib
import shutil
import subprocess
import sys
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen

from .narration import CATALOG, MODELS

HUB = "https://huggingface.co"


def download(url, path, sha256=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    def valid(file):
        if not file.is_file():
            return False
        if not sha256:
            return file.stat().st_size > 0
        with file.open("rb") as stream:
            return hashlib.file_digest(stream, "sha256").hexdigest() == sha256
    if valid(path):
        return path
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as dest:
        temp = Path(dest.name)
    try:
        with urlopen(url, timeout=90) as response, temp.open("wb") as out:
            shutil.copyfileobj(response, out, 1024 * 1024)
            size = response.headers.get("Content-Length")
        if (size and temp.stat().st_size != int(size)) or not valid(temp):
            raise ValueError(f"Incomplete download: {path.name}")
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)
    return path


def kokoro(directory):
    url = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/"
    download(url + "kokoro-v1.0.onnx", directory / "model.onnx", "beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a")
    download(url + "voices-v1.0.bin", directory / "voices.bin", "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d")


def piper(directory):
    base = f"{HUB}/rhasspy/piper-voices/resolve/e9c8a39444359388adaa94255becb37a5a2b8e51/"
    def prepare(voice):
        locale, name, quality = voice.split("-")
        prefix = f"en/{locale}/{name}/{quality}/"
        for suffix in (".onnx", ".onnx.json"):
            download(base + prefix + voice + suffix, directory / (voice + suffix))
        download(base + prefix + "MODEL_CARD", directory / "licenses" / (voice + ".txt"))
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(prepare, CATALOG["piper"]["voices"]))


def pocket(directory):
    release = "https://github.com/kyutai-labs/pocket-tts/releases/download/v4.0.1/"
    archive = download(release + "pocket-tts-3.3.0-x86_64-pc-windows-msvc.zip", directory / "runtime.zip",
                       "98753041f2e65744b989776f87bccb93f1f574a08afe1890c5427ec94cd6309c")
    with zipfile.ZipFile(archive) as package:
        for filename in ("pocket-tts.exe", "LICENSE"):
            entry = next(name for name in package.namelist() if Path(name).name == filename)
            (directory / filename).write_bytes(package.read(entry))
    repo = f"{HUB}/kyutai/pocket-tts-without-voice-cloning/resolve/"
    config = download("https://raw.githubusercontent.com/kyutai-labs/pocket-tts/v4.0.1/pocket_tts/config/english.yaml",
                      directory / "upstream.yaml").read_text("utf-8")
    for file, revision in [("model.safetensors", "a7056f505a4a8ca72d8b5fb1440071d6f1a35739"),
                           ("tokenizer.json", "00eac05ed3d16bdc3f6b5d598874019c34a89214")]:
        download(f"{repo}{revision}/languages/english/{file}", directory / file)
    # The published preset embeddings work with the ungated checkpoint. Resolve
    # all three paths locally so a game or preview never contacts the model hub.
    config = "\n".join(line.partition(":")[0] + ": " + ("tokenizer.json" if "tokenizer_path:" in line else "model.safetensors")
                       if ": hf://" in line else line for line in config.splitlines())
    (directory / "english.yaml").write_text(config + "\n", "utf-8")
    def prepare(voice):
        download(repo + "a3055dcb533cf2ec90458008a01e7cef550bae2a/languages/english/embeddings/" + voice + ".safetensors",
                 directory / (voice + ".safetensors"))
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(prepare, CATALOG["pocket"]["voices"]))


def qwen(directory):
    source = directory / "source"
    revision = "2edb35f87b709a070b2d5379f77e5c52a1daa585"
    subprocess.run(["git", "init", str(source)], check=True)
    for args in [["fetch", "--depth", "1", "https://github.com/ServeurpersoCom/qwentts.cpp.git", revision],
                 ["checkout", "--detach", revision], ["submodule", "update", "--init", "--recursive", "--depth", "1"]]:
        subprocess.run(["git", "-C", str(source), *args], check=True)
    build = directory / "build"
    subprocess.run(["cmake", "-S", str(source), "-B", str(build), "-DBUILD_SHARED_LIBS=OFF", "-DGGML_CUDA=OFF",
                    "-DGGML_BUILD_TESTS=OFF", "-DGGML_BUILD_EXAMPLES=OFF", "-DCMAKE_BUILD_TYPE=Release"], check=True)
    subprocess.run(["cmake", "--build", str(build), "--config", "Release", "--target", "qwen-tts", "--parallel", "4"], check=True)
    shutil.copy2(next(build.rglob("qwen-tts.exe")), directory / "qwen-tts.exe")
    base = f"{HUB}/Serveurperso/Qwen3-TTS-GGUF/resolve/b7ee2e8c7459c3bea99da23e3d178125a7d1713c/"
    download(base + "qwen-talker-1.7b-customvoice-Q4_K_M.gguf", directory / "talker.gguf")
    download(base + "qwen-tokenizer-12hz-Q8_0.gguf", directory / "codec.gguf")


if __name__ == "__main__":
    installers = {"kokoro": kokoro, "piper": piper, "pocket": pocket, "qwen": qwen}
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("engine", choices=[*installers, "all"], default="kokoro", nargs="?")
    engine = parser.parse_args().engine
    for name in installers if engine == "all" else [engine]:
        if name in {"pocket", "qwen"} and sys.platform != "win32":
            parser.error(f"The bundled {name} installer targets Windows x64.")
        directory = MODELS / name
        directory.mkdir(parents=True, exist_ok=True)
        installers[name](directory)
        print(f"{CATALOG[name]['name']} ready in {directory}", flush=True)
