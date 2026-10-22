const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
test('late-game bursts demand alternating commands with forgiving input timing',()=>{
 for(const name of ['rhythm-five','overdrive-rhythm']){
  const p=C.PATTERNS.find(p=>p.name===name);assert.ok(p);
  assert.ok(p.hazards.length>=5);
  assert.ok(p.script.filter(s=>s[1]==='jump').length>=3);
  assert.ok(p.script.filter(s=>s[1]==='duck-on').length>=2);
  for(const sec of [40,60,100,140,200]){
   const seg=C.buildPattern(0,sec,C.speedAt(sec),p,C.randomizer(9));
   for(const offset of [-.04,-.025,0,.025,.04])
    assert.ok(C.replayPattern(seg,{offset}).ok,name+' at '+sec+'s offset '+offset);
   const idle=C.replayPattern(C.buildPattern(0,sec,C.speedAt(sec),{...p,script:[]},C.randomizer(9)));
   assert.equal(idle.ok,false,name+' must not be idle-safe');
  }
 }
});
