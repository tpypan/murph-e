"""One resident CPU model. JSON lines on stdin/stdout; no HTTP or cloud STT."""
import base64
import io
import json
import sys
import time
from pathlib import Path

from faster_whisper import WhisperModel

root = Path(__file__).resolve().parent.parent
model_path = root / ".models" / "whisper-tiny.en"
model = WhisperModel(
    str(model_path), device="cpu", compute_type="int8", cpu_threads=4,
    local_files_only=True,
)
print(json.dumps({"ready": True}), flush=True)

for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        clip = io.BytesIO(base64.b64decode(request["audio"], validate=True))
        started = time.perf_counter()
        segments, info = model.transcribe(
            clip, language="en", beam_size=1, vad_filter=True,
            condition_on_previous_text=False,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        result = {
            "id": request["id"], "text": text,
            "ms": round((time.perf_counter() - started) * 1000),
            "model": "tiny.en", "local": True,
        }
    except Exception as error:
        result = {"id": request.get("id"), "error": str(error)}
    print(json.dumps(result), flush=True)
