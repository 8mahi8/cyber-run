const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
test('experimental composer plans character actions before it derives collision geometry',()=>{
 let sampled=0,rejected=0,sky=0,ground=0,withGaps=0,multi=0;
 for(const time of [0,12,35,80,120]){
  for(let seed=1;seed<=60;seed++){
   const rng=C.randomizer(seed*101+13),planned=C.trajectoryComposition(time,C.randomizer(seed*101+13));
   assert.ok(planned.script.length>=4&&planned.needs.length>=3);
   const built=C.composeTrajectorySegment(1000,time,rng);
   if(!built){rejected++;continue} // Invalid movement scripts must be safely rejected.
   assert.equal(built.origin,'trajectory-first');
   // A rejected first plan may be retried, so compare against the accepted
   // route's own action-first blueprint, not the first random draft.
   assert.equal(built.script.length,built.pattern.script.length);
   assert.ok(built.script.length>=built.planCount,'each move contributes an input');
   assert.equal(built.hazards.length+built.gaps.length,built.pattern.hazards.length+built.pattern.gaps.length);
   assert.equal(built.platforms.length,built.pattern.platforms.length);
   assert.ok(built.pattern.duration>0&&built.length>0);
   assert.ok(C.replayPattern(built).ok,'planned runner cannot complete synthesized geometry');
   assert.ok(built.hazards.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)));
   assert.ok(built.gaps.every(g=>g.w>0&&Number.isFinite(g.x)));
   if(built.platforms.length){
    sky++;
    const trace=C.replayPattern(built,{trace:true});
    assert.ok(trace.route.some(p=>p.support==='trace-route:0'),'derived platform was not traversed');
   }else ground++;
   if(built.gaps.length)withGaps++;
   if(built.script.filter(x=>x[1]==='jump'||x[1]==='duck-on').length>=5)multi++;
   sampled++;
  }
 }
 assert.ok(sampled>=185,'too many rejected experimental scripts: '+sampled+'/300');
 assert.ok(rejected>0,'generator should visibly reject incompatible candidates');
 assert.ok(sky>=50&&ground>=50&&withGaps>=50&&multi>=100,
   JSON.stringify({sampled,sky,ground,withGaps,multi}));
});
test('trajectory generation is deterministic for equal seeds and time',()=>{
 for(const time of [0,15,100])for(let seed=1;seed<=20;seed++){
  const a=C.composeTrajectorySegment(500,time,C.randomizer(seed));
  const b=C.composeTrajectorySegment(500,time,C.randomizer(seed));
  assert.deepEqual(a,b);
 }
});
test('the experimental route generator is not silently enabled for the playable V0.6 build',()=>{
 assert.equal(globalThis.CYBER_RUN_V07_EXPERIMENTAL,undefined);
 const a=C.makeSegment(500,25,C.randomizer(4),3,{});
 assert.notEqual(a.origin,'trajectory-first');
});
