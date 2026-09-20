#!/usr/bin/env python3
"""Reproducible, private Pac-Man reference import; no downloads or admission.

Requires Pillow. Source artwork stays under ignored data/reference-cache.
Animation timing, anchors and project collision metadata are authored here;
they are not measurements of the original arcade program.
"""
from collections import deque
from hashlib import sha256
from pathlib import Path
import json

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/reference-cache/spriters-resource/pac-man'
SOURCE_SHA = '2a13b214b274eb48d9dfe1352c5bcc0ebd22de98600a27cd9d0baa40c2f4bd4f'
BLACK = (0, 0, 0, 255)
BOX = {'x': -3, 'y': -3, 'w': 6, 'h': 6}
ANCHOR = {'x': 8, 'y': 8}


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')


def backdrop_mask(crop):
    """Only border-connected exact black becomes transparent.

    The source PNG bakes black behind sprites. Enclosed opaque black is kept;
    the reviewed selected poses happen not to contain any enclosed black.
    This is an authored mask, not an alpha channel recovered from the ROM.
    """
    w, h = crop.size
    black = {(x, y) for y in range(h) for x in range(w) if crop.getpixel((x, y)) == BLACK}
    seen = {p for p in black if p[0] in (0, w - 1) or p[1] in (0, h - 1)}
    pending = deque(seen)
    while pending:
        x, y = pending.popleft()
        for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if point in black and point not in seen:
                seen.add(point)
                pending.append(point)
    return seen


def main():
    source_path = OUT / '52631.png'
    assert sha256(source_path.read_bytes()).hexdigest() == SOURCE_SHA, 'Source changed; review mapping'
    source = Image.open(source_path)
    assert source.mode == 'RGBA' and source.size == (680, 248)
    metadata = json.loads((OUT / '52631.json').read_text())
    assert metadata['sha256'] == SOURCE_SHA
    raw_dir, rgba_dir = OUT / 'frames/source-crops', OUT / 'frames/rgba'
    raw_dir.mkdir(parents=True, exist_ok=True)
    rgba_dir.mkdir(parents=True, exist_ok=True)
    frames, animations, mapping, previews = {}, {}, {}, {}
    assertions = 0

    # Guard against a blanket black color-key erasing intentional black detail.
    fixture = Image.new('RGBA', (5, 5), BLACK)
    for x in range(1, 4):
        for y in range(1, 4):
            fixture.putpixel((x, y), (255, 255, 0, 255))
    fixture.putpixel((2, 2), BLACK)
    assert (2, 2) not in backdrop_mask(fixture) and (0, 0) in backdrop_mask(fixture)
    assertions += 2

    def crop_frame(key, x, y, role, collision=True, note=None):
        nonlocal assertions
        rect = [x, y, 16, 16]
        crop = source.crop((x, y, x + 16, y + 16))
        crop.save(raw_dir / f'{key}.png')
        assert Image.open(raw_dir / f'{key}.png').tobytes() == crop.tobytes()
        assertions += 1
        transparent = backdrop_mask(crop)
        rgba = crop.copy()
        palette = []
        for yy in range(16):
            for xx in range(16):
                if (xx, yy) in transparent:
                    rgba.putpixel((xx, yy), (0, 0, 0, 0))
                else:
                    color = '#%02x%02x%02x' % crop.getpixel((xx, yy))[:3]
                    if color not in palette:
                        palette.append(color)
        # A blank hold still carries a valid palette but uses no opaque index.
        palette = palette or ['#000000']
        assert len(palette) <= 16
        assertions += 1
        rows = []
        for yy in range(16):
            row = ''
            for xx in range(16):
                rgba_pixel = rgba.getpixel((xx, yy))
                pixel = '.' if not rgba_pixel[3] else format(palette.index('#%02x%02x%02x' % rgba_pixel[:3]), 'x')
                row += pixel
                reconstructed = (0, 0, 0, 0) if pixel == '.' else tuple(bytes.fromhex(palette[int(pixel, 16)][1:])) + (255,)
                assert reconstructed == rgba_pixel
                assert pixel == '.' or rgba_pixel == crop.getpixel((xx, yy))
                assertions += 2
            rows.append(row)
        rgba.save(rgba_dir / f'{key}.png')
        frames[key] = {
            'pixels': rows, 'palette': palette, 'size': {'w': 16, 'h': 16},
            'anchor': dict(ANCHOR), 'hitboxes': [dict(BOX)] if collision else [],
            'hurtboxes': [dict(BOX)] if collision else [],
            'source': {'assetId': '52631', 'sha256': SOURCE_SHA, 'rect': rect},
            'provenance': {
                'pixels': 'Native source crop; exact non-background RGB; no scaling, recoloring or quantization.',
                'transparency': 'Authored removal of border-connected exact black backing; enclosed black retained.',
                'anchor': 'Authored center of native 16x16 source cell.',
                'geometry': 'Project maze 6x6 actor collision box, relative to anchor; not original ROM geometry.' if collision else 'Noncolliding return-eyes or authored blank hold.',
                'role': role, 'note': note,
            },
        }
        mapping[key] = {
            'sourceRect': rect, 'role': role, 'transparentPixels': len(transparent),
            'opaqueBlackPixels': sum(rgba.getpixel((xx, yy)) == BLACK for yy in range(16) for xx in range(16)),
            'opaqueColors': len(set(p for p in rgba.getdata() if p[3])),
            'note': note,
        }
        previews[key] = rgba
        return key

    def clip(key, ids, duration, loop=True, colliding=True, note=None):
        animations[key] = {
            'loop': loop,
            'frames': [{
                'frame': frame_id, 'duration': duration, 'anchor': dict(ANCHOR),
                'hitboxes': [dict(BOX)] if colliding else [],
                'hurtboxes': [dict(BOX)] if colliding else [],
            } for frame_id in ids],
            'provenance': {
                'timing': 'Authored project duration in ticks at 60Hz; not recovered original arcade timing.',
                'stateAssignment': note or 'Reviewed source pose assigned to corresponding project movement state.',
            },
        }

    # Source row order is right, left, up, down, confirmed by the open mouth.
    for direction, y in [('right', 0), ('left', 16), ('up', 32), ('down', 48)]:
        ids = [crop_frame(f'pacman-{direction}-{i}', 456 + i * 16, y, f'player {direction}, mouth phase {i}') for i in range(3)]
        for player in range(2):
            clip(f'chomper-{player}-{direction}', [ids[2], ids[1], ids[0], ids[1]], 4)

    death = [crop_frame(f'pacman-death-{i}', 504 + i * 16, 0, f'player death phase {i}') for i in range(11)]
    death.append(crop_frame('pacman-blank-hold', 664, 16, 'authored transparent end hold', False,
                            'Empty source cell selected to hold disappearance; not an additional drawn death pose.'))
    for player in range(2):
        clip(f'chomper-{player}-death', death, 6, False,
             note='11 reviewed collapse/burst drawings followed by an authored blank hold; 72 ticks fits the 75-tick death phase.')

    # Source columns pair gait phases for right, left, up, down eye directions.
    for ghost, name in enumerate(['Blinky', 'Pinky', 'Inky', 'Clyde']):
        for direction, offset in [('right', 0), ('left', 32), ('up', 64), ('down', 96)]:
            ids = [crop_frame(f'ghost-{ghost}-{direction}-{i}', 456 + offset + i * 16,
                              64 + ghost * 16, f'{name}, {direction}, gait phase {i}') for i in range(2)]
            clip(f'ghost-{ghost}-{direction}', ids, 7)

    for name, x in [('blue', 584), ('flash', 616)]:
        ids = [crop_frame(f'frightened-{name}-{i}', x + i * 16, 64, f'frightened {name}, gait phase {i}') for i in range(2)]
        clip(f'frightened-{name}', ids, 7)
    for direction, x in [('right', 584), ('left', 600), ('up', 616), ('down', 632)]:
        frame_id = crop_frame(f'eyes-{direction}', x, 80, f'returning eyes {direction}', False)
        clip(f'eyes-{direction}', [frame_id], 1, colliding=False)
    for ghost in range(4):
        clip(f'reform-{ghost}', ['eyes-up', f'ghost-{ghost}-up-0', f'ghost-{ghost}-up-1'],
             15, False, False, 'Authored eyes-to-body transition using existing source poses; no unique original reform art claimed.')

    assert len(frames) == 64 and len(animations) == 36
    assert all(sum(s['duration'] for s in c['frames']) <= 75 for k, c in animations.items() if k.endswith('death'))
    assert all(sum(s['duration'] for s in c['frames']) == 45 for k, c in animations.items() if k.startswith('reform-'))
    assertions += 3
    actor_set = {
        'id': 'pac-man-actors', 'subject': 'Pac-Man and Blinky, Pinky, Inky, Clyde',
        'camera': 'top-down', 'tags': ['pac-man', 'maze', 'ghosts'],
        'frames': frames, 'animations': animations,
        'coordinates': 'Native 16x16 pixels; center anchor (8,8); hit/hurt boxes relative to anchor.',
        'geometry': {'coordinates': 'anchor-relative', 'authority': 'Original project maze controller, not recovered ROM collision.', 'normalBox': BOX, 'returningAndReforming': 'noncolliding'},
        'provenance': {'source': metadata, 'mapping': 'Source cell coordinates manually reviewed against sheet; no mirrored or recolored actor poses.', 'timing': 'Authored 60Hz controller timing.', 'playerTwo': 'Same source yellow artwork; project P1/P2 marker distinguishes cooperative actors.'},
        'license': {'spdx': 'LicenseRef-Commercial-Reference', 'notes': 'Private source-art import; archive availability is not a redistribution license.'},
        'unsupportedStates': ['Original intermissions and oversized player poses', 'Unique source reform tween (project reuses eyes and body poses)', 'Original ROM timing, collision, maze topology and ghost targeting', 'Original alternate-turn two-player rules; project uses simultaneous cooperative actors'],
    }
    write_json('source-assets.json', {'schemaVersion': 1, 'sets': {'pac-man-actors': actor_set}})
    write_json('maze-config.json', {'avatar': 'chomper', 'playerMarkers': True, 'assets': {'frames': frames, 'animations': animations}})
    write_json('sheet-map.json', {'source': metadata, 'sourceMode': source.mode, 'sourceDimensions': list(source.size), 'frames': mapping, 'transparencyPolicy': 'Border-connected black removed by explicit authored mask; raw RGBA crops retained untouched.', 'animationPolicy': 'Source drawings with authored durations and state assignments; reform reuses source eyes/body; final death hold uses an empty source cell.'})
    write_json('integrity.json', {
        'sourceSha256': SOURCE_SHA, 'sourceGeometry': list(source.size), 'sourcePoseCells': 63,
        'authoredBlankHoldCells': 1, 'runtimeFrames': len(frames), 'runtimeClips': len(animations),
        'maximumOpaqueColors': max(m['opaqueColors'] for m in mapping.values()),
        'selectedOpaqueBlackPixels': sum(m['opaqueBlackPixels'] for m in mapping.values()),
        'enclosedBlackRetentionFixture': 'passed', 'assertions': assertions,
        'colorQuantization': False, 'spatialResampling': False, 'recoloring': False,
        'exactOpaqueSourceColors': True,
        'repeatedPosesNote': 'Directional closed-mouth cells can have identical pixels; do not count source cells as distinct drawings.',
    })
    contact = Image.new('RGB', (1280, 8 * 112), '#192532')
    draw = ImageDraw.Draw(contact)
    for i, (key, rgba) in enumerate(previews.items()):
        x, y = (i % 8) * 160, (i // 8) * 112
        draw.text((x + 5, y + 4), key, fill='white')
        contact.paste(rgba.resize((64, 64), Image.Resampling.NEAREST), (x + 48, y + 25), rgba.resize((64, 64), Image.Resampling.NEAREST))
        draw.text((x + 5, y + 94), '16x16 / 4x preview', fill='#a9c7d7')
    contact.save(OUT / 'reviewed-actor-contact.png')
    print(json.dumps({'frames': len(frames), 'clips': len(animations), 'assertions': assertions,
                      'configSha256': sha256((OUT / 'maze-config.json').read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
