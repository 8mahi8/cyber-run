const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const family=['fracture-hop','fracture-shutter','orb-leap','orb-gate'];
const pattern=name=>{const p=C.PATTERNS.find(p=>p.name===name);assert.ok(p,name);return p};
const build=(name,start=65)=>C.buildPattern(400,start,C.speedAt(start),pattern(name),C.randomizer(12),0);
test('V0.8 introduces new physical mechanics, not only different obstacle sprites',()=>{
 for(const name of family)assert.ok(C.replayPattern(build(name)).ok,name);
 assert.ok(build('fracture-hop').platforms.some(p=>p.kind==='fragile'));
 assert.ok(build('orb-leap').pads.some(p=>p.kind==='airboost'));
 assert.equal(C.FRAGILE_HOLD,.34);assert.ok(C.AIR_BOOST_VY>=800);
});
test('new chasms require their actual rebound/jump, and shutters require crouching',()=>{
 for(const start of [15,30,65,110])for(const name of family){
  const s=build(name,start);
  assert.ok(C.replayPattern(s).ok,name+' impossible at '+start);
  const skipped={...s,pattern:{...s.pattern,script:s.script.filter((_,i)=>i!==1)}};
  assert.equal(C.replayPattern(skipped).ok,false,name+' clearable without second jump');
  if(name.startsWith('orb-')){
   const res=C.replayPattern({...s,pads:[]});
   assert.equal(res.ok,false,name+' bypassable without rebound ring');
   assert.equal(res.reason,'fell');
  }
  if(name==='orb-gate'||name==='fracture-shutter'){
   const noDuck={...s,pattern:{...s.pattern,script:s.script.filter(a=>!a[1].startsWith('duck-'))}};
   assert.equal(C.replayPattern(noDuck).ok,false,name+' clearable without ducking');
  }
 }
});
test('each action in the four added courses tolerates independent +/-100ms input drift',()=>{
 for(const start of [15,40,65,110])for(const name of family){
  const s=build(name,start);
  for(const a of [-.1,0,.1])for(const b of [-.1,0,.1])for(const c of [-.1,.1])for(const d of [-.1,.1]){
   const offsets=[a,b,c,d].slice(0,s.script.length);
   assert.ok(C.replayPattern(s,{actionOffsets:offsets}).ok,name+' at '+start+' with '+offsets);
  }
 }
});
test('two same gimmicks in successive segments cannot reuse expired floor/ring activation',()=>{
 const a=build('fracture-hop',33),b=build('fracture-hop',43);
 assert.notEqual(a.platforms[0].id,b.platforms[0].id);
 const c=build('orb-leap',33),d=build('orb-leap',43);
 assert.notEqual(c.pads[0].id,d.pads[0].id);
 const runner=C.makeRunner();assert.ok(runner.fragileTimes&&runner.airBoosts);
});
test('new hazards actually appear regularly in the full procedural course stream',()=>{
 let fractured=0,orb=0,all=0;const flag=globalThis.CYBER_RUN_V07_EXPERIMENTAL;
 globalThis.CYBER_RUN_V07_EXPERIMENTAL=true;
 try{
  for(let seed=1;seed<=70;seed++){
   let x=400,t=0,rng=C.randomizer(seed),recent={};
   while(t<90){
    const s=C.makeSegment(x,t,rng,3,recent);all++;
    fractured+=+(s.platforms.some(p=>p.kind==='fragile'));
    orb+=+(s.pads.some(p=>p.kind==='airboost'));
    x+=s.length;t+=C.timeToTravel(t,s.length);
    recent={type:s.type,theme:s.theme,recentTypes:[...(recent.recentTypes||[]),s.type].slice(-3),recentThemes:[...(recent.recentThemes||[]),s.theme].slice(-2)};
   }
  }
 }finally{if(flag===undefined)delete globalThis.CYBER_RUN_V07_EXPERIMENTAL;else globalThis.CYBER_RUN_V07_EXPERIMENTAL=flag}
 assert.ok(fractured>=60,'fragile floors underrepresented: '+fractured);
 assert.ok(orb>=60,'air rings underrepresented: '+orb);
 assert.ok(all>=800,'too few course pieces: '+all);
});
