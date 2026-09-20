#!/usr/bin/env python3
"""Offline separate Atari Batman fighter candidate. Authored pose reuse is explicit."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib,json
ROOT=Path(__file__).resolve().parents[1];OLD=ROOT/'data/local-assets/dc-batman-arcade';OUT=ROOT/'data/reference-cache/spriters-resource/dc-arcade/batman-fighter';OUT.mkdir(exist_ok=True)
SOURCE=OLD/'sources/31098.png';SHA='b394fc88ff78734fe1976da90d3d081e1665c5f151d7fad5975d8e1f20b23c2a';BG=(186,254,202);SCALE=2/3
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SHA
frozen={str(p.relative_to(OLD)):hashlib.sha256(p.read_bytes()).hexdigest()for p in OLD.rglob('*')if p.is_file()}
im=Image.open(SOURCE).convert('RGBA');frames={};proof=[];(OUT/'frames').mkdir(exist_ok=True)
def add(name,rect,anchorx=None,clearance=0,kind='body'):
 cut=im.crop(rect)
 annotations={'recoil':[(40,1278,50,1288)],'hunched':[(64,1287,74,1296)]}.get(name,[])
 annotation_count=0
 if annotations:
  foreground={(x,y)for y in range(rect[1],rect[3])for x in range(rect[0],rect[2])if im.getpixel((x,y))[:3]!=BG};components=[]
  while foreground:
   point=foreground.pop();pending=[point];component={point}
   while pending:
    x,y=pending.pop()
    for neighbor in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
     if neighbor in foreground:foreground.remove(neighbor);pending.append(neighbor);component.add(neighbor)
   components.append(component)
  body=max(components,key=len)
  removed={(x,y)for ax,ay,bx,by in annotations for y in range(max(ay,rect[1]),min(by,rect[3]))for x in range(max(ax,rect[0]),min(bx,rect[2]))if im.getpixel((x,y))[:3]!=BG}
  assert not removed.intersection(body),'Annotation mask overlaps main body'
  annotation_count=len(removed)
 for ax,ay,bx,by in annotations:
  for y in range(max(ay,rect[1]),min(by,rect[3])):
   for x in range(max(ax,rect[0]),min(bx,rect[2])):cut.putpixel((x-rect[0],y-rect[1]),(0,0,0,0))
 cut.putdata([(0,0,0,0)if p[:3]==BG else p for p in cut.getdata()]);trim=cut.getbbox();assert trim
 cut=cut.crop(trim);scaled=cut.resize((round(cut.width*SCALE),round(cut.height*SCALE)),Image.Resampling.NEAREST)
 colors=sorted(set(p[:3]for p in scaled.getdata()if p[3]));planes=[]
 for off in range(0,len(colors),16):
  palette=colors[off:off+16];slots={p:format(i,'x')for i,p in enumerate(palette)}
  planes.append({'pixels':[''.join(slots.get(scaled.getpixel((x,y))[:3],'.')if scaled.getpixel((x,y))[3]else'.'for x in range(scaled.width))for y in range(scaled.height)],'palette':['#%02x%02x%02x'%p for p in palette]})
 assert len(planes)<=9
 anchor={'x':round((cut.width/2 if anchorx is None else anchorx-rect[0]-trim[0])*SCALE),'y':scaled.height-1+clearance}
 f={**planes[0],'size':{'w':scaled.width,'h':scaled.height},'anchor':anchor,'source':{'sheetCell':list(rect),'trimWithinCell':list(trim),'sourceSha256':SHA,'excludedAnnotationRects':annotations},'transform':{'nearestScale':SCALE,'mirrored':False,'exactSourceRGB':True}}
 if len(planes)>1:f['layers']=planes[1:]
 decoded=Image.new('RGBA',scaled.size)
 for plane in planes:
  for y,row in enumerate(plane['pixels']):
   for x,v in enumerate(row):
    if v!='.':assert decoded.getpixel((x,y))[3]==0;decoded.putpixel((x,y),(*bytes.fromhex(plane['palette'][int(v,16)][1:]),255))
 assert decoded.tobytes()==scaled.tobytes()
 decoded.save(OUT/'frames'/f'{name}.png');frames[name]=f;proof.append({'name':name,'rect':list(rect),'trim':trim,'colors':len(colors),'opaquePixels':sum(p[3]>0 for p in decoded.getdata()),'mismatches':0,'kind':kind,'excludedAnnotationPixels':annotation_count,'mainBodyPreserved':True});return name
for i,(a,b)in enumerate(zip([0,70,134,194,258,320],[70,134,194,258,320,390])):add(f'walk{i}',(a,8,b,101))
for i,(a,b)in enumerate(zip([0,64,143,239,348,427,508],[64,143,239,348,427,508,608])):add(f'jump{i}',(a,103,b,220))
add('ready',(64,222,116,318),90)
add('punchReady',(180,222,240,318),214);add('punch',(240,222,340,318),278)
add('kickReady',(347,400,427,501),390);add('kick',(427,400,536,501),470)
add('crouch',(70,321,151,399),113);add('crouchReady',(151,321,230,399),187);add('lowKick',(399,321,492,399),437)
add('airKick',(412,733,535,835),468);add('reach',(140,627,211,720),178)
add('throwReady',(80,840,151,930),118);add('throw',(226,840,325,930),266)
# Object pixels visibly held in throwReady. Flight is authored, not a source travel animation.
add('heldProp',(83,848,100,864),kind='held-object extraction')
# Actual bottom-row collapse/prone poses. The first stagger is marked unused on source.
add('recoil',(4,1280,63,1372),34);add('hunched',(64,1290,121,1372),92)
add('fall0',(125,1280,184,1372),156);add('fall1',(184,1280,243,1372),213);add('fall2',(245,1304,314,1372),276);add('fall3',(318,1340,401,1372),357);add('prone',(403,1348,489,1372),445)
animations={}
H={'x':-12,'y':-53,'w':25,'h':53};LOW={'x':-15,'y':-33,'w':30,'h':33}
def clip(name,names,durations,loop=False,hit=None,low=False,note='Observed pose category; original labels/order unverified.'):
 if isinstance(durations,int):durations=[durations]*len(names)
 animations[name]={'loop':loop,'mappingNote':note,'timingProvenance':'Authored60Hz timing, not recovered Atari metadata.','frames':[{'frame':n,'duration':d,'anchor':frames[n]['anchor'],'hitboxes':[hit]if hit and i==1 else[],'hurtboxes':[LOW if low else H],'geometryProvenance':'Authored feet-relative rectangular geometry, not original hitboxes.'}for i,(n,d)in enumerate(zip(names,durations))]}
clip('idle',['walk1'],60,True,note='Authored neutral hold reuses one actual walking stance; no distinct original idle claimed.')
clip('walk',[f'walk{i}'for i in range(6)],6,True)
clip('jump',[f'jump{i}'for i in range(7)],5,note='Observed airborne/cape poses; authored jump order and pivot.')
clip('crouch',['crouch'],60,True,low=True)
clip('light',['punchReady','punch','punchReady'],[5,3,10],hit={'x':18,'y':-40,'w':28,'h':13,'kind':'mid'})
clip('heavy',['kickReady','kick','kickReady'],[11,5,21],hit={'x':15,'y':-35,'w':36,'h':15,'kind':'overhead'})
clip('sweep',['crouchReady','lowKick','crouchReady'],[9,5,20],low=True,hit={'x':12,'y':-18,'w':35,'h':16,'kind':'low'})
for name,d in [('airLight',[4,6,10]),('airHeavy',[8,6,14])]:clip(name,['jump1','airKick','jump3'],d,hit={'x':12,'y':-28,'w':38,'h':18,'kind':'overhead'},note='Both aerial buttons deliberately reuse actual flying-kick poses with different authored timings; no aerial punch art or original strength claimed.')
clip('guard',['ready'],60,False,note='Authored defensive hold of visible raised fists; original guard state unverified.')
clip('crouchGuard',['crouchReady'],60,False,low=True,note='Authored low defensive hold reuses observed crouch posture.')
clip('hurt',['recoil','hunched'],[7,9],note='Observed stagger/hunch poses; first source pose marked unused; authored recoil sequence.')
clip('ko',['fall0','fall1','fall2','fall3','prone'],[6,6,7,9,90],note='Actual bottom-row collapse to prone; authored timing and grounded pivots, not mirrored attacks.')
clip('victory',['ready'],90,note='Authored neutral post-round ready hold; no original victory/celebration pose identified or claimed.')
clip('special',['throwReady','throw','ready'],[13,5,22],note='Observed curved held-prop and forward-throw body poses; authored traveling prop effect extracted from held object, not original projectile animation.')
clip('dash',['walk4','reach','walk4'],[9,12,24],hit={'x':10,'y':-43,'w':31,'h':39,'kind':'mid'},note='Authored optional forward lunge reuses observed stepping/forward-reaching body poses; not original dash labels.')
# Centered object and socket are explicitly authored from visible source coordinates.
prop=frames['heldProp'];prop['anchor']={'x':prop['size']['w']//2,'y':prop['size']['h']//2}
clip('propTravel',['heldProp'],5,True,note='Static extracted held-prop pixels translated by authored controller; no spin frames fabricated.')
animations['propTravel']['frames'][0]['anchor']=prop['anchor'];animations['propTravel']['frames'][0]['hurtboxes']=[]
f=frames['throw'];r=f['source']['sheetCell'];t=f['source']['trimWithinCell'];socket={'x':round((315-r[0]-t[0])*SCALE),'y':round((876-r[1]-t[1])*SCALE)}
assert 0<=socket['x']<f['size']['w'] and 0<=socket['y']<f['size']['h'];animations['special']['frames'][1]['projectileOrigin']=socket
actor={'id':'batman-atari','name':'Batman — Atari source adaptation','subject':'Batman (Atari1991 arcade) — authored fighter adaptation','camera':'side-view','coordinates':'feet-relative boxes; source frame pixel-center anchors','frames':frames,'animations':animations,'projectile':{'travel':'propTravel','speed':3.5,'life':90,'box':{'x':-4,'y':-3,'w':8,'h':6}},'source':{'path':'sources/31098.png','sha256':SHA,'url':'https://www.spriters-resource.com/arcade/batman/asset/31098/'},'provenance':{'game':'Batman (Atari1991)','uploader':'Yawackhary','sourceSha256':SHA,'originalTimingRecovered':False,'limitations':['Nearest2/3 authored spatial scale; exact resulting native RGB','Neutral idle/victory, defensive holds and optional dash are explicitly reused observed poses','Both aerial attacks reuse actual flying kick, not an invented punch','Travel effect is cropped from held curved prop; motion/socket/timing authored, no source projectile animation claimed','Unused-marked stagger pose retained truthfully; tiny disconnected sheet-asterisk annotations excluded by explicit rectangles','Curved held prop identity is visually plausible but source sheet has no action/projectile labels; no recovered batarang flight or timing claimed']},'unsupportedStates':['original game timing/physics','original victory animation','aerial punch','grapple/climb/throws']}
(OUT/'actor.json').write_text(json.dumps(actor,indent=2)+'\n')
contact=Image.new('RGB',(8*140,((len(frames)+7)//8)*120),(26,30,40));draw=ImageDraw.Draw(contact)
for i,(n,f)in enumerate(frames.items()):
 pic=Image.open(OUT/'frames'/f'{n}.png');x=i%8*140;y=i//8*120;contact.paste(pic,(x+(140-pic.width)//2,y+94-pic.height),pic);draw.text((x+4,y+100),n,fill='white')
contact.save(OUT/'contact.png')
panel=Image.new('RGB',(880,360),(65,73,91));d=ImageDraw.Draw(panel)
for i,name in enumerate(['throwReady','throw','heldProp']):
 pic=Image.open(OUT/'frames'/f'{name}.png');pic=pic.resize((pic.width*4,pic.height*4),Image.Resampling.NEAREST);x=20+i*285;y=50;panel.paste(pic,(x,y),pic);d.text((x,20),name,fill='white')
 if name=='throw':
  px=x+socket['x']*4;py=y+socket['y']*4;d.line((px-8,py,px+8,py),fill='red',width=2);d.line((px,py-8,px,py+8),fill='red',width=2)
d.text((20,325),'Held-prop crop, not a separately labelled source projectile. Flight and socket authored.',fill='white');panel.save(OUT/'throw-contact.png')
assert frozen=={str(p.relative_to(OLD)):hashlib.sha256(p.read_bytes()).hexdigest()for p in OLD.rglob('*')if p.is_file()}
(OUT/'source-proof.json').write_text(json.dumps({'sourceSha256':SHA,'actorSha256':hashlib.sha256((OUT/'actor.json').read_bytes()).hexdigest(),'frames':proof,'mismatches':0,'oldPackUnchanged':frozen,'socket':socket},indent=2)+'\n')
print(json.dumps({'frames':len(frames),'clips':len(animations),'socket':socket,'contact':str(OUT/'contact.png')}))
