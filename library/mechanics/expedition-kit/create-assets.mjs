import {writeFileSync} from 'node:fs';
const sets={};
function canvas(w,h){const rows=Array.from({length:h},()=>Array(w).fill('.'));return {r(x,y,ww,hh,c){for(let j=y;j<y+hh;j++)for(let i=x;i<x+ww;i++)if(i>=0&&j>=0&&i<w&&j<h)rows[j][i]=c},p(x,y,c){this.r(x,y,1,1,c)},rows(){return rows.map(r=>r.join(''))}}}
function add(id,w,h,names,draw){const frames={},animations={};for(const [n,name] of names.entries()){const a=canvas(w,h);draw(a,n,name);frames[name]={pixels:a.rows(),anchor:{x:w>>1,y:h-3},durationMs:120,hurtboxes:[{x:3,y:4,w:w-6,h:h-6}],hitboxes:[]};animations[name]={frames:[name],frameMs:120,loop:true}}sets[id]={width:w,height:h,frames,animations}}
for(let player=0;player<2;player++)add('warden'+player,16,20,['idle','walk1','walk2','cast','hurt','down'],(a,n)=>{
 const color=player?'8':'c',light=player?'9':'6';
 if(n===5){a.r(2,13,12,5,'1');a.r(3,12,9,4,color);a.r(1,12,5,3,'f');return}
 a.r(4,17,3,2,'1');a.r(10,17,3,2,'1');a.r(4,8,9,9,'1');a.r(5,8,7,8,color);a.r(5,9,2,7,light);a.r(7,4,6,6,'f');a.r(7,4,6,2,'4');a.r(9,6,1,1,'1');a.r(12,6,1,1,'1');a.r(3,3,11,2,color);a.r(6,1,6,3,color);a.r(7,0,3,2,light);a.r(4,7,3,5,color);a.r(2,10,3,4,'f');
 a.r(n===3?14:13,n===3?5:9,1,9,'4');a.r(n===3?12:11,n===3?3:7,4,3,'a');a.p(n===3?13:12,n===3?3:7,'7');
 if(n===1){a.r(4,17,3,3,color);a.r(10,17,3,1,color)}if(n===2){a.r(4,17,3,1,color);a.r(10,17,3,3,color)}if(n===4){a.r(4,9,9,3,'7')}
});
add('slime',16,14,['idle','walk1','walk2','hurt'],(a,n)=>{a.r(3,3,10,9,'3');a.r(1,7,14,5,'3');a.r(4,2,8,8,'b');a.r(3,6,10,5,'b');a.r(5,3,3,2,'7');a.r(5,7,2,3,'1');a.r(10,7,2,3,'1');a.r(2+n%2,11,12,2,'3');if(n===3)a.r(3,5,10,3,'7')});
add('bat',20,14,['idle','walk1','walk2','hurt'],(a,n)=>{a.r(8,4,5,8,'2');a.r(7,3,7,7,'d');a.r(7,1,2,4,'d');a.r(12,1,2,4,'d');for(let x=1;x<8;x++){a.r(x,3+(n%2?x:7-x)/2|0,2,5,'2');a.r(19-x,3+(n%2?x:7-x)/2|0,2,5,'2')}a.r(8,6,2,2,'a');a.r(12,6,2,2,'a');if(n===3)a.r(7,5,7,3,'7')});
add('mage',16,20,['idle','walk1','walk2','hurt'],(a,n)=>{a.r(5,5,7,12,'2');a.r(3,12,11,6,'2');a.r(6,4,5,11,'d');a.r(5,3,8,4,'2');a.r(8,1,3,4,'d');a.r(6,7,6,4,'1');a.p(7,8,'9');a.p(10,8,'9');a.r(13,8,1,10,'4');a.r(12,6+(n%2),3,3,'8');if(n===3)a.r(5,12,8,3,'7')});
add('boss',28,28,['idle','walk1','walk2','hurt'],(a,n)=>{a.r(4,7,20,16,'2');a.r(7,3,14,19,'8');a.r(3,1,4,9,'4');a.r(21,1,4,9,'4');a.r(6,0,3,7,'9');a.r(19,0,3,7,'9');a.r(6,8,16,5,'2');a.r(8,9,4,2,'a');a.r(17,9,4,2,'a');a.r(10,17,9,3,'4');a.r(11,17,2,2,'7');a.r(17,17,2,2,'7');a.r(2,14,5,8,'8');a.r(22,14,5,8,'8');a.r(6+n%2,22,6,5,'4');a.r(16-n%2,22,6,5,'4');if(n===3)a.r(6,14,17,3,'7')});
add('loot',12,12,['xp','key','potion','gem'],(a,n)=>{if(n===0){a.r(4,1,4,9,'c');a.r(2,3,8,5,'6');a.r(4,2,3,5,'7')}if(n===1){a.r(1,2,6,6,'a');a.r(3,4,2,2,'1');a.r(6,5,5,2,'9');a.r(9,6,2,4,'9')}if(n===2){a.r(4,1,4,3,'4');a.r(3,4,6,7,'7');a.r(4,6,4,4,'8')}if(n===3){a.r(4,1,4,10,'d');a.r(2,3,8,6,'d');a.r(4,2,3,5,'7')}});
for(const [id,set] of Object.entries(sets)){set.subject=id.startsWith('warden')?'wizard':id==='boss'?'horned guardian':id;set.tags=['arcade','fantasy',id.startsWith('warden')?'wizard':id];set.unsupportedStates=['jump','climb','melee','carry','directional-facing'];if(set.frames.walk1)set.animations.walk={frames:['walk1','walk2'],frameMs:120,loop:true}}
writeFileSync(new URL('assets.json',import.meta.url),JSON.stringify({schemaVersion:1,camera:'top-down',coordinates:'image top-left; anchor is actor feet',sets},null,2)+'\n');
