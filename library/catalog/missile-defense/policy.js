(state,frame,cache)=>{
 const keys=Array.from({length:state.players},()=>[])
 for(let p=0;p<state.players;p++){
  const cursor=state.cursors[p],battery=state.batteries[cursor.battery]
  if(!battery.alive||battery.ammo<=0){const replacement=state.batteries.map((b,i)=>({...b,i})).filter(b=>b.alive&&b.ammo>0).sort((a,b)=>Math.abs(a.x-cursor.x)-Math.abs(b.x-cursor.x))[0];if(replacement&&replacement.i!==cursor.battery&&frame%2===0)keys[p].push('b')}
  const candidates=state.missiles.filter(m=>!state.explosions.some(e=>Math.hypot(e.x-m.x,e.y-m.y)<e.radius+6)&&!state.rockets.some(r=>Math.hypot(r.tx-m.x,r.ty-(m.y+m.vy*.5))<24)).sort((a,b)=>b.y-a.y)
  const target=state.players===2?(candidates.find(m=>p?m.x>=128:m.x<128)||candidates[p]||candidates[0]):candidates[0]
  if(!target)continue
  const lead=Math.hypot(target.x-battery.x,target.y-184)/205+.18
  const x=Math.max(8,Math.min(248,target.x+target.vx*lead)),y=Math.max(32,Math.min(175,target.y+target.vy*lead))
  if(Math.abs(x-cursor.x)>1.8)keys[p].push(x>cursor.x?'right':'left')
  if(Math.abs(y-cursor.y)>1.8)keys[p].push(y>cursor.y?'down':'up')
  if(Math.hypot(x-cursor.x,y-cursor.y)<6&&state.phase==='wave')keys[p].push('a')
 }
 return keys
}
