(config = {}) => {
function createExpedition(kind, config, assets) {
  const allowed = ['difficulty','stages','seed','playerHealth','theme','onEvent'];
  for (const key of Object.keys(config)) if (!allowed.includes(key)) throw Error('Unsupported expedition config: '+key);
  const number=(key,def,min,max,integer=false)=>{
    const v=config[key]===undefined?def:config[key];
    if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error('Invalid '+key);
    return v;
  };
  const difficulty=number('difficulty',0.4,0,1), stages=number('stages',kind==='arena'?4:3,2,6,true);
  const seed=number('seed',17,1,2147483647,true), health=number('playerHealth',6,3,10,true);
  const theme=config.theme===undefined?(kind==='arena'?'garden':'crypt'):config.theme;
  if(!['garden','crypt'].includes(theme))throw Error('Invalid theme');
  if(config.onEvent!==undefined&&typeof config.onEvent!=='function')throw Error('Invalid onEvent');
  const COLS=15,ROWS=11,TILE=16,OX=8,OY=40;
  const upgrades=['POWER','HASTE','VITALITY'];
  let g, rngState;
  function rand(){rngState=(Math.imul(rngState,1664525)+1013904223)>>>0;return rngState/4294967296}
  function emit(type,data,api){g.events[type]=(g.events[type]||0)+1;if(config.onEvent)config.onEvent({type,...data},api)}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function cell(x,y){return {x:Math.floor((x-OX)/TILE),y:Math.floor((y-OY)/TILE)}}
  function solid(x,y){const c=cell(x,y);if(c.x<0||c.y<0||c.x>=COLS||c.y>=ROWS)return true;return g.map[c.y][c.x]===1}
  function clearAt(x,y,r=5){return !solid(x-r,y-r)&&!solid(x+r,y-r)&&!solid(x-r,y+r)&&!solid(x+r,y+r)}
  function visible(a,b){const d=distance(a,b);for(let t=0;t<d;t+=2)if(!clearAt(a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d,2))return false;return true}
  function move(body,dx,dy){if(clearAt(body.x+dx,body.y,body.r))body.x+=dx;if(clearAt(body.x,body.y+dy,body.r))body.y+=dy}
  function pathStep(from,to){
    const a=cell(from.x,from.y),b=cell(to.x,to.y),start=a.y*COLS+a.x,target=b.y*COLS+b.x;
    if(start===target)return {x:to.x,y:to.y};
    const queue=[start],prev=Array(COLS*ROWS).fill(-1);prev[start]=start;
    for(let i=0;i<queue.length&&prev[target]===-1;i++){
      const k=queue[i],x=k%COLS,y=Math.floor(k/COLS);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,n=ny*COLS+nx;
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS||g.map[ny][nx]||prev[n]!==-1)continue;
        prev[n]=k;queue.push(n);
      }
    }
    if(prev[target]===-1)return {x:from.x,y:from.y};
    let n=target;while(prev[n]!==start&&prev[n]!==n)n=prev[n];
    const cx=OX+(a.x+0.5)*TILE,cy=OY+(a.y+0.5)*TILE;
    if(n%COLS!==a.x&&Math.abs(from.y-cy)>1)return {x:from.x,y:cy};
    if(Math.floor(n/COLS)!==a.y&&Math.abs(from.x-cx)>1)return {x:cx,y:from.y};
    return {x:OX+(n%COLS+0.5)*TILE,y:OY+(Math.floor(n/COLS)+0.5)*TILE};
  }
  function burst(x,y,color,n=9){for(let i=0;i<n&&g.particles.length<96;i++){const a=rand()*Math.PI*2;g.particles.push({x,y,vx:Math.cos(a)*(15+rand()*40),vy:Math.sin(a)*(15+rand()*40),life:0.3+rand()*0.25,color})}}
  function giveLoot(type,x,y){
    if(!clearAt(x,y,5)){const c=cell(x,y);x=OX+(c.x+0.5)*TILE;y=OY+(c.y+0.5)*TILE}
    if(g.loot.length<80)g.loot.push({id:++g.id,type,x,y,life:type==='key'?1e9:40})}
  function buildRoom(){
    g.map=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>(x===0||y===0||x===COLS-1||y===ROWS-1)?1:0));
    const layout=kind==='arena'?[[4,4],[10,4],[4,7],[10,7]]:g.stage%2?[[4,3],[4,4],[10,6],[10,7],[7,5]]:[[4,5],[5,5],[9,5],[10,5],[7,3]];
    for(const [x,y] of layout)g.map[y][x]=1;
  }
  function startStage(api){
    g.phase='play';g.phaseTime=0;g.stageTime=0;g.enemies=[];g.bullets=[];g.loot=[];g.spawns=[];g.exitOpen=false;g.keyDropped=false;g.inventory.keys=0;
    buildRoom();
    for(let i=0;i<g.people.length;i++){
      const p=g.people[i];p.x=g.people.length===1?128:112+i*32;p.y=184;p.hp=Math.min(p.maxHp,Math.max(p.hp,2)+1);p.shield=1.5;p.dash=0;p.cooldown=0;p.fire=0;p.revive=0;p.down=false;p.ready=false;p.choice=0;p.dx=0;p.dy=-1;
    }
    const boss=g.stage===stages;
    const count=Math.min(24,(kind==='arena'?4+g.stage*2:3+g.stage)*g.people.length);
    for(let i=0;i<count;i++){
      const choices=[[32,64],[224,64],[32,144],[224,144],[80,64],[176,64],[48,192],[208,192]];
      const spot=choices[i%choices.length];
      const type=boss&&i===0?'boss':i%4===3?'mage':i%3===1?'bat':'slime';
      g.spawns.push({x:spot[0],y:spot[1],type,delay:1.2+i*0.7,warning:0.8});
    }
    g.message=boss?'GUARDIAN APPROACHES':g.stage===1?'A FIRE  B DASH':kind==='arena'?'SURVIVE THE WAVE':'CLEAR ROOM FOR KEY';g.messageTime=3;
    emit('stage-start',{stage:g.stage,kind},api);
  }
  function init(api){
    if(api.players!==1&&api.players!==2)throw Error('Expeditions support one or two humans');
    rngState=seed;
    g={phase:'play',phaseTime:0,stage:1,stageTime:0,totalTime:0,id:0,map:[],enemies:[],bullets:[],loot:[],particles:[],spawns:[],people:[],inventory:{keys:0,gems:0},xp:0,level:1,events:{},exitOpen:false,keyDropped:false,message:'',messageTime:0};
    for(let i=0;i<api.players;i++)g.people.push({id:i,x:0,y:0,r:5,hp:health,maxHp:health,power:0,haste:0,vitality:0,shield:0,fire:0,cast:0,dash:0,cooldown:0,dx:0,dy:-1,down:false,revive:0,choice:0,ready:false,steps:0});
    api.score(0);startStage(api);
  }
  function spawnEnemy(s){
    const hp=s.type==='boss'?30+g.people.length*12:s.type==='mage'?5:s.type==='bat'?2:3;
    g.enemies.push({id:++g.id,x:s.x,y:s.y,r:s.type==='boss'?6:5,type:s.type,hp,maxHp:hp,hurt:0,windup:0,attack:2+rand(),aimX:0,aimY:0});
  }
  function nearestEnemy(p){let best=null,bestD=Infinity;for(const e of g.enemies){const d=distance(p,e);if(d<bestD&&visible(p,e)){best=e;bestD=d}}return best}
  function shoot(p,api){
    if(g.bullets.length>=100||g.bullets.filter(b=>b.owner===p.id).length>=14)return;
    const target=nearestEnemy(p),vx=target?target.x-p.x:p.dx,vy=target?target.y-p.y:p.dy,l=Math.hypot(vx,vy)||1;
    g.bullets.push({x:p.x,y:p.y,vx:vx/l*155,vy:vy/l*155,owner:p.id,life:1.8,damage:2+p.power,r:2});
    p.cast=0.14;api.sfx('shoot');emit('shot',{player:p.id},api);
  }
  function hitPerson(p,api){
    if(p.down||p.shield>0||p.dash>0)return;
    p.hp--;p.shield=1.15;burst(p.x,p.y,8);api.sfx('hit');api.shake(4);emit('player-hit',{player:p.id,hp:p.hp},api);
    if(p.hp<=0){p.down=true;p.hp=0;p.revive=0;api.sfx('die');emit('player-down',{player:p.id},api)}
  }
  function enemyFire(e,api){
    const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x),count=e.type==='boss'?5:1;
    for(let i=0;i<count&&g.bullets.length<100;i++){
      const a=angle+(i-(count-1)/2)*0.22;
      g.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*(48+difficulty*24),vy:Math.sin(a)*(48+difficulty*24),owner:-1,life:3.5,damage:1,r:3});
    }
    emit('enemy-shot',{enemy:e.type},api);
  }
  function beginUpgrade(api){
    g.phase='upgrade';g.phaseTime=0;for(const p of g.people){const levels=[p.power,p.haste,p.vitality];p.choice=levels.indexOf(Math.min(...levels));p.ready=p.down}
    api.sfx('powerup');emit('upgrade-offer',{level:g.level},api);
  }
  function finishUpgrade(api){
    for(const p of g.people){
      if(p.down)continue;
      const key=['power','haste','vitality'][p.choice];p[key]=Math.min(3,p[key]+1);
      if(key==='vitality'){p.maxHp=health+p.vitality;p.hp=Math.min(p.maxHp,p.hp+2)}
      emit('upgrade',{player:p.id,upgrade:key,value:p[key]},api);
    }
    g.phase='play';g.phaseTime=0;g.level++;
  }
  function terminal(api,win){
    if(g.phase==='won'||g.phase==='lost')return;
    g.phase=win?'won':'lost';g.bullets=[];emit(win?'victory':'defeat',{stage:g.stage},api);
    if(win){api.addScore(500);api.win()}else api.gameOver();
  }
  function update(api,dt){
    dt=Math.min(1/30,Math.max(0,dt));
    if(g.phase==='won'||g.phase==='lost')return;
    g.totalTime+=dt;g.phaseTime+=dt;
    if(g.totalTime>=180){terminal(api,false);return}
    g.messageTime=Math.max(0,g.messageTime-dt);
    for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}g.particles=g.particles.filter(p=>p.life>0);
    if(g.phase==='upgrade'){
      for(const p of g.people){if(p.ready)continue;if(api.btnp('left',p.id))p.choice=(p.choice+2)%3;if(api.btnp('right',p.id))p.choice=(p.choice+1)%3;if(api.btnp('a',p.id)&&g.phaseTime>0.2){p.ready=true;api.sfx('select')}}
      if(g.people.every(p=>p.ready)||g.phaseTime>=7)finishUpgrade(api);
      return;
    }
    if(g.phase==='clear'){
      if(g.phaseTime>=2){g.stage++;startStage(api)}return;
    }
    g.stageTime+=dt;
    for(const s of g.spawns)s.delay-=dt;
    for(const s of g.spawns.filter(s=>s.delay<=0))spawnEnemy(s);
    g.spawns=g.spawns.filter(s=>s.delay>0);
    for(const p of g.people){
      p.shield=Math.max(0,p.shield-dt);p.fire=Math.max(0,p.fire-dt);p.cast=Math.max(0,p.cast-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.dash=Math.max(0,p.dash-dt);
      if(p.down)continue;
      let dx=(api.btn('right',p.id)?1:0)-(api.btn('left',p.id)?1:0),dy=(api.btn('down',p.id)?1:0)-(api.btn('up',p.id)?1:0);
      const l=Math.hypot(dx,dy);if(l){dx/=l;dy/=l;p.dx=dx;p.dy=dy;p.steps+=dt}
      if(api.btnp('b',p.id)&&p.cooldown===0){p.dash=0.18;p.cooldown=2.4;api.sfx('jump');burst(p.x,p.y,p.id?8:12,5);emit('dash',{player:p.id},api)}
      const speed=p.dash>0?200:69;
      move(p,(p.dash>0?p.dx:dx)*speed*dt,(p.dash>0?p.dy:dy)*speed*dt);
      if(p.fire===0&&(api.btn('a',p.id)||(kind==='arena'&&g.enemies.length))){shoot(p,api);p.fire=(api.btn('a',p.id)?0.38:0.9)-p.haste*0.07}
      for(const down of g.people.filter(q=>q.down)){
        if(distance(p,down)<22){down.revive+=dt;if(down.revive>=1.6){down.down=false;down.hp=Math.ceil(down.maxHp/2);down.shield=2;down.revive=0;api.sfx('powerup');emit('revive',{player:down.id,by:p.id},api)}}
      }
    }
    // Keep both human silhouettes readable when they converge on the same target.
    if(g.people.length===2&&!g.people[0].down&&!g.people[1].down){
      const a=g.people[0],b=g.people[1],d=distance(a,b);
      if(d<12){const dx=d?(b.x-a.x)/d:1,dy=d?(b.y-a.y)/d:0,push=(12-d)/2;move(a,-dx*push,-dy*push);move(b,dx*push,dy*push)}
    }
    if(g.people.every(p=>p.down)){terminal(api,false);return}
    for(const p of g.people.filter(p=>p.down))if(!g.people.some(q=>!q.down&&distance(q,p)<22))p.revive=0;
    for(const e of g.enemies){
      e.hurt=Math.max(0,e.hurt-dt);e.attack-=dt;
      const living=g.people.filter(p=>!p.down);
      if(!living.length){terminal(api,false);return}
      const target=living.reduce((a,b)=>distance(e,a)<distance(e,b)?a:b);
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){enemyFire(e,api);e.attack=e.type==='boss'?2.1:2.8}}
      else if((e.type==='mage'||e.type==='boss')&&e.attack<=0){e.windup=0.8;e.aimX=target.x;e.aimY=target.y}
      else {
        const path=pathStep(e,target),dx=path.x-e.x,dy=path.y-e.y,l=Math.hypot(dx,dy)||1;
        const speed=(e.type==='bat'?32:e.type==='boss'?12:e.type==='mage'?14:20)*(0.8+difficulty*0.65);
        if(e.type!=='mage'||distance(e,target)>80||!visible(e,target))move(e,dx/l*speed*dt,dy/l*speed*dt);
      }
      for(const p of living)if(distance(e,p)<e.r+p.r+1)hitPerson(p,api);
    }
    for(const b of g.bullets){
      b.life-=dt;
      // Two bounded substeps prevent fast bolts skipping a small actor/wall.
      for(let step=0;step<2&&b.life>0;step++){
        b.x+=b.vx*dt/2;b.y+=b.vy*dt/2;
        if(solid(b.x,b.y)){b.life=0;break}
        if(b.owner>=0){
          for(const e of g.enemies){if(e.hp<=0||distance(b,e)>e.r+b.r)continue;e.hp-=b.damage;e.hurt=0.12;b.life=0;burst(b.x,b.y,10,4);api.sfx('hit');
            if(e.hp<=0){api.addScore(e.type==='boss'?250:25,b.owner);giveLoot('xp',e.x,e.y);if(e.id%5===0)giveLoot('potion',e.x+6,e.y);burst(e.x,e.y,e.type==='slime'?11:13);emit('enemy-defeated',{player:b.owner,enemy:e.type},api)}break;
          }
        }else for(const p of g.people){if(!p.down&&distance(b,p)<p.r+b.r){hitPerson(p,api);b.life=0;break}}
      }
    }
    g.enemies=g.enemies.filter(e=>e.hp>0);g.bullets=g.bullets.filter(b=>b.life>0);
    if(g.people.every(p=>p.down)){terminal(api,false);return}
    for(const loot of g.loot){
      loot.life-=dt;
      if(loot.life<=0)continue;
      for(const p of g.people){
        if(p.down||distance(p,loot)>12)continue;
        if(loot.type==='xp'){g.xp+=10;api.addScore(5,p.id)}
        if(loot.type==='key'){g.inventory.keys++;emit('key-collected',{player:p.id,keys:g.inventory.keys},api)}
        if(loot.type==='potion')p.hp=Math.min(p.maxHp,p.hp+2);
        if(loot.type==='gem'){g.inventory.gems++;api.addScore(50,p.id)}
        loot.life=0;api.sfx('coin');emit('pickup',{player:p.id,item:loot.type},api);break;
      }
    }
    g.loot=g.loot.filter(l=>l.life>0);
    if(kind==='arena'&&g.xp>=60*g.people.length*g.level&&g.enemies.length&&g.people.some(p=>p.power+p.haste+p.vitality<9)){beginUpgrade(api);return}
    if(!g.enemies.length&&!g.spawns.length){
      if(kind==='arena'){
        api.addScore(100);emit('stage-clear',{stage:g.stage},api);
        if(g.stage===stages){terminal(api,true);return}g.phase='clear';g.phaseTime=0;g.message='WAVE CLEARED';g.messageTime=2;
      }else{
        if(!g.keyDropped){g.keyDropped=true;giveLoot('key',128,168);giveLoot('gem',40,72);g.message='TAKE KEY TO THE DOOR';g.messageTime=3;emit('room-cleared',{stage:g.stage},api)}
        const opener=g.people.find(p=>!p.down&&Math.hypot(p.x-128,p.y-64)<14);
        if(opener&&g.inventory.keys>0&&!g.exitOpen){g.inventory.keys--;g.exitOpen=true;g.map[0][7]=0;g.message='GO THROUGH NORTH DOOR';g.messageTime=3;api.sfx('powerup');emit('door-unlocked',{player:opener.id,keys:g.inventory.keys},api)}
        if(g.exitOpen&&g.people.some(p=>!p.down&&p.y<55&&Math.abs(p.x-128)<12)){
          api.addScore(100);emit('stage-clear',{stage:g.stage},api);
          if(g.stage===stages){terminal(api,true);return}g.phase='clear';g.phaseTime=0;g.message='NEXT CHAMBER';g.messageTime=2;
        }
      }
    }
  }
  function sprite(api,id,pose,x,y,flip=false){const set=assets.sets[id],frame=set.frames[pose]||set.frames.idle;api.spr(frame.pixels,Math.round(x-frame.anchor.x),Math.round(y-frame.anchor.y),flip,false)}
  function draw(api){
    api.cls(0);
    const garden=theme==='garden';
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const px=OX+x*TILE,py=OY+y*TILE;
      if(g.map[y][x]){api.rectfill(px,py,TILE,TILE,garden?3:5);api.rectfill(px+1,py+1,TILE-2,4,garden?11:6);api.line(px+1,py+15,px+15,py+15,0);api.line(px+8,py+6,px+8,py+14,garden?3:1)}
      else{api.rectfill(px,py,TILE,TILE,garden?1:1);api.pset(px+3+(x%3),py+5,5);if((x+y)%3===0)api.line(px+9,py+11,px+12,py+11,garden?3:5)}
    }
    for(const x of [24,232]){api.rectfill(x-3,45,6,9,4);api.circfill(x,43+Math.sin(api.t*8+x),3,9);api.pset(x,42,10)}
    if(kind==='dungeon'){
      api.rectfill(118,40,20,16,g.exitOpen?0:4);api.rect(118,40,20,16,9);
      if(!g.exitOpen){api.rectfill(125,45,6,6,10);api.pset(128,48,0)}else{api.line(123,50,128,45,10);api.line(128,45,133,50,10)}
    }
    for(const s of g.spawns)if(s.delay<=s.warning){api.circ(s.x,s.y,8+Math.sin(api.t*15)*3,8);api.line(s.x-4,s.y-4,s.x+4,s.y+4,9);api.line(s.x+4,s.y-4,s.x-4,s.y+4,9)}
    for(const l of g.loot){api.circfill(l.x,l.y+4,5,0);sprite(api,'loot',l.type,l.x,l.y+Math.sin(api.t*5+l.id)*2)}
    const actors=[...g.enemies.map(e=>({...e,enemy:true})),...g.people.map(p=>({...p,enemy:false}))].sort((a,b)=>a.y-b.y);
    for(const a of actors){
      api.circfill(a.x,a.y+3,a.enemy?a.r+2:7,0);
      if(a.enemy){
        if(a.windup>0){api.line(a.x,a.y,a.aimX,a.aimY,2);api.circ(a.x,a.y,a.r+4,8)}
        sprite(api,a.type,a.hurt>0?'hurt':Math.floor(api.t*6+a.id)%2?'walk1':'walk2',a.x,a.y);
        if(a.type==='boss'||a.hp<a.maxHp){api.rectfill(a.x-10,a.y-a.r-17,20,3,0);api.rectfill(a.x-10,a.y-a.r-17,20*a.hp/a.maxHp,2,8)}
      }else{
        const pose=a.down?'down':a.shield>0&&Math.floor(api.t*12)%2?'hurt':a.cast>0?'cast':Math.floor(a.steps*8)%2?'walk1':'idle';
        sprite(api,'warden'+a.id,pose,a.x,a.y,a.dx<0);
        api.text(String(a.id+1),a.x-3,a.y+7,a.id?8:12);
        if(a.down){api.rectfill(a.x-8,a.y-20,16,3,5);api.rectfill(a.x-8,a.y-20,16*a.revive/1.6,3,11)}
        if(a.dash>0)api.circ(a.x,a.y-5,12,a.id?9:6);
      }
    }
    for(const b of g.bullets){api.circfill(b.x,b.y,b.r+1,b.owner<0?8:b.owner===1?14:12);api.circfill(b.x,b.y,b.r,b.owner<0?9:7)}
    for(const p of g.particles)api.rectfill(p.x,p.y,2,2,p.color);
    api.rectfill(0,13,256,25,0);
    api.text((kind==='arena'?'WAVE ':'ROOM ')+g.stage+'/'+stages,8,14,7);
    api.text('T'+Math.ceil(Math.max(0,180-g.totalTime)),96,14,9);
    if(kind==='arena')api.text('XP '+g.xp,155,14,6);else api.text('KEY '+g.inventory.keys,166,14,10);
    for(const p of g.people){const x=8+p.id*128;api.text('P'+(p.id+1),x,26,p.id?8:12);for(let h=0;h<p.maxHp;h++)api.rectfill(x+22+h*5,27,3,5,h<p.hp?(p.id?8:12):5);api.rectfill(x+90,27,26*(1-p.cooldown/2.4),4,11)}
    {const text=g.messageTime>0?g.message:g.people.some(p=>p.down)?'STAND NEAR P2 TO REVIVE'.replace('P2','P'+(g.people.find(p=>p.down).id+1)):g.enemies.length||g.spawns.length?'ENEMIES '+(g.enemies.length+g.spawns.length):kind==='dungeon'?(g.exitOpen?'GO THROUGH NORTH DOOR':'TAKE KEY TO NORTH DOOR'):'WAVE CLEAR';api.rectfill(128-text.length*4-4,214,text.length*8+8,10,0);api.textCenter(text,215,10)}
    if(g.phase==='clear'){api.rectfill(30,97,196,33,0);api.rect(30,97,196,33,11);api.textCenter(g.message,109,11)}
    if(g.phase==='upgrade'){
      api.rectfill(12,76,232,100,0);api.rect(12,76,232,100,6);api.textCenter('CHOOSE YOUR UPGRADE',84,7);
      for(const p of g.people){const y=105+p.id*24;api.text('P'+(p.id+1),22,y,p.id?8:12);api.text(p.ready?'READY':upgrades[p.choice],55,y,p.ready?11:10);if(!p.ready){api.text('<',40,y,7);api.text('>',136,y,7)}}
      api.textCenter('LEFT/RIGHT  A CONFIRM',158,6);
    }
  }
  function inspect(){return JSON.parse(JSON.stringify({...g,kind,stages,rngState}))}
  return {init,update,draw,inspect};
}

return createExpedition('dungeon',config,{
  "schemaVersion": 1,
  "camera": "top-down",
  "coordinates": "image top-left; anchor is actor feet",
  "sets": {
    "warden0": {
      "width": 16,
      "height": 20,
      "frames": {
        "idle": {
          "pixels": [
            ".......666......",
            "......c666cc....",
            "......cccccc....",
            "...ccccccccccc..",
            "...ccccccccccc..",
            ".......444444...",
            ".......ff1ff1...",
            "....cccffffa7aa.",
            "....cccffffaaaa.",
            "....cccffffaaaa.",
            "..fffccccccc14..",
            "..fffccccccc14..",
            "..fff66ccccc14..",
            "..fff66ccccc14..",
            "....166ccccc14..",
            "....166ccccc14..",
            "....1111111114..",
            "....111...1114..",
            "....111...111...",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "walk1": {
          "pixels": [
            ".......666......",
            "......c666cc....",
            "......cccccc....",
            "...ccccccccccc..",
            "...ccccccccccc..",
            ".......444444...",
            ".......ff1ff1...",
            "....cccffffa7aa.",
            "....cccffffaaaa.",
            "....cccffffaaaa.",
            "..fffccccccc14..",
            "..fffccccccc14..",
            "..fff66ccccc14..",
            "..fff66ccccc14..",
            "....166ccccc14..",
            "....166ccccc14..",
            "....1111111114..",
            "....ccc...ccc4..",
            "....ccc...111...",
            "....ccc........."
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "walk2": {
          "pixels": [
            ".......666......",
            "......c666cc....",
            "......cccccc....",
            "...ccccccccccc..",
            "...ccccccccccc..",
            ".......444444...",
            ".......ff1ff1...",
            "....cccffffa7aa.",
            "....cccffffaaaa.",
            "....cccffffaaaa.",
            "..fffccccccc14..",
            "..fffccccccc14..",
            "..fff66ccccc14..",
            "..fff66ccccc14..",
            "....166ccccc14..",
            "....166ccccc14..",
            "....1111111114..",
            "....ccc...ccc4..",
            "....111...ccc...",
            "..........ccc..."
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "cast": {
          "pixels": [
            ".......666......",
            "......c666cc....",
            "......cccccc....",
            "...ccccccccca7aa",
            "...cccccccccaaaa",
            ".......44444aaaa",
            ".......ff1ff1.4.",
            "....cccffffff.4.",
            "....cccffffff.4.",
            "....cccffffff.4.",
            "..fffccccccc1.4.",
            "..fffccccccc1.4.",
            "..fff66ccccc1.4.",
            "..fff66ccccc1.4.",
            "....166ccccc1...",
            "....166ccccc1...",
            "....111111111...",
            "....111...111...",
            "....111...111...",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "hurt": {
          "pixels": [
            ".......666......",
            "......c666cc....",
            "......cccccc....",
            "...ccccccccccc..",
            "...ccccccccccc..",
            ".......444444...",
            ".......ff1ff1...",
            "....cccffffa7aa.",
            "....cccffffaaaa.",
            "....777777777aa.",
            "..ff7777777774..",
            "..ff7777777774..",
            "..fff66ccccc14..",
            "..fff66ccccc14..",
            "....166ccccc14..",
            "....166ccccc14..",
            "....1111111114..",
            "....111...1114..",
            "....111...111...",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "down": {
          "pixels": [
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            ".fffffcccccc....",
            ".fffffcccccc11..",
            ".fffffcccccc11..",
            "..1ccccccccc11..",
            "..111111111111..",
            "..111111111111..",
            "................",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "idle": {
          "frames": [
            "idle"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk1": {
          "frames": [
            "walk1"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk2": {
          "frames": [
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        },
        "cast": {
          "frames": [
            "cast"
          ],
          "frameMs": 120,
          "loop": true
        },
        "hurt": {
          "frames": [
            "hurt"
          ],
          "frameMs": 120,
          "loop": true
        },
        "down": {
          "frames": [
            "down"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk": {
          "frames": [
            "walk1",
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "wizard",
      "tags": [
        "arcade",
        "fantasy",
        "wizard"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    },
    "warden1": {
      "width": 16,
      "height": 20,
      "frames": {
        "idle": {
          "pixels": [
            ".......999......",
            "......899988....",
            "......888888....",
            "...88888888888..",
            "...88888888888..",
            ".......444444...",
            ".......ff1ff1...",
            "....888ffffa7aa.",
            "....888ffffaaaa.",
            "....888ffffaaaa.",
            "..fff888888814..",
            "..fff888888814..",
            "..fff998888814..",
            "..fff998888814..",
            "....1998888814..",
            "....1998888814..",
            "....1111111114..",
            "....111...1114..",
            "....111...111...",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "walk1": {
          "pixels": [
            ".......999......",
            "......899988....",
            "......888888....",
            "...88888888888..",
            "...88888888888..",
            ".......444444...",
            ".......ff1ff1...",
            "....888ffffa7aa.",
            "....888ffffaaaa.",
            "....888ffffaaaa.",
            "..fff888888814..",
            "..fff888888814..",
            "..fff998888814..",
            "..fff998888814..",
            "....1998888814..",
            "....1998888814..",
            "....1111111114..",
            "....888...8884..",
            "....888...111...",
            "....888........."
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "walk2": {
          "pixels": [
            ".......999......",
            "......899988....",
            "......888888....",
            "...88888888888..",
            "...88888888888..",
            ".......444444...",
            ".......ff1ff1...",
            "....888ffffa7aa.",
            "....888ffffaaaa.",
            "....888ffffaaaa.",
            "..fff888888814..",
            "..fff888888814..",
            "..fff998888814..",
            "..fff998888814..",
            "....1998888814..",
            "....1998888814..",
            "....1111111114..",
            "....888...8884..",
            "....111...888...",
            "..........888..."
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "cast": {
          "pixels": [
            ".......999......",
            "......899988....",
            "......888888....",
            "...888888888a7aa",
            "...888888888aaaa",
            ".......44444aaaa",
            ".......ff1ff1.4.",
            "....888ffffff.4.",
            "....888ffffff.4.",
            "....888ffffff.4.",
            "..fff88888881.4.",
            "..fff88888881.4.",
            "..fff99888881.4.",
            "..fff99888881.4.",
            "....199888881...",
            "....199888881...",
            "....111111111...",
            "....111...111...",
            "....111...111...",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "hurt": {
          "pixels": [
            ".......999......",
            "......899988....",
            "......888888....",
            "...88888888888..",
            "...88888888888..",
            ".......444444...",
            ".......ff1ff1...",
            "....888ffffa7aa.",
            "....888ffffaaaa.",
            "....777777777aa.",
            "..ff7777777774..",
            "..ff7777777774..",
            "..fff998888814..",
            "..fff998888814..",
            "....1998888814..",
            "....1998888814..",
            "....1111111114..",
            "....111...1114..",
            "....111...111...",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "down": {
          "pixels": [
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            ".fffff888888....",
            ".fffff88888811..",
            ".fffff88888811..",
            "..188888888811..",
            "..111111111111..",
            "..111111111111..",
            "................",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "idle": {
          "frames": [
            "idle"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk1": {
          "frames": [
            "walk1"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk2": {
          "frames": [
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        },
        "cast": {
          "frames": [
            "cast"
          ],
          "frameMs": 120,
          "loop": true
        },
        "hurt": {
          "frames": [
            "hurt"
          ],
          "frameMs": 120,
          "loop": true
        },
        "down": {
          "frames": [
            "down"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk": {
          "frames": [
            "walk1",
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "wizard",
      "tags": [
        "arcade",
        "fantasy",
        "wizard"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    },
    "slime": {
      "width": 16,
      "height": 14,
      "frames": {
        "idle": {
          "pixels": [
            "................",
            "................",
            "....bbbbbbbb....",
            "...3b777bbbb3...",
            "...3b777bbbb3...",
            "...3bbbbbbbb3...",
            "...bbbbbbbbbb...",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bbbbbbbbbb33.",
            ".33333333333333.",
            "..333333333333..",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 8
            }
          ],
          "hitboxes": []
        },
        "walk1": {
          "pixels": [
            "................",
            "................",
            "....bbbbbbbb....",
            "...3b777bbbb3...",
            "...3b777bbbb3...",
            "...3bbbbbbbb3...",
            "...bbbbbbbbbb...",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bbbbbbbbbb33.",
            ".33333333333333.",
            "...333333333333.",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 8
            }
          ],
          "hitboxes": []
        },
        "walk2": {
          "pixels": [
            "................",
            "................",
            "....bbbbbbbb....",
            "...3b777bbbb3...",
            "...3b777bbbb3...",
            "...3bbbbbbbb3...",
            "...bbbbbbbbbb...",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bbbbbbbbbb33.",
            ".33333333333333.",
            "..333333333333..",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 8
            }
          ],
          "hitboxes": []
        },
        "hurt": {
          "pixels": [
            "................",
            "................",
            "....bbbbbbbb....",
            "...3b777bbbb3...",
            "...3b777bbbb3...",
            "...7777777777...",
            "...7777777777...",
            ".33777777777733.",
            ".33bb11bbb11b33.",
            ".33bb11bbb11b33.",
            ".33bbbbbbbbbb33.",
            ".33333333333333.",
            "...333333333333.",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 8
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "idle": {
          "frames": [
            "idle"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk1": {
          "frames": [
            "walk1"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk2": {
          "frames": [
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        },
        "hurt": {
          "frames": [
            "hurt"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk": {
          "frames": [
            "walk1",
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "slime",
      "tags": [
        "arcade",
        "fantasy",
        "slime"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    },
    "bat": {
      "width": 20,
      "height": 14,
      "frames": {
        "idle": {
          "pixels": [
            "....................",
            ".......dd...dd......",
            ".......dd...dd......",
            "......222ddd222.....",
            "....22222ddd22222...",
            "..2222222ddd2222222.",
            ".2222222aaddaa222222",
            ".2222222aaddaa222222",
            ".222222ddddddd222222",
            ".2222..ddddddd..2222",
            ".22.....22222.....22",
            "........22222.......",
            "....................",
            "...................."
          ],
          "anchor": {
            "x": 10,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 14,
              "h": 8
            }
          ],
          "hitboxes": []
        },
        "walk1": {
          "pixels": [
            "....................",
            ".......dd...dd......",
            ".......dd...dd......",
            ".22....ddddddd....22",
            ".2222..ddddddd..2222",
            ".222222ddddddd222222",
            ".2222222aaddaa222222",
            ".2222222aaddaa222222",
            "..2222222ddd2222222.",
            "....22222ddd22222...",
            "......222222222.....",
            "........22222.......",
            "....................",
            "...................."
          ],
          "anchor": {
            "x": 10,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 14,
              "h": 8
            }
          ],
          "hitboxes": []
        },
        "walk2": {
          "pixels": [
            "....................",
            ".......dd...dd......",
            ".......dd...dd......",
            "......222ddd222.....",
            "....22222ddd22222...",
            "..2222222ddd2222222.",
            ".2222222aaddaa222222",
            ".2222222aaddaa222222",
            ".222222ddddddd222222",
            ".2222..ddddddd..2222",
            ".22.....22222.....22",
            "........22222.......",
            "....................",
            "...................."
          ],
          "anchor": {
            "x": 10,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 14,
              "h": 8
            }
          ],
          "hitboxes": []
        },
        "hurt": {
          "pixels": [
            "....................",
            ".......dd...dd......",
            ".......dd...dd......",
            ".22....ddddddd....22",
            ".2222..ddddddd..2222",
            ".2222227777777222222",
            ".2222227777777222222",
            ".2222227777777222222",
            "..2222222ddd2222222.",
            "....22222ddd22222...",
            "......222222222.....",
            "........22222.......",
            "....................",
            "...................."
          ],
          "anchor": {
            "x": 10,
            "y": 11
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 14,
              "h": 8
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "idle": {
          "frames": [
            "idle"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk1": {
          "frames": [
            "walk1"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk2": {
          "frames": [
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        },
        "hurt": {
          "frames": [
            "hurt"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk": {
          "frames": [
            "walk1",
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "bat",
      "tags": [
        "arcade",
        "fantasy",
        "bat"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    },
    "mage": {
      "width": 16,
      "height": 20,
      "frames": {
        "idle": {
          "pixels": [
            "................",
            "........ddd.....",
            "........ddd.....",
            ".....222ddd22...",
            ".....222ddd22...",
            ".....22222222...",
            ".....2222222888.",
            ".....2111111888.",
            ".....2191191888.",
            ".....2111111.4..",
            ".....2111111.4..",
            ".....2ddddd2.4..",
            "...222ddddd224..",
            "...222ddddd224..",
            "...222ddddd224..",
            "...22222222224..",
            "...22222222224..",
            "...22222222224..",
            "................",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "walk1": {
          "pixels": [
            "................",
            "........ddd.....",
            "........ddd.....",
            ".....222ddd22...",
            ".....222ddd22...",
            ".....22222222...",
            ".....22222222...",
            ".....2111111888.",
            ".....2191191888.",
            ".....2111111888.",
            ".....2111111.4..",
            ".....2ddddd2.4..",
            "...222ddddd224..",
            "...222ddddd224..",
            "...222ddddd224..",
            "...22222222224..",
            "...22222222224..",
            "...22222222224..",
            "................",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "walk2": {
          "pixels": [
            "................",
            "........ddd.....",
            "........ddd.....",
            ".....222ddd22...",
            ".....222ddd22...",
            ".....22222222...",
            ".....2222222888.",
            ".....2111111888.",
            ".....2191191888.",
            ".....2111111.4..",
            ".....2111111.4..",
            ".....2ddddd2.4..",
            "...222ddddd224..",
            "...222ddddd224..",
            "...222ddddd224..",
            "...22222222224..",
            "...22222222224..",
            "...22222222224..",
            "................",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        },
        "hurt": {
          "pixels": [
            "................",
            "........ddd.....",
            "........ddd.....",
            ".....222ddd22...",
            ".....222ddd22...",
            ".....22222222...",
            ".....22222222...",
            ".....2111111888.",
            ".....2191191888.",
            ".....2111111888.",
            ".....2111111.4..",
            ".....2ddddd2.4..",
            "...22777777774..",
            "...22777777774..",
            "...22777777774..",
            "...22222222224..",
            "...22222222224..",
            "...22222222224..",
            "................",
            "................"
          ],
          "anchor": {
            "x": 8,
            "y": 17
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 10,
              "h": 14
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "idle": {
          "frames": [
            "idle"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk1": {
          "frames": [
            "walk1"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk2": {
          "frames": [
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        },
        "hurt": {
          "frames": [
            "hurt"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk": {
          "frames": [
            "walk1",
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "mage",
      "tags": [
        "arcade",
        "fantasy",
        "mage"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    },
    "boss": {
      "width": 28,
      "height": 28,
      "frames": {
        "idle": {
          "pixels": [
            "......999..........999......",
            "...444999..........999444...",
            "...444999..........999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4444888888888888884444...",
            "...4442222222222222222444...",
            "...44422aaaa22222aaaa2444...",
            "....2222aaaa22222aaaa222....",
            "....22222222222222222222....",
            "....22222222222222222222....",
            "....22288888888888888222....",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "..8888888847744447788288888.",
            "..8888888847744447788288888.",
            "..8888888844444444488288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "....22444444222244444422....",
            "......444444....444444......",
            "......444444....444444......",
            "......444444....444444......",
            "......444444....444444......",
            "............................"
          ],
          "anchor": {
            "x": 14,
            "y": 25
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 22,
              "h": 22
            }
          ],
          "hitboxes": []
        },
        "walk1": {
          "pixels": [
            "......999..........999......",
            "...444999..........999444...",
            "...444999..........999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4444888888888888884444...",
            "...4442222222222222222444...",
            "...44422aaaa22222aaaa2444...",
            "....2222aaaa22222aaaa222....",
            "....22222222222222222222....",
            "....22222222222222222222....",
            "....22288888888888888222....",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "..8888888847744447788288888.",
            "..8888888847744447788288888.",
            "..8888888844444444488288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "....22244444422444444222....",
            ".......444444..444444.......",
            ".......444444..444444.......",
            ".......444444..444444.......",
            ".......444444..444444.......",
            "............................"
          ],
          "anchor": {
            "x": 14,
            "y": 25
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 22,
              "h": 22
            }
          ],
          "hitboxes": []
        },
        "walk2": {
          "pixels": [
            "......999..........999......",
            "...444999..........999444...",
            "...444999..........999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4444888888888888884444...",
            "...4442222222222222222444...",
            "...44422aaaa22222aaaa2444...",
            "....2222aaaa22222aaaa222....",
            "....22222222222222222222....",
            "....22222222222222222222....",
            "....22288888888888888222....",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "..8888888847744447788288888.",
            "..8888888847744447788288888.",
            "..8888888844444444488288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "....22444444222244444422....",
            "......444444....444444......",
            "......444444....444444......",
            "......444444....444444......",
            "......444444....444444......",
            "............................"
          ],
          "anchor": {
            "x": 14,
            "y": 25
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 22,
              "h": 22
            }
          ],
          "hitboxes": []
        },
        "hurt": {
          "pixels": [
            "......999..........999......",
            "...444999..........999444...",
            "...444999..........999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4449998888888888999444...",
            "...4444888888888888884444...",
            "...4442222222222222222444...",
            "...44422aaaa22222aaaa2444...",
            "....2222aaaa22222aaaa222....",
            "....22222222222222222222....",
            "....22222222222222222222....",
            "....22288888888888888222....",
            "..8888777777777777777778888.",
            "..8888777777777777777778888.",
            "..8888777777777777777778888.",
            "..8888888847744447788288888.",
            "..8888888847744447788288888.",
            "..8888888844444444488288888.",
            "..8888888888888888888288888.",
            "..8888888888888888888288888.",
            "....22244444422444444222....",
            ".......444444..444444.......",
            ".......444444..444444.......",
            ".......444444..444444.......",
            ".......444444..444444.......",
            "............................"
          ],
          "anchor": {
            "x": 14,
            "y": 25
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 22,
              "h": 22
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "idle": {
          "frames": [
            "idle"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk1": {
          "frames": [
            "walk1"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk2": {
          "frames": [
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        },
        "hurt": {
          "frames": [
            "hurt"
          ],
          "frameMs": 120,
          "loop": true
        },
        "walk": {
          "frames": [
            "walk1",
            "walk2"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "horned guardian",
      "tags": [
        "arcade",
        "fantasy",
        "boss"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    },
    "loot": {
      "width": 12,
      "height": 12,
      "frames": {
        "xp": {
          "pixels": [
            "............",
            "....cccc....",
            "....777c....",
            "..66777666..",
            "..66777666..",
            "..66777666..",
            "..66777666..",
            "..66666666..",
            "....cccc....",
            "....cccc....",
            "............",
            "............"
          ],
          "anchor": {
            "x": 6,
            "y": 9
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 6,
              "h": 6
            }
          ],
          "hitboxes": []
        },
        "key": {
          "pixels": [
            "............",
            "............",
            ".aaaaaa.....",
            ".aaaaaa.....",
            ".aa11aa.....",
            ".aa11a99999.",
            ".aaaaa99999.",
            ".aaaaaa..99.",
            ".........99.",
            ".........99.",
            "............",
            "............"
          ],
          "anchor": {
            "x": 6,
            "y": 9
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 6,
              "h": 6
            }
          ],
          "hitboxes": []
        },
        "potion": {
          "pixels": [
            "............",
            "....4444....",
            "....4444....",
            "....4444....",
            "...777777...",
            "...777777...",
            "...788887...",
            "...788887...",
            "...788887...",
            "...788887...",
            "...777777...",
            "............"
          ],
          "anchor": {
            "x": 6,
            "y": 9
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 6,
              "h": 6
            }
          ],
          "hitboxes": []
        },
        "gem": {
          "pixels": [
            "............",
            "....dddd....",
            "....777d....",
            "..dd777ddd..",
            "..dd777ddd..",
            "..dd777ddd..",
            "..dd777ddd..",
            "..dddddddd..",
            "..dddddddd..",
            "....dddd....",
            "....dddd....",
            "............"
          ],
          "anchor": {
            "x": 6,
            "y": 9
          },
          "durationMs": 120,
          "hurtboxes": [
            {
              "x": 3,
              "y": 4,
              "w": 6,
              "h": 6
            }
          ],
          "hitboxes": []
        }
      },
      "animations": {
        "xp": {
          "frames": [
            "xp"
          ],
          "frameMs": 120,
          "loop": true
        },
        "key": {
          "frames": [
            "key"
          ],
          "frameMs": 120,
          "loop": true
        },
        "potion": {
          "frames": [
            "potion"
          ],
          "frameMs": 120,
          "loop": true
        },
        "gem": {
          "frames": [
            "gem"
          ],
          "frameMs": 120,
          "loop": true
        }
      },
      "subject": "loot",
      "tags": [
        "arcade",
        "fantasy",
        "loot"
      ],
      "unsupportedStates": [
        "jump",
        "climb",
        "melee",
        "carry",
        "directional-facing"
      ]
    }
  }
});
}
