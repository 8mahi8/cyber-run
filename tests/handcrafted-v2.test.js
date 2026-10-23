'use strict';
/* node tests/handcrafted-v2.test.js
 * CIRCUIT STUDY V2 is a fixed physics test bench, not the final infinite runner.
 * Simulates the SAME core physics at 120Hz and continuous cross-section handoff.
 */
const assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level-v2.js');
assert.equal(H.totalSections,16,'expected study section count');
assert(H.SECTIONS.some(s=>s.base==='relay-bridge'),'bespoke relay chain must be present');
assert(H.SECTIONS.some(s=>s.base==='skyline-exit'));
assert(H.SECTIONS.some(s=>s.base==='tunnel-bridge'));
const warmup=['reverse-switch','sky-ascend','drop-and-duck'];
assert.deepEqual(H.SECTIONS.slice(0,3).map(x=>x.base),warmup);
const initDist=C.BASE_SPEED*1.45;
const distance=t=>t<=100?400*t+3.75*t*t:77500+1150*(t-100);
let cursor=initDist,entry=C.timeToTravel(0,cursor),coins=0,segments=[],commands=[];
for(let i=0;i<H.totalSections;i++){
 const s=H.makeSection(i,cursor,entry);
 assert.equal(s.authoredSection,i);
 const replay=C.replayPattern(s,{trace:true});
 assert(replay.ok,'standalone witnessed physics failed: '+s.type);
 assert(s.pickups.length>=5,'empty coin trail: '+s.type);
 // Every guide coin must be collectable on the certified route without
 // overlapping a hazard silhouette. Coins are guidance, not random decoration.
 for(const coin of s.pickups){
  let witness=replay.route[0],best=Infinity;
  for(const tick of replay.route){
   const dx=Math.abs(tick.worldX+C.HITBOX_OFFSET_X+C.BODY_W/2-coin.x);
   if(dx<best){best=dx;witness=tick}
  }
  const midX=witness.worldX+C.HITBOX_OFFSET_X+C.BODY_W/2;
  const midY=witness.bottom-(witness.duck?C.DUCK_H/2:C.STAND_H/2);
  assert(Math.hypot(midX-coin.x,midY-coin.y)<=coin.r+17,
   'guide coin not collectable along certified safe movement: '+s.type);
  for(const hazard of s.hazards){
   const rect=C.hazardAt(hazard,s.seconds+witness.time);
   const dx=Math.max(rect.x-coin.x,0,coin.x-rect.x-rect.w);
   const dy=Math.max(rect.y-coin.y,0,coin.y-rect.y-rect.h);
   assert(Math.hypot(dx,dy)>=coin.r,
    'guide coin overlaps hazard: '+s.type+' '+hazard.kind);
  }
 }
 for(const coin of s.pickups){
  assert.equal(coin.kind,'guide-coin');
  assert.equal(coin.taken,false);
  assert(coin.x>=s.x&&coin.x<=s.x+s.length,'coin outside section: '+s.type);
  assert(coin.r>0);
  assert.equal(Object.hasOwn(coin,'value'),false,'coin must not award score');
 }
 coins+=s.pickups.length;
 for(const [t,cmd] of s.script)commands.push({t:entry+t,cmd});
 segments.push(s);
 cursor+=s.length;
 entry+=s.pattern.duration;
}
assert.equal(coins,180,'expected guide coin count after physics witness');
// Guard against visually impressive but mechanically optional elevated routes.
// Deleting either of the first two jumps must now make the relay/tunnel impassable,
// across low, mid and capped running speed. A missing jump used to be survivable.
for(const name of ['relay-bridge','tunnel-bridge']){
 const section=H.SECTIONS.findIndex(s=>s.base===name);
 assert(section>=0,'missing crafted chain '+name);
 for(const seconds of [0,20,40,70,100]){
  const course=H.makeSection(section,0,seconds);
  assert(C.replayPattern(course).ok,'crafted chain baseline failed '+name+' '+seconds);
  const jumps=course.pattern.script.flatMap((action,i)=>action[1]==='jump'?[i]:[]);
  assert(jumps.length>=3,'expected consecutive jumps');
  for(const omitted of jumps.slice(0,2)){
   const copy={...course,pattern:{...course.pattern,
    script:course.pattern.script.filter((_,i)=>i!==omitted)}};
   assert(!C.replayPattern(copy).ok,
    'unexpected shortcut that bypasses elevated motion '+name+' action '+omitted+' at '+seconds);
  }
  const jitter=course.pattern.script.map((_,i)=>i%2?.08:-.08);
  assert(C.replayPattern(course,{actionOffsets:jitter}).ok,
   'crafted mandatory jumps must tolerate alternating +/-80ms: '+name+' at '+seconds);
 }
}

const springIndex=H.SECTIONS.findIndex(s=>s.base==='spring-pressure');
assert(springIndex>=3,'spring mechanism must occur after warmup');
for(const at of [0,20,50,100]){
 const stage=H.makeSection(springIndex,0,at);
 assert(C.replayPattern(stage).ok,'spring stage must clear at speed corresponding to '+at+'s');
 assert(!C.replayPattern({...stage,pads:[]}).ok,'spring must actually be necessary: '+at+'s');
 const path=C.replayPattern(stage,{trace:true}).route;
 assert(path.some(s=>s.support&&s.support!=='ground'), 'spring stage should visit elevated platform');
}

const warmupEnd=C.timeToTravel(0,initDist)+segments.slice(0,3).reduce((sum,s)=>sum+s.pattern.duration,0);
assert(warmupEnd>9&&warmupEnd<11,'fixed opening should be ~10s');
function testStitched(offset){
 const runner=C.makeRunner(0),plats=segments.flatMap(s=>s.platforms),gaps=segments.flatMap(s=>s.gaps),pads=segments.flatMap(s=>s.pads),hazards=segments.flatMap(s=>s.hazards);
 const queue=commands.map((x,i)=>({...x,t:x.t+(i%2?offset:-offset)})).sort((a,b)=>a.t-b.t);
 let ix=0,held=false;
 for(let step=0;step<Math.ceil((entry+.4)/C.DT);step++){
  const now=step*C.DT,x=distance(now);
  let jump=false;
  while(ix<queue.length&&queue[ix].t<=now+1e-6){
   const cmd=queue[ix++].cmd;
   if(cmd==='jump')jump=true;
   if(cmd==='duck-on')held=true;
   if(cmd==='duck-off')held=false;
  }
  C.physicsStep(runner,C.DT,x,plats,gaps,held,jump,now,0,pads);
  const hitbox=C.rectAt(x+C.HITBOX_OFFSET_X,runner.bottom,runner.duck);
  assert(runner.bottom<=C.GROUND+10,'fell at '+now.toFixed(3)+'s with jitter '+offset);
  for(const h of hazards){
   assert(!C.overlap(hitbox,C.hazardAt(h,now)), 'hazard '+h.kind+' at '+now.toFixed(3)+'s with jitter '+offset);
  }
 }
}
for(const offset of [0,.025,.045,.06,.08])testStitched(offset);
console.log('PASS: 16 sections, '+coins+' non-scoring guide coins, '+entry.toFixed(2)+'s, 120Hz continuous replay, ±80ms alternating input jitter');
