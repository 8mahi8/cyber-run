const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const required=['reverse-switch','tunnel-run','duck-weave','beam-chase','pulse-drone','drop-and-duck'];

function make(name,seconds=35){
 const p=C.PATTERNS.find(z=>z.name===name);
 assert.ok(p,'unknown pattern '+name);
 return C.buildPattern(0,seconds,C.speedAt(seconds),p,C.randomizer(1234),0);
}
test('mandatory duck gate leaves a readable low opening but no standing or overhead shortcut',()=>{
 assert.ok(C.DUCK_GATE_TOP>=0 && C.DUCK_GATE_TOP<C.GROUND-240);
 assert.equal(C.DUCK_GATE_OPENING,28);
 const p=make('reverse-switch',35);
 const gate=p.hazards.find(h=>h.kind==='duck-gate');assert.ok(gate);
 assert.equal(gate.y,C.DUCK_GATE_TOP);
 assert.equal(gate.y+gate.h,C.GROUND-C.DUCK_GATE_OPENING);
 assert.ok(C.overlap(C.rectAt(gate.x+5,C.GROUND,false),gate),'standing runner should hit');
 assert.ok(!C.overlap(C.rectAt(gate.x+5,C.GROUND,true),gate),'crouch runner must fit');
});
test('grounded jump (including double jump and spring) never clears the top of the mandatory gate',()=>{
 for(const secondJump of [.11,.16,.22,.3,.38,.45,.55,.7]){
  const p=C.makeRunner(0);let min=C.GROUND;
  for(let i=0;i<240;i++){
   const t=i*C.DT;
   const jump=i===0||Math.abs(t-secondJump)<=C.DT/2;
   C.physicsStep(p,C.DT,t*400,[],[],false,jump,t);
   min=Math.min(min,p.bottom);
  }
  assert.ok(min>C.DUCK_GATE_TOP+12,'double jump could clear mandatory gate at '+secondJump+', min bottom='+min);
 }
 const spring=C.makeRunner(0);spring.vy=-C.SPRING_JUMP;spring.support=null;spring.jumps=1;
 let min=C.GROUND;for(let i=0;i<240;i++){
  C.physicsStep(spring,C.DT,i*400*C.DT,[],[],false,false,i*C.DT);
  min=Math.min(min,spring.bottom);
 }
 assert.ok(min>C.DUCK_GATE_TOP+12,'spring jump could clear mandatory gate');
});
test('specified legacy motifs require actual crouch instead of a jump substitute',()=>{
 for(const name of required)for(const seconds of [0,22,100]){
  const s=make(name,seconds),gates=s.hazards.filter(h=>h.kind==='duck-gate');
  assert.ok(gates.length>=1,name+' has no gate');
  assert.ok(C.replayPattern(s).ok,name+' intended action must be feasible at speed tier '+seconds);
  const withoutDuck={...s,pattern:{...s.pattern,script:s.pattern.script.filter(e=>e[1]!=='duck-on'&&e[1]!=='duck-off')}};
  const noDuck=C.replayPattern(withoutDuck);
  assert.equal(noDuck.ok,false,name+' should not clear gate by skipping crouch at '+seconds);
  assert.equal(noDuck.reason,'hazard',name+' failure must be actual gate collision');
  const substitute={...s,pattern:{...s.pattern,script:s.pattern.script.filter(e=>e[1]!=='duck-off').map(e=>[e[0],e[1]==='duck-on'?'jump':e[1]])}};
  assert.equal(C.replayPattern(substitute).ok,false,name+' jumping instead of crouching should fail');
 }
});
test('jumpable bars remain available as deliberate optional-route gimmicks',()=>{
 const requiredCounts=C.PATTERNS.filter(p=>p.hazards.some(h=>h[1]==='duck-gate'));
 const optionalCounts=C.PATTERNS.filter(p=>p.hazards.some(h=>h[1]==='bar'));
 assert.ok(requiredCounts.length>=5,'not enough genuine duck corridors');
 assert.ok(optionalCounts.length>=5,'do not remove choice from every bar');
});
test('trajectory-first action grammar contains both mandatory duck and optional routes',()=>{
 let mandatory=0,optional=0;
 for(let seed=1;seed<=150;seed++){
  const p=C.trajectoryComposition(60,C.randomizer(seed));
  mandatory+=p.needs.filter(n=>n.kind==='duck-gate').length;
  optional+=p.needs.filter(n=>n.kind==='bar').length;
 }
 assert.ok(mandatory>90, 'motion-first plan should require duck frequently');
 assert.ok(optional>50, 'motion-first plan must preserve optional alternatives');
});
