'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level-v2.js');
const E=require('../extra-motifs-v1.js'),I=require('../infinite-level-v1.js');
const SPEEDS=[0,30,50,80,100,170,250];
test('TWIN HALO needs exactly ONE manual jump, two automatic rings and visible coins',()=>{
 assert.equal(C.FIRST_JUMP,690);
 assert.equal(C.SECOND_JUMP,640);
 const legacy=C.buildPattern(580,100,C.speedAt(100),H.SECTIONS[6].pattern,C.randomizer(1));
 assert.equal(legacy.pads[0].w,44);
 assert.equal(legacy.pads[0].h,34,'unrelated ring geometries must not change');
 for(const sec of SPEEDS){
  const s=E.makeSection(17,580,sec);
  assert.deepEqual(s.script.filter(x=>x[1]==='jump').map(x=>x[0]),[.17],
   'ring-to-ring should not require a secret second tap');
  assert.deepEqual(s.pads.map(p=>p.w),[100,140]);
  assert.deepEqual(s.pads.map(p=>p.h),[64,70]);
  assert(C.replayPattern(s).ok,'baseline failed to finish at '+sec);
  assert(s.pickups.length>=18);
  const coinYs=s.pickups.map(c=>c.y);
  assert(Math.min(...coinYs)>=44,'guide coins escape top of the screen at '+sec);
  assert(Math.max(...coinYs)<=C.GROUND,'guide coins below ground');
  for(const offset of [-.12,-.08,0,.08,.12]){
   assert(C.replayPattern(s,{actionOffsets:[offset,0,0]}).ok,
    'initial jump unfair at speed time '+sec+' shift '+offset);
  }
  assert(!C.replayPattern({...s,pads:[s.pads[1]]}).ok,'first automatic ring optional');
  assert(!C.replayPattern({...s,pads:[s.pads[0]]}).ok,'second automatic ring optional');
  const noManualJump={...s,pattern:{...s.pattern,script:s.script.filter(a=>a[1]!=='jump')}};
  assert(!C.replayPattern(noManualJump).ok,'getting into ring without any manual jump should not be a route');
 }
});
test('ring TAP cue is an accurate input coordinate, not a misleading coin in midair',()=>{
 const gen=I.makeGenerator(20261024);let x=580,t=C.timeToTravel(0,580-C.HITBOX_OFFSET_X),ring=null;
 for(let k=0;k<120;k++){
  const s=gen.next(x,t);
  if(s.authoredSection===17){ring=s;break}
  t+=s.pattern.duration;x+=s.length;
 }
 assert(ring,'never generated TWIN HALO');
 assert.equal(ring.jumpCues.length,1,'only one TAP indicator required for the ring pair');
 const cue=ring.jumpCues[0],expected=.17*C.speedAt(ring.seconds)+3.75*.17*.17;
 assert(Math.abs(cue.offset-expected)<1,'TAP marker not placed at real takeoff');
 assert(cue.y>=78&&cue.y<C.GROUND);
 const trace=C.replayPattern(ring,{trace:true}).route;
 assert(Math.min(...trace.map(p=>p.bottom-26))>40,'physically witnessed gold trail is offscreen');
});
