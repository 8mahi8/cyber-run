'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level-v2.js');
const E=require('../extra-motifs-v1.js'),I=require('../infinite-level-v1.js');
const speeds=[0,25,50,80,100,170,270];
test('legacy fixed 16-part course is isolated from infinite-only expansions',()=>{
 assert.equal(H.totalSections,16);
 assert.equal(E.firstIndex,16);
 assert.equal(E.totalSections,19);
 assert.deepEqual(E.SECTIONS.map(s=>s.title),
  ['SPRING CATWALK','TWIN HALO','SHATTER RELAY']);
});
test('three new motifs are physically traversable and tolerate early/late inputs',()=>{
 for(const section of E.SECTIONS)for(const sec of speeds){
  const part=E.makeSection(section.index,580,sec);
  assert(C.replayPattern(part).ok,section.title+' at '+sec);
  for(const shift of [-.08,.08]){
   const offsets=part.script.map((_,i)=>i%2?shift:-shift);
   assert(C.replayPattern(part,{actionOffsets:offsets}).ok,
    section.title+' failed alternate input drift '+shift+'s at '+sec+'s');
  }
  assert(part.pickups.length>=14,'missing dense gold guide for '+section.title);
  assert(part.pickups.every(c=>c.kind==='guide-coin'&&c.r>0));
  const end=C.replayPattern(part,{trace:true}).route.at(-1);
  assert(end.support!==null,'non-grounded segment boundary '+section.title);
 }
});
test('new features are required, not merely visually different cosmetics',()=>{
 for(const sec of speeds){
  const spring=E.makeSection(16,580,sec);
  assert(!C.replayPattern({...spring,pads:[]}).ok,
   'SPRING CATWALK can be passed with no spring');
  assert(!C.replayPattern({...spring,pattern:{...spring.pattern,
   script:spring.script.filter((_,i)=>i!==0)}}).ok,
   'SPRING CATWALK can be passed without crumbling-floor jump');
  const rings=E.makeSection(17,580,sec);
  for(const kept of [[rings.pads[0]],[rings.pads[1]]]){
   assert(!C.replayPattern({...rings,pads:kept}).ok,
    'TWIN HALO can be passed without either required air ring');
  }
  const shatter=E.makeSection(18,580,sec);
  assert(!C.replayPattern({...shatter,pattern:{...shatter.pattern,
   script:shatter.script.filter((_,i)=>i!==3)}}).ok,
   'SHATTER RELAY can be passed without the crucial high-platform exit jump');
 }
});
test('deep running actually draws every added motif and not during tutorial',()=>{
 const g=I.makeGenerator(20261024),counts=[0,0,0],seen={},first={},ordered=[];
 let x=580,t=C.timeToTravel(0,580-C.HITBOX_OFFSET_X);
 for(let i=0;i<150;i++){
  const part=g.next(x,t);
  const id=part.authoredSection;
  if(id>=16){counts[id-16]++;first[id]??=t;}
  if(i<3)assert.equal(id,i);
  ordered.push(id);
  t+=part.pattern.duration;x+=part.length;
 }
 assert(counts.every(n=>n>=5),'new patterns ignored in long-run selection: '+counts);
 assert(first[16]>=30,'spring catwalk should wait until beyond early intro');
 assert(first[17]>=60&&first[18]>=60,
  'late mechanics must not appear during the gentle opening');
 assert(ordered.slice(0,3).every((id,i)=>id===i));
});
