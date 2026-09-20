#!/usr/bin/env python3
"""Reproduce reviewed, partial DC arcade actor packs from privately cached source PNGs.

No model calls. Optional --download fetches only the three observed public PNG URLs.
Native resolution/RGB, explicit crop review, authored preview timing and anchors.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess
from PIL import Image, ImageDraw
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'data/reference-cache/spriters-resource/dc-arcade'

def row(y0,y1,edges):return [[a,y0,b,y1]for a,b in zip(edges,edges[1:])]

SETS={
 'batman':{'asset':'31098','game':'Batman (Atari, 1991)','slug':'batman','uploader':'Yawackhary','url':'https://www.spriters-resource.com/media/assets/28/31098.png?updated=1755472649','sha':'b394fc88ff78734fe1976da90d3d081e1665c5f151d7fad5975d8e1f20b23c2a','bg':[186,254,202],
  'clips':{'walk':(row(8,101,[0,70,134,194,258,320,390]),6,True),'jump':(row(103,220,[0,64,143,239,348,427,508,608]),7,False),'crouch':(row(321,399,[0,70,151,230]),8,False),'punch':(row(222,318,[180,240,340]),6,False),'kick':(row(400,501,[208,279,347,427,536]),6,False)}},
 'joker':{'asset':'110272','game':'Batman (Atari, 1991)','slug':'batman','uploader':'shadowman44','url':'https://www.spriters-resource.com/media/assets/107/110272.png?updated=1755477868','sha':'01fb6386debd5cf978af52806e64dd0f3a21d128dc5671072c03205c0346f8f0','bg':[186,254,202],
  'clips':{'hatWalk':(row(0,81,[0,43,86,128,174,198,250]),6,True),'hatPistol':(row(82,172,[0,55,144]),8,False),'hatCrouch':([[145,105,191,170]],8,False),'hatFall':([[0,173,52,260],[52,173,104,260],[104,173,165,260],[165,173,207,260],[207,173,277,260],[292,173,363,260]],7,False),'walk':(row(263,344,[0,48,98,158,191,226,275,307,341]),6,True)}},
 'superman':{'asset':'108348','game':'Superman (Taito arcade)','slug':'superman','uploader':'jin315','url':'https://www.spriters-resource.com/media/assets/105/108348.png?updated=1755477412','sha':'f4a0cd3f73623bb2d1b441cb269c46b4aa25dac187d48b456e5f374db27f5579','bg':[98,146,177],
  'clips':{'idle':([[0,860,75,955]],60,True),'walk':(row(860,955,[100,176,229,280,344,395,470]),6,True),'punch':(row(860,955,[495,554,629,723,798,870]),6,False),'crouch':(row(875,955,[900,970,1033]),8,False),'hover':(row(505,590,[0,65,140]),8,True)}}
}

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,data):p.write_text(json.dumps(data,indent=2)+'\n')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');args=parser.parse_args()
 CACHE.mkdir(parents=True,exist_ok=True)
 summaries=[]
 for name,cfg in SETS.items():
  source=CACHE/f'{name}-{cfg["asset"]}.png'
  if args.download and not source.exists():subprocess.run(['curl','-L','--fail',cfg['url'],'-o',str(source)],check=True)
  assert digest(source)==cfg['sha'],f'{name}: source changed; review required'
  pack=ROOT/f'data/local-assets/dc-{name}-arcade';pack.mkdir(parents=True,exist_ok=True)
  assert not (pack/'quality.json').exists(),'Refusing to overwrite an admitted pack'
  for d in ['sources','evidence','previews']:(pack/d).mkdir(exist_ok=True)
  shutil.copyfile(source,pack/f'sources/{cfg["asset"]}.png')
  im=Image.open(source).convert('RGBA');frames={};clips={};proof=[];previews=[]
  for clip,(rects,duration,loop)in cfg['clips'].items():
   steps=[]
   for i,rect in enumerate(rects):
    raw=np.asarray(im.crop(tuple(rect))).copy();raw[np.all(raw[:,:,:3]==cfg['bg'],axis=2),3]=0
    cut=Image.fromarray(raw);trim=cut.getbbox();assert trim
    cut=cut.crop(trim);arr=np.asarray(cut).copy();arr[arr[:,:,3]==0]=0
    opaque=arr[:,:,3]!=0
    colors=sorted({tuple(int(v)for v in px[:3])for px in arr.reshape(-1,4)if px[3]})
    planes=[]
    for offset in range(0,len(colors),16):
     local=colors[offset:offset+16];slots={c:format(j,'x')for j,c in enumerate(local)}
     planes.append({'pixels':[''.join(slots.get(tuple(int(v)for v in px[:3]),'.')if px[3]else'.'for px in r)for r in arr],'palette':['#'+bytes(c).hex()for c in local]})
    assert len(planes)<=9
    frame_id=f'{clip}-{i:02d}';anchor={'x':cut.width//2,'y':cut.height-1}
    frame=dict(planes[0],size={'w':cut.width,'h':cut.height},anchor=anchor,hitboxes=[],hurtboxes=[],source={'sheetCell':rect,'trimWithinCell':list(trim),'sourceSha256':cfg['sha']},transform={'scale':1,'mirrored':False,'exactSourceRGB':True},anchorProvenance='Authored bottom-center preview anchor, not original engine pivot. Flight/jump trajectory must be authored by a controller.')
    if len(planes)>1:frame['layers']=planes[1:]
    frames[frame_id]=frame
    decoded=Image.new('RGBA',cut.size);coverage=np.zeros((cut.height,cut.width),dtype=np.uint8)
    for plane in [frame]+frame.get('layers',[]):
     for y,r in enumerate(plane['pixels']):
      for x,slot in enumerate(r):
       if slot!='.':decoded.putpixel((x,y),(*bytes.fromhex(plane['palette'][int(slot,16)][1:]),255));coverage[y,x]+=1
    assert np.array_equal(np.asarray(decoded),arr),frame_id
    assert np.array_equal(coverage,opaque.astype(np.uint8)),frame_id
    decoded.save(pack/f'previews/{frame_id}.png');previews.append((frame_id,decoded))
    proof.append({'frame':frame_id,'sourceRect':rect,'trim':list(trim),'nativeSize':list(cut.size),'colors':len(colors),'planePaletteSizes':[len(p['palette'])for p in planes],'opaquePixels':int(opaque.sum()),'transparentPixels':int((~opaque).sum()),'mismatchPixels':0})
    steps.append({'frame':frame_id,'duration':duration,'anchor':anchor,'hitboxes':[],'hurtboxes':[],'geometryProvenance':'No combat boxes supplied; no collision/strength inferred from pose pixels.'})
   clips[clip]={'loop':loop,'frames':steps,'mappingConfidence':'medium','mappingNote':'Visual pose category reviewed; source action labels/ordering are not machine-readable. No claim of original move strength or semantics.','timingProvenance':'Authored 60Hz preview timing, not measured source-game timing.'}
  page=f'https://www.spriters-resource.com/arcade/{cfg["slug"]}/asset/{cfg["asset"]}/'
  actor={'id':name,'name':name.title()+' arcade source study','subject':name.title()+' — '+cfg['game'],'camera':'side-view','frames':frames,'animations':clips,'coordinates':'anchor-relative offsets; authored bottom-center origin; no hit/hurt boxes supplied','source':{'path':f'sources/{cfg["asset"]}.png','url':page,'sha256':cfg['sha']},'unsupportedStates':['complete fighter contract','original collision geometry','original timing','all unmapped source poses'],'provenance':{'game':cfg['game'],'platform':'Arcade','sourcePage':page,'uploader':cfg['uploader'],'sourceSha256':cfg['sha'],'mapping':'Partial visually reviewed native-resolution sequences; not a16-clip fighter or original animation reconstruction.'},'integration':{'status':'draft','fighterCompatible':False,'originalTimingRecovered':False}}
  write(pack/'actor.json',actor)
  write(pack/'manifest.json',{'schemaVersion':1,'id':f'dc-{name}-arcade','version':'0.1.0','title':name.title()+' arcade source study','camera':'side-view','description':f'Private partial native-color actor: {len(frames)} frames and {len(clips)} reviewed pose clips. Combat integration unverified.','license':{'spdx':'LicenseRef-Commercial-Reference','localNotice':'LICENSE.md','notes':'Private reference import; retain source credit and rights metadata.'},'provenance':{'kind':'derived','sourcePage':page,'uploader':cfg['uploader'],'sourceSha256':cfg['sha'],'importScript':'scripts/import-dc-arcade.py'},'actors':[{'id':name,'file':'actor.json','tags':[name,'dc comics','dc universe','arcade','side view',cfg['game']]}],'props':[]})
  (pack/'LICENSE.md').write_text(f'Commercial DC character artwork from {cfg["game"]}, archived by The Spriters Resource. Uploader: {cfg["uploader"]}. Private local reference; no redistribution license is inferred. Crop encoding, preview timing and anchors are authored by this project.\n')
  (pack/'README.md').write_text(f'# {name.title()} arcade actor draft\n\nPartial actual source poses, native RGB/resolution. Clips: {", ".join(clips)}. Exact source/encoded RGBA comparison passed. Timings/anchors authored; collision boxes absent. Not a complete fighter. Source/artifacts are private. Regenerate with scripts/import-dc-arcade.py; use --download only to retrieve the fixed observed PNGs if absent.\n')
  contact=Image.new('RGB',(8*170,((len(previews)+7)//8)*160),(28,32,43));draw=ImageDraw.Draw(contact)
  for n,(label,img)in enumerate(previews):
   x=n%8*170;y=n//8*160;assert img.width<=166 and img.height<=135
   contact.paste(img,(x+(170-img.width)//2,y+135-img.height),img);draw.text((x+6,y+143),label,fill='white')
  contact.save(pack/'evidence/contact.png')
  evidence={'sourceSha256':cfg['sha'],'actorSha256':digest(pack/'actor.json'),'frames':proof,'totalFrames':len(frames),'totalOpaquePixels':sum(r['opaquePixels']for r in proof),'mismatchPixels':0,'sourceUnchanged':digest(source)==cfg['sha'],'review':'Source sheet and output contact visually inspected separately; partial pose mapping; not native gameplay proof.'}
  write(pack/'evidence/source-rgba.json',evidence)
  summaries.append({'id':f'dc-{name}-arcade','frames':len(frames),'clips':len(clips),'opaquePixels':evidence['totalOpaquePixels'],'mismatches':0,'sourceSha256':cfg['sha']})
 write(CACHE/'imports.json',summaries);print(json.dumps(summaries,indent=2))

if __name__=='__main__':main()
