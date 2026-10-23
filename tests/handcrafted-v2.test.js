'use strict';
/* node tests/handcrafted-v2.test.js
 * CIRCUIT STUDY V2 is a fixed physics test bench, not the final infinite runner.
 * Simulates the SAME core physics at 120Hz and continuous cross-section handoff.
 */
const assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level-v2.js');
assert.equal(H.totalSections,13,'expected authored study section count');
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
assert.equal(coins,133,'expected guide coin count after physic witness');
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
console.log('PASS: 13 sections, '+coins+' non-scoring guide coins, '+entry.toFixed(2)+'s, 120Hz continuous replay, ±80ms alternating input jitter');
