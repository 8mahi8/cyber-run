'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level-v2.js'),E=require('../extra-motifs-v1.js');
const SPEEDS=[0,30,50,80,100,170,250];
test('TWIN HALO visually larger rings match forgiving hitboxes without increasing global jump power',()=>{
 assert.equal(C.FIRST_JUMP,690);
 assert.equal(C.SECOND_JUMP,640);
 const old=C.buildPattern(580,100,C.speedAt(100),H.SECTIONS[6].pattern,C.randomizer(1));
 assert.equal(old.pads[0].w,44);
 assert.equal(old.pads[0].h,34,'other established rings remain unchanged');
 for(const sec of SPEEDS){
  const s=E.makeSection(17,580,sec);
  assert.deepEqual(s.pads.map(p=>p.w),[100,140]);
  assert.deepEqual(s.pads.map(p=>p.h),[64,85]);
  // Physics rectangle and the drawn ring use precisely the same pad w/h.
  assert(s.pads[0].y>250,'first ring remains visually within first-jump reach');
  assert(C.replayPattern(s).ok,'baseline cannot clear at '+sec);
  assert(s.pickups.length>=18,'route coins not recalculated for larger rings');
  // Taps may happen earlier/later as real humans react to the moving screen.
  for(const offset of [-.14,-.1,-.08,0,.08,.1,.14]){
   const z=C.replayPattern(s,{actionOffsets:[offset,0,0,0]});
   assert(z.ok,'first cyan ring too hard to reach at '+sec+' / '+offset);
  }
  for(const offset of [-.08,0,.08,.10]){
   const z=C.replayPattern(s,{actionOffsets:[0,offset,0,0]});
   assert(z.ok,'inter-ring second jump timing too strict at '+sec+' / '+offset);
  }
  const needs1=C.replayPattern({...s,pads:[s.pads[1]]});
  const needs2=C.replayPattern({...s,pads:[s.pads[0]]});
  assert(!needs1.ok&&!needs2.ok,'both rebounds must still be necessary');
  const noSecondJump=C.replayPattern({...s,pattern:{...s.pattern,
   script:s.pattern.script.filter((_,i)=>i!==1)}});
  assert(!noSecondJump.ok,'second manual jump remains an intentional move');
 }
});
