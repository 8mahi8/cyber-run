'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level-v2.js'),E=require('../extra-motifs-v1.js'),I=require('../infinite-level-v1.js');
function generate(seed,hp=3,limit=305){
 const gen=I.makeGenerator(seed);
 const start=580;
 let t=C.timeToTravel(0,start-C.HITBOX_OFFSET_X),x=start;
 const segments=[];
 while(t<limit&&segments.length<140){
  const seg=gen.next(x,t,hp),route=C.replayPattern(seg,{trace:true});
  assert(route.ok,'unpassable chunk at '+t.toFixed(2)+'s / '+seg.type);
  assert(seg.length>0&&seg.pickups.length>=5,'missing scoreless guidance');
  assert(seg.pickups.every(p=>p.kind==='guide-coin'||p.kind==='heart'));
  const section=seg.authoredSection<H.totalSections?H.SECTIONS[seg.authoredSection]:E.SECTIONS[seg.authoredSection-H.totalSections];
  assert(seg.authoredLabel===section.title);
  assert.equal(seg.sequenceNumber,segments.length);
  segments.push(seg);
  t+=seg.pattern.duration;x+=seg.length;
 }
 assert(segments.length<140,'generator stalled at max section count');
 return segments;
}
test('fixed finger warmup followed by deterministic endless, no terminal goal',()=>{
 const a=generate(4051),b=generate(4051),c=generate(4052);
 assert.deepEqual(a.slice(0,3).map(x=>x.authoredSection),[0,1,2]);
 assert.deepEqual(a.map(x=>x.authoredSection),b.map(x=>x.authoredSection));
 assert.notDeepEqual(a.slice(3,24).map(x=>x.authoredSection),c.slice(3,24).map(x=>x.authoredSection));
 assert(a.at(-1).seconds>280,'infinite map must continue past the old 55s goal');
 assert(a.every((s,i)=>i<3||s.authoredSection>=3));
 for(let i=4;i<a.length;i++)assert.notEqual(a[i].type,a[i-1].type,'duplicate segment');
 assert.equal(I.totalSections,Infinity);
});
test('deep-run danger increases in sustained action chains beyond speed cap',()=>{
 const a=generate(20261024);
 assert.equal(I.pressureAt(0).tier,0);
 assert.equal(I.pressureAt(50).tier,2);
 assert.equal(I.pressureAt(90).tier,3);
 assert.equal(I.pressureAt(125).chainLength,2);
 assert(I.pressureAt(260).chainLength>I.pressureAt(160).chainLength);
 const early=a.filter(s=>s.seconds>=10&&s.seconds<55);
 const deep=a.filter(s=>s.seconds>=165&&s.seconds<295);
 const actions=s=>s.script.filter(e=>e[1]==='jump'||e[1]==='duck-on').length;
 const density=xs=>xs.reduce((v,s)=>v+actions(s),0)/xs.reduce((v,s)=>v+s.pattern.duration,0);
 assert(density(deep)>density(early),'deep chains need denser distinct actions');
 const expert=new Set([9,12,13,15,16,17,18]),ordered=a.filter(s=>s.seconds>220).map(s=>s.authoredSection);
 let longest=0,run=0;
 for(const id of ordered){run=expert.has(id)?run+1:0;longest=Math.max(longest,run)}
 assert(longest>=4,'endgame requires repeated expert chains with sustained pressure');
});
test('selection remains viable at low, mid and max speed, even with HP loss',()=>{
 for(const seed of [1,5,39,2026,65535,999999]){
  const all=generate(seed,3,245);
  assert(all.some(s=>s.seconds>200));
  for(const s of all){
   const drift=s.pattern.script.map((_,i)=>i%2?.06:-.06);
   assert(C.replayPattern(s,{actionOffsets:drift}).ok,
    'unfair physics timing between chunks at '+s.seconds.toFixed(2)+' / '+s.type);
  }
  const wounded=generate(seed,2,115);
  // Recoveries must be independent from the terrain PRNG; same route even when wounded.
  assert.deepEqual(wounded.map(s=>s.authoredSection),
   all.slice(0,wounded.length).map(s=>s.authoredSection));
 }
});
