#!/usr/bin/env node
/* CYBER RUN gameplay quality audit. Run on the development branch before any preview handoff.
 * The numbers are indicators, never a substitute for browser play and visual judgment.
 */
'use strict';
const C = require('../core.js');
const COUNT = 100;
const duration = 30;
const thresholds = { earlyGroundShareMax: .72, earlyAerialShareMin: .28 };
const aggregate = {
  earlyTotal: 0, earlyGround: 0, earlyAerial: 0, allTotal: 0,
  earlyKinds: {}, allKinds: {}, actionSignatures: {}, seenMovingPatterns: 0
};
for (let seed = 1; seed <= COUNT; seed++) {
  let rng=C.randomizer(seed), t=0, x=450, recent={};
  while(t<duration){
    const seg=C.makeSegment(x,t,rng,3,recent);
    if(!seg || !Number.isFinite(seg.length) || seg.length<=0)throw Error('Invalid segment at seed '+seed+', time '+t);
    const p=seg.pattern;
    const aerial=!!p.platforms?.length;
    const moving=!!p.hazards?.some(h=>h[1]==='moving');
    const signature=(aerial?'PLATFORM':'GROUND')+' '+(p.script||[]).map(a=>a[1]).join('/')+' '+(p.hazards||[]).map(h=>h[1]).join('/');
    aggregate.allTotal++;
    aggregate.allKinds[p.name]=(aggregate.allKinds[p.name]||0)+1;
    aggregate.actionSignatures[signature]=(aggregate.actionSignatures[signature]||0)+1;
    if (moving) aggregate.seenMovingPatterns++;
    if(t<12){
      aggregate.earlyTotal++;
      aggregate.earlyKinds[p.name]=(aggregate.earlyKinds[p.name]||0)+1;
      if(aerial)aggregate.earlyAerial++;
      else aggregate.earlyGround++;
    }
    // Estimated course entry time; indicative distribution check, not exact physics proof.
    t+=p.duration;
    x+=seg.length;
    recent={type:seg.type,theme:seg.theme};
  }
}
const pct=n=>Math.round(n*1000)/10;
const metrics={
  sampledSeeds:COUNT, samplingWindowSeconds:duration, earlyWindowSeconds:12,
  earlyGroundPercent:pct(aggregate.earlyGround/aggregate.earlyTotal),
  earlyAerialPercent:pct(aggregate.earlyAerial/aggregate.earlyTotal),
  differentActionSignatures:Object.keys(aggregate.actionSignatures).length,
  movingSegmentsIn30s:aggregate.seenMovingPatterns,
  earlyCourseCounts:aggregate.earlyKinds,
  allCourseCounts:aggregate.allKinds
};
const blockers=[];
const springSegments=(aggregate.allKinds['spring-overdrive']||0)+(aggregate.allKinds['spring-to-sky']||0);
if(springSegments<20)blockers.push('Spring jumps are rarely generated');
if(aggregate.earlyGround/aggregate.earlyTotal>thresholds.earlyGroundShareMax)
  blockers.push('Opening is dominated by ground-only action; improve meaningful early aerial sequences');
if(aggregate.earlyAerial/aggregate.earlyTotal<thresholds.earlyAerialShareMin)
  blockers.push('Opening offers too few aerial-action segments');
if(aggregate.seenMovingPatterns===0)
  blockers.push('No moving hazards actually appear in sampled runs, despite claims of diverse mechanics');
console.log(JSON.stringify({status:blockers.length?'NOT READY':'DISTRIBUTION CHECK PASSED',metrics,blockers},null,2));
if(blockers.length)process.exitCode=1;
