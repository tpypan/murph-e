#!/usr/bin/env python3
"""Import native Sonic 2 reference pixels; authored timing/geometry, no network."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/reference-cache/spriters-resource/sonic'
BG = {(13, 72, 7), (37, 102, 26)}
SOURCES = {
    '10073': '13802d67234c3937cc9397f6d1ab5948974944e6d7fcca472c937bbcbbf6c428',
    '85563': 'e883cd17a8c802e5d33e3b712598715fd145f31cc4597a77daef74147d84b7cd',
}
images = {}
for sid, expected in SOURCES.items():
    path = OUT / f'{sid}.png'
    assert sha256(path.read_bytes()).hexdigest() == expected
    images[sid] = Image.open(path).convert('RGB')
(OUT / 'frames').mkdir(exist_ok=True)
proof = []
previews = []


def frame(sid, name, rect, anchor='feet'):
    raw = images[sid].crop(rect)
    rgba = raw.convert('RGBA')
    for y in range(raw.height):
        for x in range(raw.width):
            if raw.getpixel((x, y)) in BG:
                rgba.putpixel((x, y), (0, 0, 0, 0))
    trim = rgba.getbbox()
    assert trim, name
    rgba = rgba.crop(trim)
    palette = sorted(set(pixel[:3] for pixel in rgba.getdata() if pixel[3]))
    assert len(palette) <= 16, (name, len(palette))
    rows = [''.join('.' if rgba.getpixel((x, y))[3] == 0 else format(palette.index(rgba.getpixel((x, y))[:3]), 'x') for x in range(rgba.width)) for y in range(rgba.height)]
    reconstructed = Image.new('RGBA', rgba.size)
    for y, row in enumerate(rows):
        for x, value in enumerate(row):
            reconstructed.putpixel((x, y), (0, 0, 0, 0) if value == '.' else palette[int(value, 16)] + (255,))
    assert reconstructed.tobytes() == rgba.tobytes(), name
    rgba.save(OUT / 'frames' / f'{name}.png')
    # Feet follow each visible contact baseline; center crops keep object centers fixed.
    point = {'x': (raw.width - 1) // 2 - trim[0], 'y': rgba.height - 1 if anchor == 'feet' else (raw.height - 1) // 2 - trim[1]}
    item = {
        'pixels': rows, 'palette': ['#%02x%02x%02x' % c for c in palette],
        'size': {'w': rgba.width, 'h': rgba.height}, 'anchor': point,
        'hitboxes': [], 'hurtboxes': [],
        'source': {'assetId': sid, 'sha256': SOURCES[sid], 'rect': list(rect), 'trim': list(trim)},
        'provenance': {'pixels': 'Native source RGB, no resampling or recoloring; the two sheet backing greens become transparent.', 'anchor': 'Authored cell horizontal center and visible foot baseline; centered objects use cell center.'},
    }
    proof.append({'name': name, 'source': item['source'], 'size': item['size'], 'colors': len(palette), 'opaquePixels': sum(p[3] != 0 for p in rgba.getdata()), 'opaqueBlack': sum(p == (0, 0, 0, 255) for p in rgba.getdata()), 'rgbaMismatches': 0})
    previews.append((name, rgba))
    return item


frames = {}
def body(name, x, y, w=59, h=59):
    frames[name] = frame('10073', name, (x, y, x+w, y+h))
    return name

idle = body('idle', 24, 251)
bored = [body(f'idle{i}', x, 251) for i, x in enumerate([103, 166, 229, 292, 355])]
walk = [body(f'walk{i}', 24 + i*63, 335) for i in range(8)]
run = [body(f'run{i}', 544 + i*63, 335) for i in range(4)]
skid = [body(f'skid{i}', 812 + i*63, 335) for i in range(3)]
roll = [body(f'roll{i}', 812 + i*63, 419) for i in range(5)]
dash = [body(f'charge{i}', 24 + i*63, 515) for i in range(6)]
hurt = [body(f'hurt{i}', 430 + i*63, 683) for i in range(2)]
spring = body('spring', 986, 251)
look = body('look', 702, 251)
crouch = body('crouch', 844, 251)
death = body('death', 572, 683)


def clip(names, duration, loop=True, collision=True):
    return {'loop': loop, 'frames': [{
        'frame': name, 'duration': duration if isinstance(duration, int) else duration[i],
        'anchor': dict(frames[name]['anchor']), 'hitboxes': [],
        'hurtboxes': [{'x': -8, 'y': -28, 'w': 16, 'h': 28}] if collision else [],
    } for i, name in enumerate(names)]}


hero = {
    'id': 'sonic', 'subject': 'Sonic the Hedgehog (Sonic 2, Sega Genesis)', 'camera': 'side-view',
    'coordinates': 'feet-relative boxes; right-facing pixel-center anchors',
    'frames': frames,
    'animations': {
        'idle': clip([idle]+bored, [90, 15, 15, 15, 15, 15]),
        'walk': clip(walk, 6), 'run': clip(run, 4),
        'jump': clip(roll, 3), 'roll': clip(roll, 3), 'spindash': clip(dash, 3),
        'skid': clip(skid, 5, False), 'hurt': clip(hurt, 8, False),
        'spring': clip([spring], 6), 'crouch': clip([crouch], 8),
        'victory': clip([idle, look, idle], [30, 30, 30], False),
        'ko': clip([death], 30, False),
    },
    'source': {'path': 'sources/10073.png', 'sha256': SOURCES['10073'], 'url': 'https://www.spriters-resource.com/sega_genesis/sonicth2/asset/10073/'},
    'provenance': {'kind': 'derived', 'uploader': 'Triangly', 'contributors': ['Tiaremoana'], 'pixels': 'Source Sonic 2 native poses, exact RGB and dimensions.', 'timing': 'Authored 60Hz adaptation, not recovered original ROM metadata.', 'victory': 'Authored goal hold using actual idle/look-up art; not claimed as an original victory animation.', 'geometry': 'Authored feet-relative approximate collision box; controller collision is authoritative.'},
    'unsupportedStates': ['flight', 'wall-climb', 'combat combo set', 'original game physics and timing'],
}
objects = {}
for role, cells, duration, center in [
    ('ring', [(24,200,40,216),(48,200,64,216),(72,200,80,216),(88,200,104,216)], 7, True),
    ('checkpoint', [(256,200,296,264),(304,200,344,264),(352,200,392,264)], 8, False),
    ('goal', [(506,748,554,797)], 12, False),
]:
    fs = {f'{role}{i}': frame('85563', f'{role}{i}', rect, 'center' if center else 'feet') for i,rect in enumerate(cells)}
    objects[role] = {'id': role, 'subject': f'Sonic 2 {role}', 'camera': 'side-view', 'coordinates': 'anchor-relative object geometry', 'frames': fs, 'animations': {'idle': {'loop': True, 'frames': [{'frame': n, 'duration': duration, 'anchor': f['anchor'], 'hitboxes': [], 'hurtboxes': []} for n,f in fs.items()]}}, 'source': {'path': 'sources/85563.png','sha256': SOURCES['85563'], 'url': 'https://www.spriters-resource.com/sega_genesis/sonicth2/asset/85563/'}, 'provenance': {'pixels': 'Native exact RGB source cells; green backing removed.', 'timing': 'Authored display timing, not recovered original metadata.'}}

for name,value in [('hero.json',hero),('objects.json',objects),('integrity.json',{'sources': SOURCES, 'frames': proof, 'exactRgb': True, 'resampling': False, 'quantization': False, 'mismatches': 0})]:
    (OUT/name).write_text(json.dumps(value,indent=2)+'\n')
contact=Image.new('RGB',(960, ((len(previews)+9)//10)*100),(20,24,34));draw=ImageDraw.Draw(contact)
for i,(name,img) in enumerate(previews):
    x=(i%10)*96;y=(i//10)*100;draw.text((x+3,y+3),name,fill='white');contact.paste(img,(x+(96-img.width)//2,y+25+(65-img.height)//2),img)
contact.resize((1920,contact.height*2),Image.Resampling.NEAREST).save(OUT/'contact.png')
print(json.dumps({'heroFrames':len(frames),'clips':len(hero['animations']),'objectFrames':sum(len(s['frames']) for s in objects.values()),'mismatches':0}))
