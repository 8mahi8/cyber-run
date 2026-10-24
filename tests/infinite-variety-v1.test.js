'use strict';
// Endurance should be difficult because of mixed mechanics, not 10 consecutive
// copies of the same elevated-jump rhythm with different section names.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),I=require('../infinite-level-v1.js');
const VALID=['gate','elevated','fragile','ring','spring','drone','rhythm'];
function sequence(seed,count=220){
 const gen=I.makeGenerator(seed),out=[];
 let t=C.timeToTravel(0,580-C.HITBOX_OFFSET_X),x=580;
 for(let k=0;k<count;k++){
  const seg=gen.next(x,t);
  out.push({id:seg.authoredSection,family:I.familyOf(seg.authoredSection),time:t,
   tier:seg.difficulty.tier,script:seg.script});
  x+=seg.length;t+=seg.pattern.duration;
 }
 return out;
}
test('hundreds of difficult segments cannot repeat the same movement family consecutively',()=>{
 for(const seed of [1,2,3,4,5,42,67,101,2026,20261024,998877,1234567]){
  const list=sequence(seed);
  assert.deepEqual(list.slice(0,3).map(x=>x.id),[0,1,2],'fixed warmup changed');
  for(let i=4;i<list.length;i++){
   assert.notEqual(list[i].family,list[i-1].family,
    'repeated mechanic family at seed '+seed+' section '+i+' / '+list[i].family);
   assert.notEqual(list[i].id,list[i-2].id,
    'identical pattern returned after only one intervening segment');
  }
  for(let i=60;i+8<list.length;i+=8){
   const eight=list.slice(i,i+8),families=new Set(eight.map(z=>z.family));
   assert(families.size>=3,'eight deep-run segments contain too few mechanics: '+seed+' '+i);
  }
  assert(list.at(-1).time>700,'run never reaches endgame');
 }
});
test('difficulty progression and seed replay remain stable with family-aware selection',()=>{
 const one=sequence(8675309),again=sequence(8675309),other=sequence(8675310);
 assert.deepEqual(one.map(x=>x.id),again.map(x=>x.id));
 assert.notDeepEqual(one.slice(5,75).map(x=>x.id),other.slice(5,75).map(x=>x.id));
 const early=one.filter(s=>s.time>=10&&s.time<50),late=one.filter(s=>s.time>=180);
 const density=arr=>arr.reduce((a,s)=>a+s.script.filter(([_,cmd])=>cmd==='jump'||cmd==='duck-on').length,0)
  /arr.reduce((a,s)=>a+((s.time>=0&&s.script.length)?1:1),0);
 assert(density(late)>density(early),'endurance must still require more action changes');
 const lateFamilies=new Set(late.map(x=>x.family));
 assert(lateFamilies.has('ring')&&lateFamilies.has('spring')&&lateFamilies.has('elevated')&&lateFamilies.has('rhythm'));
 for(const row of one)assert(VALID.includes(row.family)||row.id<3,'unclassified motif');
});
