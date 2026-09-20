import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const dir=dirname(fileURLToPath(import.meta.url)),frames={}
function add(id,pixels,durationTicks=60,anchor={x:0,y:0},boxes=[]){frames[id]={width:pixels[0].length,height:pixels.length,pixels,durationTicks,anchor,hitboxes:boxes,hurtboxes:[],provenance:'Original project pixel artwork.'}}
for(const c of [5,8,9,10,11,12,13,14]){
 const color=c.toString(16)
 add('block-'+c,Array.from({length:7},(_,y)=>Array.from({length:7},(_,x)=>y===0||x===0?'7':y===6||x===6?'1':x===1&&y===1?'7':color).join('')),60,{x:0,y:0},[{x:0,y:0,w:7,h:7}])
 add('mini-'+c,['777','7'+color+'1','111'])
}
add('ghost',['5555555','5.....5','5.....5','5.....5','5.....5','5.....5','5555555'])
for(let i=0;i<3;i++)add('clear-'+i,Array.from({length:7},(_,y)=>Array.from({length:7},(_,x)=>i===0?'7':i===1?(y%2?'a':'7'):(x+y)%2?'c':'.').join('')),4)
const assets={schemaVersion:1,id:'falling-blocks-art',palette:'pico-8',coordinateSystem:'Frame-local pixels. Game collision is discrete 10 by 20 grid occupancy, not decorative bevel bounds.',provenance:{kind:'original',authors:['Arcade project'],sources:[],license:'LicenseRef-Project-Original'},frames,animations:{lineClear:{frames:['clear-0','clear-1','clear-2'],loop:false},ghost:{frames:['ghost'],loop:true}}}
writeFileSync(join(dir,'assets.json'),JSON.stringify(assets,null,2)+'\n')
writeFileSync(join(dir,'module.js'),readFileSync(join(dir,'module.base.js'),'utf8').replace('__ART__',JSON.stringify(assets)))
