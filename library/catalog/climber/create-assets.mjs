// Original pixel authoring, no imported sprites or image processing.
import { writeFileSync } from 'node:fs'
import { dirname,join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir=dirname(fileURLToPath(import.meta.url)),sets={}
function canvas(w,h){const px=Array.from({length:h},()=>Array(w).fill('.'));const dot=(x,y,c)=>{if(x>=0&&y>=0&&x<w&&y<h)px[y|0][x|0]=c};return{dot,rect(x,y,ww,hh,c){for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++)dot(xx,yy,c)},ellipse(cx,cy,rx,ry,c){for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++)if((x-cx)**2/rx**2+(y-cy)**2/ry**2<=1)dot(x,y,c)},rows:()=>px.map(r=>r.join(''))}}
const player={width:16,height:20,frames:{},animations:{}}
function worker(key,pose,phase=0){const a=canvas(16,20),r=a.rect.bind(a),e=a.ellipse.bind(a);const climb=pose==='climb',jump=pose==='jump',hurt=pose==='hurt',death=pose==='death';
 if(death){r(1,11,13,5,'c');r(1,9,5,3,'a');r(10,13,5,3,'f');r(2,15,4,2,'1');r(10,15,4,2,'1');}
 else{
 const bob=pose==='walk'&&phase===1?1:0;
 r(5,1+bob,7,2,'a');r(4,3+bob,9,3,'a');r(3,5+bob,11,1,'9');r(6,6+bob,7,4,'f');r(5,7+bob,3,3,'4');if(!climb)r(11,7+bob,2,pose==='idle'&&phase===1?2:1,'0');r(8,10+bob,3,1,'4');
 r(4,11+bob,8,6,'c');r(5,11+bob,2,2,'7');r(10,11+bob,2,2,'7');r(6,14+bob,5,3,'1');
 if(climb){r(2,phase?5:9,3,7,'f');r(12,phase?9:5,3,7,'f');r(4,17,3,phase?2:3,'1');r(10,16,3,phase?4:2,'1');}
 else if(jump){r(2,8,3,6,'f');r(12,8,3,6,'f');r(3,phase?17:16,4,phase?3:2,'1');r(10,phase?17:15,4,phase?3:2,'1');}
 else if(hurt){r(1,9,4,3,'f');r(12,10,4,3,'f');r(2,17,4,3,'1');r(10,17,4,3,'1');r(7,7,2,2,'8');}
 else{r(3,12,3,4,'f');r(12,12,3,4,'f');const step=pose==='walk'?phase:0;r(step?3:5,17,3,3,'1');r(step?10:9,17,3,3,'1');r(step?2:4,19,4,1,'0');r(step?11:9,19,4,1,'0');}
 }
 player.frames[key]={pixels:a.rows(),durationMs:pose==='walk'?100:pose==='climb'?130:140,anchor:{x:8,y:20},hurtboxes:death?[]:[{x:4,y:4,w:8,h:16}],hitboxes:[],sockets:{hand:{x:13,y:12},head:{x:8,y:4}}}
}
worker('idle-0','idle');worker('idle-1','idle',1);for(let i=0;i<4;i++)worker('walk-'+i,'walk',i%2);for(let i=0;i<2;i++)worker('climb-'+i,'climb',i);worker('jump-rise','jump');worker('jump-fall','jump',1);worker('hurt-0','hurt');worker('hurt-1','hurt',1);worker('death-0','death');
player.animations={idle:{frames:['idle-0','idle-1'],frameMs:300,loop:true},walk:{frames:['walk-0','walk-1','walk-2','walk-3'],frameMs:100,loop:true},climb:{frames:['climb-0','climb-1'],frameMs:130,loop:true},jump:{frames:['jump-rise','jump-fall'],frameMs:180,loop:false},hurt:{frames:['hurt-0','hurt-1'],frameMs:100,loop:true},death:{frames:['death-0'],frameMs:650,loop:false}}
sets.worker=player
const gorilla={width:36,height:32,frames:{},animations:{idle:{frames:['idle-0','idle-1'],frameMs:350,loop:true},throw:{frames:['throw-0','throw-1','throw-2'],frameMs:160,loop:false}}}
for(const [key,throwing,phase] of [['idle-0',false,0],['idle-1',false,1],['throw-0',true,0],['throw-1',true,1],['throw-2',true,2]]){const a=canvas(36,32),r=a.rect.bind(a),e=a.ellipse.bind(a);e(18,18,12,12,'4');e(18,18,8,10,'9');r(5,19,7,12,'4');r(24,19,7,12,'4');r(3,28,10,4,'4');r(23,28,10,4,'4');e(18,9,9,9,'4');r(12,8,12,7,'f');r(11,9,5,4,'0');r(21,9,5,4,'0');r(13,9,2,2,'7');r(22,9,2,2,'7');r(15,13,7,2,'9');r(13,16,11,2,throwing?'0':'f');r(10,2,16,3,'a');r(8,5,20,2,'9');
 if(throwing){const yy=phase===0?12:phase===1?3:10;r(1,yy,7,10,'4');r(28,yy-2,7,10,'4');r(1,yy,7,3,'f');r(28,yy-2,7,3,'f');if(phase!==2){r(27,yy-6,8,7,'9');r(27,yy-5,8,1,'7');r(27,yy-1,8,1,'7')}}else{r(0,16+phase,8,10,'4');r(28,16-phase,8,10,'4');r(1,24+phase,6,3,'f');r(29,24-phase,6,3,'f')}
 gorilla.frames[key]={pixels:a.rows(),durationMs:throwing?160:350,anchor:{x:18,y:32},hurtboxes:[],hitboxes:[],sockets:{barrel:{x:32,y:throwing?6:18}}}}
sets.gorilla=gorilla
const barrel={width:12,height:12,frames:{},animations:{roll:{frames:['roll-0','roll-1','roll-2','roll-3'],frameMs:80,loop:true},fall:{frames:['fall-0','fall-1'],frameMs:90,loop:true}}}
for(let n=0;n<6;n++){const a=canvas(12,12),r=a.rect.bind(a),e=a.ellipse.bind(a);e(6,6,5,5,'4');e(6,6,4,4,'9');if(n<4){r(2,3,8,1,'7');r(2,8,8,1,'6');if(n%2){for(let i=3;i<9;i++)a.dot(i,n===1?i:11-i,'4')}else r(n===0?4:7,3,1,6,'4')}else{r(3,2,1,8,'7');r(8,2,1,8,'6');r(n===4?4:5,4,3,3,'4')}
 barrel.frames[n<4?'roll-'+n:'fall-'+(n-4)]={pixels:a.rows(),durationMs:n<4?80:90,anchor:{x:6,y:6},hurtboxes:[],hitboxes:[{x:2,y:2,w:8,h:8}],sockets:{}}}
sets.barrel=barrel
const fire={width:16,height:16,frames:{},animations:{burn:{frames:['burn-0','burn-1','burn-2'],frameMs:100,loop:true},explode:{frames:['burst-0','burst-1','burst-2'],frameMs:80,loop:false}}}
for(let n=0;n<6;n++){const a=canvas(16,16),r=a.rect.bind(a),e=a.ellipse.bind(a);if(n<3){e(8,10,6,5,'8');e(8,10,4,4,'9');e(8,11,2,3,'a');r(4+n,2+n,2,8,'9');r(10-n,4-n,2,9,'a');a.dot(5+n,1,'a')}else{const radius=2+(n-3)*2;e(8,8,radius,radius,'9');e(8,8,Math.max(1,radius-2),Math.max(1,radius-2),'a');for(let i=0;i<8;i++){const t=i*Math.PI/4;a.dot(Math.round(8+Math.cos(t)*(radius+2)),Math.round(8+Math.sin(t)*(radius+2)),'7')}}
 fire.frames[n<3?'burn-'+n:'burst-'+(n-3)]={pixels:a.rows(),durationMs:n<3?100:80,anchor:{x:8,y:14},hurtboxes:[],hitboxes:n<3?[{x:4,y:6,w:8,h:8}]:[],sockets:{}}}
sets.fire=fire
const cat={width:16,height:16,frames:{},animations:{wait:{frames:['wait-0','wait-1'],frameMs:300,loop:true},rescued:{frames:['rescued'],frameMs:300,loop:false}}}
for(const [key,n] of [['wait-0',0],['wait-1',1],['rescued',2]]){const a=canvas(16,16),r=a.rect.bind(a),e=a.ellipse.bind(a);e(8,11,4,4,'9');r(4,5,9,7,'9');r(4,2,3,4,'9');r(10,2,3,4,'9');r(5,3,1,2,'e');r(11,3,1,2,'e');r(5,7,2,2,'7');r(10,7,2,2,'7');r(6,7,1,1,'0');r(10,7,1,1,'0');r(8,10,1,1,'e');r(5,14,3,1,'f');r(10,14,3,1,'f');r(n===1?1:13,8,2,6,'9');if(n===2){r(6,1,5,1,'a');r(8,0,1,3,'a')}
 cat.frames[key]={pixels:a.rows(),durationMs:300,anchor:{x:8,y:15},hurtboxes:[],hitboxes:[],sockets:{}}}
sets.cat=cat
for(const set of Object.values(sets))for(const clip of Object.values(set.animations))for(const key of clip.frames)set.frames[key].durationMs=clip.frameMs
const assets={schemaVersion:1,id:'construction-rescue',palette:'runtime-pico8',transparent:'.',license:{spdx:'LicenseRef-Project-Original',notes:'Original code-native pixel drawings; no commercial game sprites copied.'},provenance:{kind:'original',authors:['Arcade project'],sources:[],createdAt:'2026-09-19'},sets,collision:{player:{halfWidth:4,height:16},barrel:{radius:4},fire:{halfWidth:4,height:8}},recolor:{worker:{c:'overalls',a:'helmet'},gorilla:{4:'fur',9:'chest'}}}
writeFileSync(join(dir,'assets.json'),JSON.stringify(assets,null,2)+'\n')
console.log('Saved '+Object.values(sets).reduce((n,s)=>n+Object.keys(s.frames).length,0)+' original sprite frames.')
