const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const TIMES=[0,5,12,20,40,65,100,140,200];

test('sky-climb layouts require two ordered platform landings',()=>{
 for(const name of ['sky-ascend','sky-ascend-duck']){
  const motif=C.PATTERNS.find(p=>p.name===name);assert.ok(motif,'missing '+name);
  assert.ok(motif.platforms[1][2]>motif.platforms[0][2],name+' must climb');
  for(const secs of TIMES.filter(x=>x>=motif.minTime)){
   const seg=C.buildPattern(100,secs,C.speedAt(secs),motif,C.randomizer(12));
   const trace=C.replayPattern(seg,{trace:true});assert.ok(trace.ok,name+' '+secs);
   const supports=trace.route.map(step=>step.support);
   const a=supports.indexOf(name+':0'),b=supports.indexOf(name+':1');
   assert.ok(a>=0&&b>a,'must visit both floors in order '+name+' '+secs);
   assert.equal(trace.route.at(-1).support,'ground');
   if(name==='sky-ascend-duck')assert.ok(trace.route.some(step=>step.support===name+':1'&&step.duck));
  }
 }
});

test('pre-certified micro-riffs are traversable at 9 speeds with input slack',()=>{
 let checks=0;
 for(const motif of C.PATTERNS){
  const riffs=motif.name==='rhythm-five'?[0,2]:motif.name==='aerial-surge'?[0,1]:[0,1,2,3];
  for(const secs of TIMES.filter(t=>t>=(motif.minTime||0))){
   for(const riff of riffs){
    const seg=C.buildPattern(250,secs,C.speedAt(secs),motif,C.randomizer(37),riff);
    for(const offset of [-.04,-.025,0,.025,.04]){
     const r=C.replayPattern(seg,{offset});
     assert.ok(r.ok,`${motif.name} riff ${riff} at ${secs}s offset ${offset}: ${JSON.stringify(r)}`);
     checks++;
    }
   }
  }
 }
 assert.ok(checks>3000,`wanted broad coverage, got ${checks}`);
});

test('generated riffs preserve a no-damage witness for numerous seeds and stages',()=>{
 let checks=0;
 for(let seed=1;seed<=80;seed++){
  let t=0,x=300,rng=C.randomizer(seed),previous={};
  for(let i=0;i<32;i++){
   const s=C.makeSegment(x,t,rng,3,previous);
   assert.ok([0,1,2,3].includes(s.riff));
   assert.ok(s.type!=='rhythm-five'||[0,2].includes(s.riff));
   assert.ok(s.type!=='aerial-surge'||[0,1].includes(s.riff));
   const r=C.replayPattern(s,{offset:0});
   assert.ok(r.ok,`seed=${seed} at=${t.toFixed(2)} ${s.type} riff=${s.riff}: ${JSON.stringify(r)}`);
   checks++;x+=s.length;t+=C.timeToTravel(t,s.length);previous={type:s.type,theme:s.theme};
  }
 }
 assert.ok(checks>=2500);
});
