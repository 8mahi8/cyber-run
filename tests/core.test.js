const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const TIMES=[0,4,8,12,16,20,24,28,35,40,55,65,85,100,200];
test('accelerates and caps',()=>{let last=0;for(let i=0;i<400;i++){let v=C.speedAt(i);assert.ok(v>=last&&v<=C.MAX_SPEED);last=v}assert.ok(C.speedAt(45)>C.BASE_SPEED*1.8)});
test('13 action-first motifs including aerial and ground sequences',()=>{assert.ok(C.PATTERNS.length>=12);assert.ok(new Set(C.PATTERNS.map(p=>p.theme)).size>=4);assert.ok(C.PATTERNS.filter(p=>p.platforms?.length).length>=5)});
test('timed witness routes work across speed tiers with 40 ms input variation',()=>{
 let count=0;for(const seconds of TIMES)for(const p of C.PATTERNS){if(seconds<(p.minTime||0))continue;
  const segment=C.buildPattern(100,seconds,C.speedAt(seconds),p,C.randomizer(44));
  for(const offset of [-.04,-.025,0,.025,.04]){const r=C.replayPattern(segment,{offset});count++;assert.ok(r.ok,p.name+' '+seconds+' '+offset+' '+JSON.stringify(r))}
 }assert.ok(count>=750);
});
test('aerial witness lands on the platform and ends grounded',()=>{
 for(const p of C.PATTERNS.filter(p=>p.platforms?.length)){
  const seg=C.buildPattern(100,65,C.speedAt(65),p,C.randomizer(1)),r=C.replayPattern(seg,{trace:true});
  assert.ok(r.ok,p.name);assert.ok(r.route.some(s=>s.support?.startsWith(p.name)),p.name);assert.equal(r.route.at(-1).support,'ground');
 }
});
test('one-way platforms allow jump-through and natural fall-off',()=>{
 const platform={id:'test',x:0,w:300,y:300},p=C.makeRunner(30);p.bottom=338;p.vy=-700;p.jumps=1;p.support=null;
 let passed=false,landed=false;for(let f=0;f<110;f++){
  C.physicsStep(p,C.DT,30,[platform],[],false,false,f*C.DT);if(p.bottom<platform.y-10)passed=true;if(p.support==='test'){landed=true;break}
 }assert.ok(passed&&landed);C.physicsStep(p,C.DT,380,[platform],[],false,false,2);assert.equal(p.support,null);assert.ok(p.bottom>platform.y);
});
test('no score collectibles; only rare healing hearts below 3 HP',()=>{
 const rng=C.randomizer(655),types=new Set();
 for(let i=0;i<1200;i++){const seg=C.makeSegment(1000,i/9,rng,i%3+1);types.add(seg.type);assert.ok(seg.pickups.every(item=>item.kind==='heart'))}
 assert.ok(types.size>=12);
 for(let t of [0,20,60])assert.equal(C.makeSegment(0,t,()=>0,3).pickups.length,0);
 assert.equal(C.makeSegment(0,60,()=>0,1).pickups[0].kind,'heart');
});
test('same seed yields deterministic courses',()=>{
 const a=C.randomizer(555),b=C.randomizer(555);for(let i=0;i<130;i++)assert.deepEqual(C.makeSegment(i*500,i,a,2),C.makeSegment(i*500,i,b,2));
});
test('each course contains a safe exit buffer',()=>{
 for(const p of C.PATTERNS){const s=C.buildPattern(0,70,C.speedAt(70),p,C.randomizer(1)),right=Math.max(0,...s.hazards.map(h=>h.x+h.w),...s.gaps.map(g=>g.x+g.w));assert.ok(s.length-right>100,p.name)}
});