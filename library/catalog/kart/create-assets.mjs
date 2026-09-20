// Original deterministic pixel artwork authoring source; outputs portable rows.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url))
const frames = {}
function kart(name, lean = 0, bounce = 0, flame = 0, spin = 0) {
  const w = 32, h = 32
  const px = Array.from({length:h},()=>Array(w).fill('.'))
  const dot=(x,y,c)=>{ if(x>=0&&y>=0&&x<w&&y<h)px[y|0][x|0]=c }
  const rect=(x,y,ww,hh,c)=>{ for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++)dot(xx,yy,c) }
  const ellipse=(cx,cy,rx,ry,c)=>{ for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++)if((x-cx)**2/rx**2+(y-cy)**2/ry**2<=1)dot(x,y,c) }
  const dy=bounce
  if(spin===1||spin===3){
    rect(1,23,30,2,'1'); rect(4,16,24,7,'8'); rect(7,15,16,2,'7');
    ellipse(7,24,5,6,'0');ellipse(25,24,5,6,'0');ellipse(7,24,2,3,'5');ellipse(25,24,2,3,'5');
    rect(12,13,7,8,'1');ellipse(16,7,5,6,'a');ellipse(16,5,4,3,'7');rect(spin===1?18:11,7,5,3,'1');rect(12,12,8,3,'c');
    rect(10,17,12,2,'9');rect(2,21,27,2,'2')
  } else {
    // Rear tires: individual tread slots survive nearest-neighbour scaling.
    rect(1,18+dy,7,11,'0');rect(24,18+dy,7,11,'0')
    rect(2,19+dy,2,8,'5');rect(27,19+dy,2,8,'5')
    for(let y=20;y<29;y+=3){rect(2,y+dy,5,1,'1');rect(25,y+dy,5,1,'1')}
    // Body shell, fenders, rear bumper, engine vents and twin lights.
    rect(5,17+dy,22,10,'2');rect(4,18+dy,24,6,'8');rect(7,16+dy,18,3,'8')
    rect(8,15+dy,16,2,'9');rect(7,25+dy,18,3,'8');rect(8,27+dy,16,2,'1')
    rect(6,22+dy,20,2,'7');rect(11,22+dy,10,4,'5');rect(12,23+dy,8,1,'0')
    rect(6,24+dy,4,2,'a');rect(22,24+dy,4,2,'a');rect(11,27+dy,2,2,'6');rect(20,27+dy,2,2,'6')
    // Driver silhouette: helmet, suit shoulder shading, mittens and seat.
    const dx=lean*2
    rect(10+dx,12+dy,12,8,'1');rect(11+dx,12+dy,10,6,'c');rect(12+dx,15+dy,8,4,'1')
    rect(8+dx,14+dy,4,4,'f');rect(20+dx,14+dy,4,4,'f');rect(11+dx,17+dy,10,2,'0')
    ellipse(16+dx,8+dy,6,7,'2');ellipse(16+dx,7+dy,5,6,'a')
    rect(14+dx,2+dy,3,9,'7');rect(12+dx,10+dy,8,2,'9');rect(13+dx,12+dy,6,1,'4')
    if(spin===2){rect(11+dx,7+dy,10,3,'1');rect(13+dx,7+dy,3,1,'c')}
    if(lean){rect(lean<0?2:27,17,3,2,'6');rect(lean<0?25:3,20,3,2,'5')}
  }
  if(flame){
    const c=flame===1?'a':'c'
    rect(11,29,3,2,'9');rect(19,29,3,2,'9');rect(12,30,1,2,c);rect(20,30,1,2,c)
    dot(10,31,c);dot(22,31,c)
  }
  frames[name] = { pixels:px.map(row=>row.join('')), durationMs:100, anchor:{x:16,y:29}, hurtboxes:[{x:3,y:17,w:26,h:12}], hitboxes:[], sockets:{exhaustLeft:{x:12,y:29},exhaustRight:{x:20,y:29},driver:{x:16+lean*2,y:7+bounce}} }
}
kart('idle-0');kart('idle-1',0,1);kart('drive-0');kart('drive-1',0,-1)
kart('left-0',-1);kart('left-1',-1,-1);kart('right-0',1);kart('right-1',1,-1)
kart('drift-left-0',-2);kart('drift-left-1',-2,-1);kart('drift-right-0',2);kart('drift-right-1',2,-1)
kart('boost-0',0,0,1);kart('boost-1',0,-1,2)
for(let n=0;n<4;n++)kart('crash-'+n,0,0,0,n)
const asset={schemaVersion:1,id:'coast-kart',kind:'indexed-sprite',width:32,height:32,palette:'runtime-pico8',transparent:'.',license:{spdx:'LicenseRef-Project-Original',notes:'Original pixel artwork created for this project; no ripped or copied game assets.'},provenance:{kind:'original',authors:['Arcade project'],sources:[],createdAt:'2026-09-19'},recolor:{'8':'body','2':'bodyShadow','a':'helmet','9':'helmetShade'},collision:{space:'track',halfWidth:0.15,halfLength:45,notes:'Sprite pixel boxes are presentation metadata. Track collision uses these physical dimensions independently of camera scale.'},animations:{idle:{frames:['idle-0','idle-1'],loop:true,frameMs:200},drive:{frames:['drive-0','drive-1'],loop:true,frameMs:90},steerLeft:{frames:['left-0','left-1'],loop:true,frameMs:100},steerRight:{frames:['right-0','right-1'],loop:true,frameMs:100},driftLeft:{frames:['drift-left-0','drift-left-1'],loop:true,frameMs:80},driftRight:{frames:['drift-right-0','drift-right-1'],loop:true,frameMs:80},boost:{frames:['boost-0','boost-1'],loop:true,frameMs:60},crash:{frames:['crash-0','crash-1','crash-2','crash-3'],loop:true,frameMs:90}},frames}
for (const clip of Object.values(asset.animations)) for (const key of clip.frames) asset.frames[key].durationMs = clip.frameMs
writeFileSync(join(dir,'assets.json'),JSON.stringify(asset,null,2)+'\n')
console.log('Created '+Object.keys(frames).length+' original kart frames.')
