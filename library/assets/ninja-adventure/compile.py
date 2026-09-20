#!/usr/bin/env python3
"""Rebuild runtime-ready pixel data from the unchanged licensed source PNGs.

Requires Pillow. No network. Source art, frame layout, timing and newly authored
collision geometry have deliberately separate provenance in the output.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REVISION = "6ac78232d5aedcc85ce5f27d060ea92366f7c24a"
SOURCE = f"https://raw.githubusercontent.com/pixel-boy/NinjaAdventure/{REVISION}/"
LICENSE_URL = "https://pixel-boy.itch.io/ninja-adventure-asset-pack"
PALETTE_SOURCE = ROOT / "packages/runtime/src/palette.ts"
HEX = re.findall(r"'(#[0-9a-f]{6})'", PALETTE_SOURCE.read_text())
assert len(HEX) == 16, "Expected the runtime's actual sixteen-color palette"
PALETTE = [tuple(bytes.fromhex(value[1:])) for value in HEX]
PALETTE_MAP = json.loads((HERE / "palette-map.json").read_text())
DIRECTIONS = ("down", "up", "left", "right")
HUMANOIDS = {
    "ninja-blue": "content/character/ninja_blue/sprite.png",
    "samurai-blue": "content/character/samurai_blue/sprite.png",
    "samurai-green": "content/character/samurai_green/samurai_green.png",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")


def index_color(rgb):
    return min(range(16), key=lambda i: sum((rgb[c] - PALETTE[i][c]) ** 2 for c in range(3)))


def pixels(image, overrides=None):
    # All source PNGs currently use alpha 0/255. Reject unexpected partial alpha
    # rather than silently destroy a future translucent source revision.
    assert set(image.getchannel("A").getdata()) <= {0, 255}
    overrides = overrides or {}
    return ["".join("." if (pixel := image.getpixel((x, y)))[3] == 0 else
                    format(overrides.get("#" + bytes(pixel[:3]).hex(), index_color(pixel[:3])), "x") for x in range(image.width))
            for y in range(image.height)]


def frame(image, frame_id, rect, anchor, hurt=True, pig=False, overrides=None):
    x, y, w, h = rect
    crop = image.crop((x, y, x+w, y+h))
    return {
        "id": frame_id,
        "sourceRect": {"x": x, "y": y, "w": w, "h": h},
        "pixels": pixels(crop, overrides),
        "durationTicks": 10,
        "anchor": anchor,
        "opaqueBounds": dict(zip(("left", "top", "right", "bottom"), crop.getbbox())),
        "hurtboxes": ([{"x": 3 if pig else 4, "y": 5, "w": 10 if pig else 8, "h": 8}] if hurt else []),
        "pushbox": {"x": 4, "y": 11, "w": 8, "h": 3},
        "hitboxes": [],
        "attachmentAnchors": {},
    }


def animation(ids, kind="pose", flip=False):
    return {"frameIds": ids, "loop": True, "kind": kind, "flipX": flip}


def source_metadata(path):
    data = (HERE / "original" / path).read_bytes()
    return {"path": "original/" + path, "url": SOURCE + path,
            "sha256": sha(data), "sourceRevision": REVISION}


def actor_common(actor_id, path, tags, anchor):
    return {
        "schemaVersion": 1, "id": actor_id, "packId": "ninja-adventure",
        "width": 16, "height": 16, "camera": "top-down", "tags": tags,
        "anchor": anchor, "source": source_metadata(path),
        "license": {"spdx": "CC0-1.0", "authors": ["Pixel-Boy", "AAA"], "sourceUrl": LICENSE_URL},
        "timing": {"simulationHz": 60, "sourceFramesPerSecond": 6,
                   "origin": "Source Godot IMAGE_SPEED = 6; 60/6 = 10 simulation ticks per frame."},
        "geometry": {"coordinates": "frame-local pixels; subtract anchor to obtain world-relative offsets",
                     "anchorOrigin": "Source centered Sprite2D dimensions and its vertical offset.",
                     "collisionOrigin": "Authored conservative body/foot rectangles for this catalogue; not recovered from PNG or copied from the Godot collision circles.",
                     "attackOrigin": "No attack hitboxes or combat windows provided. A one-frame attack pose is not a complete combat animation.",
                     "mirroring": "For a local rectangle mirror x to width - x - w; mirror anchor.x to width - anchor.x. Do not flip only the pixels."},
        "normalization": {"palette": "pico-8", "paletteHex": HEX,
                          "reviewedOverrides": PALETTE_MAP["actors"][actor_id],
                          "method": "Reviewed palette-map.json overrides retain characteristic clothing hue; remaining colors use nearest squared RGB distance with lowest-index tie break. Alpha 0 is '.', alpha 255 is an opaque hex digit. No scaling, cropping, dithering or drawing new pixels."},
    }


def make_humanoid(actor_id, path):
    image = Image.open(HERE / "original" / path).convert("RGBA")
    assert image.size == (64, 112)
    result = actor_common(actor_id, path, ["humanoid", "top-down", "ninja" if actor_id.startswith("ninja") else "samurai"], {"x": 8, "y": 14})
    result["layoutSource"] = SOURCE + "system/character/sprite_character.gd"
    result["anchorSource"] = SOURCE + "system/character/character.tscn"
    result["frames"] = []
    result["animations"] = {}
    overrides = PALETTE_MAP["actors"][actor_id]
    for direction, x in zip(DIRECTIONS, range(0, 64, 16)):
        for row in range(6):
            frame_id = f"{direction}-{row}"
            result["frames"].append(frame(image, frame_id, (x, row*16, 16, 16), result["anchor"], overrides=overrides))
        result["animations"][f"idle-{direction}"] = animation([f"{direction}-0"])
        result["animations"][f"walk-{direction}"] = animation([f"{direction}-{row}" for row in range(4)], "cycle")
        result["animations"][f"attack-pose-{direction}"] = animation([f"{direction}-4"])
        result["animations"][f"jump-pose-{direction}"] = animation([f"{direction}-5"])
    for col, name in enumerate(("death-pose", "item-pose", "ability-pose", "ability-2-pose")):
        result["frames"].append(frame(image, name, (col*16, 96, 16, 16), result["anchor"], hurt=name != "death-pose", overrides=overrides))
        result["animations"][name] = animation([name])
    result["supportedStates"] = ["idle", "walk", "attack-pose", "jump-pose", "death-pose", "item-pose", "ability-pose", "ability-2-pose"]
    result["unsupportedStates"] = ["hurt-animation", "guard-animation", "multi-frame-attack", "side-view-fighting", "directional-death-animation"]
    result["notes"] = ["28 source frames. Only walking has a multi-frame motion cycle. Attack/jump/death/abilities are static source poses.",
                       "Source damage response flashes and shakes the sprite rather than selecting hurt artwork; this pack does not fabricate a hurt animation.",
                       "Last sheet row encodes four distinct action poses, not four directions of the same action."]
    return result


def make_pig():
    path = "content/character/pig/pig.png"
    image = Image.open(HERE / "original" / path).convert("RGBA")
    assert image.size == (32, 16)
    result = actor_common("pig", path, ["animal", "pig", "top-down", "horizontal-motion"], {"x": 8, "y": 13})
    result["layoutSource"] = SOURCE + "system/character/animal.gd"
    result["anchorSource"] = SOURCE + "content/character/pig/pig.tscn"
    result["frames"] = [frame(image, f"left-{i}", (i*16, 0, 16, 16), result["anchor"], pig=True) for i in range(2)]
    result["animations"] = {
        "idle-left": animation(["left-0"]), "walk-left": animation(["left-0", "left-1"], "cycle"),
        "idle-right": animation(["left-0"], flip=True), "walk-right": animation(["left-0", "left-1"], "cycle", flip=True),
    }
    result["supportedStates"] = ["idle-left", "idle-right", "walk-left", "walk-right"]
    result["unsupportedStates"] = ["walk-up", "walk-down", "attack", "hurt-animation", "death-animation"]
    result["notes"] = ["Two source frames, mirrored horizontally for right-facing motion, as in the source animal controller. No invented up/down poses."]
    return result


def make_prop(path):
    image = Image.open(HERE / "original" / path).convert("RGBA")
    parts = Path(path).parts
    prop_id = (parts[-2].replace("_", "-") + ("-held" if parts[-1] == "in_hand.png" else "-item")) if parts[1] == "weapon" else Path(path).stem.lower()
    return {
        "schemaVersion": 1, "id": prop_id, "packId": "ninja-adventure", "camera": "top-down",
        "width": image.width, "height": image.height, "source": source_metadata(path),
        "pixels": pixels(image, PALETTE_MAP["props"].get(prop_id, {})), "anchor": {"x": image.width // 2, "y": image.height},
        "normalization": {"palette": "pico-8", "reviewedOverrides": PALETTE_MAP["props"].get(prop_id, {})},
        "anchorOrigin": "Authored bottom-center placement; source attachment pivots have not been reconstructed.",
        "hitboxes": [], "hurtboxes": [], "animations": {},
        "tags": ["weapon" if parts[1] == "weapon" else "prop", "static"],
        "notes": "Static source image only. No implied attack animation, damage volume or destruction sequence.",
    }


def as_image(rows):
    out = Image.new("RGBA", (len(rows[0]), len(rows)))
    for y, row in enumerate(rows):
        for x, value in enumerate(row):
            if value != ".": out.putpixel((x, y), (*PALETTE[int(value, 16)], 255))
    return out


def contact_sheet(actors):
    # Original on the left, indexed-runtime rendering on the right at 4x nearest.
    sheet = Image.new("RGB", (624, 620), "#292d39")
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 8), "NINJA ADVENTURE / SOURCE                         PICO-8 CONVERSION", fill="white")
    x_offsets = (12, 322)
    y = 34
    for actor in actors:
        image = Image.open(HERE / actor["source"]["path"]).convert("RGBA")
        # A 4-column x 7-row humanoid grid retains the source's exact layout.
        mapped = Image.new("RGBA", image.size)
        for f in actor["frames"]:
            r = f["sourceRect"]
            mapped.paste(as_image(f["pixels"]), (r["x"], r["y"]))
        # Show each direction's first walk and contact phase, action and death poses.
        if actor["id"] != "pig":
            for x, original in zip(x_offsets, (image, mapped)):
                # Four key pose rows for overview; the full source sheets and all
                # normalized frames remain available beside this contact sheet.
                for order, row in enumerate((0, 16, 64, 96)):
                    tile = original.crop((0, row, 64, row+16)).resize((128, 32), Image.Resampling.NEAREST)
                    sheet.paste(tile, (x+(order % 2)*140, y+18+(order//2)*42), tile)
            draw.text((12, y), actor["id"] + " (idle / walk phase / attack pose / last action row)", fill="white")
            y += 112
        else:
            draw.text((12, y), "pig (two source motion frames, horizontal mirroring only)", fill="white")
            for x, original in zip(x_offsets, (image, mapped)):
                tile = original.resize((128, 64), Image.Resampling.NEAREST)
                sheet.paste(tile, (x, y+20), tile)
            y += 92
    draw.text((12, y+4), "Palette loss is intentional and reversible: original PNGs are retained.", fill="#ffffff")
    draw.text((12, y+24), "No fighter hurt/guard/attack cycles are invented from these top-down poses.", fill="#ffffff")
    sheet.crop((0, 0, 624, y+54)).save(HERE / "contact-sheet.png")


def prop_contact_sheet(props):
    sheet = Image.new("RGB", (640, 400), "#292d39")
    draw = ImageDraw.Draw(sheet)
    draw.text((10, 8), "STATIC AUXILIARY ART: SOURCE / NORMALIZED (no animation claimed)", fill="white")
    for i, prop in enumerate(props):
        x, y = (i % 4)*160, 28 + (i//4)*90
        draw.text((x+4, y), prop["id"], fill="white")
        original = Image.open(HERE / prop["source"]["path"]).convert("RGBA")
        for n, image in enumerate((original, as_image(prop["pixels"]))):
            tile = image.resize((image.width*3, image.height*3), Image.Resampling.NEAREST)
            sheet.paste(tile, (x+8+n*70, y+17), tile)
    sheet.save(HERE / "props-contact-sheet.png")


def motion_preview(actors):
    images = []
    for phase in range(4):
        canvas = Image.new("RGB", (624, 342), "#292d39")
        draw = ImageDraw.Draw(canvas)
        draw.text((12, 8), "WALK CYCLES / SOURCE                         PICO-8 CONVERSION", fill="white")
        for row, actor in enumerate(actors):
            y = 28 + row*76
            draw.text((12, y), actor["id"], fill="white")
            source = Image.open(HERE / actor["source"]["path"]).convert("RGBA")
            frames = {f["id"]: f for f in actor["frames"]}
            directions = DIRECTIONS if actor["id"] != "pig" else ("left", "right")
            for col, direction in enumerate(directions):
                animation = actor["animations"][f"walk-{direction}"]
                f = frames[animation["frameIds"][phase % len(animation["frameIds"])]]
                r = f["sourceRect"]
                original = source.crop((r["x"], r["y"], r["x"]+r["w"], r["y"]+r["h"]))
                for base_x, image in ((12, original), (322, as_image(f["pixels"]))):
                    if animation["flipX"]: image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                    tile = image.resize((48, 48), Image.Resampling.NEAREST)
                    canvas.paste(tile, (base_x+col*66, y+14), tile)
        images.append(canvas)
    # GIF timing has 10ms resolution, so this visual preview approximates 6fps.
    # Runtime timing remains the exact ten ticks stored on every source frame.
    images[0].save(HERE / "walk-preview.gif", save_all=True, append_images=images[1:], duration=170, loop=0, disposal=2)


def compile_pack():
    source_tree = json.loads((HERE / "source-tree.json").read_text())
    for file in source_tree["files"]:
        data = (HERE / "original" / file["path"]).read_bytes()
        git_blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        assert git_blob == file["sha"], f"Source bytes differ from pinned Git blob: {file['path']}"
    actors = [make_humanoid(k, v) for k, v in HUMANOIDS.items()] + [make_pig()]
    for actor in actors:
        write_json(HERE / "actors" / f"{actor['id']}.json", actor)
    prop_paths = sorted(p.relative_to(HERE / "original").as_posix() for p in (HERE / "original").rglob("*.png")
                        if "weapon/" in str(p) or "destroyable/" in str(p) or p.name == "Shadow.png")
    props = [make_prop(path) for path in prop_paths]
    for prop in props:
        write_json(HERE / "props" / f"{prop['id']}.json", prop)
    contact_sheet(actors)
    prop_contact_sheet(props)
    motion_preview(actors)
    files = sorted(p.relative_to(HERE).as_posix() for p in HERE.rglob("*")
                   if p.is_file() and p.name not in ("manifest.json", "verification.json") and "__pycache__" not in p.parts)
    manifest = {
        "schemaVersion": 1, "id": "ninja-adventure", "version": "1.0.0",
        "title": "Ninja Adventure CC0 subset", "camera": "top-down",
        "description": "Three four-direction humanoid walk sets and one two-frame animal, plus static weapons/props, normalized for the existing runtime.",
        "license": {"spdx": "CC0-1.0", "authors": ["Pixel-Boy", "AAA"], "sourceUrl": LICENSE_URL,
                    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/", "localNotice": "LICENSE.md"},
        "provenance": {"kind": "licensed", "repository": "https://github.com/pixel-boy/NinjaAdventure",
                       "commit": REVISION, "retrievedAt": "2026-09-19", "normalization": "compile.py",
                       "sourceLicenseStatement": "Creator's linked itch.io asset page identifies this asset pack as CC0. The GitHub Godot example is linked by that same page.",
                       "authorPageSha256AtRetrieval": "2263b2b7ef3dc83a2b67a88295058acf08e27fa3e02b50da572b535fad11af2d"},
        "palette": {"name": "pico-8", "hex": HEX, "transparent": ".", "source": "packages/runtime/src/palette.ts"},
        "actors": [{"id": a["id"], "file": f"actors/{a['id']}.json", "tags": a["tags"]} for a in actors],
        "props": [{"id": p["id"], "file": f"props/{p['id']}.json", "tags": p["tags"]} for p in props],
        "counts": {"actors": len(actors), "actorFrames": sum(len(a["frames"]) for a in actors),
                   "props": len(props), "sourcePngs": len(source_tree["files"])},
        "files": files,
        "fileHashes": {path: sha((HERE / path).read_bytes()) for path in files},
    }
    write_json(HERE / "manifest.json", manifest)
    print(json.dumps(manifest["counts"]))


if __name__ == "__main__":
    compile_pack()
