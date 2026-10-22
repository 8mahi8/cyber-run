#!/usr/bin/env node
'use strict';
// Developer-only benchmark. Runtime milliseconds depend on hardware/JIT, never CI gate.
const C=require('../core.js'),{performance}=require('node:perf_hooks');
const qty=Number(process.env.RUNS||400);
if(!Number.isInteger(qty)||qty<10||qty>10000)throw Error('RUNS must be 10..10000');
const percentile=(a,p)=>a[Math.max(0,Math.min(a.length-1,Math.floor((a.length-1)*p)))];
for(const start of [0,20,55,80,120]){
 const elapsed=[],totals={accepted:0,stairs:0,aerial:0,actions:0,duration:0};
 for(let seed=1;seed<=qty;seed++){
  const rng=C.randomizer(seed*231+19),before=performance.now();
  const segment=C.composeTrajectorySegment(500,start,rng);
  elapsed.push(performance.now()-before);
  if(segment){
   totals.accepted++;
   totals.stairs+=+(segment.platforms.length===2);
   totals.aerial+=+(segment.platforms.length>0);
   totals.actions+=segment.script.filter(a=>a[1]==='jump'||a[1]==='duck-on').length;
   totals.duration+=segment.pattern.duration;
  }
 }
 elapsed.sort((a,b)=>a-b);
 console.log(JSON.stringify({startSeconds:start,samples:qty,...totals,
  actionsPer10:totals.duration?Number((10*totals.actions/totals.duration).toFixed(2)):0,
  timingMs:{p50:percentile(elapsed,.5),p95:percentile(elapsed,.95),p99:percentile(elapsed,.99),max:elapsed[elapsed.length-1]}}));
}
