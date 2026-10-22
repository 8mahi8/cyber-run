const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
// Replays several chunks together with the real acceleration curve.
function replaySequence(patterns,now=0){
 const dt=C.DT,course=[];let start=now,x=0;
 const duration=(distance,t)=>{let d=0,s=0;while(d<distance){d+=C.speedAt(t+s)*dt;s+=dt}return s};
 for(const p of patterns){const seg=C.buildPattern(x,start,C.speedAt(start),p,C.randomizer(1));course.push({seg,start});x+=seg.length;start+=duration(seg.length,start)}
 const actions=course.flatMap(({seg,start})=>seg.script.map(([t,action])=>({at:start+t,action}))).sort((a,b)=>a.at-b.at);
 const hazards=course.flatMap(x=>x.seg.hazards),platforms=course.flatMap(x=>x.seg.platforms),gaps=course.flatMap(x=>x.seg.gaps);
 const player=C.makeRunner(0);let walk=0,next=0,duck=false;
 for(let frame=0;frame<6500&&walk<x;frame++){
  const t=now+frame*dt;let jump=false;
  while(next<actions.length&&actions[next].at<=t+1e-6){const action=actions[next++].action;if(action==='jump')jump=true;if(action==='duck-on')duck=true;if(action==='duck-off')duck=false}
  walk+=C.speedAt(t)*dt;C.physicsStep(player,dt,walk,platforms,gaps,duck,jump,t);
  if(player.bottom>C.GROUND+10)return false;
  if(hazards.some(h=>C.overlap(C.rectAt(walk,player.bottom,player.duck),C.hazardAt(h,t))))return false;
 }
 return player.support==='ground';
}
test('175 four-course sequences stay traversable across speed tiers',()=>{
 const rng=C.randomizer(2026);let checked=0;
 for(const t of [0,15,40,85,150])for(let i=0;i<35;i++){
  const choices=C.PATTERNS.filter(p=>(p.minTime||0)<=t);
  const set=Array.from({length:4},()=>choices[Math.floor(rng()*choices.length)]);
  assert.ok(replaySequence(set,t),t+' '+set.map(x=>x.name).join(','));
  checked++;
 }
 assert.ok(checked>=175);
});