"""Download the Whisper weights once, ahead of offline play."""

from pathlib import Path
from huggingface_hub import snapshot_download

if __name__ == "__main__":
    directory = Path(__file__).resolve().parents[1] / ".models" / "large-v3-turbo"
    snapshot_download(
        "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
        revision="0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf",
        local_dir=directory,
        allow_patterns=["config.json", "preprocessor_config.json", "tokenizer.json", "vocabulary.json", "model.bin"],
    )
    print(f"Whisper ready in {directory}")
