#!/usr/bin/env python3
"""Offline authored reaction revision; immutable layered import remains the baseline."""
from pathlib import Path
import copy
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/reference-cache/spriters-resource/spider-man'
SOURCE = CACHE.parent / 'marvel-spider-man-275483.png'
SHA = '140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f'
# ID, authored 60 Hz duration, pelvis horizontal fraction before mirror,
# clearance between the bottom opaque pixel and the arena ground, in native pixels.
HURT = [(479, 7, .48, 0), (480, 9, .45, 0)]
KO = [(514, 5, .51, 16), (515, 5, .53, 24), (516, 5, .51, 20),
      (517, 5, .54, 12), (518, 5, .52, 4), (519, 6, .53, 0),
      (520, 6, .53, 0), (521, 8, .53, 0), (522, 90, .53, 0)]
OUT = CACHE / 'reviewed-reactions'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def main():
    assert sha(SOURCE) == SHA
    baseline_path = CACHE / 'custom-assets-layered.json'
    baseline_bytes = baseline_path.read_bytes()
    baseline = json.loads(baseline_bytes)['spider-man-reference']
    assert len(baseline['frames']) == 57
    # Hash all prior evidence outside this revision's new output namespace.
    frozen = {str(p.relative_to(ROOT)): sha(p) for p in CACHE.rglob('*')
              if p.is_file() and OUT not in p.parents
              and p.name != 'custom-assets-reviewed.json'}
    frozen[str(SOURCE.relative_to(ROOT))] = sha(SOURCE)
    OUT.mkdir(exist_ok=True)
    original = Image.open(SOURCE)
    assert original.mode == 'P' and original.info.get('transparency') == 0
    palette = original.getpalette()
    cells = json.loads((CACHE / 'cells.json').read_text())['cells']
    by_id = {r['id']: r for r in cells}
    asset = copy.deepcopy(baseline)
    proof, previews = [], {}
    for source_id, duration, pelvis, clearance in HURT + KO:
        rect = by_id[source_id]['cell'][:]
        changed = True
        while changed:
            changed = False
            for record in cells:
                r = record['cell']
                if max(r[0], rect[0]) < min(r[2], rect[2]) and max(r[1], rect[1]) < min(r[3], rect[3]):
                    merged = [min(r[0], rect[0]), min(r[1], rect[1]), max(r[2], rect[2]), max(r[3], rect[3])]
                    if merged != rect:
                        rect = merged
                        changed = True
        source_rgba = np.asarray(original.crop(tuple(rect)).convert('RGBA')).copy()
        source_rgba[np.all(source_rgba[:, :, :3] == (255, 0, 255), axis=2), 3] = 0
        cut = Image.fromarray(source_rgba)
        trim = cut.getbbox()
        assert trim
        cut = cut.crop(trim)
        size = (max(1, round(cut.width * 9 / 16)), max(1, round(cut.height * 9 / 16)))
        indexed = original.crop(tuple(rect)).crop(trim).resize(size, Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        indices = np.asarray(indexed)
        opaque = (indices != 0) & (indices != 1)
        colors, lookup = [], {}
        for index in sorted(int(v) for v in np.unique(indices[opaque])):
            color = '#' + bytes(palette[3*index:3*index+3]).hex()
            if color not in colors:
                colors.append(color)
            lookup[index] = color
        planes = []
        for offset in range(0, len(colors), 16):
            local = colors[offset:offset+16]
            slots = {c: format(i, 'x') for i, c in enumerate(local)}
            planes.append({'pixels': [''.join(slots.get(lookup.get(int(indices[y, x])), '.') if opaque[y, x] else '.' for x in range(size[0])) for y in range(size[1])], 'palette': local})
        assert len(planes) <= 9
        anchor = {'x': size[0]-1-round((cut.width-1)*pelvis*9/16), 'y': size[1]-1+clearance}
        frame = dict(planes[0], anchor=anchor, size={'w': size[0], 'h': size[1]},
            source={'sourceFrameId': source_id, 'sheetCell': rect, 'trimWithinCell': list(trim), 'sourcePalette': 'source-palette.json', 'exactPaletteMap': 'reviewed-reactions/proof.json'},
            transform={'nearestScale': 9/16, 'mirrorToFaceRight': True, 'globalPaletteQuantized': False, 'exactScaledSourceRGB': True},
            anchorProvenance='Authored approximate horizontal pelvis registration plus explicit bottom clearance; not source-game pivots.',
            authoredRegistration={'sourcePelvisFractionX': pelvis, 'bottomClearanceNativePixels': clearance})
        if len(planes) > 1:
            frame['layers'] = planes[1:]
        name = f'src{source_id:03d}'
        asset['frames'][name] = frame
        decoded = Image.new('RGBA', size)
        coverage = np.zeros((size[1], size[0]), dtype=np.uint8)
        for plane in [frame] + frame.get('layers', []):
            assert len(plane['palette']) <= 16 and len(plane['pixels']) == size[1]
            for y, row in enumerate(plane['pixels']):
                assert len(row) == size[0]
                for x, slot in enumerate(row):
                    if slot != '.':
                        decoded.putpixel((x, y), (*bytes.fromhex(plane['palette'][int(slot, 16)][1:]), 255))
                        coverage[y, x] += 1
        # Separate RGBA route, independent of source-index-to-slot encoding.
        expected = np.asarray(cut.resize(size, Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)).copy()
        expected[expected[:, :, 3] == 0] = 0
        assert np.array_equal(np.asarray(decoded), expected), name
        assert np.array_equal(coverage, opaque.astype(np.uint8)), name
        decoded.save(OUT / f'{source_id:03d}-decoded.png')
        previews[name] = decoded
        proof.append({'frame': name, 'size': frame['size'], 'anchor': anchor, 'durationTicks': duration,
                      'sourcePelvisFractionX': pelvis, 'bottomClearanceNativePixels': clearance,
                      'opaquePixels': int(opaque.sum()), 'transparentPixels': int((~opaque).sum()),
                      'opaqueBlackPixels': int(np.count_nonzero(opaque & np.all(expected[:, :, :3] == 0, axis=2))),
                      'opaqueColors': len(colors), 'planePaletteSizes': [len(p['palette']) for p in planes], 'rgbaMismatchPixels': 0})
    for clip_name, definition in [('hurt', HURT), ('ko', KO)]:
        clip = copy.deepcopy(asset['animations'][clip_name])
        clip.update(loop=False, mappingConfidence='medium',
                    mappingNote='Visually reviewed recoil/downed pose categories; original game state identity and ordering remain unverified. Authored prototype revision.',
                    timingProvenance='Newly authored 60 Hz prototype durations; not extracted source-game timing.')
        clip['frames'] = []
        for source_id, duration, _, _ in definition:
            name = f'src{source_id:03d}'
            f = asset['frames'][name]
            clip['frames'].append({'frame': name, 'duration': duration, 'anchor': f['anchor'], 'hitboxes': [],
                'hurtboxes': [{'x': -f['anchor']['x'], 'y': -f['anchor']['y'], 'w': f['size']['w'], 'h': f['size']['h']}],
                'geometryProvenance': 'Authored conservative visible-frame bounds relative to registered ground point; not recovered collision data.'})
        asset['animations'][clip_name] = clip
    assert all(asset['frames'][k] == v for k, v in baseline['frames'].items())
    assert all(asset['animations'][k] == v for k, v in baseline['animations'].items() if k not in ('hurt', 'ko'))
    asset['name'] = 'Spider-Man (local exact-color authored reaction revision)'
    asset['provenance']['coverage'] = '68 exact scaled source frames, 16 prototype clips. Original 57 frame objects preserved; hurt/KO replaced only in this new authored revision.'
    asset['provenance']['reactionRevision'] = {'baseline': 'custom-assets-layered.json', 'baselineSha256': hashlib.sha256(baseline_bytes).hexdigest(), 'sourceSha256': SHA, 'review': 'docs/research/spider-man-hurt-ko-review.md', 'originalGameStatesVerified': False}
    asset['provenance']['limitations'] = [
        'Original game state labels, animation ordering, durations and pivots remain unverified. Recoil/downed appearance is visually reviewed; timings, registration and collision bounds are authored.',
        'Same nearest 9/16 scale and facing mirror; no source color quantization or costume recolor.',
        'Native controller integration and reaction transition proof must be performed separately. Web mechanics remain incomplete.',
        'Commercial reference art remains in ignored local cache; no library admission or redistribution license is implied.',
    ]
    save(CACHE / 'custom-assets-reviewed.json', {'spider-man-reference': asset})
    # Shared world anchor shows actual authored vertical registration, not bottom-aligned poses.
    cell_w, cell_h, zoom, ground = 300, 300, 3, 255
    contact = Image.new('RGB', (cell_w*5, cell_h*3), (24, 28, 38))
    draw = ImageDraw.Draw(contact)
    sequence = [('hurt', x) for x in HURT] + [('ko', x) for x in KO]
    gifs = {'hurt': [], 'ko': []}
    durations = {'hurt': [], 'ko': []}
    for i, (clip, (source_id, duration, _, clearance)) in enumerate(sequence):
        name = f'src{source_id:03d}'; f = asset['frames'][name]
        canvas = Image.new('RGB', (cell_w, cell_h), (24, 28, 38)); d = ImageDraw.Draw(canvas)
        d.line((0, ground+1, cell_w, ground+1), fill=(80, 95, 112))
        d.line((150, ground-4, 150, ground+4), fill=(180, 190, 200))
        d.text((8, 8), f'{clip} {name} / authored {duration} ticks', fill='white')
        d.text((8, 25), f'anchor {f["anchor"]} / clearance {clearance}', fill=(190, 200, 215))
        image = previews[name].resize((f['size']['w']*zoom, f['size']['h']*zoom), Image.Resampling.NEAREST)
        x, y = 150-f['anchor']['x']*zoom, ground-f['anchor']['y']*zoom
        assert x >= 0 and y >= 40 and x+image.width <= cell_w
        canvas.paste(image, (x, y), image)
        contact.paste(canvas, ((i%5)*cell_w, (i//5)*cell_h))
        gifs[clip].append(canvas); durations[clip].append(round(duration*1000/60))
    contact.save(OUT / 'contact.png')
    for clip, images in gifs.items():
        images[0].save(OUT / f'{clip}.gif', save_all=True, append_images=images[1:], duration=durations[clip], loop=0, disposal=2)
    assert baseline_path.read_bytes() == baseline_bytes
    assert all(sha(ROOT / p) == digest for p, digest in frozen.items()), 'Prior artifact changed'
    report = {'sourceSha256': SHA, 'baselineSha256': hashlib.sha256(baseline_bytes).hexdigest(),
              'reviewedAssetSha256': sha(CACHE / 'custom-assets-reviewed.json'), 'totalFrames': len(asset['frames']),
              'newFrames': len(proof), 'opaquePixels': sum(p['opaquePixels'] for p in proof),
              'transparentPixels': sum(p['transparentPixels'] for p in proof), 'opaqueBlackPixels': sum(p['opaqueBlackPixels'] for p in proof),
              'rgbaMismatchPixels': 0, 'old57FrameObjectsUnchanged': True, 'other14ClipsUnchanged': True,
              'priorFilesUnchanged': True, 'priorHashes': frozen, 'frames': proof,
              'boundary': 'Offline source/encoding equality and authored registration previews; native controller proof is separate.'}
    save(OUT / 'proof.json', report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('priorHashes','frames')}))

if __name__ == '__main__':
    main()
