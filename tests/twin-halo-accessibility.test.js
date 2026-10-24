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

test('gold coins match the ONE-TAP two-AUTO physical route at each difficulty speed',()=>{
 for(const seconds of [0,50,100,220]){
  const section=E.makeSection(17,580,seconds);
  const route=C.replayPattern(section,{trace:true}).route;
  assert(route.length>350);
  for(const coin of section.pickups){
   const nearest=route.reduce((best,row)=>
    Math.abs((row.worldX+C.HITBOX_OFFSET_X+C.BODY_W/2)-coin.x)<
    Math.abs((best.worldX+C.HITBOX_OFFSET_X+C.BODY_W/2)-coin.x)?row:best,route[0]);
   assert(Math.abs((nearest.bottom-(nearest.duck?14:26))-coin.y)<.001,
    'coin not at actual simulated player location at '+seconds+' / x='+coin.x);
   assert(coin.y>=44&&coin.y<C.GROUND,'gold trail escaped viewport');
  }
  // Use the actual physics tick, not only abstract jump timings, and ensure
  // both rings REALLY activate with only one press from the player.
  const runner=C.makeRunner(section.x),events=section.script;
  let elapsed=0,covered=0,next=0,duck=false,jumps=0;
  const auto=[];
  while(covered<section.length){
   let press=false;
   while(next<events.length&&events[next][0]<=elapsed+1e-6){
    const action=events[next++][1];
    if(action==='jump'){press=true;jumps++}
    if(action==='duck-on')duck=true;
    if(action==='duck-off')duck=false;
   }
   covered+=C.speedAt(seconds+elapsed)*C.DT;
   const previous=runner.lastAirBoostId;
   C.physicsStep(runner,C.DT,section.x+covered,section.platforms,section.gaps,
    duck,press,seconds+elapsed,0,section.pads);
   if(runner.lastAirBoostId!==previous)auto.push(runner.lastAirBoostId);
   elapsed+=C.DT;
  }
  assert.equal(jumps,1);
  assert.deepEqual(auto,section.pads.map(p=>p.id),'one jump must really trigger both AUTO rings');
  assert.equal(runner.support,'ground');
 }
});
