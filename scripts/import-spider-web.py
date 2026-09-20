#!/usr/bin/env python3
"""Offline exact-color web effect import; creates a separate private authored revision."""
from pathlib import Path
import copy
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/reference-cache/spriters-resource/spider-man'
SOURCE = CACHE.parent / 'marvel-spider-man-275483.png'
OUT = CACHE / 'web-import'
SOURCE_SHA = '140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f'
GROUPS = {
    'webTravel': ([369,371,372,373,374], [4,4,4,4,4], True),
    'webImpact': ([368,364,365,362,363], [3,3,3,3,3], False),
    'webBind': ([735,736,737,738,739,740], [4,5,5,5,5,5], False),
}

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def save(p, value):
    p.write_text(json.dumps(value, indent=2)+'\n')

def main():
    assert sha(SOURCE) == SOURCE_SHA
    baseline_path = CACHE / 'custom-assets-reviewed.json'
    baseline_bytes = baseline_path.read_bytes()
    baseline = json.loads(baseline_bytes)['spider-man-reference']
    assert len(baseline['frames']) == 68
    frozen = {str(p.relative_to(ROOT)): sha(p) for p in CACHE.rglob('*')
              if p.is_file() and OUT not in p.parents and p.name != 'custom-assets-web.json'}
    frozen[str(SOURCE.relative_to(ROOT))] = sha(SOURCE)
    OUT.mkdir(exist_ok=True)
    original = Image.open(SOURCE)
    assert original.mode == 'P' and original.info.get('transparency') == 0
    source_palette = original.getpalette()
    records = json.loads((CACHE / 'cells.json').read_text())['cells']
    by_id = {r['id']: r for r in records}
    asset = copy.deepcopy(baseline)
    proof, previews = [], {}
    for group, (ids, durations, loop) in GROUPS.items():
        steps = []
        for source_id, duration in zip(ids, durations):
            rect = by_id[source_id]['cell'][:]
            # Visually reviewed full source cell: foreground split background components.
            if source_id == 369:
                rect = [130,2994,236,3013]
            rgba = np.asarray(original.crop(tuple(rect)).convert('RGBA')).copy()
            rgba[np.all(rgba[:,:,:3] == (255,0,255), axis=2),3] = 0
            cut = Image.fromarray(rgba)
            trim = cut.getbbox(); assert trim
            cut = cut.crop(trim)
            size = (max(1,round(cut.width*9/16)), max(1,round(cut.height*9/16)))
            indexed = original.crop(tuple(rect)).crop(trim).resize(size,Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            indices = np.asarray(indexed)
            opaque = (indices != 0) & (indices != 1)
            colors, lookup = [], {}
            for index in sorted(int(i) for i in np.unique(indices[opaque])):
                color = '#'+bytes(source_palette[index*3:index*3+3]).hex()
                if color not in colors: colors.append(color)
                lookup[index] = color
            planes = []
            for offset in range(0,len(colors),16):
                local = colors[offset:offset+16]
                slots = {c:format(i,'x') for i,c in enumerate(local)}
                planes.append({'pixels':[''.join(slots.get(lookup.get(int(indices[y,x])),'.') if opaque[y,x] else '.' for x in range(size[0])) for y in range(size[1])], 'palette':local})
            assert len(planes)<=9
            if group == 'webTravel':
                tip_x = int(np.nonzero(opaque)[1].max())
                tip_y = round(float(np.nonzero(opaque[:,tip_x])[0].mean()))
                anchor = {'x':tip_x,'y':tip_y}
                anchor_note = 'Authored visible leading-tip center for right-facing travel; entity origin is impact center, tail extends left.'
            elif group == 'webImpact':
                anchor = {'x':round((size[0]-1)/2),'y':round((size[1]-1)/2)}
                anchor_note = 'Authored trimmed visual center at projectile impact point.'
            else:
                anchor = {'x':round((size[0]-1)/2),'y':size[1]-1}
                anchor_note = 'Authored bottom-center aligned to target ground reference; not recovered source pivots.'
            name = f'web{source_id:03d}'
            frame = dict(planes[0], size={'w':size[0],'h':size[1]},anchor=anchor,
                source={'sourceFrameId':source_id,'sheetCell':rect,'trimWithinCell':list(trim),'sourcePalette':'source-palette.json','exactPaletteMap':'web-import/proof.json'},
                transform={'nearestScale':9/16,'mirrorToFaceRight':True,'globalPaletteQuantized':False,'exactScaledSourceRGB':True},anchorProvenance=anchor_note)
            if len(planes)>1:frame['layers']=planes[1:]
            asset['frames'][name]=frame
            decoded=Image.new('RGBA',size); coverage=np.zeros((size[1],size[0]),dtype=np.uint8)
            for plane in [frame]+frame.get('layers',[]):
                assert len(plane['palette'])<=16 and len(plane['pixels'])==size[1]
                for y,row in enumerate(plane['pixels']):
                    assert len(row)==size[0]
                    for x,slot in enumerate(row):
                        if slot!='.':
                            decoded.putpixel((x,y),(*bytes.fromhex(plane['palette'][int(slot,16)][1:]),255));coverage[y,x]+=1
            expected=np.asarray(cut.resize(size,Image.Resampling.NEAREST).transpose(Image.Transpose.FLIP_LEFT_RIGHT)).copy()
            expected[expected[:,:,3]==0]=0
            assert np.array_equal(np.asarray(decoded),expected),name
            assert np.array_equal(coverage,opaque.astype(np.uint8)),name
            decoded.save(OUT/f'{name}.png');previews[name]=decoded
            steps.append({'frame':name,'duration':duration,'anchor':anchor,'hitboxes':[],'hurtboxes':[],
                'geometryProvenance':'Effect artwork has no body collision boxes. Authored projectile box is in character.projectile.'})
            proof.append({'frame':name,'group':group,'sourceRect':rect,'trimWithinCell':list(trim),'size':frame['size'],'anchor':anchor,'durationTicks':duration,'opaqueColors':len(colors),'planePaletteSizes':[len(p['palette'])for p in planes],'opaquePixels':int(opaque.sum()),'transparentPixels':int((~opaque).sum()),'rgbaMismatchPixels':0})
        asset['animations'][group]={'loop':loop,'mappingConfidence':'medium','mappingNote':'Reviewed source effect appearance; original game event semantics and animation ordering remain unverified.','timingProvenance':'Authored 60 Hz prototype duration; not recovered Capcom timing.','frames':steps}
    # Sprite-local, stored mirrored/scaled coordinates, NOT sheet coordinates or feet offsets.
    socket={'x':54,'y':14}
    special=asset['animations']['special']
    assert special['frames'][1]['frame']=='src345'
    special['frames'][1]['projectileOrigin']=socket
    asset['projectile']={'travel':'webTravel','impact':'webImpact','bind':'webBind','speed':3.6,'life':90,
                        'box':{'x':-10,'y':-3,'w':10,'h':6},'bindTicks':38}
    assert all(asset['frames'][k]==v for k,v in baseline['frames'].items())
    for name,clip in baseline['animations'].items():
        check=copy.deepcopy(asset['animations'][name])
        if name=='special':check['frames'][1].pop('projectileOrigin')
        assert check==clip,name
    asset['name']='Spider-Man (local exact-color authored web revision)'
    asset['provenance']['webRevision']={'baseline':'custom-assets-reviewed.json','baselineSha256':hashlib.sha256(baseline_bytes).hexdigest(),
        'sourceSha256':SOURCE_SHA,'review':'docs/research/spider-man-web-review.md','originalMoveSemanticsVerified':False,
        'socket':{'frame':'src345','step':1,'framePixel':socket,'stepAnchor':special['frames'][1]['anchor'],'rightFacingFeetOffset':{'x':31,'y':-28},'provenance':'Visually selected wrist/palm emission center in stored66x42 sprite. Authored emitter registration.'},
        'behaviorProvenance':'Speed, lifetime, head-only collision box and finite bind duration are authored prototype rules, not recovered source-game data.'}
    asset['provenance']['coverage']='84 exact scaled source frames, 16 preserved character clips plus3 authored effect clips; only second special step gains an emitter socket.'
    asset['provenance']['limitations']=[
        'Original state labels, source animation timing/order, collision and original web behavior remain unverified; this is an authored adaptation.',
        'Source RGB remains exact at existing nearest9/16 scale; removed spatial detail is not restored.',
        'Native projectile collision, flip/socket transforms, effect playback, finite bind/recovery and rendering proof are separate integration tasks.',
        'Commercial pixels remain ignored/private; no admission or redistribution license is implied.']
    save(CACHE/'custom-assets-web.json',{'spider-man-reference':asset})
    # Effect contact in a common anchor coordinate system; red rectangle is travel head collision.
    w,h,zoom=250,230,2
    contact=Image.new('RGB',(w*6,h*3),(24,28,38))
    for row,(group,(ids,_,_))in enumerate(GROUPS.items()):
        for col,source_id in enumerate(ids):
            name=f'web{source_id:03d}';frame=asset['frames'][name];im=previews[name]
            canvas=Image.new('RGB',(w,h),(24,28,38));d=ImageDraw.Draw(canvas)
            d.text((8,8),f'{group} / {name}',fill='white');d.text((8,25),f'anchor{frame["anchor"]} / exact RGB',fill=(190,200,215))
            ox,oy=(160,120)if group=='webTravel'else(125,140 if group=='webImpact' else 210)
            enlarged=im.resize((im.width*zoom,im.height*zoom),Image.Resampling.NEAREST)
            x,y=ox-frame['anchor']['x']*zoom,oy-frame['anchor']['y']*zoom
            assert x>=0 and y>=40 and x+enlarged.width<=w
            canvas.paste(enlarged,(x,y),enlarged)
            if group=='webTravel':d.rectangle((ox-20,oy-6,ox-1,oy+5),outline=(255,100,100))
            d.line((ox-3,oy,ox+3,oy),fill=(255,210,0));d.line((ox,oy-3,ox,oy+3),fill=(255,210,0))
            contact.paste(canvas,(col*w,row*h))
    contact.save(OUT/'effects-contact.png')
    body=Image.open(CACHE/'frames/runtime-layered/345.png').convert('RGBA')
    emitter=Image.new('RGB',(660,460),(24,28,38));emitter.paste(body.resize((660,420),Image.Resampling.NEAREST),(0,0),body.resize((660,420),Image.Resampling.NEAREST))
    d=ImageDraw.Draw(emitter);sx,sy=socket['x']*10+5,socket['y']*10+5
    d.ellipse((sx-9,sy-9,sx+9,sy+9),outline=(255,255,255),width=2)
    d.text((10,432),'Authored emitter(54,14); anchor(23,42); feet offset(+31,-28). 10x nearest.',fill='white')
    emitter.save(OUT/'emitter-socket.png')
    assert baseline_path.read_bytes()==baseline_bytes
    assert all(sha(ROOT/p)==digest for p,digest in frozen.items()),'Previous artifact changed'
    report={'sourceSha256':SOURCE_SHA,'baselineSha256':hashlib.sha256(baseline_bytes).hexdigest(),'webAssetSha256':sha(CACHE/'custom-assets-web.json'),
        'totalFrames':len(asset['frames']),'newFrames':len(proof),'newOpaquePixels':sum(r['opaquePixels']for r in proof),'newTransparentPixels':sum(r['transparentPixels']for r in proof),'rgbaMismatchPixels':0,
        'old68FramesUnchanged':True,'old16ClipsUnchangedExceptSocket':True,'priorFilesUnchanged':True,'priorHashes':frozen,'projectile':asset['projectile'],'socket':asset['provenance']['webRevision']['socket'],'frames':proof,
        'boundary':'Source/encoding proof only; authored gameplay parameters await native controller integration.'}
    save(OUT/'proof.json',report)
    print(json.dumps({k:v for k,v in report.items()if k not in('priorHashes','frames')}))

if __name__=='__main__':main()
