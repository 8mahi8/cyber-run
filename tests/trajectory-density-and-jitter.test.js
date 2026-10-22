const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
function actions(segment){return segment.script.filter(a=>a[1]==='jump'||a[1]==='duck-on').length}
test('replay supports independent per-action delay and detects a missed mandatory duck',()=>{
 const p=C.PATTERNS.find(p=>p.name==='reverse-switch');
 const segment=C.buildPattern(0,20,C.speedAt(20),p,C.randomizer(2),0);
 assert.ok(C.replayPattern(segment).ok);
 assert.equal(C.replayPattern(segment,{actionOffsets:[1,0,0]}).reason,'hazard');
});
test('late experimental movement plans increase linked-action density while retaining air and crouch roles',()=>{
 const byTime={};
 for(const time of [0,55,120]){
  let accepted=0,active=0,seconds=0,sky=0,mandatory=0,optional=0;
  for(let seed=1;seed<=240;seed++){
   const s=C.composeTrajectorySegment(250,time,C.randomizer(seed*33+7));
   if(!s)continue;accepted++;active+=actions(s);seconds+=s.pattern.duration;
   sky+=+(s.platforms.length>0);
   mandatory+=s.hazards.filter(h=>h.kind==='duck-gate').length;
   optional+=s.hazards.filter(h=>h.kind==='bar').length;
  }
  byTime[time]={accepted,actionsPer10:active*10/seconds,sky,mandatory,optional};
 }
 assert.ok(byTime[120].accepted>=130,JSON.stringify(byTime));
 assert.ok(byTime[120].actionsPer10>11.5,JSON.stringify(byTime));
 assert.ok(byTime[120].actionsPer10>byTime[0].actionsPer10+.8,JSON.stringify(byTime));
 assert.ok(byTime[120].sky>=60,'high-speed sections lost air gameplay');
 assert.ok(byTime[120].mandatory>=100&&byTime[120].optional>=100,'action choice variety missing');
});
test('accepted crowded routes survive four independent +/- 100ms perturbation probes',()=>{
 for(const time of [25,65,110])for(let seed=1;seed<=60;seed++){
  const s=C.composeTrajectorySegment(250,time,C.randomizer(seed*53+9));
  if(!s)continue;
  const actions=s.script;
  const probes=[
   actions.map((_,i)=>i%2===0?.10:-.10),
   actions.map((_,i)=>i%2===0?-.10:.10),
   actions.map((_,i)=>((Math.imul(i+17,1103515245)>>>24)/255-.5)*.20),
   actions.map((_,i)=>((Math.imul(i+47,1664525)>>>24)/255-.5)*.20)
  ];
  for(const actionOffsets of probes){
   assert.ok(C.replayPattern(s,{actionOffsets}).ok,'unfair crowded route at time '+time+' seed '+seed);
  }
 }
});
