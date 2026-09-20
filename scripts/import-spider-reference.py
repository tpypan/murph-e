#!/usr/bin/env python3
"""Local-only sprite sheet segmentation and explicit reviewed clip import.

The processing code is original; source and derived commercial pixels stay in
ignored data/reference-cache. No download, licensing inference, or publication.
Requires Python, Pillow and NumPy. Run --scan to inspect numbered frame cells.
"""
from pathlib import Path
import argparse, copy, hashlib, json
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/reference-cache/spriters-resource/marvel-spider-man-275483.png'
OUT = ROOT / 'data/reference-cache/spriters-resource/spider-man'
KEY = (255, 0, 255)

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')

def components(mask):
    """Run-length union-find connected components; no guessed uniform grid."""
    parents, bounds, areas, previous = [], [], [], []
    def root(n):
        while parents[n] != n:
            parents[n] = parents[parents[n]]; n = parents[n]
        return n
    for y, row in enumerate(mask):
        changes = np.flatnonzero(np.diff(np.r_[False, row, False].astype(np.int8)))
        current, cursor = [], 0
        for x0, x1 in zip(changes[::2], changes[1::2]):
            x0, x1 = int(x0), int(x1)
            n = len(parents); parents.append(n); bounds.append([x0,y,x1,y+1]); areas.append(x1-x0)
            while cursor < len(previous) and previous[cursor][1] <= x0: cursor += 1
            k=cursor
            while k<len(previous) and previous[k][0]<x1:
                a,b=root(n),root(previous[k][2])
                if a!=b:
                    parents[a]=b
                    bounds[b]=[min(bounds[a][0],bounds[b][0]),min(bounds[a][1],bounds[b][1]),max(bounds[a][2],bounds[b][2]),max(bounds[a][3],bounds[b][3])]
                    areas[b]+=areas[a]
                k+=1
            current.append((x0,x1,n))
        previous=current
    return [(bounds[i],areas[i]) for i in range(len(parents)) if parents[i]==i]

def transparent_crop(image, rect):
    crop=image.crop(tuple(rect)).convert('RGBA'); data=np.asarray(crop).copy()
    data[np.all(data[:,:,:3]==KEY,axis=2),3]=0
    return Image.fromarray(data)

def scan():
    OUT.mkdir(parents=True,exist_ok=True)
    image=Image.open(SOURCE);array=np.asarray(image.convert('RGB'))
    candidates=[]
    for rect,area in components(np.all(array==KEY,axis=2)):
        x0,y0,x1,y1=rect
        if x1-x0>=18 and y1-y0>=18 and area>=120: candidates.append((rect,area))
    # Retain large background regions, reject detached magenta holes inside a cell.
    cells=[]
    for rect,area in sorted(candidates,key=lambda v:v[1],reverse=True):
        if not any(a<=rect[0] and b<=rect[1] and c>=rect[2] and d>=rect[3] for a,b,c,d in cells): cells.append(rect)
    cells.sort(key=lambda r:(r[1]//5,r[0],r[1]))
    records=[]
    for i,rect in enumerate(cells):
        crop=transparent_crop(image,rect);bbox=crop.getbbox()
        if bbox is None: continue
        records.append({'id':i,'cell':rect,'visibleBounds':[rect[0]+bbox[0],rect[1]+bbox[1],rect[0]+bbox[2],rect[1]+bbox[3]],'cellSize':[rect[2]-rect[0],rect[3]-rect[1]]})
    write_json(OUT/'cells.json',{'source':str(SOURCE.relative_to(ROOT)),'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'dimensions':list(image.size),'method':'Connected magenta background regions, containment filtering; clip assignments still require visual review.','cells':records})
    for start in range(0,len(records),72):
        subset=records[start:start+72];width=1200;height=((len(subset)+7)//8)*150
        sheet=Image.new('RGB',(width,height),(32,36,48));draw=ImageDraw.Draw(sheet)
        for j,record in enumerate(subset):
            x=(j%8)*150;y=(j//8)*150;crop=transparent_crop(image,record['cell']);crop=crop.crop(crop.getbbox())
            # Inspection thumbnail only; originals retained for import.
            if crop.width>144 or crop.height>124: crop.thumbnail((144,124),Image.Resampling.NEAREST)
            sheet.paste(crop,(x+(150-crop.width)//2,y+8+(124-crop.height)//2),crop)
            draw.text((x+5,y+134),f"{record['id']}  y={record['cell'][1]}",fill=(255,255,255))
        sheet.save(OUT/f'cells-{start:03d}.png')
    print(json.dumps({'cells':len(records),'inspectionSheets':(len(records)+71)//72,'out':str(OUT)}))


# Clip identities below are reviewed pose assignments for the prototype, not
# recovered Capcom action labels, animation durations or collision metadata.
PROTOTYPE_CLIPS = {
 'idle': ([0,1,2,3,4,5,6,7,8], [6]*9, True, 'high', 'recognizable low fighting stance loop'),
 'walk': ([9,10,11,12,13,14], [5]*6, True, 'medium', 'adjacent compact stepping poses; forward/back semantics are unverified'),
 'jump': ([16,23,31,39], [5,7,9,8], False, 'medium', 'airborne poses composed into a prototype jump; original order is unverified'),
 'crouch': ([15], [60], True, 'high', 'clear low crouching pose'),
 'light': ([233,234,235,236], [5,3,5,5], False, 'high', 'visible straight punch and retraction; custom light timing'),
 'heavy': ([247,248,249,247], [11,5,11,10], False, 'high', 'visible standing side kick; custom heavy timing'),
 'airLight': ([295,299,296], [4,6,10], False, 'medium', 'airborne reach/punch pose; original move class unverified'),
 'airHeavy': ([315,316,317], [8,6,14], False, 'high', 'airborne extended-leg kick poses; custom timing'),
 'sweep': ([274,276,275], [9,5,20], False, 'medium', 'visible low extended kick; original strength/move name unverified'),
 'guard': ([71,72], [5,60], False, 'medium', 'protective raised-arm poses near shield effects; original guard state unverified'),
 'crouchGuard': ([82,83], [5,60], False, 'medium', 'low protective arm poses; original guard state unverified'),
 'hurt': ([110,45], [8,8], False, 'low', 'proxy recoil/hunched poses; not a recovered original hit-reaction clip'),
 'ko': ([168,171], [10,90], False, 'low', 'falling/lying pose proxy; original KO sequence is not established'),
 'victory': ([139,140,142,143], [7,7,12,24], False, 'high', 'salute/thumbs-up poses; original victory selection/order unverified'),
 'special': ([343,345,346,349,344], [13,5,7,7,8], False, 'high', 'visible web-shooting poses; generic fighter projectile art is incompatible, so demo uses dash instead'),
 'dash': ([153,154,155,156], [9,12,12,12], False, 'medium', 'low forward travel poses; mapped to generic tested dash mechanic'),
}

def build():
    if not (OUT/'cells.json').exists(): scan()
    original=Image.open(SOURCE);palette=original.getpalette();records=json.loads((OUT/'cells.json').read_text())['cells'];by_id={r['id']:r for r in records}
    import re
    colors=[tuple(bytes.fromhex(c[1:])) for c in re.findall(r"'(#[0-9a-f]{6})'",(ROOT/'packages/runtime/src/palette.ts').read_text())]
    assert len(colors)==16
    counts=Counter(original.getdata());used=sorted(counts)
    source_palette=[{'index':i,'rgb':palette[3*i:3*i+3],'count':counts[i],'alpha':0 if i==original.info.get('transparency') else 255}for i in used]
    write_json(OUT/'source-palette.json',{'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'pngMode':original.mode,'pngTransparencyIndex':original.info.get('transparency'),'extraChromaKeyIndex':1,'indices':source_palette,'notes':['Index 0 transparent black differs from opaque black index 20.','Orange-highlight/red-shadow suit ramp is present in the source. No alternative or canonical red palette was identified.','Idle and straight punch each use 15 opaque colors; web FX can exceed that.']})
    nearest={i:min(range(16),key=lambda c:sum((palette[3*i+k]-colors[c][k])**2 for k in range(3)))for i in used if i not in (0,1)}
    write_json(OUT/'runtime-palette-map.json',{'method':'Nearest squared RGB into the unchanged runtime global palette. No costume recolor; source orange highlights remain orange.','sourceToRuntime':nearest,'runtimePalette':colors,'warning':'Lossy prototype. Multiple distinct source shades collapse; source palette files/PNGs retain the originals.'})
    (OUT/'frames/source-indexed').mkdir(parents=True,exist_ok=True);(OUT/'frames/source-rgba').mkdir(parents=True,exist_ok=True);(OUT/'frames/runtime').mkdir(parents=True,exist_ok=True)
    selected=sorted(set(i for seq,*_ in PROTOTYPE_CLIPS.values() for i in seq));frames={};rgba={};mapping=[]
    scale=9/16
    for i in selected:
        rect=by_id[i]['cell'][:]
        # A foreground limb can divide its magenta background into overlapping
        # components. Union overlapping component bounds to recover that cell.
        changed=True
        while changed:
            changed=False
            for record in records:
                a=record['cell']
                if max(a[0],rect[0])<min(a[2],rect[2]) and max(a[1],rect[1])<min(a[3],rect[3]):
                    merged=[min(a[0],rect[0]),min(a[1],rect[1]),max(a[2],rect[2]),max(a[3],rect[3])]
                    if merged!=rect:rect=merged;changed=True
        raw=original.crop(tuple(rect));raw.save(OUT/f'frames/source-indexed/{i:03d}.png',transparency=0)
        cut=transparent_crop(original,rect);trim=cut.getbbox();assert trim
        cut=cut.crop(trim);cut.save(OUT/f'frames/source-rgba/{i:03d}.png');rgba[i]=cut
        # Authored foot/pelvis anchor estimate, explicitly not extracted game pivots.
        fraction=.60
        if i in [9,10,11,12,13,14]:fraction=.57
        if i in [233,234,235,236]:fraction=.68
        if i in [247,248,249]:fraction=.75
        if i in [274,275,276]:fraction=.65
        if i in [343,344,345,346,349]:fraction=.65
        if i in [139,140,142,143]:fraction=.5
        anchor_source={'x':round((cut.width-1)*fraction),'y':cut.height-1}
        native=cut.resize((max(1,round(cut.width*scale)),max(1,round(cut.height*scale))),Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        arr=np.asarray(native);rows=[];preview=Image.new('RGBA',native.size)
        for y in range(native.height):
            row=''
            for x in range(native.width):
                rgb=tuple(arr[y,x,:3]);alpha=arr[y,x,3]
                if not alpha:row+='.';continue
                c=min(range(16),key=lambda c:sum((int(rgb[k])-colors[c][k])**2 for k in range(3)))
                row+=format(c,'x');preview.putpixel((x,y),(*colors[c],255))
            rows.append(row)
        preview.save(OUT/f'frames/runtime/{i:03d}.png')
        anchor={'x':native.width-1-round(anchor_source['x']*scale),'y':round(anchor_source['y']*scale)}
        frame={'pixels':rows,'anchor':anchor,'size':{'w':native.width,'h':native.height},'source':{'sheetCell':rect,'trimWithinCell':list(trim),'sourceFrameId':i,'sourcePalette':'source-palette.json'},'transform':{'nearestScale':scale,'mirrorToFaceRight':True,'globalPaletteQuantized':True},'anchorProvenance':'Authored approximate foot/pelvis point, not source-game metadata.'}
        frames[f'src{i:03d}']=frame
        mapping.append({'id':i,'sourceRect':rect,'trim':list(trim),'originalSize':list(cut.size),'runtimeSize':list(native.size),'sourceAnchorAuthored':anchor_source,'runtimeAnchor':anchor,'sourceOpaqueColors':len(set(tuple(c)for c in np.asarray(cut).reshape(-1,4)if c[3]))})
    hurt={name:{'x':-15,'y':-45,'w':32,'h':44}for name in PROTOTYPE_CLIPS}
    for name in ['crouch','crouchGuard','sweep']:hurt[name]={'x':-17,'y':-28,'w':35,'h':28}
    for name in ['jump','airLight','airHeavy']:hurt[name]={'x':-14,'y':-58,'w':29,'h':48}
    hurt['ko']={'x':-22,'y':-17,'w':46,'h':17}
    hit={
      'light':{'x':31,'y':-35,'w':29,'h':12,'kind':'mid'},
      'heavy':{'x':31,'y':-39,'w':34,'h':14,'kind':'overhead'},
      'sweep':{'x':24,'y':-14,'w':34,'h':12,'kind':'low'},
      'airLight':{'x':20,'y':-40,'w':34,'h':15,'kind':'overhead'},
      'airHeavy':{'x':22,'y':-25,'w':39,'h':16,'kind':'overhead'},
      'dash':{'x':12,'y':-38,'w':32,'h':34,'kind':'mid'},
    }
    animations={}
    for name,(seq,timing,loop,confidence,note)in PROTOTYPE_CLIPS.items():
        animations[name]={'loop':loop,'mappingConfidence':confidence,'mappingNote':note,'timingProvenance':'Authored 60Hz prototype timings adapted to existing tested fighter move windows; not extracted Capcom timing.','frames':[{'frame':f'src{i:03d}','duration':duration,'anchor':frames[f'src{i:03d}']['anchor'],'hitboxes':[hit[name]]if n==1 and name in hit else [],'hurtboxes':[hurt[name]],'geometryProvenance':'Authored prototype boxes in feet-relative world coordinates, not source collision data.'}for n,(i,duration)in enumerate(zip(seq,timing))]}
    asset={'name':'Spider-Man (local sheet prototype)','frames':frames,'animations':animations,'provenance':{'kind':'commercial-reference-prototype','sourcePage':'https://www.spriters-resource.com/arcade/marvelvscapcom/asset/275483/','uploader':'kilburto','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'license':'Commercial game art; no redistribution license inferred. Local ignored cache only.','coverage':'Complete adapter schema; partial/uncertain original state identification. Hurt and KO are explicit proxies.','limitations':['No original frame labels, timings, pivots or collision geometry were supplied.','Nearest global palette loses shade detail; source indexed/RGBA pixels remain untouched.','Facing is normalized by mirroring source left-facing poses.','Web poses are mapped, but the generic fighter projectile renderer is not a web. Demo uses the supported dash special.']}}
    write_json(OUT/'custom-assets.json',{'spider-man-reference':asset});write_json(OUT/'mapping.json',{'sourceFrames':mapping,'clips':{name:{'ids':clip[0],'durations':clip[1],'loop':clip[2],'confidence':clip[3],'notes':clip[4]}for name,clip in PROTOTYPE_CLIPS.items()}})
    # Contact sheet: original-size RGB pixels with nearest-only fitting for preview.
    sheet=Image.new('RGB',(960,8*164),(24,28,38));draw=ImageDraw.Draw(sheet)
    for j,(name,(seq,*_))in enumerate(PROTOTYPE_CLIPS.items()):
        x0=(j%2)*480;y0=(j//2)*164;draw.text((x0+7,y0+4),name+'  / source palette',fill=(255,255,255))
        chosen=[seq[0],seq[min(1,len(seq)-1)],seq[-1]]
        for k,i in enumerate(chosen):
            im=rgba[i].copy();im.thumbnail((148,124),Image.Resampling.NEAREST)
            sheet.paste(im,(x0+k*158+(158-im.width)//2,y0+24+(124-im.height)),im)
            draw.text((x0+k*158+8,y0+151),f'source {i}',fill=(172,188,207))
    sheet.save(OUT/'source-clips.png')
    # Honest comparison: same selected source poses, source RGB vs runtime RGB.
    compare=Image.new('RGB',(840,430),(24,28,38));draw=ImageDraw.Draw(compare)
    draw.text((12,8),'SOURCE PIXELS / SOURCE PALETTE (left-facing)',fill=(255,255,255));draw.text((12,223),'RUNTIME PROTOTYPE / FIXED 16 COLORS (mirrored + 9/16 scale)',fill=(255,255,255))
    for k,i in enumerate([0,234,248,316,345]):
        im=rgba[i];im=im.resize((im.width,im.height),Image.Resampling.NEAREST);x=k*168+(168-im.width)//2
        compare.paste(im,(x,190-im.height),im);draw.text((k*168+8,200),f'frame {i}',fill=(200,200,200))
        im=Image.open(OUT/f'frames/runtime/{i:03d}.png');im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
        if im.width>160 or im.height>162:im.thumbnail((160,162),Image.Resampling.NEAREST)
        compare.paste(im,(k*168+(168-im.width)//2,410-im.height),im)
    compare.save(OUT/'palette-comparison.png')
    animation=[]
    for frame_no in range(72):
        canvas=Image.new('RGB',(620,330),(24,28,38));d=ImageDraw.Draw(canvas)
        for j,name in enumerate(['idle','walk','light','heavy']):
            seq,timing,_,_,_=PROTOTYPE_CLIPS[name];tick=frame_no*2%sum(timing);idx=0
            while tick>=timing[idx]:tick-=timing[idx];idx+=1
            im=rgba[seq[idx]].copy();im.thumbnail((280,132),Image.Resampling.NEAREST)
            x0=(j%2)*310;y0=(j//2)*165;canvas.paste(im,(x0+(310-im.width)//2,y0+145-im.height),im);d.text((x0+8,y0+151),name+' / source palette, authored timing',fill=(255,255,255))
        animation.append(canvas)
    animation[0].save(OUT/'source-animation.gif',save_all=True,append_images=animation[1:],duration=33,loop=0,disposal=2)
    print(json.dumps({'frames':len(frames),'clips':len(animations),'sourceColors':len(used),'out':str(OUT),'coverage':'Adapter complete; hurt/KO original identity remains unverified.'}))


def build_exact():
    """Preserve RGB at the legacy import's exact coordinates; never quantize.

    The reviewed quantized import is the geometry/animation manifest, not the
    color source. Read pixels again from the untouched indexed source PNG.
    Over-limit cells and clips are reported and omitted, never substituted.
    """
    legacy_path = OUT / 'custom-assets.json'
    if not legacy_path.exists():
        raise SystemExit('Run --build first to create the reviewed geometry/clip manifest.')
    legacy_bytes = legacy_path.read_bytes()
    legacy = json.loads(legacy_bytes)['spider-man-reference']
    source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if source_sha != legacy['provenance']['sourceSha256']:
        raise SystemExit('Source PNG differs from the reviewed manifest; review before import.')
    original = Image.open(SOURCE)
    if original.mode != 'P' or original.info.get('transparency') != 0:
        raise SystemExit('Expected reviewed indexed PNG with transparency at index 0.')
    source_palette = original.getpalette()
    for directory in ['frames/runtime-exact', 'frames/scaled-source-exact']:
        (OUT / directory).mkdir(parents=True, exist_ok=True)
    frames, mapping, unsupported = {}, [], []
    for name, old in legacy['frames'].items():
        source = old['source']
        rect, trim = source['sheetCell'], source['trimWithinCell']
        cut = transparent_crop(original, rect).crop(tuple(trim))
        size = (old['size']['w'], old['size']['h'])
        scale = old['transform']['nearestScale']
        assert size == (max(1, round(cut.width * scale)), max(1, round(cut.height * scale)))
        native = cut.resize(size, Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        # Same transform on indexed pixels preserves a trace from each local
        # palette slot back to the source PNG index, including opaque black 20.
        indexed = original.crop(tuple(rect)).crop(tuple(trim)).resize(size, Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        rgba, indices = np.asarray(native), np.asarray(indexed)
        opaque = rgba[:, :, 3] != 0
        used_indices = sorted(int(i) for i in np.unique(indices[opaque]))
        palette, source_to_slot, slot_sources = [], {}, []
        for index in used_indices:
            rgb = source_palette[index * 3:index * 3 + 3]
            color = '#' + bytes(rgb).hex()
            if color not in palette:
                palette.append(color)
                slot_sources.append([])
            slot = palette.index(color)
            source_to_slot[index] = slot
            slot_sources[slot].append(index)
        source_id = source['sourceFrameId']
        native.save(OUT / f'frames/scaled-source-exact/{source_id:03d}.png')
        record = {
            'frame': name, 'sourceFrameId': source_id, 'size': old['size'],
            'anchor': old['anchor'], 'sourceRect': rect, 'trimWithinCell': trim,
            'opaquePixels': int(np.count_nonzero(opaque)), 'opaqueColors': len(palette),
            'sourceToSlot': source_to_slot, 'palette': palette,
            'slots': [{'slot': i, 'rgb': color, 'sourceIndices': slot_sources[i]} for i, color in enumerate(palette)],
        }
        if len(palette) > 16:
            record['status'] = 'unsupported'
            record['reason'] = f'{len(palette)} opaque RGB colors exceed the 16-entry per-sprite contract; no reduction or substitution.'
            unsupported.append(record)
            mapping.append(record)
            continue
        pixels = [
            ''.join(format(source_to_slot[int(indices[y, x])], 'x') if opaque[y, x] else '.' for x in range(size[0]))
            for y in range(size[1])
        ]
        frame = copy.deepcopy(old)
        frame['pixels'], frame['palette'] = pixels, palette
        frame['transform']['globalPaletteQuantized'] = False
        frame['transform']['exactScaledSourceRGB'] = True
        frame['source']['exactPaletteMap'] = 'exact-palette-import.json'
        frames[name] = frame
        # Independently reconstruct the sprite encoding, then compare all RGBA
        # bytes. Transparent RGB is intentionally normalized, not rendered.
        decoded = Image.new('RGBA', size)
        for y, row in enumerate(pixels):
            for x, value in enumerate(row):
                if value != '.':
                    decoded.putpixel((x, y), (*bytes.fromhex(palette[int(value, 16)][1:]), 255))
        expected = np.asarray(native).copy()
        expected[~opaque] = 0
        assert np.array_equal(np.asarray(decoded), expected), name
        decoded.save(OUT / f'frames/runtime-exact/{source_id:03d}.png')
        record['status'] = 'exact'
        record['encodedRGBAMatchesScaledSource'] = True
        record['opaqueBlackPixels'] = int(np.count_nonzero(opaque & np.all(rgba[:, :, :3] == 0, axis=2)))
        mapping.append(record)
    skipped_clips = {
        name: sorted({item['frame'] for item in clip['frames'] if item['frame'] not in frames})
        for name, clip in legacy['animations'].items()
        if any(item['frame'] not in frames for item in clip['frames'])
    }
    asset = copy.deepcopy(legacy)
    asset['name'] = 'Spider-Man (local exact source palette subset)'
    asset['frames'] = frames
    asset['animations'] = {name: clip for name, clip in asset['animations'].items() if name not in skipped_clips}
    asset['provenance']['coverage'] = f'{len(frames)}/{len(legacy["frames"])} exact scaled source frames; {len(asset["animations"])}/{len(legacy["animations"])} complete reviewed clips. Unsupported clips are omitted, not replaced.'
    asset['provenance']['limitations'] = [
        'Source pixels use the same nearest 9/16 downscale, mirror, anchors and authored timings as the quantized prototype; spatial detail lost by that scale is not recovered.',
        'Web-special frames src345/src346 exceed 16 opaque colors and are omitted. This subset does not satisfy the fighter full-clip validator as a standalone character.',
        'Original move identities, timings, pivots and collision geometry remain unverified; hurt/KO are explicit authored proxies.',
        'Source orange/red and blue ramps are preserved exactly; no costume recolor or commercial-art redistribution license is inferred.',
    ]
    write_json(OUT / 'custom-assets-exact.json', {'spider-man-reference': asset})
    report = {
        'sourceSha256': source_sha, 'legacyAssetsSha256': hashlib.sha256(legacy_bytes).hexdigest(),
        'exactAssetsSha256': hashlib.sha256((OUT / 'custom-assets-exact.json').read_bytes()).hexdigest(),
        'sourceUnchanged': hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_sha,
        'legacyAssetsUnchanged': legacy_path.read_bytes() == legacy_bytes,
        'method': 'Re-read reviewed source indexed PNG; same crop, nearest scale, mirror and authored anchors. Compact exact opaque RGB into frame-local slots; dot is transparency. No color approximation.',
        'framesImported': len(frames), 'clipsImported': len(asset['animations']),
        'unsupportedFrames': unsupported, 'unsupportedClips': skipped_clips, 'frames': mapping,
    }
    write_json(OUT / 'exact-palette-import.json', report)
    print(json.dumps({key: report[key] for key in ['framesImported', 'clipsImported', 'sourceUnchanged', 'legacyAssetsUnchanged', 'unsupportedClips']}))

def build_layered():
    """Lossless local composite encoding of the 57 already reviewed frames."""
    expected_sha = '140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f'
    def sha(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()
    # Freeze all pre-existing evidence, not just the two asset manifests.
    def is_layered_output(path):
        rel = path.relative_to(OUT)
        return (rel.parts[0] in ('custom-assets-layered.json', 'layered-palette-import.json',
                                'layered-special-contact.png', 'layered-special-animation.gif')
                or rel.parts[:2] == ('frames', 'runtime-layered'))
    frozen = {str(p.relative_to(ROOT)): sha(p) for p in OUT.rglob('*')
              if p.is_file() and not is_layered_output(p)}
    frozen[str(SOURCE.relative_to(ROOT))] = sha(SOURCE)
    assert sha(SOURCE) == expected_sha, 'Unexpected source; review required'
    legacy = json.loads((OUT / 'custom-assets.json').read_text())['spider-man-reference']
    exact = json.loads((OUT / 'custom-assets-exact.json').read_text())['spider-man-reference']
    assert len(legacy['frames']) == 57 and len(exact['frames']) == 55
    assert legacy['provenance']['sourceSha256'] == expected_sha
    original = Image.open(SOURCE)
    assert original.mode == 'P' and original.info.get('transparency') == 0
    source_palette = original.getpalette()
    frames, proof, previews = {}, [], {}
    directory = OUT / 'frames/runtime-layered'
    directory.mkdir(parents=True, exist_ok=True)
    for name, old in legacy['frames'].items():
        rect, trim = old['source']['sheetCell'], old['source']['trimWithinCell']
        size = (old['size']['w'], old['size']['h'])
        indexed = original.crop(tuple(rect)).crop(tuple(trim))
        scale = old['transform']['nearestScale']
        assert size == (max(1, round(indexed.width * scale)), max(1, round(indexed.height * scale)))
        indices = np.asarray(indexed.resize(size, Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT))
        opaque = (indices != 0) & (indices != 1)
        colors, index_colors = [], {}
        for index in sorted(int(i) for i in np.unique(indices[opaque])):
            color = '#' + bytes(source_palette[index*3:index*3+3]).hex()
            if color not in colors:
                colors.append(color)
            index_colors[index] = color
        planes = []
        for offset in range(0, len(colors), 16):
            palette = colors[offset:offset+16]
            slots = {color: format(i, 'x') for i, color in enumerate(palette)}
            pixels = [''.join(slots.get(index_colors.get(int(indices[y, x])), '.')
                              if opaque[y, x] else '.' for x in range(size[0]))
                      for y in range(size[1])]
            planes.append({'pixels': pixels, 'palette': palette})
        assert 1 <= len(planes) <= 9
        if name in exact['frames']:
            # Preserve the old 55-frame exact subset, including metadata, literally.
            frame = copy.deepcopy(exact['frames'][name])
            assert len(planes) == 1
            assert frame['pixels'] == planes[0]['pixels'] and frame['palette'] == planes[0]['palette']
        else:
            frame = copy.deepcopy(old)
            frame.update(planes[0])
            frame['layers'] = planes[1:]
            frame['transform']['globalPaletteQuantized'] = False
            frame['transform']['exactScaledSourceRGB'] = True
            frame['source']['exactPaletteMap'] = 'layered-palette-import.json'
        frames[name] = frame
        # Independent decoder: consume serialized plane slots, not encoder indices.
        decoded = Image.new('RGBA', size)
        coverage = np.zeros((size[1], size[0]), dtype=np.uint8)
        for plane in [frame] + frame.get('layers', []):
            assert len(plane['palette']) <= 16
            assert len(plane['pixels']) == size[1]
            assert all(len(row) == size[0] for row in plane['pixels'])
            for y, row in enumerate(plane['pixels']):
                for x, slot in enumerate(row):
                    if slot != '.':
                        decoded.putpixel((x, y), (*bytes.fromhex(plane['palette'][int(slot, 16)][1:]), 255))
                        coverage[y, x] += 1
        # Independent source RGBA route uses PNG alpha and chroma removal.
        expected = transparent_crop(original, rect).crop(tuple(trim)).resize(size, Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        expected_array = np.asarray(expected).copy()
        expected_array[expected_array[:, :, 3] == 0] = 0
        assert np.array_equal(np.asarray(decoded), expected_array), name
        assert np.array_equal(coverage, opaque.astype(np.uint8)), name
        assert frame['anchor'] == old['anchor'] and frame['size'] == old['size']
        path = directory / f"{old['source']['sourceFrameId']:03d}.png"
        decoded.save(path)
        previews[name] = decoded
        proof.append({'frame': name, 'opaquePixels': int(opaque.sum()),
                      'transparentPixels': int((~opaque).sum()), 'opaqueColors': len(colors),
                      'opaqueBlackPixels': int(np.count_nonzero(opaque & np.all(expected_array[:, :, :3] == 0, axis=2))),
                      'planePaletteSizes': [len(p['palette']) for p in planes],
                      'rgbaMismatchPixels': 0, 'overlappingOpaquePlanePixels': 0,
                      'preview': str(path.relative_to(ROOT)), 'previewSha256': sha(path)})
    assert set(frames) - set(exact['frames']) == {'src345', 'src346'}
    assert all(frames[k] == v for k, v in exact['frames'].items())
    asset = copy.deepcopy(legacy)
    asset['name'] = 'Spider-Man (local exact-color layered source study)'
    asset['frames'] = frames
    asset['provenance']['coverage'] = '57 reviewed scaled source frames, 16 reviewed prototype clips; not an admitted or complete character.'
    asset['provenance']['limitations'] = [
        'Exact colors only at the existing nearest 9/16 scale; discarded spatial detail is not restored.',
        'Pose assignments, anchors and timings are the existing reviewed authored prototype metadata; hurt/KO remain proxies.',
        'The fighter controller does not currently draw these extra layers. This import is source/encoding proof, not native fighter rendering proof.',
        'Web mechanics and original game move metadata are not implemented or recovered.',
        'Commercial reference art remains in ignored local cache; no redistribution license or canonical costume recolor is inferred.',
    ]
    assert asset['animations'] == legacy['animations']
    write_json(OUT / 'custom-assets-layered.json', {'spider-man-reference': asset})
    # Complete existing special sequence; render exact RGB planes without smoothing.
    sequence = asset['animations']['special']['frames']
    zoom = 3
    cell_w = max(previews[f['frame']].width for f in sequence) * zoom + 24
    cell_h = max(previews[f['frame']].height for f in sequence) * zoom + 62
    contact = Image.new('RGB', (cell_w * len(sequence), cell_h + 50), (24, 28, 38))
    draw = ImageDraw.Draw(contact)
    draw.text((12, 8), 'Exact source colors / full reviewed special sequence / 3x nearest preview', fill='white')
    draw.text((12, 25), 'Authored timing; source/encoding proof only. Fighter layers and web mechanics are not integrated.', fill=(190, 200, 215))
    animated, durations = [], []
    for number, entry in enumerate(sequence):
        image = previews[entry['frame']]
        enlarged = image.resize((image.width * zoom, image.height * zoom), Image.Resampling.NEAREST)
        x = number * cell_w + (cell_w-enlarged.width)//2
        contact.paste(enlarged, (x, 50 + cell_h - 48 - enlarged.height), enlarged)
        row = next(p for p in proof if p['frame'] == entry['frame'])
        draw.text((number*cell_w+12, cell_h+10), f"{entry['frame']}  {entry['duration']} ticks  {row['opaqueColors']} RGB", fill='white')
        canvas = Image.new('RGB', (cell_w, cell_h), (24, 28, 38))
        canvas.paste(enlarged, ((cell_w-enlarged.width)//2, cell_h-42-enlarged.height), enlarged)
        ImageDraw.Draw(canvas).text((10, cell_h-25), entry['frame']+' / authored timing', fill='white')
        animated.append(canvas); durations.append(round(entry['duration'] * 1000 / 60))
    contact.save(OUT / 'layered-special-contact.png')
    animated[0].save(OUT / 'layered-special-animation.gif', save_all=True, append_images=animated[1:], duration=durations, loop=0, disposal=2)
    assert all(sha(ROOT / path) == digest for path, digest in frozen.items()), 'Frozen evidence changed'
    report = {'sourceSha256': expected_sha, 'framesImported': len(frames), 'clipsRetained': len(asset['animations']),
              'opaquePixels': sum(p['opaquePixels'] for p in proof),
              'transparentPixels': sum(p['transparentPixels'] for p in proof),
              'opaqueBlackPixels': sum(p['opaqueBlackPixels'] for p in proof),
              'rgbaMismatchPixels': 0, 'old55ExactFramesUnchanged': True,
              'frozenFilesUnchanged': True, 'frozenFileHashes': frozen,
              'layeredAssetsSha256': sha(OUT / 'custom-assets-layered.json'),
              'frames': proof, 'contactSheet': str((OUT / 'layered-special-contact.png').relative_to(ROOT)),
              'proofBoundary': 'Independent local source RGBA versus decoded layer encoding. No fighter/runtime rendering claim.'}
    write_json(OUT / 'layered-palette-import.json', report)
    print(json.dumps({key: report[key] for key in ('framesImported', 'clipsRetained', 'opaquePixels', 'transparentPixels', 'opaqueBlackPixels', 'rgbaMismatchPixels', 'old55ExactFramesUnchanged', 'frozenFilesUnchanged', 'contactSheet')}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--scan',action='store_true');parser.add_argument('--build',action='store_true');parser.add_argument('--exact',action='store_true',help='Exact RGB subset using the existing reviewed geometry; preserve quantized outputs.');parser.add_argument('--layered',action='store_true',help='Exact colors for all 57 reviewed frames using independent <=16-color planes.');args=parser.parse_args()
    if args.layered: build_layered()
    elif args.exact: build_exact()
    elif args.scan: scan()
    else: build()
