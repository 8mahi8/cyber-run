const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
test('motion-first plans bound expensive sky-stage simulations but keep true double-floor runs',()=>{
 let twoFloors=0,airbornePlans=0,total=0;
 for(const start of [0,20,55,100,120])for(let seed=1;seed<=160;seed++){
  const p=C.trajectoryComposition(start,C.randomizer(seed*123+7));
  const sky=p.needs.filter(n=>n.kind==='platform');
  assert.ok(sky.length<=2,'unbounded multi-floor plan: '+sky.length);
  if(sky.length===2)twoFloors++;
  if(sky.length>0)airbornePlans++;
  total++;
 }
 assert.ok(twoFloors>80,'multi-tier stair sequences disappeared');
 assert.ok(airbornePlans>180,'sky routes are no longer frequent enough');
 assert.equal(total,800);
});
test('successful late-game synthesized paths preserve capped real platforms and action links',()=>{
 let accepted=0,stairs=0,dense=0;
 for(let time of [55,120])for(let seed=1;seed<=200;seed++){
  const s=C.composeTrajectorySegment(1600,time,C.randomizer(seed*199+4));
  if(!s)continue;accepted++;
  assert.ok(s.platforms.length<=2,'generated unexpected number of elevated floors');
  assert.ok(C.replayPattern(s).ok,'accepted route is not really passable');
  if(s.platforms.length===2)stairs++;
  const actionCount=s.script.filter(x=>x[1]==='jump'||x[1]==='duck-on').length;
  dense+=+(actionCount>=6);
 }
 assert.ok(accepted>=250,'route rejection rate too high: '+accepted);
 assert.ok(stairs>=90,'actual sky stair courses missing: '+stairs);
 assert.ok(dense>=140,'lost connected interaction density: '+dense);
});