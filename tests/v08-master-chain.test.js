const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const p=C.PATTERNS.find(p=>p.name==='fracture-rebound-gate');
test('endgame chain genuinely requires breakaway landing, airborne ring and mandatory crouch',()=>{
 assert.ok(p&&p.minTime>=70,'must be endgame only');
 for(const seconds of [20,65,110,180]){
  const s=C.buildPattern(500,seconds,C.speedAt(seconds),p,C.randomizer(12),0);
  const win=C.replayPattern(s,{trace:true});
  assert.ok(win.ok,'ideal chain impossible '+seconds);
  assert.ok(win.route.some(step=>step.support===s.platforms[0].id),'crumbling landing never happens');
  assert.equal(C.replayPattern({...s,platforms:[]}).ok,false,'fragile floor can be bypassed');
  assert.equal(C.replayPattern({...s,pads:[]}).ok,false,'air ring can be bypassed');
  const noDuck={...s,pattern:{...s.pattern,script:s.script.filter(a=>!a[1].startsWith('duck-'))}};
  assert.equal(C.replayPattern(noDuck).ok,false,'shutter can be skipped');
  for(const a of [-.10,0,.10])for(const b of [-.10,0,.10])
   for(const c of [-.10,0,.10])for(const d of [-.10,0,.10])
    assert.ok(C.replayPattern(s,{actionOffsets:[a,b,c,d]}).ok,
       'chain fails independently shifted jump/duck inputs '+[seconds,a,b,c,d]);
 }
});
