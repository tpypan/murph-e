(config = {}) => {
  const ART = __CLIMBER_ART__;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const layouts = [
    [[202,0.025],[168,-0.025],[134,0.025],[100,-0.025],[65,0.025]],
    [[202,0.035],[168,-0.035],[133,0.03],[99,-0.035],[65,0.025]],
    [[204,0.018],[168,-0.032],[133,0.036],[99,-0.023],[65,0.025]],
  ];
  const ladderLayouts = [
    [[204,70],[40,171],[204,111],[151,77]],
    [[181,61],[58,197],[184,96],[139,67]],
    [[212,83],[45,161],[193,104],[147,64]],
  ];
  let floors=[],ladders=[],people=[],barrels=[],fires=[],particles=[],popups=[];
  let players=1,stage=0,stageCount=3,lives=3,limit=100,difficulty=0,phase='playing',phaseTime=0;
  let clock=0,frame=0,spawnClock=1.8,throwTime=0,nextId=1,rescuer=null,terminal=false;
  let stageBonus=5000,totalTime=0,goal={x:226,floor:4},stageSeed=0,avatarSets=[],targetSet=null,artSets={};
  const stats={spawned:0,ladderDrops:0,edgeDrops:0,jumps:0,jumpAwards:0,hits:0,rescues:0};
  const GRAVITY=520,JUMP_SPEED=170,SPEED=72,CLIMB_SPEED=43;
  function floorY(f,x){const p=floors[f];return p.y+(x-128)*p.slope;}
  function addScore(api,p,n){p.score+=n;api.score(p.score,p.id);}
  function say(text,x,y,color=10){popups.push({text,x,y,life:0.9,color});}
  function colorConfig(p,key,fallback){const c=(config.avatars||[])[p]||{};return Number.isFinite(c[key])?clamp(c[key]|0,0,15):fallback;}
  function setupStage(api,first=false){
    const index=stage%layouts.length;
    floors=layouts[index].map(([y,slope],id)=>({id,y,slope,left:12,right:244,dir:slope>0?1:-1}));
    ladders=[];
    for(let f=0;f<4;f++)for(let n=0;n<2;n++)ladders.push({id:ladders.length,x:ladderLayouts[index][f][n],bottom:f,top:f+1,main:n===0,
      // Broken optional shortcuts are visible but never the only route.
      broken:stage>=1&&n===1&&(f+stage)%3===0});
    barrels=[];fires=[];particles=[];popups=[];clock=0;spawnClock=1.8;throwTime=0;
    phase='playing';phaseTime=0;stageBonus=Math.max(3000,Math.floor((Number(config.bonus)||5000)/100)*100);rescuer=null;
    goal={x:clamp(Number(config.goalX)||226,184,234),floor:4};
    people=Array.from({length:players},(_,id)=>{
      const old=people[id];
      return {id,x:32+id*24,y:floorY(0,32+id*24),vx:0,vy:0,floor:0,checkpoint:0,grounded:true,
        ladder:null,climbFrom:null,face:1,walk:0,jumpBuffer:0,coyote:0,prevA:false,
        jumpFloor:0,jumpStart:0,invulnerable:first?1:1.4,hurt:0,dead:0,
        lives:first?lives:Math.max(1,old?.lives||0),score:first?0:old?.score||0,
        reached:[true,false,false,false,false],pose:'idle'};
    });
    if(first)for(const p of people)api.score(0,p.id);
    stageSeed=((stage+1)*69069+((Number(config.seed)||7)|0))>>>0;
  }
  function validateSet(set,required,role){
    if(!set)return null;
    const avatar=role==='avatar',limit=avatar||role==='fire'?24:role==='barrel'?16:48;
    if(!Number.isInteger(set.width)||!Number.isInteger(set.height)||set.width<1||set.height<1||set.width>limit||set.height>limit)
      throw new Error('Climber '+role+' sprite canvas must be 1-'+limit+' pixels per side');
    for(const pose of required){
      const clip=set.animations?.[pose];
      if(!clip||!Array.isArray(clip.frames)||clip.frames.length<1||!Number.isFinite(clip.frameMs)||clip.frameMs<16)
        throw new Error('Climber sprite missing animation '+pose);
      for(const key of clip.frames){
        const f=set.frames?.[key];
        if(!f||!Array.isArray(f.pixels)||f.pixels.length!==set.height||f.pixels.some(row=>typeof row!=='string'||row.length!==set.width||!/^[0-9a-f.]+$/i.test(row))||!f.anchor||!Number.isInteger(f.anchor.x)||!Number.isInteger(f.anchor.y)||f.anchor.x<0||f.anchor.x>set.width||f.anchor.y<0||f.anchor.y>set.height)
          throw new Error('Invalid climber sprite frame '+key);
        if(f.palette!==undefined&&(!Array.isArray(f.palette)||f.palette.length<1||f.palette.length>16||f.palette.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))||f.pixels.some(row=>[...row].some(ch=>ch!=='.'&&Number.parseInt(ch,16)>=f.palette.length))))
          throw new Error('Invalid climber sprite palette '+key);
        if(avatar){
          // Fixed girders leave about 20px of standing clearance at their tightest point.
          // Art is a visual skin of the 8x16 controller, never an implicit physics resize.
          if(f.anchor.x!==Math.floor(set.width/2)||f.anchor.y!==set.height)
            throw new Error('Climber avatar '+key+' must use the same bottom-center foot anchor in every frame');
          for(let y=0;y<set.height;y++)for(let x=0;x<set.width;x++){
            if(f.pixels[y][x]==='.')continue;
            const dx=x-f.anchor.x,dy=y-f.anchor.y;
            if(dx< -10||dx>9||dy< -20||dy> -1)
              throw new Error('Climber avatar '+key+' must fit 20px high and 20px wide above its foot anchor; larger characters need a different level layout');
          }
        }
      }
    }
    return set;
  }
  function init(api){
    players=(api.players??config.players)===2?2:1;stage=0;stageCount=clamp((Number(config.stages)||3)|0,1,6);
    lives=clamp((Number(config.lives)||3)|0,1,6);limit=clamp(Number(config.timeLimit)||100,30,240);difficulty=clamp(Number(config.difficulty)||0,0,1);
    terminal=false;totalTime=0;frame=0;nextId=1;people=[];
    avatarSets=Array.from({length:players},(_,p)=>validateSet(config.avatars?.[p]?.sprites,['idle','walk','climb','jump','hurt','death'],'avatar'));
    targetSet=validateSet(config.targetSprites,['wait','rescued'],'target');
    artSets={gorilla:validateSet(config.art?.gorilla,['idle','throw'],'gorilla'),barrel:validateSet(config.art?.barrel,['roll','fall'],'barrel'),fire:validateSet(config.art?.fire,['burn','explode'],'fire')};
    for(const k in stats)stats[k]=0;setupStage(api,true);
  }
  function noise(){stageSeed=(Math.imul(stageSeed,1664525)+1013904223)>>>0;return stageSeed/4294967296;}
  function damage(p,api,cause){
    if(p.invulnerable>0||p.dead>0||p.lives<=0||phase!=='playing')return;
    p.lives--;p.dead=1.0;p.hurt=0.3;p.invulnerable=2.8;p.vy=-80;p.vx=-p.face*22;p.grounded=false;p.ladder=null;p.pose='hurt';
    stats.hits++;api.sfx(p.lives>0?'hit':'die');say('-1 LIFE',p.x-22,p.y-22,8);
    if(typeof config.onHit==='function'){config.onHit({player:p.id,cause,lives:p.lives},api);p.score=api.getScore(p.id);}
  }
  function respawn(p){
    p.x=clamp(p.checkpoint===0?32+p.id*24:(ladderLayouts[stage%3][p.checkpoint-1][0]+22),22,228);
    p.floor=p.checkpoint;p.y=floorY(p.floor,p.x);p.vx=p.vy=0;p.dead=0;p.hurt=0;p.invulnerable=2;
    p.grounded=true;p.ladder=null;p.jumpBuffer=0;p.coyote=0;p.pose='idle';
  }
  function nearestLadder(p,direction){
    return ladders.find(l=>!l.broken&&Math.abs(p.x-l.x)<=5&&
      ((direction<0&&p.grounded&&p.floor===l.bottom)||(direction>0&&p.grounded&&p.floor===l.top)));
  }
  function reachFloor(p,f,api){
    p.floor=f;p.grounded=true;p.y=floorY(f,p.x);p.vy=0;p.ladder=null;
    p.checkpoint=Math.max(p.checkpoint,f);
    if(!p.reached[f]){p.reached[f]=true;addScore(api,p,100);say('+100',p.x-12,p.y-21);api.sfx('coin');
      if(typeof config.onFloor==='function'){config.onFloor({player:p.id,floor:f,stage:stage+1},api);p.score=api.getScore(p.id);}}
  }
  function movePlayer(p,dt,api){
    p.invulnerable=Math.max(0,p.invulnerable-dt);p.hurt=Math.max(0,p.hurt-dt);
    if(p.lives<=0&&p.dead<=0){p.pose='death';return;}
    if(p.dead>0){p.dead=Math.max(0,p.dead-dt);p.pose=p.dead>0.5?'hurt':'death';p.vy=Math.min(150,p.vy+GRAVITY*dt);p.y=Math.min(219,p.y+p.vy*dt);p.x=clamp(p.x+p.vx*dt,18,238);
      if(p.dead===0&&p.lives>0)respawn(p);return;}
    const left=api.btn('left',p.id),right=api.btn('right',p.id),up=api.btn('up',p.id),down=api.btn('down',p.id),a=api.btn('a',p.id);
    if(a&&!p.prevA)p.jumpBuffer=0.1;p.prevA=a;p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
    const horizontal=(right?1:0)-(left?1:0),vertical=(down?1:0)-(up?1:0);
    if(horizontal)p.face=horizontal;
    if(p.grounded)p.coyote=0.09;else p.coyote=Math.max(0,p.coyote-dt);
    if(p.ladder===null&&vertical){const l=nearestLadder(p,vertical);if(l){p.ladder=l.id;p.climbFrom=p.floor;p.grounded=false;p.vy=0;p.x=l.x;}}
    if(p.jumpBuffer>0&&(p.grounded||p.coyote>0||p.ladder!==null)){
      p.jumpFloor=p.floor;p.jumpStart=p.y;p.vy=-JUMP_SPEED;p.jumpBuffer=0;p.coyote=0;p.grounded=false;p.ladder=null;stats.jumps++;api.sfx('jump');
    }
    if(p.ladder!==null){
      const l=ladders[p.ladder];p.x=l.x;p.y+=vertical*CLIMB_SPEED*dt;p.vx=p.vy=0;
      p.pose='climb';if(vertical)p.walk+=dt;
      if(p.y<=floorY(l.top,l.x))reachFloor(p,l.top,api);
      else if(p.y>=floorY(l.bottom,l.x))reachFloor(p,l.bottom,api);
      return;
    }
    p.vx=horizontal*SPEED;p.x=clamp(p.x+p.vx*dt,18,238);
    if(p.grounded){p.y=floorY(p.floor,p.x);p.pose=horizontal?'walk':'idle';}
    else{
      const oldY=p.y;p.vy=Math.min(235,p.vy+GRAVITY*dt);
      if(!a&&p.vy<-65)p.vy=-65;
      p.y+=p.vy*dt;p.pose='jump';
      if(p.vy>=0){
        for(let f=floors.length-1;f>=0;f--){const y=floorY(f,p.x);if(oldY<=y+0.01&&p.y>=y&&p.x>=floors[f].left&&p.x<=floors[f].right){reachFloor(p,f,api);break;}}
      }
      if(p.y>220)damage(p,api,'fall');
    }
    if(horizontal||!p.grounded)p.walk+=dt;
  }
  function spawnBarrel(){
    barrels.push({id:nextId++,x:65,y:floorY(4,65)-6,floor:4,dir:1,mode:'roll',vy:0,age:0,
      speed:clamp(37+stage*7+difficulty*15,28,85),jumped:0,lastLadder:-1,oldX:65,oldY:floorY(4,65)-6});
    stats.spawned++;
  }
  function dropBarrel(b,kind){
    if(b.floor<=0){
      b.remove=true;particles.push({x:b.x,y:b.y,age:0,life:0.3});
      if(stage>0&&fires.length<2)fires.push({id:nextId++,x:224,y:floorY(0,224),dir:-1,speed:19+stage*3,jumped:0});return;
    }
    b.mode='fall';b.vy=0;b.target=b.floor-1;b.x=clamp(b.x,17,239);
    if(kind==='ladder')stats.ladderDrops++;else stats.edgeDrops++;
  }
  function updateBarrels(dt,api){
    const cadence=Math.max(1.35,2.75-stage*0.4-difficulty*0.35);
    spawnClock-=dt;throwTime=Math.max(0,throwTime-dt);
    if(spawnClock<0.5&&throwTime===0)throwTime=0.5;
    if(spawnClock<=0){if(barrels.length<15){spawnBarrel();api.sfx('select');}spawnClock=cadence;throwTime=0;}
    for(const b of barrels){
      b.age+=dt;b.oldX=b.x;b.oldY=b.y;
      if(b.mode==='fall'){
        b.vy=Math.min(200,b.vy+300*dt);b.y+=b.vy*dt;
        const target=floorY(b.target,b.x)-6;
        if(b.y>=target){b.y=target;b.floor=b.target;b.mode='roll';b.dir=floors[b.floor].dir;b.vy=0;b.lastLadder=-1;}
      }else{
        b.x+=b.dir*b.speed*dt;b.y=floorY(b.floor,b.x)-6;
        const l=ladders.find(l=>l.top===b.floor&&!l.broken&&Math.abs(b.x-l.x)<2&&b.lastLadder!==l.id);
        if(l){b.lastLadder=l.id;if(noise()<0.20+stage*0.10){b.x=l.x;dropBarrel(b,'ladder');}}
        if(b.mode==='roll'&&(b.x>242||b.x<14))dropBarrel(b,'edge');
      }
      for(const p of people){
        if(p.lives<=0||p.dead>0)continue;
        const dx=Math.abs(p.x-b.x),overlap=dx<8&&p.y>b.y-5&&p.y-16<b.y+4;
        if(overlap)damage(p,api,'barrel');
        const mask=1<<p.id;
        if(!p.grounded&&p.ladder===null&&p.dead===0&&p.jumpFloor===b.floor&&dx<7&&p.y<=b.y-5&&p.y>b.y-32&&!(b.jumped&mask)){
          b.jumped|=mask;stats.jumpAwards++;addScore(api,p,100);say('+100',p.x-12,p.y-18);api.sfx('coin');
          if(typeof config.onJumpOver==='function'){config.onJumpOver({player:p.id,hazard:b.id,stage:stage+1},api);p.score=api.getScore(p.id);}
        }
      }
    }
    barrels=barrels.filter(b=>!b.remove&&b.age<45);
    for(const f of fires){
      f.x+=f.dir*f.speed*dt;if(f.x<24){f.x=24;f.dir=1;}if(f.x>229){f.x=229;f.dir=-1;}f.y=floorY(0,f.x);
      for(const p of people)if(p.floor===0&&Math.abs(p.x-f.x)<8&&p.y>f.y-8)damage(p,api,'fire');
    }
  }
  function rescue(p,api){
    if(phase!=='playing')return;phase='rescue';phaseTime=1.3;rescuer=p.id;stats.rescues++;api.sfx('powerup');
    const award=1000+Math.floor(Math.max(0,stageBonus-clock*30)/100)*100;
    for(const person of people)addScore(api,person,award);
    say('RESCUED!',179,42,11);
    if(typeof config.onRescue==='function'){config.onRescue({player:p.id,stage:stage+1,bonus:award},api);for(const person of people)person.score=api.getScore(person.id);}
  }
  function update(api,dt){
    dt=clamp(dt||1/60,1/240,0.05);frame++;if(terminal)return;
    for(const e of popups){e.life-=dt;e.y-=dt*10;}popups=popups.filter(e=>e.life>0);
    for(const e of particles)e.age+=dt;particles=particles.filter(e=>e.age<e.life);
    if(phase==='rescue'){
      phaseTime-=dt;if(phaseTime<=0){stage++;if(stage>=stageCount){terminal=true;phase='won';api.win();}else setupStage(api);}
      return;
    }
    clock+=dt;totalTime+=dt;
    for(const p of people)movePlayer(p,dt,api);
    updateBarrels(dt,api);
    for(const p of people)if(p.lives>0&&p.dead<=0&&p.grounded&&p.floor===goal.floor&&Math.abs(p.x-goal.x)<12&&(!config.canRescue||config.canRescue({player:p.id,stage:stage+1},api)!==false))rescue(p,api);
    if(phase==='playing'&&people.every(p=>p.lives<=0&&p.dead<=0)){terminal=true;phase='lost';api.gameOver();}
    if(clock>=limit&&phase==='playing'){
      for(const p of people)if(p.lives>0){p.invulnerable=0;damage(p,api,'timeout');}
      // The clock restarts after a life penalty; finite lives still bound a no-input run.
      clock=0;say('TIME UP!',96,119,8);
    }
  }
  function frameFor(set,animation,time){const clip=set.animations[animation];return set.frames[clip.frames[(clip.loop?Math.floor(time*1000/clip.frameMs)%clip.frames.length:Math.min(clip.frames.length-1,Math.floor(time*1000/clip.frameMs)))]];}
  function sprite(api,setName,animation,x,y,time,flip=false,recolor={},override=null){
    const set=override||artSets[setName]||ART.sets[setName],f=frameFor(set,animation,time),ox=Math.round(x-f.anchor.x),oy=Math.round(y-f.anchor.y);
    // Source palettes define their own indexes; default clothing recolors must not replace them.
    if(f.palette){api.spr(f.pixels,ox,oy,flip,false,f.palette);return;}
    for(let yy=0;yy<set.height;yy++)for(let xx=0;xx<set.width;xx++){
      const ch=f.pixels[yy][xx];if(ch==='.')continue;const color=Object.hasOwn(recolor,ch)?recolor[ch]:Number.parseInt(ch,16);
      api.pset(ox+(flip?set.width-1-xx:xx),oy+yy,color);
    }
  }
  function draw(api){
    api.cls(0);
    // Construction silhouettes stay dark, preserving hazard silhouettes and clear empty routes.
    for(let x=28;x<256;x+=64){api.rectfill(x,30,3,177,1);api.line(x,71,x+60,131,1);api.line(x+60,131,x,191,1);}
    api.rectfill(0,12,256,12,1);api.text('STAGE '+(stage+1),4,14,7);api.text('BONUS '+Math.max(0,Math.floor((stageBonus-clock*30)/100)*100),115,14,10);
    for(const l of ladders){
      const top=floorY(l.top,l.x),bottom=floorY(l.bottom,l.x),middle=(top+bottom)/2;
      const col=l.broken?5:9;
      api.line(l.x-4,top,l.x-4,l.broken?middle-3:bottom,col);api.line(l.x+4,top,l.x+4,l.broken?middle-3:bottom,col);
      if(l.broken){api.line(l.x-4,middle+6,l.x-4,bottom,col);api.line(l.x+4,middle+6,l.x+4,bottom,col);}
      for(let y=top+4;y<bottom;y+=5){if(l.broken&&y>middle-3&&y<middle+6)continue;api.line(l.x-3,y,l.x+3,y,col);}
    }
    for(const f of floors){
      // Sloped metal girders, repeating triangular trusses and visible rivets.
      const girder=Number.isFinite(config.girderColor)?clamp(config.girderColor|0,0,15):8;
      for(let x=f.left;x<=f.right;x++){
        const y=floorY(f.id,x);api.line(x,y,x,y+7,girder);api.pset(x,y,14);api.pset(x,y+7,2);
      }
      for(let x=f.left+3;x<f.right-8;x+=12){const y=floorY(f.id,x);api.line(x,y+2,x+4,y+5,0);api.line(x+4,y+5,x+8,y+2,0);api.pset(x+9,y+3,7);}
    }
    // Barrel supply, throw telegraph, crane cage and the visibly waiting rescue target.
    for(let n=0;n<3;n++)sprite(api,'barrel','roll',18+n*10,39,0);
    const gy=floorY(4,39);
    sprite(api,'gorilla',throwTime>0?'throw':'idle',39,gy,throwTime>0?0.5-throwTime:frame/60);
    if(config.cage!==false){api.rectfill(goal.x-12,28,25,3,6);api.line(goal.x,24,goal.x,28,6);}
    const rescueY=floorY(4,goal.x);
    if(config.cage!==false&&phase!=='rescue'&&phase!=='won'){api.line(goal.x-11,31,goal.x-11,rescueY,5);api.line(goal.x+11,31,goal.x+11,rescueY,5);api.line(goal.x-11,43,goal.x+11,43,5);}
    sprite(api,'cat',phase==='rescue'||phase==='won'?'rescued':'wait',goal.x,rescueY-1,frame/60,false,{},targetSet);
    if(frame%100<64&&phase==='playing')api.text('HELP',goal.x-15,32,10);
    // The oil drum is the clear destination for barrels leaving the bottom girder.
    api.rectfill(232,199,17,20,1);api.rect(232,199,17,20,12);api.line(231,202,250,202,12);api.text('O',237,206,7);
    sprite(api,'fire','burn',240,200,frame/60);
    for(const b of barrels)sprite(api,'barrel',b.mode==='fall'?'fall':'roll',b.x,b.y,b.age,b.dir<0);
    for(const f of fires)sprite(api,'fire','burn',f.x,f.y,frame/60+f.id);
    for(const e of particles)sprite(api,'fire','explode',e.x,e.y,e.age);
    for(const p of people){
      if(p.lives<=0&&p.dead<=0)continue;
      if(p.invulnerable>0&&p.dead<=0&&frame%8<3)continue;
      const pose=p.pose==='death'?'death':p.pose==='hurt'?'hurt':p.pose==='climb'?'climb':p.pose==='jump'?'jump':p.pose==='walk'?'walk':'idle';
      sprite(api,'worker',pose,p.x,p.y,pose==='jump'?(p.vy<0?0:0.2):p.walk+(pose==='idle'?frame/60:0),p.face<0,{'c':colorConfig(p.id,'overalls',p.id===0?12:8),'a':colorConfig(p.id,'helmet',p.id===0?10:7)},avatarSets[p.id]);
      if(players===2){const nearby=people.some(other=>other.id!==p.id&&Math.abs(other.x-p.x)<10&&Math.abs(other.y-p.y)<18);api.text(String(p.id+1),p.x-3+(nearby?(p.id===0?-6:6):0),p.y-28,p.id===0?12:8);}
    }
    for(const p of people){const xx=p.id===0?4:151;api.text('P'+(p.id+1),xx,215,p.id===0?12:8);for(let n=0;n<p.lives;n++){api.rectfill(xx+22+n*7,216,5,4,p.id===0?12:8);api.pset(xx+24+n*7,215,p.id===0?12:8);}}
    for(const e of popups)api.text(e.text,clamp(e.x,0,256-api.textWidth(e.text)),e.y,e.color);
    if(phase==='rescue'){const text=String(config.rescueText||'CAT RESCUED!').toUpperCase().slice(0,25);const width=Math.max(128,Math.min(248,api.textWidth(text)+16)),x=Math.floor((256-width)/2);api.rectfill(x,111,width,19,0);api.rect(x,111,width,19,10);api.text(text,config.rescueText?Math.round((256-api.textWidth(text))/2):80,117,10);}
  }
  function inspect(){return {phase,stage:stage+1,stages:stageCount,time:clock,totalTime,goal:{...goal},stats:{...stats},
    floors:floors.map(f=>({...f})),ladders:ladders.map(l=>({...l})),
    people:people.map(p=>({id:p.id,x:p.x,y:p.y,vy:p.vy,floor:p.floor,checkpoint:p.checkpoint,grounded:p.grounded,ladder:p.ladder,
      lives:p.lives,score:p.score,dead:p.dead,invulnerable:p.invulnerable,pose:p.pose})),
    barrels:barrels.map(b=>({id:b.id,x:b.x,y:b.y,floor:b.floor,mode:b.mode,dir:b.dir,jumped:b.jumped,speed:b.speed})),fires:fires.map(f=>({...f}))};}
  return {init,update,draw,inspect};
}
