#!/usr/bin/env python3
"""Reproduce a private native-size Pole Position art import from cached PNGs.

No network, palette quantization, resize, source-registry edits, or admission.
Atlas rectangles are reviewed data; all pixels remain in the ignored cache.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/reference-cache/spriters-resource/pole-position'
SOURCE = OUT / '94319.png'
EXPECTED = '1363ed964d192c916320fc5b10010bfc8bed908a0637b85f5e39051fb23dee42'
BACKING = (153, 217, 234, 255)


def save_json(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--display-width', type=float, default=42)
    args = parser.parse_args()
    assert 24 <= args.display_width <= 64
    assert digest(SOURCE) == EXPECTED, 'Source changed: inspect the new sheet before importing'
    source = Image.open(SOURCE)
    assert source.mode == 'RGBA' and source.size == (957, 160)
    provenance = json.loads((OUT / '94319.json').read_text())
    controller_path = ROOT / 'library/catalog/kart/module.base.js'
    controller_source = controller_path.read_text()
    for audited in ['Math.abs(gap) > 90', 'Math.abs(a.x - b.x) > 0.30', 'impact < 40 && Math.abs(gap) > 45', 'a.invulnerable = b.invulnerable = 0.7', 'impact > 390) rear.crash = 0.65']:
        assert audited in controller_source, 'Controller collision rules changed; review metadata before importing'
    collision = {
        **json.loads((ROOT / 'library/catalog/kart/assets.json').read_text())['collision'],
        'authority': 'Current original Arcade kart controller; not extracted Pole Position ROM geometry.',
        'source': 'library/catalog/kart/module.base.js:collideRacers',
        'controllerSourceSha256': digest(controller_path),
        'candidateOverlap': {'maximumDistanceGap': 90, 'maximumLaneGap': 0.30},
        'lowImpactSkip': {'relativeSpeedBelow': 40, 'distanceGapAbove': 45},
        'impactResponse': {'laneSeparationPerCar': 0.13, 'rearSpeedMultiplier': 0.64,
                           'frontSpeedMultiplier': 0.92, 'invulnerabilitySeconds': 0.7,
                           'crashRelativeSpeedAbove': 390, 'crashSeconds': 0.65},
    }
    frames_dir = OUT / 'frames'
    for folder in ['source-crops', 'source-rgba', 'derived']:
        (frames_dir / folder).mkdir(parents=True, exist_ok=True)

    mapping = {'schemaVersion': 1, 'source': '94319.png', 'sourceSha256': EXPECTED,
               'sourcePage': 'https://www.spriters-resource.com/arcade/poleposition/asset/94319/',
               'transparentRGBA': list(BACKING), 'spatialScaling': 'none',
               'notes': ['Opaque black is retained. Only the uniform cyan sheet backing becomes transparent.',
                         'Same-yaw wheel variants alternate; yaw angles never form a driving animation.',
                         'Left turns are explicitly mirrored derivatives of reviewed right-yaw source cells.',
                         'All timings, anchors and game-state assignments are authored for this controller, not recovered original timing/physics.'],
               'frames': {}, 'paletteReferences': {}}
    originals, reviewed = {}, {}
    assertions = 0

    def crop(name, region):
        nonlocal assertions
        x, y, w, h = region
        assert x >= 0 and y >= 0 and x + w <= source.width and y + h <= source.height
        window = source.crop((x, y, x + w, y + h))
        points = [(xx, yy) for yy in range(h) for xx in range(w) if window.getpixel((xx, yy)) != BACKING]
        left, top = min(p[0] for p in points), min(p[1] for p in points)
        right, bottom = max(p[0] for p in points) + 1, max(p[1] for p in points) + 1
        rect = [x + left, y + top, right - left, bottom - top]
        original = source.crop((rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]))
        original.save(frames_dir / 'source-crops' / (name + '.png'))
        assert Image.open(frames_dir / 'source-crops' / (name + '.png')).tobytes() == original.tobytes()
        rgba = original.copy()
        rgba.putdata([(0, 0, 0, 0) if color == BACKING else color for color in original.getdata()])
        assert all(p[3] in (0, 255) for p in rgba.getdata())
        rgba.save(frames_dir / 'source-rgba' / (name + '.png'))
        entry = {'sourceRect': rect, 'reviewWindow': region, 'size': list(rgba.size),
                 'anchor': {'x': rgba.width // 2, 'y': rgba.height}, 'confidence': 'high crop; authored state/timing/anchor'}
        mapping['frames'][name] = entry
        originals[name] = original
        reviewed[name] = rgba
        assertions += 3
        return rgba

    for state, x in [('drive', 0), ('steerRight', 192), ('driftRight', 508)]:
        for phase, y in enumerate([0, 33]):
            crop(f'{state}-{phase}', [x, y, 64, 33])
    for n in range(6):
        crop(f'crash-{n}', [64 * n, 66, 64, 34])

    for state in ['steer', 'drift']:
        for phase in range(2):
            source_name = f'{state}Right-{phase}'
            name = f'{state}Left-{phase}'
            mirrored = reviewed[source_name].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            reviewed[name] = mirrored
            mirrored.save(frames_dir / 'derived' / (name + '.png'))
            original_anchor = mapping['frames'][source_name]['anchor']
            mapping['frames'][name] = {**mapping['frames'][source_name],
                'anchor': {'x': mirrored.width - original_anchor['x'], 'y': original_anchor['y']},
                'derivedFrom': source_name, 'transform': 'horizontal mirror; no resampling'}
            assert mirrored.tobytes() == reviewed[source_name].transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
            assertions += 1

    palette_maps = {}
    for name, region in [('red', [0, 115, 55, 31]), ('white', [55, 115, 54, 31]),
                         ('orange', [109, 115, 54, 31]), ('green', [163, 115, 54, 31])]:
        alt = crop('palette-' + name, region)
        base = reviewed['drive-0']
        assert alt.size == base.size
        candidates = {}
        for a, b in zip(base.getdata(), alt.getdata()):
            assert bool(a[3]) == bool(b[3]), 'Palette reference changed source silhouette'
            if a[3]:
                candidates.setdefault(a[:3], set()).add(b[:3])
                assertions += 1
        assert all(len(values) == 1 for values in candidates.values()), 'Alternate palette mapping is ambiguous'
        colors = {key: next(iter(values)) for key, values in candidates.items()}
        palette_maps[name] = colors
        mapping['paletteReferences'][name] = {'sourceRect': mapping['frames']['palette-' + name]['sourceRect'],
            'silhouetteMismatches': 0, 'unambiguousSourceColorMapping': True,
            'colors': [{'source': list(k), 'target': list(v)} for k, v in colors.items()],
            'application': 'Drive/steer/drift only. Crash art remains unchanged; explosion colors are not body colors.'}

    animations = {
        'idle': {'frames': ['drive-0'], 'frameMs': 200, 'loop': True},
        'drive': {'frames': ['drive-0', 'drive-1'], 'frameMs': 100, 'loop': True},
        **{name: {'frames': [name + '-0', name + '-1'], 'frameMs': 100, 'loop': True}
           for name in ['steerLeft', 'steerRight', 'driftLeft', 'driftRight']},
        'boost': {'frames': ['drive-0', 'drive-1'], 'frameMs': 80, 'loop': True,
                  'mappingNote': 'Same source wheel poses at an authored faster cadence. No original boost sprite is claimed.'},
        'crash': {'frames': [f'crash-{n}' for n in range(6)], 'frameMs': 650 / 6, 'loop': False,
                  'mappingNote': 'Reviewed wreck then growing impact/explosion sequence, retimed to controller 0.65s crash window.'},
    }
    names = [name for name in reviewed if not name.startswith('palette-')]
    vehicles = []
    contact_frames = []
    for variant, color_map in palette_maps.items():
        frames = {}
        for name in names:
            native = reviewed[name]
            variant_image = native.copy()
            if not name.startswith('crash-'):
                variant_image.putdata([(*color_map[p[:3]], 255) if p[3] else p for p in native.getdata()])
            palette = sorted({p[:3] for p in variant_image.getdata() if p[3]})
            assert 1 <= len(palette) <= 16
            lookup = {rgb: i for i, rgb in enumerate(palette)}
            rows = []
            for yy in range(variant_image.height):
                row = ''
                for xx in range(variant_image.width):
                    p = variant_image.getpixel((xx, yy))
                    row += format(lookup[p[:3]], 'x') if p[3] else '.'
                    if p[3]:
                        assert palette[int(row[-1], 16)] == p[:3]
                        assertions += 1
                rows.append(row)
            f = {'pixels': rows, 'palette': ['#%02x%02x%02x' % c for c in palette],
                 'anchor': mapping['frames'][name]['anchor'],
                 'hurtboxes': [], 'hitboxes': [],
                 'source': {**mapping['frames'][name], 'sheet': '94319.png', 'sha256': EXPECTED},
                 'provenance': {'paletteVariant': variant, 'paletteRect': mapping['paletteReferences'][variant]['sourceRect'],
                                'colorConversion': 'None for red and all crash frames; reviewed source palette substitution for alternate driving poses.',
                                'geometry': 'Native pixels; authored bottom-center placement anchor. Physics remains track-space controller geometry.'}}
            frames[name] = f
            target = frames_dir / 'derived' / variant
            target.mkdir(exist_ok=True)
            variant_image.save(target / (name + '.png'))
            if variant == 'red' or name == 'drive-0':
                contact_frames.append((variant + '/' + name, variant_image))
        vehicle = {'id': 'pole-position-' + variant, 'frames': frames, 'animations': animations,
                   'sourceWidth': 52, 'displayWidth': args.display_width,
                   'collision': collision,
                   'provenance': {'source': provenance, 'status': 'private commercial reference import; not approved by this script'},
                   'unsupportedStates': ['Original physics/timing not recovered', 'No dedicated boost artwork', 'Drift maps to stronger source yaw', 'Alternate palettes share unchanged red wreck/explosion frames']}
        vehicles.append(vehicle)

    config = {'assets': {'vehicles': vehicles}, 'drivers': [
        {'name': name, 'asset': 'pole-position-' + variant} for name, variant in
        [('YOU', 'red'), ('P2', 'white'), ('GOLD', 'orange'), ('GREEN', 'green'), ('RIVAL', 'red'), ('ACE', 'white')]]}
    save_json('sheet-map.json', mapping)
    save_json('source-assets.json', {'schemaVersion': 1, 'vehicles': vehicles, 'provenance': provenance,
        'sourceFrameCount': 12, 'mirroredFrameCount': 4, 'paletteReferenceCount': 4,
        'notes': ['Four variants are palette derivatives of shared poses, not 64 independently drawn source poses.',
                  'All source dimensions are native. displayWidth is an explicit runtime projection setting, not rewritten source pixels.']})
    save_json('kart-config.json', config)
    cols, cw, ch = 4, 240, 155
    contact = Image.new('RGB', (cols * cw, math.ceil(len(contact_frames) / cols) * ch), '#16232a')
    draw = ImageDraw.Draw(contact)
    for i, (name, im) in enumerate(contact_frames):
        x, y = i % cols * cw, i // cols * ch
        scale = min(3, 210 // im.width, 115 // im.height)
        enlarged = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
        contact.paste(enlarged, (x + (cw - enlarged.width) // 2, y + 24 + (110 - enlarged.height) // 2), enlarged)
        draw.text((x + 5, y + 5), name, fill='white')
        draw.text((x + 5, y + 136), f'{im.width}x{im.height} native / nearest preview', fill='#a1c6d8')
    contact.save(OUT / 'reviewed-car-contact.png')
    save_json('integrity.json', {'sourceSha256': EXPECTED, 'sourceGeometry': [957, 160],
        'assertions': assertions, 'sourcePoseCrops': 12, 'mirroredPoses': 4, 'sourcePaletteSamples': 4,
        'vehicleVariants': 4, 'runtimeFramesIncludingVariants': sum(len(v['frames']) for v in vehicles),
        'exactSourceColors': True, 'quantization': False, 'spatialResampling': False,
        'transparencyRule': 'Only RGBA153,217,234,255 removed; RGBA0,0,0,255 remains opaque.'})
    print(json.dumps({'vehicles': 4, 'sourcePoses': 12, 'mirroredPoses': 4, 'assertions': assertions, 'config': str(OUT / 'kart-config.json')}))


if __name__ == '__main__':
    main()
