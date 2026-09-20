import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const dir=dirname(fileURLToPath(import.meta.url)),frames={}
function add(id,pixels,durationTicks=60,anchor={x:0,y:0},boxes=[]){frames[id]={width:pixels[0].length,height:pixels.length,pixels,durationTicks,anchor,hitboxes:boxes,hurtboxes:[],provenance:'Original project pixel artwork.'}}
function raster(w,h,paint){return Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>paint(x,y)).join(''))}
for(let style=0;style<3;style++)for(let phase=0;phase<2;phase++){
 const heights=[[8,13,10],[11,7,14],[13,10,8]][style]
 add(`city-${style}-${phase}`,raster(15,15,(x,y)=>{
  if(y===14)return '3';const tower=Math.min(2,Math.floor(x/5)),roof=14-heights[tower];if(y<roof)return '.';
  if(y===roof||x%5===0)return 'c';if(x%5===4)return '1';if(y>roof+1&&(y-roof)%3===0&&x%5===2)return phase?'a':'7';return '5';
 }),30,{x:7,y:14},[{x:0,y:0,w:15,h:15}])
}
add('city-ruin',raster(15,15,(x,y)=>y===14?'4':y>10+(x*7%3)?(x%3?'5':'4'):'.'),60,{x:7,y:14})
for(const state of ['idle','fire','empty','ruin'])add('battery-'+state,raster(13,11,(x,y)=>{
 if(state==='ruin')return y>7+(x%3)?'4':'.';if(y<4)return x>=5&&x<=7?(state==='fire'?'a':'7'):'.';
 if(y<7&&(x<4-(y-4)||x>8+(y-4)))return '.';if(y===10)return '3';if(y===7&&x>=3&&x<=9)return state==='empty'?'5':'a';return x===0||x===12?'1':'6';
}),state==='fire'?7:60,{x:6,y:10},[{x:0,y:0,w:13,h:11}])
add('enemy-0',['..7..','.787.','..8..','..8..','.....'],6,{x:2,y:2},[{shape:'circle',x:2,y:2,radius:1.5}])
add('enemy-1',['..a..','.777.','..8..','.....','.....'],6,{x:2,y:2},[{shape:'circle',x:2,y:2,radius:1.5}])
add('enemy-split',['7...7','.a.a.','..7..','.8.8.','.....'],6,{x:2,y:2},[{shape:'circle',x:2,y:2,radius:1.5}])
for(let p=0;p<2;p++)for(let phase=0;phase<2;phase++){
 const color=p?'8':'c'
 add(`cursor-${p}-${phase}`,raster(9,9,(x,y)=>((x===0||x===8)&&y>=2&&y<=6||(y===0||y===8)&&x>=2&&x<=6)?color:x===4&&y===4?(phase?'7':color):'.'),20,{x:4,y:4})
 add(`rocket-${p}-${phase}`,['.7.','.7.',color+'7'+color,'.'+(phase?'a':color)+'.','.'+(phase?'.':'a')+'.'],5,{x:1,y:2},[{shape:'circle',x:1,y:2,radius:1}])
}
const radii=[3,7,12,18,24],durations=[3,4,5,6,10],animations={}
for(const kind of ['blast','chain'])for(let p=0;p<2;p++){
 for(let i=0;i<radii.length;i++){
  const r=Math.round(radii[i]*(kind==='chain'?0.625:1));const color=p?'e':'c';
  add(`${kind}-${p}-${i}`,raster(r*2+1,r*2+1,(x,y)=>{
   const d=Math.hypot(x-r,y-r);if(d>r+.1)return '.';if(d>r-1.4)return color;if(d>r-2.3)return '7';if(d<Math.max(1,r*.22))return 'a';return '1';
  }),durations[i],{x:r,y:r},[{shape:'circle',x:r,y:r,radius:radii[i]*(kind==='chain'?0.625:1)}])
 }
 animations[`${kind}-${p}`]={frames:[0,1,2,3,4,4,3,2,1,0].map(i=>`${kind}-${p}-${i}`),durationTicks:[3,4,5,6,10,10,6,5,4,3],loop:false}
}
animations.enemy={frames:['enemy-0','enemy-1'],loop:true};animations.cityLights={frames:['city-0-0','city-0-1'],loop:true}
const assets={schemaVersion:1,id:'missile-defense-art',palette:'pico-8',coordinateSystem:'Frame-local pixels. Explosion hitbox radius follows the same expand/hold/contract frame sequence as rendering. Small chain rings use 0.625 scale.',provenance:{kind:'original',authors:['Arcade project'],sources:[],license:'LicenseRef-Project-Original'},frames,animations}
writeFileSync(join(dir,'assets.json'),JSON.stringify(assets,null,2)+'\n')
writeFileSync(join(dir,'module.js'),readFileSync(join(dir,'module.base.js'),'utf8').replace('__ART__',JSON.stringify(assets)))
