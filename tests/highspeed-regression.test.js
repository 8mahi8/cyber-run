const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
test('v0.6 cap is higher but is not reached in the first minute',()=>{
 assert.equal(C.BASE_SPEED,400);
 assert.equal(C.MAX_SPEED,1150);
 assert.ok(C.speedAt(60)<C.MAX_SPEED);
 assert.ok(C.speedAt(90)<C.MAX_SPEED);
 assert.equal(C.speedAt(100),C.MAX_SPEED);
 assert.equal(C.speedAt(200),C.MAX_SPEED);
});
test('future chunk timing matches the integrated acceleration curve',()=>{
 const dt=C.DT;
 for(const start of [0,14,59,93,105,180])for(const travelSeconds of [.5,1.5,3.2,5.5]){
  let covered=0,t=0;while(t<travelSeconds){covered+=C.speedAt(start+t)*dt;t+=dt}
  const computed=C.timeToTravel(start,covered);
  assert.ok(Math.abs(computed-travelSeconds)<.014,{start,travelSeconds,computed}.toString());
 }
});
test('spring pad launches the runner and does not require a new button',()=>{
 const p=C.makeRunner(100),pad={id:'a',x:90,w:48,y:C.GROUND};
 C.physicsStep(p,C.DT,100,[],[],false,false,1,0,[pad]);
 assert.ok(p.vy<-C.FIRST_JUMP,'spring should launch higher than ordinary jump');
 assert.equal(p.support,null);
 assert.equal(p.jumps,1,'player retains an optional second jump');
});
test('all spring motifs have reachable routes at multiple speed tiers',()=>{
 const springs=C.PATTERNS.filter(p=>p.pads?.length);
 assert.ok(springs.length>=2);
 for(const pattern of springs)for(const t of [12,20,55,95,115,180]){
  if(t<(pattern.minTime||0))continue;
  const seg=C.buildPattern(0,t,C.speedAt(t),pattern,C.randomizer(8));
  for(const offset of [-.04,0,.04]){
   const r=C.replayPattern(seg,{offset,trace:true});
   assert.ok(r.ok,JSON.stringify({pattern:pattern.name,t,offset,r}));
   assert.ok(r.route.some(p=>p.bottom<C.GROUND-130),`${pattern.name} didn't create a high jump`);
  }
 }
});
test('generated first 30 seconds includes aerial, spring and moving motifs',()=>{
 let count=0,air=0,spring=0,moving=0,signature=new Set();
 for(let seed=1;seed<=100;seed++){
  let t=0,x=400,rng=C.randomizer(seed),previous={};
  while(t<30){let seg=C.makeSegment(x,t,rng,3,previous),p=seg.pattern;
   if(t<12){count++;if(p.platforms?.length)air++}
   if(seg.pads.length)spring++;
   if(seg.hazards.some(x=>x.kind==='moving'))moving++;
   signature.add(p.script.map(x=>x[1]).join('/')+'|'+p.theme);
   x+=seg.length;t+=p.duration;previous={type:p.name,theme:p.theme};
  }
 }
 assert.ok(air/count>.28,`early aerial portion ${air}/${count}`);
 assert.ok(spring>20,`few spring launches ${spring}`);
 assert.ok(moving>20,`few moving hazards ${moving}`);
 assert.ok(signature.size>=15,`only ${signature.size} action signatures`);
});
