#!/usr/bin/env node
/* Gameplay quality audit: indicators only. Passing cannot replace browser self-play. */
'use strict';
const C=require('../core.js');
const SAMPLES=100, WINDOW=30, EARLY=12;
let total=0,early=0,ground=0,aerial=0,moving=0;
const kinds={},earlyKinds={},actions={};
for(let seed=1;seed<=SAMPLES;seed++){
 let t=0,x=450,rng=C.randomizer(seed),recent={};
 while(t<WINDOW){
  const s=C.makeSegment(x,t,rng,3,recent);
  if(!s||!Number.isFinite(s.length)||s.length<=0)throw Error('Invalid generated course: '+seed+','+t);
  const p=s.pattern,isAerial=!!p.platforms?.length,isMoving=!!p.hazards?.some(h=>h[1]==='moving');
  total++;kinds[s.type]=(kinds[s.type]||0)+1;
  const key=(isAerial?'AIR':'GROUND')+'|'+p.script.map(i=>i[1]).join('>')+'|'+p.hazards.map(i=>i[1]).join('>');
  actions[key]=(actions[key]||0)+1;if(isMoving)moving++;
  if(t<EARLY){early++;earlyKinds[s.type]=(earlyKinds[s.type]||0)+1;if(isAerial)aerial++;else ground++;}
  t+=p.duration;x+=s.length;recent={type:s.type,theme:s.theme};
 }
}
const groundShare=ground/early,airShare=aerial/early;
const blockers=[];
if(groundShare>.75)blockers.push('Early play dominated by ground action');
if(airShare<.16)blockers.push('Too few aerial sequences in the opening');
if(!moving)blockers.push('No moving-hazard gameplay in sampled runs');
const report={status:blockers.length?'NOT READY':'DISTRIBUTION CHECK PASSED',samples:SAMPLES,seconds:WINDOW,earlyWindow:EARLY,earlyGroundPercent:+(groundShare*100).toFixed(1),earlyAerialPercent:+(airShare*100).toFixed(1),movingSegments:moving,actionSignatures:Object.keys(actions).length,earlyCourseCounts:earlyKinds,allCourseCounts:kinds,blockers};
console.log(JSON.stringify(report,null,2));if(blockers.length)process.exitCode=1;
