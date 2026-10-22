(()=>{'use strict';
const C=window.CyberRunCore,canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false}),$=id=>document.getElementById(id);if(!ctx||!C){$('message').textContent='ゲームを初期化できませんでした。';return}
const ui={overlay:$('overlay'),msg:$('message'),start:$('primary'),score:$('score'),best:$('best'),distance:$('distance'),speed:$('speed'),hearts:$('hearts'),region:$('region'),duck:$('duck'),jump:$('jump')};
let viewW=960,viewH=540,s=1,dpr=1,ground=C.GROUND,state='menu',runner=null,segments=[],hazards=[],gaps=[],pickups=[],seed=0,rng=null,spawnCursor=0,elapsed=0,travel=0,score=0,invuln=0,rescue=0,nextFrame=0,lastFrame=0,gameId=0,duckHeld=false,localBest=0,currentRegion='NEON CITY',floaters=[],trail=[],hitPulse=0;
try{localBest=Number(localStorage.getItem('cyber-run-v04-best'))||0}catch(_){/* storage may be blocked */}
function resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);s=h/viewH;viewW=w/s;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr*s,0,0,dpr*s,0,0);ctx.imageSmoothingEnabled=true}
addEventListener('resize',resize);resize();
function makeRunner(){return {x:Math.max(86,viewW*.19),bottom:ground,vy:0,jumps:0,duck:false,hp:3}}
function playerRect(){const height=runner.duck&&runner.jumps===0?27:48;return{x:runner.x+6,y:runner.bottom-height+4,w:21,h:height-7}}
function isOnGround(){return runner.jumps===0&&Math.abs(runner.bottom-ground)<.01}
function jump(){if(state!=='running'||runner.jumps>=2)return;runner.duck=false;runner.vy=runner.jumps===0?-C.FIRST_JUMP:-C.SECOND_JUMP;runner.jumps++}
function setDuck(value){if(!runner)return;duckHeld=!!value&&state==='running';runner.duck=duckHeld&&isOnGround();ui.duck.classList.toggle('pressed',duckHeld)}
function start(){gameId++;seed=((Date.now()^Math.floor(performance.now()*10000))>>>0)||1;rng=C.randomizer(seed);runner=makeRunner();segments=[];hazards=[];gaps=[];pickups=[];spawnCursor=runner.x+C.speedAt(0)*1.45;elapsed=0;travel=0;score=0;invuln=0;rescue=0;duckHeld=false;state='running';floaters=[];trail=[];hitPulse=0;ui.start.textContent='もう一回';ui.overlay.classList.add('hidden');ui.best.textContent='BEST '+localBest.toLocaleString();lastFrame=performance.now();cancelAnimationFrame(nextFrame);nextFrame=requestAnimationFrame(frame)}
function pause(){if(state==='running'){state='paused';ui.msg.textContent='一時停止中';ui.start.textContent='再開';ui.overlay.classList.remove('hidden');setDuck(false)}else if(state==='paused'){resume()}}
function resume(){state='running';ui.overlay.classList.add('hidden');lastFrame=performance.now();nextFrame=requestAnimationFrame(frame)}
ui.start.addEventListener('click',()=>state==='paused'?resume():start());$('pause').addEventListener('click',pause);
function bind(button,down,up){button.addEventListener('pointerdown',e=>{e.preventDefault();try{button.setPointerCapture(e.pointerId)}catch(_){}button.classList.add('pressed');down()});['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,e=>{e.preventDefault();button.classList.remove('pressed');if(up)up()}))}
bind(ui.jump,jump);bind(ui.duck,()=>setDuck(true),()=>setDuck(false));
const keys=new Set();addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(keys.has(e.code))return;keys.add(e.code);if(['ArrowUp','Space'].includes(e.code))jump();if(e.code==='ArrowDown')setDuck(true);if(e.code==='Escape'||e.code==='KeyP')pause()});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ArrowDown')setDuck(false)});addEventListener('blur',()=>{keys.clear();if(state==='running')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause()});addEventListener('contextmenu',e=>e.preventDefault());
function createAhead(){let guard=0;while(spawnCursor<viewW+700&&guard++<10){const eta=Math.max(0,(spawnCursor-(runner.x+6))/C.speedAt(elapsed));const segment=C.makeSegment(spawnCursor,elapsed+eta,rng,runner.hp,viewW);spawnCursor+=segment.length;segments.push(segment);hazards.push(...segment.hazards);gaps.push(...segment.gaps);pickups.push(...segment.pickups)}}
function hit(){if(invuln>0||state!=='running')return;runner.hp--;invuln=1.35;hitPulse=.32;floaters.push({x:runner.x+16,y:runner.bottom-66,t:0,text:'−1 HP',color:'#ff819d'});if(runner.hp<=0)gameOver()}
function gameOver(){state='over';const rounded=Math.floor(score),newRecord=rounded>localBest;if(newRecord){localBest=rounded;try{localStorage.setItem('cyber-run-v04-best',String(localBest))}catch(_){}}
 ui.msg.textContent='SCORE '+rounded.toLocaleString()+' / '+Math.floor(travel/9).toLocaleString()+' m'+(newRecord?' — NEW BEST!':'');ui.start.textContent='もう一回';ui.overlay.classList.remove('hidden');setDuck(false)}
function step(dt){for(const f of floaters){f.t+=dt;f.y-=22*dt}floaters=floaters.filter(f=>f.t<.65);elapsed+=dt;hitPulse=Math.max(0,hitPulse-dt);invuln=Math.max(0,invuln-dt);rescue=Math.max(0,rescue-dt);const speed=C.speedAt(elapsed),move=speed*dt;travel+=move;score+=move*.23;spawnCursor-=move;
 for(const list of [hazards,gaps,pickups,segments])for(const thing of list)thing.x-=move;
 for(const h of hazards)if(h.kind==='moving')h.y=ground-87+Math.sin(elapsed*3.5+h.phase)*27;
 const p=playerRect(),overHole=gaps.some(g=>C.intersectsGap(p,g));
 if(overHole&&runner.jumps===0&&rescue<=0&&runner.bottom>=ground-1){hit();rescue=1.0;}
 runner.vy+=C.GRAVITY*dt;runner.bottom+=runner.vy*dt;
 if(runner.bottom>=ground&&(!overHole||rescue>0)){runner.bottom=ground;runner.vy=0;runner.jumps=0;runner.duck=duckHeld}
 if(runner.bottom>ground+112){hit();runner.bottom=ground;runner.vy=0;runner.jumps=0;rescue=1.0;invuln=Math.max(invuln,1.4)}
 const body=playerRect();
 for(const h of hazards){if(C.overlap(body,h)){hit();break}}
 for(const item of pickups){if(item.taken)continue;const midx=body.x+body.w/2,midy=body.y+body.h/2;const distance=Math.hypot(item.x-midx,item.y-midy);if(distance<item.r+17){item.taken=true;if(item.kind==='heart'){runner.hp=Math.min(3,runner.hp+1);floaters.push({x:item.x,y:item.y,t:0,text:'HP +1',color:'#ff819d'})}else{const points=item.kind==='gem'?400:100;score+=points;floaters.push({x:item.x,y:item.y,t:0,text:'+'+points,color:item.kind==='gem'?'#caa7ff':'#ffda87'})}}}
 hazards=hazards.filter(h=>h.x+h.w>-40);gaps=gaps.filter(g=>g.x+g.w>-40);pickups=pickups.filter(item=>!item.taken&&item.x>-40);segments=segments.filter(a=>a.x+a.length>-40);
 createAhead();currentRegion=elapsed<22?'NEON CITY':elapsed<48?'MACHINE DISTRICT':'ENERGY TUNNEL';ui.region.textContent=currentRegion;ui.score.textContent=Math.floor(score).toLocaleString();ui.hearts.textContent='♥ '.repeat(runner.hp)+'♡ '.repeat(3-runner.hp);ui.speed.textContent=(speed/C.BASE_SPEED).toFixed(1)+'×';ui.distance.textContent=Math.floor(travel/9).toLocaleString()+' m';
}
function draw(){
 const W=viewW,H=viewH,t=travel,velocity=C.speedAt(elapsed),intensity=Math.min(1,(velocity-C.BASE_SPEED)/(C.MAX_SPEED-C.BASE_SPEED)),colors=currentRegion==='MACHINE DISTRICT'?['#070b1d','#253354','#ff8db0']:currentRegion==='ENERGY TUNNEL'?['#0d0b26','#3c1f5c','#bd96ff']:['#081028','#16405b','#55d7fa'];
 const back=ctx.createLinearGradient(0,0,0,H);back.addColorStop(0,colors[0]);back.addColorStop(.85,colors[1]);back.addColorStop(1,'#0a2638');ctx.fillStyle=back;ctx.fillRect(0,0,W,H);
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

 for(const g of gaps){ctx.fillStyle='#050a19';ctx.fillRect(g.x,ground-1,g.w,H-ground+2);ctx.fillStyle='#f77c9c';ctx.fillRect(g.x-4,ground-2,4,15);ctx.fillRect(g.x+g.w,ground-2,4,15)}
 // Obstacles: each type must have its own silhouette at speed.
 for(const h of hazards){
  ctx.save();ctx.shadowBlur=9;ctx.shadowColor=h.kind==='bar'?'#fe67ba':'#f7806e';
  if(h.kind==='bar'){
   ctx.fillStyle='#eb4e9a';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#ffd0e5';for(let k=0;k<3;k++)ctx.fillRect(h.x+7+k*27,h.y+7,13,5);
  }else if(h.kind==='moving'){
   ctx.strokeStyle='#fe8c9d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+h.w/2,0);ctx.lineTo(h.x+h.w/2,h.y);ctx.stroke();
   ctx.fillStyle='#f77b60';ctx.beginPath();ctx.moveTo(h.x+h.w/2,h.y-4);ctx.lineTo(h.x+h.w,h.y+h.h/2);ctx.lineTo(h.x+h.w/2,h.y+h.h+4);ctx.lineTo(h.x,h.y+h.h/2);ctx.closePath();ctx.fill();
  }else{
   ctx.fillStyle=h.kind==='tall'?'#e76475':'#f59059';ctx.fillRect(h.x,h.y,h.w,h.h);
   ctx.fillStyle='#ffddab';ctx.beginPath();ctx.moveTo(h.x,h.y+12);ctx.lineTo(h.x+h.w/2,h.y-4);ctx.lineTo(h.x+h.w,h.y+12);ctx.fill();
   ctx.fillStyle='#632b4b';for(let k=12;k<h.h;k+=23)ctx.fillRect(h.x+5,h.y+k,h.w-10,4);
  }ctx.restore();
 }
 for(const item of pickups){
  ctx.save();ctx.shadowColor=item.kind==='heart'?'#ff70ae':item.kind==='gem'?'#ad8cff':'#ffd46d';ctx.shadowBlur=9;
  ctx.fillStyle=item.kind==='heart'?'#ff709a':item.kind==='gem'?'#b3a1ff':'#ffd66e';
  if(item.kind==='gem'){ctx.beginPath();ctx.moveTo(item.x,item.y-item.r);ctx.lineTo(item.x+item.r,item.y);ctx.lineTo(item.x,item.y+item.r);ctx.lineTo(item.x-item.r,item.y);ctx.closePath();ctx.fill()}
  else{ctx.beginPath();ctx.arc(item.x,item.y,item.r,0,2*Math.PI);ctx.fill();ctx.fillStyle='#fff8d8';ctx.beginPath();ctx.arc(item.x-2,item.y-2,2,0,2*Math.PI);ctx.fill()}
  if(item.kind==='heart'){ctx.fillStyle='#fff';ctx.fillRect(item.x-2,item.y-7,4,14);ctx.fillRect(item.x-7,item.y-2,14,4)}ctx.restore();
 }
 if(runner){
  const crouching=runner.duck&&runner.jumps===0,h=crouching?27:48,x=runner.x,y=runner.bottom-h;
  ctx.save();ctx.globalAlpha=invuln>0&&Math.floor(invuln*12)%2===0?.42:1;
  // Streamlines and legs visually explain speed and grounded movement.
  const stride=Math.sin(elapsed*(22+intensity*14))*5;
  ctx.fillStyle='#39dfc5';ctx.globalAlpha*=.2;
  for(let k=1;k<=3+Math.floor(intensity*4);k++)ctx.fillRect(x-k*(18+intensity*7),y+h*.65+k*3,14+k*(5+intensity*6),2);
  ctx.globalAlpha=invuln>0&&Math.floor(invuln*12)%2===0?.42:1;
  ctx.fillStyle='#24a8a9';ctx.fillRect(x+3,y+h-10,11,10);
  ctx.fillStyle='#7dffde';ctx.fillRect(x+8,y+6,23,h-16);
  ctx.fillStyle='#4dd9bc';ctx.fillRect(x+8,y,22,crouching?15:21);
  ctx.fillStyle='#123d54';ctx.fillRect(x+23,y+8,7,5);
  ctx.fillStyle='#ddfff5';ctx.fillRect(x+25,y+9,4,2);
  ctx.fillStyle='#62c6dd';ctx.fillRect(x,y+Math.min(24,h-6),10,7);
  if(!crouching){ctx.fillStyle='#66f6e0';ctx.fillRect(x+10,y+h-3,11,5+stride);ctx.fillRect(x+23,y+h-3,10,5-stride)}
  ctx.restore();
 }
 if(hitPulse>0){ctx.fillStyle='rgba(255,64,107,'+(hitPulse*.28)+')';ctx.fillRect(0,0,W,H)}
 for(const f of floaters){ctx.save();ctx.globalAlpha=Math.max(0,1-f.t/.65);ctx.fillStyle=f.color;ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);ctx.restore()}
}
function frame(now){if(state!=='running')return;let dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now; // substeps prevent tunneling at higher speed or low FPS
 while(dt>0&&state==='running'){const sub=Math.min(1/120,dt);step(sub);dt-=sub}draw();if(state==='running')nextFrame=requestAnimationFrame(frame)}
 draw();ui.best.textContent='BEST '+localBest.toLocaleString();
})();
