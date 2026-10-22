const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
// Each input uses its own independent time offset, not a single global script shift.
// This tests mechanical fairness, not whether the game is subjectively fun.
function runFiveCourses(start,seed,jitter){
 let x=0,when=start,random=C.randomizer(seed),recent={},courses=[];
 for(let i=0;i<5;i++){
  const segment=C.makeSegment(x,when,random,3,recent);
  courses.push({segment,startTime:when});
  x+=segment.length;when+=C.timeToTravel(when,segment.length);
  recent={type:segment.type,theme:segment.theme,
   recentTypes:[...(recent.recentTypes||[]),segment.type].slice(-3),
   recentThemes:[...(recent.recentThemes||[]),segment.theme].slice(-2)};
 }
 const hazards=courses.flatMap(a=>a.segment.hazards),gaps=courses.flatMap(a=>a.segment.gaps),
  pads=courses.flatMap(a=>a.segment.pads),platforms=courses.flatMap(a=>a.segment.platforms);
 const rng=C.randomizer(seed+7788);
 const events=courses.flatMap(({segment,startTime})=>segment.script.map(([offset,action])=>({
  at:startTime+offset+(rng()*2-1)*jitter,action
 }))).sort((a,b)=>a.at-b.at);
 const runner=C.makeRunner(0);let walk=0,event=0,duck=false,frame=0;
 while(walk<x&&frame<3600){
  const now=start+frame*C.DT;let jump=false;
  while(event<events.length&&events[event].at<=now+1e-6){
   const action=events[event++].action;
   if(action==='jump')jump=true;
   if(action==='duck-on')duck=true;
   if(action==='duck-off')duck=false;
  }
  walk+=C.speedAt(now)*C.DT;
  C.physicsStep(runner,C.DT,walk,platforms,gaps,duck,jump,now,0,pads);
  if(runner.bottom>C.GROUND+10)return false;
  const body=C.rectAt(walk+C.HITBOX_OFFSET_X,runner.bottom,runner.duck);
  if(hazards.some(h=>C.overlap(body,C.hazardAt(h,now))))return false;
  frame++;
 }
 return runner.support==='ground'&&runner.jumps===0;
}
test('independent ±60 ms errors allow five linked courses, including 1150 speed',()=>{
 let pass=0,total=0;
 for(const start of [0,20,65,110])for(let seed=1;seed<=250;seed++){
  pass+=+runFiveCourses(start,seed,.06);total++;
 }
 assert.ok(pass/total>=.999,`only ${pass}/${total} safe`);
});
test('independent ±80/100 ms input drift retains usable success margins',()=>{
 for(const [jitter,minimum] of [[.08,.992],[.10,.972]]){
  let pass=0,total=0;
  for(const start of [0,20,65,110])for(let seed=1;seed<=400;seed++){
   pass+=+runFiveCourses(start,seed,jitter);total++;
  }
  assert.ok(pass/total>=minimum,`±${jitter}s: ${pass}/${total} across 5 linked courses`);
 }
});
