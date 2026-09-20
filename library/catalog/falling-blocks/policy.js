(state, frame, cache) => {
 const keys=Array.from({length:state.players},()=>[])
 for(const b of state.boards){
  if(!b.alive||b.clearTimer>0)continue
  let plan=cache[b.index]
  if(!plan||plan.id!==b.piece.id){
   const origin=b.cells.map(([x,y])=>[x-b.piece.x,y-b.piece.y]);let best=-Infinity
   const center=b.piece.type===0?1.5:1
   for(let turn=0;turn<4;turn++){
    const shape=origin.map(([x0,y0])=>{let x=x0,y=y0;if(b.piece.type!==1)for(let k=0;k<turn;k++){const old=x;x=2*center-y;y=old}return[x,y]})
    for(let x=-3;x<10;x++){
     const fits=y=>shape.every(([a,c])=>x+a>=0&&x+a<10&&y+c<20&&(y+c<0||!b.grid[y+c][x+a]))
     let y=-3;if(!fits(y))continue;while(fits(y+1))y++
     if(shape.some(([,c])=>y+c<0))continue
     const grid=b.grid.map(row=>row.slice());for(const [a,c]of shape)grid[y+c][x+a]=1
     const lines=grid.filter(row=>row.every(Boolean)).length,remaining=grid.filter(row=>!row.every(Boolean));while(remaining.length<20)remaining.unshift(Array(10).fill(0))
     const heights=[];let holes=0
     for(let col=0;col<10;col++){let first=remaining.findIndex(row=>row[col]);heights.push(first<0?0:20-first);if(first>=0)for(let row=first;row<20;row++)if(!remaining[row][col])holes++}
     const total=heights.reduce((a,c)=>a+c,0),bump=heights.slice(1).reduce((sum,h,i)=>sum+Math.abs(h-heights[i]),0),danger=Math.max(...heights)
     const value=lines*8-holes*8-total*.6-bump*.35-Math.max(0,danger-14)*4
     if(value>best){best=value;plan={id:b.piece.id,x,r:(b.piece.r+turn)%4}}
    }
   }
   cache[b.index]=plan
  }
  if(!plan){if(frame%2===0)keys[b.index].push('b');continue}
  if(b.piece.r!==plan.r){if(frame%2===0)keys[b.index].push('a')}
  else if(b.piece.x!==plan.x)keys[b.index].push(b.piece.x<plan.x?'right':'left')
  else if(frame%2===0)keys[b.index].push('b')
 }
 return keys
}
