#!/usr/bin/env python3
"""Import manually reviewed local reference crops, never download or publish art.

The private sheet-map.json supplies rectangles, transparency and role mapping.
Source crops stay byte-faithful to the PNG's decoded pixels. Source RGBA,
compact source palettes and an explicitly lossy PICO preview are separate.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/reference-cache/spriters-resource/donkey-kong'


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--map', type=Path, default=OUT / 'sheet-map.json')
    args = parser.parse_args()
    mapping = json.loads(args.map.read_text())
    sources = {}
    source_meta = {}
    for key, spec in mapping['sheets'].items():
        path = ROOT / spec['path']
        im = Image.open(path)
        im.load()
        sources[key] = im
        counts = im.getcolors(im.width * im.height)
        palette = im.getpalette()
        used = []
        if im.mode == 'P':
            transparency = im.info.get('transparency')
            for count, index in sorted(counts, key=lambda row: row[1]):
                alpha = 0 if transparency == index else (transparency[index] if isinstance(transparency, bytes) and index < len(transparency) else 255)
                used.append({'index': index, 'rgb': palette[index * 3:index * 3 + 3], 'alpha': alpha, 'count': count})
        source_meta[key] = {
            **spec, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'size': list(im.size), 'mode': im.mode, 'usedPaletteEntries': used,
            'pixelRights': 'Commercial reference art. No redistribution license inferred. Private ignored cache only.',
        }
    write_json(OUT / 'source-metadata.json', source_meta)

    gif_audit = []
    for spec in mapping.get('gifReferences', []):
        path = OUT / spec['file']
        animation = Image.open(path)
        details = []
        folder = OUT / 'gif-frames' / path.stem
        folder.mkdir(parents=True, exist_ok=True)
        for index in range(animation.n_frames):
            animation.seek(index)
            rendered = animation.convert('RGBA')
            rendered.save(folder / f'{index:03}.png')
            detail = {'frame': index, 'durationMs': animation.info.get('duration'), 'size': list(rendered.size)}
            if spec.get('sourceRects'):
                x, y, w, h = spec['sourceRects'][index]
                raw = sources['characters'].crop((x, y, x + w, y + h))
                assert raw.size == rendered.size
                source_rgba = raw.convert('RGBA')
                mismatches = 0
                rgb_matches = 0
                visible = 0
                for yy in range(h):
                    for xx in range(w):
                        opaque = raw.getpixel((xx, yy)) not in mapping['sheets']['characters']['transparentIndices']
                        gp = rendered.getpixel((xx, yy))
                        mismatches += opaque != (gp[3] > 0)
                        if opaque:
                            visible += 1
                            rgb_matches += gp[:3] == source_rgba.getpixel((xx, yy))[:3]
                assert mismatches == 0, f'{path.name}/{index} silhouette does not match reviewed sheet crop'
                detail.update({'sourceRect': [x, y, w, h], 'silhouetteMismatches': mismatches, 'opaquePixels': visible, 'sameRgbPixels': rgb_matches})
            details.append(detail)
        sidecar = path.with_suffix('.json')
        gif_audit.append({**spec, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'provenance': json.loads(sidecar.read_text()) if sidecar.exists() else None, 'frames': details,
                          'timingAuthority': 'Archive preview GIF only; original engine tick timing is not established.'})
    write_json(OUT / 'gif-audit.json', gif_audit)

    pico_hex = re.findall(r"'(#[0-9a-f]{6})'", (ROOT / 'packages/runtime/src/palette.ts').read_text())
    assert len(pico_hex) == 16
    pico = [tuple(bytes.fromhex(c[1:])) for c in pico_hex]
    sets_exact, sets_pico = {}, {}
    frame_meta, views = {}, []
    assertions = 0
    for role, definition in mapping['sets'].items():
        width, height = definition['canvas']
        common = {k: v for k, v in definition.items() if k not in ('canvas', 'frames')}
        exact = {**common, 'width': width, 'height': height, 'frames': {}}
        quantized = {**common, 'width': width, 'height': height, 'frames': {}}
        for name, spec in definition['frames'].items():
            source = sources[spec['sheet']]
            x, y, w, h = spec['rect']
            assert x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= source.width and y + h <= source.height
            original = source.crop((x, y, x + w, y + h))
            folder = OUT / 'frames/source-crops' / role
            folder.mkdir(parents=True, exist_ok=True)
            original.save(folder / f'{name}.png')
            reread = Image.open(folder / f'{name}.png')
            assert reread.mode == original.mode and reread.tobytes() == original.tobytes()
            if original.mode == 'P':
                assert reread.getpalette() == original.getpalette()
                assert reread.info.get('transparency') == original.info.get('transparency')
            assertions += 1

            rgba = original.convert('RGBA')
            transparent_indices = mapping['sheets'][spec['sheet']].get('transparentIndices', [])
            transparent_rgb = [tuple(v) for v in mapping['sheets'][spec['sheet']].get('transparentRGB', [])]
            for yy in range(h):
                for xx in range(w):
                    color = rgba.getpixel((xx, yy))
                    if (source.mode == 'P' and original.getpixel((xx, yy)) in transparent_indices) or color[:3] in transparent_rgb:
                        rgba.putpixel((xx, yy), (0, 0, 0, 0))
            left, top = spec.get('offset', [0, 0])
            assert left >= 0 and top >= 0 and left + w <= width and top + h <= height
            image = Image.new('RGBA', (width, height))
            image.paste(rgba, (left, top))
            if spec.get('flipX'):
                image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            assert all(p[3] in (0, 255) for p in image.getdata()), 'Partial alpha needs an explicit import policy'
            palette = sorted({p[:3] for p in image.getdata() if p[3]})
            assert len(palette) <= 16, f'{role}/{name}: {len(palette)} source colors require explicit layers'
            indices = {p: i for i, p in enumerate(palette)}
            nearest = {p: min(range(16), key=lambda i: sum((p[k] - pico[i][k]) ** 2 for k in range(3))) for p in palette}
            exact_rows, pico_rows = [], []
            preview = Image.new('RGBA', image.size)
            for yy in range(height):
                a, b = '', ''
                for xx in range(width):
                    p = image.getpixel((xx, yy))
                    if not p[3]:
                        a += '.'
                        b += '.'
                    else:
                        a += format(indices[p[:3]], 'x')
                        ci = nearest[p[:3]]
                        b += format(ci, 'x')
                        preview.putpixel((xx, yy), (*pico[ci], 255))
                        assert tuple(palette[int(a[-1], 16)]) == p[:3]
                        assertions += 1
                exact_rows.append(a)
                pico_rows.append(b)
            anchor = spec.get('anchor', definition.get('anchor', {'x': width // 2, 'y': height}))
            metadata = {'anchor': anchor, 'durationMs': spec.get('durationMs', 120), 'hurtboxes': [], 'hitboxes': [],
                        'source': spec, 'geometryProvenance': 'Source rectangle inspected; timing, canvas placement and anchor authored for local proof, not extracted original game metadata.'}
            exact['frames'][name] = {**metadata, 'pixels': exact_rows, 'palette': ['#%02x%02x%02x' % c for c in palette]}
            quantized['frames'][name] = {**metadata, 'pixels': pico_rows, 'conversion': 'Nearest squared RGB to fixed PICO palette; no spatial scaling.'}
            for sub, im in [('source-rgba', image), ('pico-preview', preview)]:
                folder = OUT / 'frames' / sub / role
                folder.mkdir(parents=True, exist_ok=True)
                im.save(folder / f'{name}.png')
            frame_meta[f'{role}/{name}'] = {'sourceColors': len(palette), 'picoColors': len(set(nearest.values())), 'nativeSize': [width, height], **spec}
            views.append((role + '/' + name, image, preview))
        for clip in exact['animations'].values():
            assert clip['frames'] and all(f in exact['frames'] for f in clip['frames'])
            assertions += 1
        sets_exact[role], sets_pico[role] = exact, quantized
    write_json(OUT / 'source-assets.json', {'sets': sets_exact, 'sourceMetadata': source_meta, 'mappingNotes': mapping.get('notes', [])})
    write_json(OUT / 'pico-preview-assets.json', {'sets': sets_pico, 'warning': 'Explicitly lossy palette preview. Original native pixel dimensions retained.'})
    write_json(OUT / 'frame-audit.json', frame_meta)
    if all(role in sets_exact for role in ('worker', 'target', 'gorilla', 'barrel', 'fire')):
        write_json(OUT / 'climber-config.json', {
            'avatars': [{'sprites': sets_exact['worker']}, {'sprites': sets_exact['worker']}],
            'targetSprites': sets_exact['target'],
            'art': {role: sets_exact[role] for role in ('gorilla', 'barrel', 'fire')},
            'cage': False, 'rescueText': 'PAULINE RESCUED!',
        })

    columns, cell_w, cell_h = 4, 240, 155
    contact = Image.new('RGB', (columns * cell_w, math.ceil(len(views) / columns) * cell_h), '#111b25')
    draw = ImageDraw.Draw(contact)
    for i, (label, native, preview) in enumerate(views):
        xx, yy = i % columns * cell_w, i // columns * cell_h
        scale = max(1, min(3, 100 // max(native.size)))
        for j, im in enumerate([native, preview]):
            enlarged = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
            contact.paste(enlarged, (xx + j * 118 + (114 - enlarged.width) // 2, yy + 24 + (102 - enlarged.height) // 2), enlarged)
        draw.text((xx + 5, yy + 4), label, fill='#ffffff')
        draw.text((xx + 5, yy + 133), 'SOURCE', fill='#9bffff')
        draw.text((xx + 125, yy + 133), 'LOSSY PICO', fill='#ffafaf')
    contact.save(OUT / 'source-vs-pico-contact.png')
    write_json(OUT / 'integrity.json', {'assertions': assertions, 'sets': len(sets_exact), 'frames': len(views), 'sourceHashes': {key: value['sha256'] for key, value in source_meta.items()}, 'originalPixelsPreserved': True, 'spatialScalingApplied': False})
    print(json.dumps({'frames': len(views), 'sets': len(sets_exact), 'assertions': assertions, 'output': str(OUT)}))


if __name__ == '__main__':
    main()
