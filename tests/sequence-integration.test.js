const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
// Continuous, accelerated world. Chunk entry times come from actual movement, not a
// perfect reset of time on each chunk. Exercises transitions with shared physics.
function sequence(patterns, startSeconds=0){
 const dt=C.DT,course=[];let secs=startSeconds,x=0;
 // Predict course entrances with the same 120Hz integrated acceleration.
 function estimatedSeconds(distance,start){let n=0,elapsed=0;while(n<distance){n+=C.speedAt(start+elapsed)*dt;elapsed+=dt}return elapsed}
 for(const pattern of patterns){const seg=C.buildPattern(x,secs,C.speedAt(secs),pattern,C.randomizer(1));course.push({seg,entry:secs});x+=seg.length;secs+=estimatedSeconds(seg.length,secs)}
 let player=C.makeRunner(0),walk=0,nextEvent=0,duck=false,last=-1;
 let events=course.flatMap(({seg,entry})=>seg.script.map(([at,action])=>({at:entry+at,action}))).sort((a,b)=>a.at-b.at);
 let hazards=course.flatMap(({seg})=>seg.hazards),gaps=course.flatMap(({seg})=>seg.gaps),platforms=course.flatMap(({seg})=>seg.platforms),pads=course.flatMap(({seg})=>seg.pads);
 for(let step=0;step<6000&&walk<x;step++){
  const time=startSeconds+step*dt;let request=false;
  while(nextEvent<events.length&&events[nextEvent].at<=time+1e-6){const e=events[nextEvent++];if(e.action==='jump')request=true;if(e.action==='duck-on')duck=true;if(e.action==='duck-off')duck=false}
  walk+=C.speedAt(time)*dt;
  C.physicsStep(player,dt,walk,platforms,gaps,duck,request,time,0,pads);
  if(player.bottom>C.GROUND+10)return {ok:false,why:'fall',time};
  if(hazards.some(h=>C.overlap(C.rectAt(walk,player.bottom,player.duck),C.hazardAt(h,time))))return {ok:false,why:'hazard',time};
 }
 return {ok:player.support==='ground',why:'handoff',walk};
}
test('a variety of consecutive courses remain passable with real acceleration',()=>{
 const rng=C.randomizer(2026);let checked=0,fail=[];
 for(const t of [0,15,40,85,150])for(let rep=0;rep<35;rep++){
  const eligible=C.PATTERNS.filter(p=>(p.minTime||0)<=t);
  const chosen=Array.from({length:4},()=>eligible[Math.floor(rng()*eligible.length)]);
  const ans=sequence(chosen,t);checked++;if(!ans.ok)fail.push({t,names:chosen.map(p=>p.name),...ans});
 }
 assert.deepEqual(fail,[],JSON.stringify(fail.slice(0,12)));
 assert.ok(checked>=175);
});
