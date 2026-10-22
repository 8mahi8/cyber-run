const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');

test('two-level platform courses really use both landings and return to ground',()=>{
 for(const name of ['sky-stepdown','sky-stepduck']){
  const p=C.PATTERNS.find(p=>p.name===name);assert.ok(p);
  for(const t of [12,20,40,70,100,130,160]){
   const seg=C.buildPattern(120,t,C.speedAt(t),p,C.randomizer(2));
   const trace=C.replayPattern(seg,{trace:true});
   assert.ok(trace.ok,name+' at '+t+'s: '+JSON.stringify(trace));
   for(const tier of [0,1])assert.ok(trace.route.some(s=>s.support===name+':'+tier),
    name+' never landed on tier '+tier);
   assert.equal(trace.route.at(-1).support,'ground');
   for(const offset of [-.04,-.025,.025,.04])
    assert.ok(C.replayPattern(seg,{offset}).ok,name+' timing offset '+offset+' at '+t);
   if(name==='sky-stepduck')assert.ok(trace.route.some(s=>
    s.support===name+':1'&&s.duck),'second-tier crouch not used');
  }
 }
});

test('starting gameplay cannot be completed simply by standing idle',()=>{
 for(const t of [0,10,30,100]){
  const available=C.PATTERNS.filter(p=>(p.minTime||0)<=t);
  const idleSafe=available.filter(p=>C.replayPattern(
   C.buildPattern(0,t,C.speedAt(t),{...p,script:[]},C.randomizer(10))).ok);
  assert.ok(idleSafe.length<=1,'too many idle-safe patterns at '+t+': '+idleSafe.map(p=>p.name));
 }
});
