(()=>{'use strict';
const C=window.CyberRunCore,canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false}),$=id=>document.getElementById(id);if(!ctx||!C){$('message').textContent='ゲームを初期化できませんでした。';return}
const ui={overlay:$('overlay'),msg:$('message'),start:$('primary'),score:$('score'),best:$('best'),distance:$('distance'),speed:$('speed'),hearts:$('hearts'),region:$('region'),duck:$('duck'),jump:$('jump')};
let viewW=960,viewH=540,s=1,dpr=1,ground=C.GROUND,state='menu',runner=null,segments=[],hazards=[],gaps=[],pickups=[],seed=0,rng=null,spawnCursor=0,elapsed=0,travel=0,score=0,invuln=0,rescue=0,nextFrame=0,lastFrame=0,gameId=0,duckHeld=false,localBest=0,currentRegion='NEON CITY';
try{localBest=Number(localStorage.getItem('cyber-run-v02-best'))||0}catch(_){/* storage may be blocked */}
function resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);s=h/viewH;viewW=w/s;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr*s,0,0,dpr*s,0,0);ctx.imageSmoothingEnabled=true}
addEventListener('resize',resize);resize();
function makeRunner(){return {x:Math.max(86,viewW*.19),bottom:ground,vy:0,jumps:0,duck:false,hp:3}}
function playerRect(){const height=runner.duck&&runner.jumps===0?27:48;return{x:runner.x+6,y:runner.bottom-height+4,w:21,h:height-7}}
function isOnGround(){return runner.jumps===0&&Math.abs(runner.bottom-ground)<.01}
function jump(){if(state!=='running'||runner.jumps>=2)return;runner.duck=false;runner.vy=runner.jumps===0?-C.FIRST_JUMP:-C.SECOND_JUMP;runner.jumps++}
function setDuck(value){if(!runner)return;duckHeld=!!value&&state==='running';runner.duck=duckHeld&&isOnGround();ui.duck.classList.toggle('pressed',duckHeld)}
function start(){gameId++;seed=((Date.now()^Math.floor(performance.now()*10000))>>>0)||1;rng=C.randomizer(seed);runner=makeRunner();segments=[];hazards=[];gaps=[];pickups=[];spawnCursor=viewW+150;elapsed=0;travel=0;score=0;invuln=0;rescue=0;duckHeld=false;state='running';ui.overlay.classList.add('hidden');ui.best.textContent='BEST '+localBest.toLocaleString();lastFrame=performance.now();cancelAnimationFrame(nextFrame);nextFrame=requestAnimationFrame(frame)}
function pause(){if(state==='running'){state='paused';ui.msg.textContent='一時停止中';ui.start.textContent='再開';ui.overlay.classList.remove('hidden');setDuck(false)}else if(state==='paused'){resume()}}
function resume(){state='running';ui.overlay.classList.add('hidden');lastFrame=performance.now();nextFrame=requestAnimationFrame(frame)}
ui.start.addEventListener('click',()=>state==='paused'?resume():start());$('pause').addEventListener('click',pause);
function bind(button,down,up){button.addEventListener('pointerdown',e=>{e.preventDefault();try{button.setPointerCapture(e.pointerId)}catch(_){}button.classList.add('pressed');down()});['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,e=>{e.preventDefault();button.classList.remove('pressed');if(up)up()}))}
bind(ui.jump,jump);bind(ui.duck,()=>setDuck(true),()=>setDuck(false));
const keys=new Set();addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();if(keys.has(e.code))return;keys.add(e.code);if(['ArrowUp','Space'].includes(e.code))jump();if(e.code==='ArrowDown')setDuck(true);if(e.code==='Escape'||e.code==='KeyP')pause()});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ArrowDown')setDuck(false)});addEventListener('blur',()=>{keys.clear();if(state==='running')pause()});addEventListener('contextmenu',e=>e.preventDefault());
function createAhead(){let guard=0;while(spawnCursor<viewW+700&&guard++<10){const segment=C.makeSegment(spawnCursor,elapsed,rng,runner.hp,viewW);spawnCursor+=segment.length;segments.push(segment);hazards.push(...segment.hazards);gaps.push(...segment.gaps);pickups.push(...segment.pickups)}}
function hit(){if(invuln>0||state!=='running')return;runner.hp--;invuln=1.35;if(runner.hp<=0)gameOver()}
function gameOver(){state='over';const rounded=Math.floor(score);if(rounded>localBest){localBest=rounded;try{localStorage.setItem('cyber-run-v02-best',String(localBest))}catch(_){}}
 ui.msg.textContent='SCORE '+rounded.toLocaleString()+' / '+Math.floor(travel/9).toLocaleString()+' m'+(rounded===localBest?' — BEST!':'');ui.start.textContent='もう一回';ui.overlay.classList.remove('hidden');setDuck(false)}
function step(dt){elapsed+=dt;invuln=Math.max(0,invuln-dt);rescue=Math.max(0,rescue-dt);const speed=C.speedAt(elapsed),move=speed*dt;travel+=move;score+=move*.23;spawnCursor-=move;
 for(const list of [hazards,gaps,pickups,segments])for(const thing of list)thing.x-=move;
 for(const h of hazards)if(h.kind==='moving')h.y=ground-87+Math.sin(elapsed*3.5+h.phase)*27;
 const p=playerRect(),overHole=gaps.some(g=>C.intersectsGap(p,g));
 if(overHole&&runner.jumps===0&&rescue<=0&&runner.bottom>=ground-1){hit();rescue=1.0;}
 runner.vy+=C.GRAVITY*dt;runner.bottom+=runner.vy*dt;
 if(runner.bottom>=ground&&(!overHole||rescue>0)){runner.bottom=ground;runner.vy=0;runner.jumps=0;runner.duck=duckHeld}
 if(runner.bottom>ground+112){hit();runner.bottom=ground;runner.vy=0;runner.jumps=0;rescue=1.0;invuln=Math.max(invuln,1.4)}
 const body=playerRect();
 for(const h of hazards){if(C.overlap(body,h)){hit();break}}
 for(const item of pickups){if(item.taken)continue;const midx=body.x+body.w/2,midy=body.y+body.h/2;const distance=Math.hypot(item.x-midx,item.y-midy);if(distance<item.r+17){item.taken=true;if(item.kind==='heart')runner.hp=Math.min(3,runner.hp+1);else score+=item.kind==='gem'?400:100}}
 hazards=hazards.filter(h=>h.x+h.w>-40);gaps=gaps.filter(g=>g.x+g.w>-40);pickups=pickups.filter(item=>!item.taken&&item.x>-40);segments=segments.filter(a=>a.x+a.length>-40);
 createAhead();currentRegion=elapsed<45?'NEON CITY':elapsed<95?'MACHINE DISTRICT':'ENERGY TUNNEL';ui.region.textContent=currentRegion;ui.score.textContent=Math.floor(score).toLocaleString();ui.hearts.textContent='♥ '.repeat(runner.hp)+'♡ '.repeat(3-runner.hp);ui.speed.textContent=(speed/C.BASE_SPEED).toFixed(1)+'×';ui.distance.textContent=Math.floor(travel/9).toLocaleString()+' m';
}
function draw(){const W=viewW,H=viewH;const back=ctx.createLinearGradient(0,0,0,H);back.addColorStop(0,'#080e21');back.addColorStop(.7,currentRegion==='MACHINE DISTRICT'?'#182743':currentRegion==='ENERGY TUNNEL'?'#2a173c':'#102e4b');back.addColorStop(1,'#0e293d');ctx.fillStyle=back;ctx.fillRect(0,0,W,H);
 const t=travel;ctx.save();ctx.globalAlpha=.45;for(let i=0;i<35;i++){const x=((i*127-t*.2)%(W+160)+(W+160))%(W+160)-80;const tall=80+(i*71%142);ctx.fillStyle=i%3===0?'#23325f':'#153d61';ctx.fillRect(x,ground-tall,78,tall);ctx.fillStyle=i%4===0?'#c56bdb':'#4eafd9';for(let j=0;j<5;j++)ctx.fillRect(x+9,ground-tall+12+j*22,14,3)}ctx.restore();
 ctx.fillStyle='#172d40';ctx.fillRect(0,ground,W,H-ground);ctx.fillStyle='#43cbe1';ctx.fillRect(0,ground,W,5);
 for(const g of gaps){ctx.fillStyle='#060d1d';ctx.fillRect(g.x,ground-1,g.w,H-ground+2);ctx.fillStyle='#ff7388';ctx.fillRect(g.x-3,ground-1,3,13);ctx.fillRect(g.x+g.w,ground-1,3,13)}
 ctx.save();ctx.lineWidth=2;for(const h of hazards){ctx.fillStyle=h.kind==='bar'?'#c45ba0':'#f8825c';ctx.strokeStyle='#ffb0a4';ctx.fillRect(h.x,h.y,h.w,h.h);ctx.strokeRect(h.x+2,h.y+2,h.w-4,h.h-4);if(h.kind==='moving'){ctx.strokeStyle='#fb8491';ctx.beginPath();ctx.moveTo(h.x+h.w/2,0);ctx.lineTo(h.x+h.w/2,h.y);ctx.stroke()}}ctx.restore();
 for(const item of pickups){ctx.beginPath();ctx.arc(item.x,item.y,item.r,0,Math.PI*2);ctx.fillStyle=item.kind==='heart'?'#ff5d9f':item.kind==='gem'?'#b0a5ff':'#ffd574';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=13;ctx.fill();ctx.shadowBlur=0;if(item.kind==='heart'){ctx.fillStyle='#fff';ctx.fillRect(item.x-2,item.y-7,4,14);ctx.fillRect(item.x-7,item.y-2,14,4)}}
 if(runner){ctx.globalAlpha=invuln>0&&Math.floor(invuln*12)%2===0?.4:1;const height=runner.duck&&runner.jumps===0?27:48;const x=runner.x,y=runner.bottom-height;ctx.fillStyle='#55f5c6';ctx.fillRect(x,y,32,height);ctx.fillStyle='#19566b';ctx.fillRect(x+21,y+9,6,6);ctx.fillStyle='#b2fff1';ctx.fillRect(x-9,y+height-9,8,5);ctx.globalAlpha=1}
 ctx.strokeStyle='#3cdaf066';ctx.lineWidth=2;for(let i=0;i<12;i++){const x=((i*141-t*.85)%(W+180)+(W+180))%(W+180)-90;ctx.beginPath();ctx.moveTo(x,ground+26+i%3*20);ctx.lineTo(x-50,ground+26+i%3*20);ctx.stroke()}
}
function frame(now){if(state!=='running')return;let dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now; // substeps prevent tunneling at higher speed or low FPS
 while(dt>0&&state==='running'){const sub=Math.min(1/120,dt);step(sub);dt-=sub}draw();if(state==='running')nextFrame=requestAnimationFrame(frame)}
 draw();ui.best.textContent='BEST '+localBest.toLocaleString();
})();
