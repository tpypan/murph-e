#!/usr/bin/env python3
"""Check the imported art contract, not just whether JSON parses."""
import hashlib
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
manifest_bytes = (HERE / "manifest.json").read_bytes()
manifest = json.loads(manifest_bytes)
checks = []


def check(name, passed):
    checks.append({"name": name, "passed": bool(passed)})
    assert passed, name


for name in manifest["files"]:
    path = (HERE / name).resolve()
    check(f"file-integrity:{name}", path.is_relative_to(HERE) and path.is_file() and
          hashlib.sha256(path.read_bytes()).hexdigest() == manifest["fileHashes"][name])

actor_count = 0
frame_count = 0
motion_cycles = 0
for record in manifest["actors"]:
    actor = json.loads((HERE / record["file"]).read_text())
    actor_count += 1
    frames = {f["id"]: f for f in actor["frames"]}
    image = Image.open(HERE / actor["source"]["path"]).convert("RGBA")
    check(f"unique-frames:{actor['id']}", len(frames) == len(actor["frames"]))
    coverage = set()
    for frame in frames.values():
        frame_count += 1
        rect = frame["sourceRect"]
        rows = frame["pixels"]
        check(f"runtime-pixels:{actor['id']}/{frame['id']}",
              len(rows) == rect["h"] and all(len(row) == rect["w"] for row in rows)
              and set("".join(rows)) <= set(".0123456789abcdef"))
        check(f"timing:{actor['id']}/{frame['id']}", frame["durationTicks"] == 10)
        check(f"anchor:{actor['id']}/{frame['id']}",
              frame["anchor"] == actor["anchor"] and
              0 <= frame["anchor"]["x"] <= actor["width"] and
              0 <= frame["anchor"]["y"] <= actor["height"])
        check(f"no-fabricated-attacks:{actor['id']}/{frame['id']}", frame["hitboxes"] == [])
        for y, row in enumerate(rows):
            for x, color in enumerate(row):
                p = (rect["x"]+x, rect["y"]+y)
                assert p not in coverage, "Overlapping source rectangles"
                coverage.add(p)
                assert (color == ".") == (image.getpixel(p)[3] == 0), "Lost source silhouette/transparency"
        for box in frame["hurtboxes"] + [frame["pushbox"]]:
            assert box["w"] > 0 and box["h"] > 0
            assert 0 <= box["x"] <= rect["w"] - box["w"]
            assert 0 <= box["y"] <= rect["h"] - box["h"]
    check(f"all-source-pixels-represented:{actor['id']}", len(coverage) == image.width*image.height)
    for name, animation in actor["animations"].items():
        check(f"animation-resolves:{actor['id']}/{name}",
              bool(animation["frameIds"]) and all(f in frames for f in animation["frameIds"]))
        if animation["kind"] == "cycle":
            motion_cycles += 1
            check(f"actual-changing-motion:{actor['id']}/{name}",
                  len({"\n".join(frames[f]["pixels"]) for f in animation["frameIds"]}) >= 2)
    if actor["id"] != "pig":
        check(f"four-direction-walk:{actor['id']}", all(f"walk-{d}" in actor["animations"] for d in ("up", "down", "left", "right")))
        check(f"static-action-honesty:{actor['id']}", "multi-frame-attack" in actor["unsupportedStates"] and
              actor["animations"]["death-pose"]["frameIds"] == ["death-pose"])
    else:
        check("pig-direction-honesty", "walk-up" in actor["unsupportedStates"] and
              actor["animations"]["walk-right"]["flipX"] is True)

for record in manifest["props"]:
    prop = json.loads((HERE / record["file"]).read_text())
    check(f"static-prop-contract:{prop['id']}",
          prop["animations"] == {} and prop["hitboxes"] == [] and
          len(prop["pixels"]) == prop["height"] and
          all(len(r) == prop["width"] for r in prop["pixels"]))

check("honest-counts", actor_count == 4 and frame_count == 86 and len(manifest["props"]) == 14)
check("bounded-assets", sum(p.stat().st_size for p in HERE.rglob("*") if p.is_file()) < 10_000_000)
report = {
    "manifestSha256": hashlib.sha256(manifest_bytes).hexdigest(),
    "checks": checks,
    "summary": {"passed": len(checks), "actors": actor_count, "sourceActorFrames": frame_count,
                "directionalMotionCyclesIncludingMirrors": motion_cycles, "staticProps": len(manifest["props"])},
    "visualArtifact": "contact-sheet.png",
    "limitations": ["No fighter action cycles or new named-character art.",
                    "Geometry is authored baseline data; consuming game must verify mechanic-specific interactions.",
                    "These checks do not claim gameplay polish or complete the 15-family goal."],
}
(HERE / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report["summary"]))
