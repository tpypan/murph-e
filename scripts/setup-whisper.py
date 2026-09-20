"""Download the English tiny model once; transcription itself stays offline."""
from pathlib import Path
from faster_whisper.utils import download_model

root = Path(__file__).resolve().parent.parent
destination = root / ".models" / "whisper-tiny.en"
download_model("tiny.en", output_dir=str(destination))
print(f"Local tiny.en model ready: {destination}")
