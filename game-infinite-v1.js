(()=>{'use strict';
const Stick=window.CyberRunStickman;
const H=window.CyberRunInfinite;
if(!H)throw Error('Handcrafted course data is missing');
const C=window.CyberRunCore,canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false}),$=id=>document.getElementById(id);if(!ctx||!C||!Stick){$('message').textContent='ゲームを初期化できませんでした。';return}
const ui={overlay:$('overlay'),msg:$('message'),start:$('primary'),score:$('score'),best:$('best'),distance:$('distance'),speed:$('speed'),hearts:$('hearts'),region:$('region'),duck:$('duck'),jump:$('jump')};
let nextHandcraftedIndex=0,goalX=Infinity,infiniteGenerator=null;
let physicsPruneClock=0;
let viewW=960,viewH=540,s=1,dpr=1,ground=C.GROUND,state='menu',runner=null,segments=[],hazards=[],gaps=[],platforms=[],pads=[],pickups=[],seed=0,rng=null,spawnCursor=0,elapsed=0,travel=0,invuln=0,rescue=0,nextFrame=0,lastFrame=0,gameId=0,duckHeld=false,jumpQueued=false,localBest=0,currentRegion='NEON CITY',currentTheme='GROUND FLOW',previousCourse=null,floaters=[],trail=[],hitPulse=0,effects=[],jumpFlash=0,landFlash=0,boostFlash=0,flowFlash=0,cleanFlash=0,lastClean=-100,hudAccumulator=0,lastTheme='GROUND FLOW',gaitPhase=0,cleanStreak=0,streakFlash=0;
try{localBest=Number(localStorage.getItem('cyber-run-infinite-v01-best'))||0}catch(_){/* storage may be blocked */}
function resize(){
 const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
 // Give iPad-like landscape screens a wider preview window at high speed.
 s=w/h>1.10?Math.min(h/540,w/920):h/540;viewW=w/s;viewH=h/s;dpr=Math.min(2,devicePixelRatio||1);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 ctx.setTransform(dpr*s,0,0,dpr*s,0,0);ctx.imageSmoothingEnabled=true;
 // Keep the runner visible when a phone rotates mid-run. Shift all world objects
 // with the anchored runner so collision distances do not change on resize.
 if(runner){
  const safeX=Math.min(Math.max(86,viewW*.19)+6,Math.max(12,viewW-40));
  const shift=safeX-runner.x;
  if(shift!==0){
   runner.x=safeX;spawnCursor+=shift;if(Number.isFinite(goalX))goalX+=shift;
   for(const list of [segments,hazards,gaps,platforms,pads,pickups,floaters])
    for(const entity of list)entity.x+=shift;
  }
 }
}
addEventListener('resize',resize);resize();
// Screen-only particles do not affect obstacle randomization or collision.
// Cap count strictly for school iPad performance.
function burst(x,y,color,count,vx,vy){
 const seed=elapsed*47+travel*.03;
 for(let i=0;i<count;i++){
  const a=(i+.5)*2.399963+seed;
  const speed=40+(i%5)*20;
  effects.push({x,y,vx:vx+Math.cos(a)*speed,vy:vy+Math.sin(a)*speed*.65,
   life:.28+(i%4)*.055,max:.28+(i%4)*.055,color,size:i%3===0?3.5:2});
 }
 if(effects.length>64)effects.splice(0,effects.length-64);
}

function makeRunner(){return C.makeRunner(Math.max(86,viewW*.19)+6)}
function playerRect(){return C.rectAt(runner.x+C.HITBOX_OFFSET_X,runner.bottom,runner.duck)}
function isOnGround(){return C.isSupported(runner)}
function jump(){if(state!=='running')return;jumpQueued=true}
function setDuck(value){if(!runner)return;duckHeld=!!value&&state==='running';runner.duck=duckHeld&&isOnGround()&&runner.jumps===0;ui.duck.classList.toggle('pressed',duckHeld)}
function start(){nextHandcraftedIndex=0;goalX=Infinity;gameId++;seed=(Number.isInteger(window.CYBER_RUN_TEST_SEED)?window.CYBER_RUN_TEST_SEED:((Date.now()^Math.floor(performance.now()*10000))>>>0))||1;rng=C.randomizer(seed);infiniteGenerator=H.makeGenerator(seed);runner=makeRunner();physicsPruneClock=0;segments=[];hazards=[];gaps=[];platforms=[];pads=[];pickups=[];spawnCursor=runner.x+C.speedAt(0)*1.45;elapsed=0;travel=0;invuln=0;rescue=0;duckHeld=false;jumpQueued=false;previousCourse=null;state='running';floaters=[];trail=[];effects=[];jumpFlash=0;landFlash=0;boostFlash=0;flowFlash=0;lastTheme='GROUND FLOW';gaitPhase=0;cleanStreak=0;streakFlash=0;cleanFlash=0;lastClean=-100;hudAccumulator=0;hitPulse=0;ui.start.textContent='もう一回';ui.overlay.classList.add('hidden');ui.best.textContent='BEST '+localBest.toLocaleString()+' m';lastFrame=performance.now();cancelAnimationFrame(nextFrame);nextFrame=requestAnimationFrame(frame)}
function pause(){if(state==='running'){state='paused';cancelAnimationFrame(nextFrame);nextFrame=0;ui.msg.textContent='一時停止中';ui.start.textContent='再開';ui.overlay.classList.remove('hidden');setDuck(false)}else if(state==='paused'){resume()}}
function resume(){if(state!=='paused')return;cancelAnimationFrame(nextFrame);nextFrame=0;state='running';ui.overlay.classList.add('hidden');lastFrame=performance.now();nextFrame=requestAnimationFrame(frame)}
ui.start.addEventListener('click',()=>state==='paused'?resume():start());$('pause').addEventListener('click',pause);
function bind(button,down,up){button.addEventListener('pointerdown',e=>{e.preventDefault();try{button.setPointerCapture(e.pointerId)}catch(_){}button.classList.add('pressed');down()});['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,e=>{e.preventDefault();button.classList.remove('pressed');if(up)up()}))}
bind(ui.jump,jump);bind(ui.duck,()=>setDuck(true),()=>setDuck(false));
const keys=new Set();addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(keys.has(e.code))return;keys.add(e.code);if(['ArrowUp','Space'].includes(e.code))jump();if(e.code==='ArrowDown')setDuck(true);if(e.code==='Escape'||e.code==='KeyP')pause()});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ArrowDown')setDuck(false)});addEventListener('blur',()=>{keys.clear();if(state==='running')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause()});addEventListener('contextmenu',e=>e.preventDefault());
function createAhead(){let guard=0;
 while(spawnCursor<viewW+700&&guard++<10){
  const eta=C.timeToTravel(elapsed,Math.max(0,spawnCursor-(runner.x+C.HITBOX_OFFSET_X)));
  const segment=infiniteGenerator.next(spawnCursor,elapsed+eta,runner.hp);
  spawnCursor+=segment.length;
  nextHandcraftedIndex++;
  const prior=previousCourse||{};
  previousCourse={type:segment.type,theme:segment.theme,
   recentTypes:[...(prior.recentTypes||[]),segment.type].slice(-3),
   recentThemes:[...(prior.recentThemes||[]),segment.theme].slice(-2)};
  segments.push(segment);hazards.push(...segment.hazards);gaps.push(...segment.gaps);
  pickups.push(...segment.pickups);platforms.push(...segment.platforms);pads.push(...segment.pads);
 }
}
function hit(){if(invuln>0||state!=='running')return;cleanStreak=0;streakFlash=0;runner.hp--;invuln=1.35;hitPulse=.32;floaters.push({x:runner.x+16,y:runner.bottom-66,t:0,text:'−1 HP',color:'#ff819d'});if(runner.hp<=0)gameOver()}
function gameOver(){state='over';const metres=Math.floor(travel/9),newRecord=metres>localBest;
 if(newRecord){localBest=metres;try{localStorage.setItem('cyber-run-infinite-v01-best',String(localBest))}catch(_){}}
 ui.msg.textContent=metres.toLocaleString()+' m 走破'+(newRecord?' — NEW BEST!':'');ui.start.textContent='もう一回';ui.overlay.classList.remove('hidden');setDuck(false)}
function step(dt){
 for(const f of floaters){f.t+=dt;f.y-=22*dt}floaters=floaters.filter(f=>f.t<.65);
 elapsed+=dt;hitPulse=Math.max(0,hitPulse-dt);invuln=Math.max(0,invuln-dt);rescue=Math.max(0,rescue-dt);
 jumpFlash=Math.max(0,jumpFlash-dt);landFlash=Math.max(0,landFlash-dt);boostFlash=Math.max(0,boostFlash-dt);flowFlash=Math.max(0,flowFlash-dt);cleanFlash=Math.max(0,cleanFlash-dt);streakFlash=Math.max(0,streakFlash-dt);
 for(const e of effects){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=170*dt;e.life-=dt}
 effects=effects.filter(e=>e.life>0);
 const speed=C.speedAt(elapsed),move=speed*dt;travel+=move;spawnCursor-=move;
 if(Number.isFinite(goalX))goalX-=move;
 if(runner.support!==null&&!runner.duck)gaitPhase+=(18+17*Math.min(1,(speed-C.BASE_SPEED)/(C.MAX_SPEED-C.BASE_SPEED)))*dt;
 for(const list of [hazards,gaps,pickups,segments,platforms,pads])for(const obj of list)obj.x-=move;
 for(const h of hazards)if(h.kind==='moving')h.y=ground-87+Math.sin(elapsed*3.5+h.phase)*27;
 // The edge of a gap is not a damage hitbox. Physics removes ground support
 // when the player truly runs over a hole; falling below ground costs HP.
 // Jumping from the lip must not be punished before physics processes input.
 // Keep the runner anchored at its screen x; world elements scroll left.
 const previousSupport=runner.support,previousVy=runner.vy,requested=jumpQueued;
 C.physicsStep(runner,dt,runner.x,platforms,gaps,duckHeld,jumpQueued,elapsed,rescue,pads);
 jumpQueued=false;
 if(previousVy>=0&&runner.vy<-800){boostFlash=.42;burst(runner.x+19,ground-6,'#ffe985',17,-55,-105)}
 else if(requested&&runner.vy<-500&&previousVy>-800){jumpFlash=.23;burst(runner.x+18,runner.bottom-3,'#66ffdd',8,-55,5)}
 if(previousSupport===null&&runner.support!==null&&previousVy>100){landFlash=.21;burst(runner.x+20,runner.bottom,'#94d9ff',10,-75,-42)}
 if(runner.bottom>ground+112){hit();runner.bottom=ground;runner.vy=0;runner.jumps=0;runner.support='ground';rescue=1.0;invuln=Math.max(invuln,1.4)}
 const body=playerRect();
 // Signal an especially tight clean pass with a small cosmetic burst.
 // This never changes distance scoring, collisions or procedural RNG.
 for(const h of hazards){
  const collider=C.hazardAt(h,elapsed);
  if(body.x<h.x+h.w&&body.x+body.w>h.x){
   const separation=Math.max(collider.y-(body.y+body.h),body.y-(collider.y+collider.h),0);
   if(!C.overlap(body,collider))h.closestClearance=Math.min(h.closestClearance??Infinity,separation);
  }
  if(!h._cleared&&h.x+h.w<body.x){
   h._cleared=true;
   // A clean-avoid streak is feedback, never score or a gameplay multiplier.
   if(!h._contacted&&invuln<=0){
    cleanStreak++;
    if(cleanStreak>=3&&cleanStreak%3===0){
     streakFlash=.70;
     burst(body.x+8,body.y+5,'#adfff0',7,-70,-10);
    }
   }
   if(invuln<=0&&Number.isFinite(h.closestClearance)&&h.closestClearance<=24&&elapsed-lastClean>.36){
    cleanFlash=.19;lastClean=elapsed;
    burst(body.x-5,body.y+body.h*.5,'#8ff5fa',5,-115,-6);
   }
  }
  if(C.overlap(body,collider)){h._contacted=true;hit();break}
 }
 for(const item of pickups){if(item.taken)continue;const midx=body.x+body.w/2,midy=body.y+body.h/2;
  if(Math.hypot(item.x-midx,item.y-midy)<item.r+17){
   item.taken=true;
   if(item.kind==='guide-coin'){burst(item.x,item.y,'#f9cc69',3,-25,-12);continue}
   runner.hp=Math.min(3,runner.hp+1);
   floaters.push({x:item.x,y:item.y,t:0,text:'HP +1',color:'#ff819d'});
  }}
 hazards=hazards.filter(h=>h.x+h.w>-40);gaps=gaps.filter(g=>g.x+g.w>-40);pickups=pickups.filter(item=>!item.taken&&item.x>-40);
 platforms=platforms.filter(p=>p.x+p.w>-40);pads=pads.filter(p=>p.x+p.w>-40);segments=segments.filter(a=>a.x+a.length>-40);
 physicsPruneClock+=dt;
 if(physicsPruneClock>=5){physicsPruneClock=0;H.pruneExpiredPhysics(runner,platforms,pads)}
 createAhead();currentRegion=elapsed<35?'NEON CITY':elapsed<110?'MACHINE DISTRICT':'ENERGY TUNNEL';
 const upcoming=segments.find(a=>a.x+a.length>runner.x+C.HITBOX_OFFSET_X);
 if(upcoming){currentTheme=upcoming.authoredLabel||upcoming.theme;
  currentRegion='RUN '+String((upcoming.sequenceNumber||0)+1).padStart(2,'0')+' · '+(upcoming.difficulty?.rank||'BUILD');
  if(currentTheme!==lastTheme){flowFlash=.60;lastTheme=currentTheme}}
 // Throttle HUD DOM writes to 20Hz; keep physics at 120Hz.
 hudAccumulator+=dt;
 if(hudAccumulator>=.05||state!=='running'){
  hudAccumulator=0;
  ui.region.textContent=currentRegion;ui.score.textContent=Math.floor(travel/9).toLocaleString()+' m';ui.hearts.textContent='♥ '.repeat(runner.hp)+'♡ '.repeat(3-runner.hp);
  ui.speed.textContent=(speed/C.BASE_SPEED).toFixed(1)+'×';ui.distance.textContent=currentTheme;
 }
}
function draw(){
 const W=viewW,H=viewH,t=travel,velocity=C.speedAt(elapsed),intensity=Math.min(1,(velocity-C.BASE_SPEED)/(C.MAX_SPEED-C.BASE_SPEED)),colors=currentRegion==='MACHINE DISTRICT'?['#070b1d','#253354','#ff8db0']:currentRegion==='ENERGY TUNNEL'?['#0d0b26','#3c1f5c','#bd96ff']:['#081028','#16405b','#55d7fa'];
 const back=ctx.createLinearGradient(0,0,0,H);back.addColorStop(0,colors[0]);back.addColorStop(.85,colors[1]);back.addColorStop(1,'#0a2638');ctx.fillStyle=back;ctx.fillRect(0,0,W,H);
 // Tablet camera offset changes drawing only; game physics stays in world coordinates.
 const cameraY=Math.max(0,Math.min(120,(H-540)*.56));
 ctx.save();ctx.globalAlpha=.12;const beaconX=W*.77,beaconY=Math.max(115,185-cameraY*.65);
 ctx.strokeStyle=colors[2];ctx.lineWidth=2;
 for(const radius of [48,65,82]){ctx.beginPath();ctx.arc(beaconX,beaconY,radius,0,Math.PI*2);ctx.stroke()}
 ctx.globalAlpha=.07;ctx.fillStyle=colors[2];ctx.beginPath();ctx.arc(beaconX,beaconY,47,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.translate(0,cameraY);
 // Distant neon skyline, looping by camera travel. All geometry is draw-only.
 ctx.save();ctx.globalAlpha=.55;
 for(let layer=0;layer<2;layer++){
  const pace=layer===0?.12:.26;
  for(let i=0;i<24;i++){
   const spacing=110,x=((i*spacing-t*pace)%(W+220)+(W+220))%(W+220)-100;
   const tall=(layer===0?60:90)+(i*79%(layer===0?155:185));
   const width=70+(i*31%25);
   ctx.fillStyle=layer===0?'#111a3e':'#203a62';ctx.fillRect(x,ground-tall,width,tall);
   ctx.fillStyle=layer===0?'#5463a8':colors[2];
   for(let j=0;j<5;j++)ctx.fillRect(x+12,ground-tall+13+j*23,13,3);
   ctx.fillStyle=colors[2];ctx.globalAlpha=layer===0?.14:.26;ctx.fillRect(x+width-2,ground-tall,2,tall);ctx.globalAlpha=.55;
  }
 }
 ctx.restore();
 // Parallax transit trails: stronger at higher speed without hiding the obstacles.
 ctx.save();ctx.lineWidth=1.2;
 for(let i=0;i<14+Math.floor(intensity*23);i++){
  const x=((i*113.7-t*(.43+i%3*.13))%(W+250)+(W+250))%(W+250)-130;
  const y=105+(i*59%220);const len=(18+intensity*135)*(i%4===0?1.35:.75);
  ctx.strokeStyle=i%3===0?'rgba(246,133,207,.14)':'rgba(102,237,255,.15)';
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y);ctx.stroke();
 }
 ctx.restore();
 // Ground and beat markers.
 ctx.fillStyle='#162b41';ctx.fillRect(0,ground,W,H-ground);
 ctx.fillStyle=colors[2];ctx.fillRect(0,ground,W,4);
 ctx.fillStyle='#52cbe480';for(let i=0;i<24;i++){
  const x=((i*95-t*1.48)%(W+200)+(W+200))%(W+200)-100;
  ctx.fillRect(x,ground+24+(i%4)*23,24+intensity*65,2);
 }
 // Street-light flashes at sprint speed create rhythmic flow cues.
 if(intensity>.35){ctx.fillStyle='rgba(115,247,255,.045)';for(let i=0;i<8;i++){
  const x=((i*257-t*.93)%(W+250)+(W+250))%(W+250)-120;
  ctx.fillRect(x,ground-145,3,140);}}

 // Horizon scanner: preview REAL obstacle silhouettes rather than telling the
 // player a button sequence. A high-speed runner can otherwise see too little ahead.
 if(intensity>.30&&runner&&W>=560){
  const x0=W*.34,span=W*.32,lineY=ground+51,maxFuture=1.5;
  const origin=runner.x+C.HITBOX_OFFSET_X+C.BODY_W;
  const upcoming=[...hazards.map(h=>({x:h.x+h.w/2,kind:h.kind})),...gaps.map(g=>({x:g.x+g.w/2,kind:'gap'})),
   ...pads.filter(p=>p.kind==='airboost').map(p=>({x:p.x+p.w/2,kind:'airboost'})),
   ...platforms.filter(p=>p.kind==='fragile').map(p=>({x:p.x+p.w/2,kind:'fragile'}))]
   .map(h=>({...h,lead:C.timeToTravel(elapsed,Math.max(0,h.x-origin))}))
   .filter(h=>h.lead>.32&&h.lead<maxFuture).sort((a,b)=>a.lead-b.lead).slice(0,5);
  ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle='#4be4da';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(x0,lineY);ctx.lineTo(x0+span,lineY);ctx.stroke();
  ctx.fillStyle='#a6e6e9';ctx.font='10px system-ui';ctx.textAlign='left';ctx.fillText('SCAN',x0,lineY-13);
  ctx.globalAlpha=.82;
  for(const h of upcoming){
   const x=x0+span*h.lead/maxFuture;
   if(h.kind==='airboost'){
    ctx.strokeStyle='#79ffe4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,lineY-5,6,0,Math.PI*2);ctx.stroke();
   }else if(h.kind==='fragile'){
    ctx.fillStyle='#ffb477';ctx.fillRect(x-8,lineY-6,16,3);
    ctx.fillStyle='#ffe6a1';ctx.fillRect(x,lineY-4,2,5);
   }else if(h.kind==='duck-gate'){
    ctx.fillStyle='#f196f5';ctx.fillRect(x-5,lineY-12,10,9);
    ctx.fillStyle='#86ffe0';ctx.fillRect(x-5,lineY-1,10,2);
   }else if(h.kind==='gap'){
    ctx.fillStyle='#ff839e';ctx.fillRect(x-7,lineY-1,5,3);ctx.fillRect(x+2,lineY-1,5,3);
   }else if(h.kind==='bar'||h.kind==='platform-bar'){
    ctx.fillStyle='#f38cdd';ctx.fillRect(x-5,lineY-10,10,4);
   }else if(h.kind==='moving'){
    ctx.fillStyle='#ffb477';ctx.fillRect(x-4,lineY-8,8,8);
   }else{
    ctx.fillStyle='#ffb477';ctx.fillRect(x-5,lineY-7,10,7);
   }
  }
  ctx.restore();
 }

 for(const g of gaps){ctx.fillStyle='#050a19';ctx.fillRect(g.x,ground-1,g.w,H-ground+2);ctx.fillStyle='#f77c9c';ctx.fillRect(g.x-4,ground-2,4,15);ctx.fillRect(g.x+g.w,ground-2,4,15)}
 // Platforms draw behind obstacles. They only collide with the player on descent.
 for(const pad of pads){
  ctx.save();
  if(pad.kind==='airboost'){
   // The full hitbox is visible: a cyan jump ring suspended in the air.
   const used=!!runner?.airBoosts?.[pad.id],cx=pad.x+pad.w/2,cy=pad.y+(pad.h||34)/2;
   ctx.globalAlpha=used?.25:1;ctx.shadowBlur=18;ctx.shadowColor='#7effe5';
   ctx.strokeStyle=used?'#698b86':'#7effe5';ctx.lineWidth=5;
   ctx.beginPath();ctx.ellipse(cx,cy,pad.w/2-4,(pad.h||34)/2-2,0,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='#d7fff4';ctx.textAlign='center';
   if(pad.h>=60){
    ctx.font='bold 14px system-ui';ctx.fillText(used?'✓':'AUTO ↑',cx,cy+5);
   }else{
    ctx.font='bold 15px system-ui';ctx.fillText(used?'✓':'↑',cx,cy+6);
    if(!used){ctx.font='bold 11px system-ui';ctx.fillText('AUTO',cx,cy+pad.h/2+15)}
   }
  }else{
   ctx.shadowBlur=14;ctx.shadowColor='#ffe36d';
   ctx.fillStyle='#a47729';ctx.fillRect(pad.x,ground-10,pad.w,10);
   ctx.fillStyle='#ffe06a';ctx.fillRect(pad.x,ground-13,pad.w,6);
   ctx.fillStyle='#fff1ba';for(let i=5;i<pad.w-4;i+=11)ctx.fillRect(pad.x+i,ground-11,5,3);
  }
  ctx.restore();
 }
 for(const p of platforms){
  ctx.save();
  if(p.kind==='fragile'){
   const touched=runner?.fragileTimes?.[p.id],remaining=touched===undefined?1:Math.max(0,1-(elapsed-touched)/C.FRAGILE_HOLD);
   ctx.globalAlpha=touched===undefined?1:Math.max(.22,remaining);
   ctx.shadowBlur=11;ctx.shadowColor='#ff9f6b';
   ctx.fillStyle='#6a4039';ctx.fillRect(p.x,p.y,p.w,11);
   ctx.fillStyle='#ffb36e';ctx.fillRect(p.x,p.y,p.w,4);
   ctx.strokeStyle='#ffe4a3';ctx.lineWidth=2;ctx.beginPath();
   for(let k=15;k<p.w-10;k+=27){ctx.moveTo(p.x+k,p.y+3);ctx.lineTo(p.x+k+7,p.y+9);ctx.lineTo(p.x+k+15,p.y+4)}
   ctx.stroke();
   ctx.globalAlpha=1;
  }else{
   ctx.shadowBlur=11;ctx.shadowColor='#ae8eff';ctx.fillStyle='#4b477f';ctx.fillRect(p.x,p.y,p.w,11);
   ctx.fillStyle='#d5adff';ctx.fillRect(p.x,p.y,p.w,4);
   ctx.fillStyle='#8974e0';for(let k=13;k<p.w-7;k+=24)ctx.fillRect(p.x+k,p.y+5,12,2);
  }
  ctx.restore();
 }
 // Distinct obstacle silhouettes with their complete collision rectangle visible.
 for(const h of hazards){
  if(h.x+h.w<0||h.x>W+100)continue;
  ctx.save();ctx.shadowBlur=7;
  if(h.kind==='duck-gate'){
   // FULL silhouette = FULL collision region, no invisible overhead wall.
   // The ground-level opening is deliberately large enough for crouching only.
   ctx.shadowColor='#f079ff';ctx.shadowBlur=12;
   ctx.fillStyle='#39254e';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#693b83';ctx.fillRect(h.x+7,h.y+6,h.w-14,h.h-14);
   ctx.fillStyle='#c581e6';ctx.fillRect(h.x,h.y,h.w,6);
   for(let k=h.y+15;k<h.y+h.h-17;k+=26){
    ctx.fillStyle='#b67bce66';ctx.fillRect(h.x+11,k,h.w-22,2);
   }
   ctx.fillStyle='#f2a4fc';ctx.fillRect(h.x,h.y+h.h-8,h.w,8);
   ctx.shadowBlur=0;
   // Only the cyan-lit low opening is safe; never draw an apparent top shortcut.
   ctx.strokeStyle='#81ffe5';ctx.lineWidth=3;ctx.beginPath();
   ctx.moveTo(h.x,h.y+h.h+3);ctx.lineTo(h.x+h.w,h.y+h.h+3);ctx.stroke();
   ctx.fillStyle='#bbffe6';ctx.font='bold 12px system-ui';ctx.textAlign='center';
   ctx.fillText('↓',h.x+h.w/2,h.y+h.h-15);
  }else if(h.kind==='bar'||h.kind==='platform-bar'){
   ctx.shadowColor='#f75fbf';ctx.fillStyle='#a92d86';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#ff99dc';ctx.fillRect(h.x+2,h.y+1,h.w-4,5);
   ctx.fillStyle='#fbe1fb';for(let k=9;k<h.w-4;k+=18)ctx.fillRect(h.x+k,h.y+11,8,3);
   ctx.fillStyle='#fb76c4';ctx.fillRect(h.x,h.y+h.h-5,h.w,5);
   ctx.strokeStyle='#f8a0db';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(h.x+6,h.y+h.h-8);ctx.lineTo(h.x+h.w-6,h.y+h.h-8);ctx.stroke();
  }else if(h.kind==='moving'){
   ctx.strokeStyle='#994d68';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(h.x+h.w/2,0);ctx.lineTo(h.x+h.w/2,h.y);ctx.stroke();
   ctx.fillStyle='#ef526c';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#ffb27f';ctx.fillRect(h.x+5,h.y+4,h.w-10,h.h-8);
   ctx.fillStyle='#7a1f51';ctx.fillRect(h.x+12,h.y+10,10,8);
  }else if(h.kind==='tall'){
   ctx.shadowColor='#fe557f';ctx.fillStyle='#a13a70';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#ff829f';ctx.fillRect(h.x,h.y,h.w,9);
   ctx.fillStyle='#ffcc97';for(let k=22;k<h.h-8;k+=22)ctx.fillRect(h.x+7,h.y+k,h.w-14,5);
   ctx.fillStyle='#501c4f';ctx.fillRect(h.x+12,h.y+12,h.w-24,h.h-25);
   ctx.fillStyle='#ffbda6';ctx.fillRect(h.x+18,h.y+18,h.w-36,h.h-38);
  }else{
   ctx.shadowColor='#ff8c5d';ctx.fillStyle='#bc4b51';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#ffb066';ctx.fillRect(h.x+3,h.y+3,h.w-6,10);
   ctx.fillStyle='#fce5a5';for(let i=0;i<3;i++){
    const lx=h.x+2+i*(h.w-4)/3,rx=h.x+2+(i+1)*(h.w-4)/3;
    ctx.beginPath();ctx.moveTo(lx,h.y+12);ctx.lineTo((lx+rx)/2,h.y+3);ctx.lineTo(rx,h.y+12);ctx.fill();
   }
   ctx.fillStyle='#61274c';ctx.fillRect(h.x+5,h.y+23,h.w-10,7);
  }
  ctx.restore();
 }
 // Finite authored goal; this route has a start and an actual finish.
 if(Number.isFinite(goalX)&&goalX>-25&&goalX<viewW+90){
  ctx.save();ctx.shadowColor='#7fffe9';ctx.shadowBlur=24;
  ctx.fillStyle='#c7fff3';ctx.fillRect(goalX,35,5,ground-25);
  ctx.fillStyle='#062c37';ctx.fillRect(goalX-57,ground-144,115,35);
  ctx.strokeStyle='#aaffea';ctx.lineWidth=3;ctx.strokeRect(goalX-57,ground-144,115,35);
  ctx.fillStyle='#bffff4';ctx.font='bold 19px system-ui';ctx.textAlign='center';ctx.fillText('GOAL',goalX,ground-120);
  ctx.restore();
 }
 // Short, bounded cosmetic effects; do not change course RNG or scoring.
 for(const e of effects){ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.max)*.85;ctx.fillStyle=e.color;
  ctx.fillRect(e.x-e.size/2,e.y-e.size/2,e.size,e.size);ctx.restore()}
 for(const item of pickups){
  ctx.save();
  if(item.kind==='guide-coin'){
   // Guide-only collectible: deliberately no distance, HP or ranking change.
   ctx.shadowColor='#f2c963';ctx.shadowBlur=5;ctx.strokeStyle='#fff0a0';ctx.lineWidth=2;
   ctx.fillStyle='#d7a638';ctx.beginPath();ctx.ellipse(item.x,item.y,item.r*.78,item.r,0,0,2*Math.PI);ctx.fill();ctx.stroke();
   ctx.strokeStyle='#fff2b5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(item.x,item.y-item.r*.52);ctx.lineTo(item.x,item.y+item.r*.52);ctx.stroke();
  }else{
   ctx.shadowColor='#ff70ae';ctx.shadowBlur=12;ctx.fillStyle='#ff709a';
   ctx.beginPath();ctx.arc(item.x,item.y,item.r,0,2*Math.PI);ctx.fill();ctx.fillStyle='#fff';
   ctx.fillRect(item.x-2,item.y-7,4,14);ctx.fillRect(item.x-7,item.y-2,14,4);
  }
  ctx.restore();
 }
 // Manually timed jump locations are painted separately from automatic
 // cyan ring triggers. Coins follow the actual replayed motion between both.
 for(const section of segments)for(const cue of section.jumpCues||[]){
  const x=section.x+cue.offset,y=cue.y;
  if(x<0||x>viewW+40)continue;
  ctx.save();ctx.globalAlpha=.92;
  ctx.fillStyle='rgba(43,35,92,.83)';ctx.fillRect(x-29,y-20,58,27);
  ctx.strokeStyle='#c2b4ff';ctx.lineWidth=1.6;ctx.strokeRect(x-29,y-20,58,27);
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 13px system-ui';
  ctx.fillText('↑ TAP',x,y-2);ctx.restore();
 }
 if(runner){
  const crouching=runner.duck&&runner.jumps===0,airborne=runner.support===null;
  const x=runner.x,bottom=runner.bottom;
  ctx.save();ctx.globalAlpha=invuln>0&&Math.floor(invuln*12)%2===0?.40:1;
  // Character animation is cosmetic: no influence on collision or physics.
  const compression=Math.min(1,landFlash/.21),stretch=Math.min(1,jumpFlash/.23);
  const scaleX=1+compression*.12-stretch*.045,scaleY=1-compression*.13+stretch*.09;
  ctx.translate(x+18,bottom);ctx.scale(scaleX,scaleY);ctx.translate(-x-18,-bottom);
  for(let k=1;k<=3+Math.floor(intensity*3);k++){
   ctx.fillStyle=k%2===0?'#2ec9d578':'#92ffe055';
   ctx.fillRect(x-k*(13+intensity*5),bottom-(crouching?11:20)+k*1.5,11+intensity*10,2);
  }
  if(boostFlash>0){ctx.strokeStyle='#ffe47f';ctx.lineWidth=2.5;
   ctx.beginPath();ctx.arc(x+18,bottom-25,24+boostFlash*20,0,Math.PI*2);ctx.stroke()}
  if(!airborne){ctx.fillStyle=landFlash>0?'#c7ffea88':'#2bd5b844';
   ctx.fillRect(x+3,bottom-2,31+landFlash*60,3)}
  Stick.draw(ctx,x,bottom,{time:elapsed,phase:gaitPhase,intensity,duck:crouching,supported:!airborne,
   jumps:runner.jumps,vy:runner.vy,boost:boostFlash>0});
  if(jumpFlash>0){ctx.fillStyle='#b4fff4';ctx.fillRect(x-8,bottom-5,8+jumpFlash*27,3)}
  ctx.restore();
 }
 if(flowFlash>0){
  const alpha=Math.min(.24,flowFlash*.40);
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#95eaff';ctx.font='900 27px system-ui';
  ctx.textAlign='right';ctx.fillText(currentTheme,W-26,ground-136);ctx.restore();
 }
 for(const f of floaters){ctx.save();ctx.globalAlpha=Math.max(0,1-f.t/.65);ctx.fillStyle=f.color;ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.restore()}
 ctx.restore();
 // Brief readable celebration above the runner, outside the HUD. Distance-only scoring remains intact.
 if(runner&&streakFlash>0&&cleanStreak>=3){
  ctx.save();ctx.globalAlpha=Math.min(1,streakFlash/.26)*.9;
  ctx.textAlign='right';ctx.font='bold 16px system-ui';ctx.fillStyle='#b4fff2';
  ctx.fillText('FLOW ×'+cleanStreak,runner.x+14,runner.bottom+cameraY-89);
  ctx.restore();
 }
 if(hitPulse>0){ctx.fillStyle='rgba(255,64,107,'+(hitPulse*.28)+')';ctx.fillRect(0,0,W,H)}
 if(cleanFlash>0){ctx.save();ctx.globalAlpha=cleanFlash*.32;ctx.strokeStyle='#62ecff';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(2,ground+cameraY-12);ctx.lineTo(2+(1-cleanFlash/.19)*75,ground+cameraY-12);ctx.stroke();ctx.restore()}
}
function frame(now){if(state!=='running')return;let dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now; // substeps prevent tunneling at higher speed or low FPS
 while(dt>0&&state==='running'){const sub=Math.min(1/120,dt);step(sub);dt-=sub}draw();if(state==='running')nextFrame=requestAnimationFrame(frame)}
 draw();ui.best.textContent='BEST '+localBest.toLocaleString()+' m';
})();
