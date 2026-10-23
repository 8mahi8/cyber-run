const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../core.js'),H=require('../handcrafted-level.js');
function course(){
 const pieces=[];let x=C.BASE_SPEED*1.45,sec=C.timeToTravel(0,x);
 for(let i=0;i<H.totalSections;i++){
  const p=H.makeSection(i,x,sec);pieces.push(p);
  x+=p.length;sec+=C.timeToTravel(sec,p.length);
 }
 return {pieces,distance:x,duration:sec};
}
function run(jitter=0,seed=1,mode='witness'){
 const {pieces,distance,duration}=course(),r=C.makeRunner(0);
 const rand=C.randomizer(seed);
 const events=pieces.flatMap(p=>p.script.map(([time,action])=>({
  at:p.seconds+time+(rand()*2-1)*jitter,action
 }))).sort((a,b)=>a.at-b.at);
 const platforms=pieces.flatMap(p=>p.platforms),gaps=pieces.flatMap(p=>p.gaps);
 const pads=pieces.flatMap(p=>p.pads),hazards=pieces.flatMap(p=>p.hazards);
 let x=0,idx=0,duck=false;
 for(let frame=0;frame<Math.ceil((duration+.1)/C.DT);frame++){
  const now=frame*C.DT;let jump=false;
  while(idx<events.length&&events[idx].at<=now+1e-6){
   const action=events[idx++].action;
   if(mode!=='duck-only'&&action==='jump')jump=true;
   if(mode!=='jump-only'&&action==='duck-on')duck=true;
   if(mode!=='jump-only'&&action==='duck-off')duck=false;
  }
  x+=C.speedAt(now)*C.DT;
  C.physicsStep(r,C.DT,x,platforms,gaps,duck,jump,now,0,pads);
  if(r.bottom>C.GROUND+10)return {ok:false,reason:'fell',now};
  const rect=C.rectAt(x+C.HITBOX_OFFSET_X,r.bottom,r.duck);
  if(hazards.some(h=>C.overlap(rect,C.hazardAt(h,now))))return {ok:false,reason:'hazard',now};
  if(x>=distance)return {ok:r.support==='ground'&&r.jumps===0,duration:now,hp:r.hp};
 }
 return {ok:false,reason:'timed-out'};
}
test('ONE finite hand-authored course has distinct, ordered chapters and meaningful mechanic variety',()=>{
 assert.equal(H.totalSections,20);
 assert.equal(H.SECTIONS.length,20);
 assert.equal(new Set(H.SECTIONS.map(s=>s.pattern.name)).size,20);
 assert.ok(new Set(H.SECTIONS.map(s=>s.base)).size>=12);
 assert.ok(H.SECTIONS.every(s=>s.objective&&s.chapter));
 const {pieces,duration}=course();
 assert.ok(duration>=58&&duration<=72,'expected one mastered ~1-minute course');
 assert.ok(pieces.every(p=>p.handcrafted&&!p.pickups.length));
 assert.ok(pieces.some(p=>p.platforms.some(v=>v.kind==='fragile')));
 assert.ok(pieces.some(p=>p.pads.some(v=>v.kind==='airboost')));
 assert.ok(pieces.some(p=>p.hazards.some(v=>v.kind==='duck-gate')));
 assert.ok(pieces.some(p=>p.platforms.length===2));
 assert.ok(pieces.some(p=>p.hazards.some(v=>v.kind==='moving')));
 assert.equal(H.makeSection(H.totalSections,123,0),null);
});
test('each authored beat is proven beatable at its actual entry speed and 60ms drift',()=>{
 const {pieces}=course();
 for(const p of pieces)for(const offset of [-.06,0,.06]){
  const result=C.replayPattern(p,{offset});
  assert.ok(result.ok,p.type+' @ '+p.seconds+' '+offset+': '+JSON.stringify(result));
 }
});
test('the WHOLE authored map connects physically through its final grounded goal',()=>{
 const ideal=run();
 assert.ok(ideal.ok,JSON.stringify(ideal));
 assert.ok(ideal.duration>60&&ideal.duration<72);
 for(let seed=1;seed<=100;seed++){
  const result=run(.06,seed);
  assert.ok(result.ok,'independently jittered full-map failure seed '+seed+': '+JSON.stringify(result));
 }
});
test('hand-designed mandatory routes cannot be solved by only jumping or only crouching',()=>{
 assert.equal(run(0,1,'jump-only').ok,false);
 assert.equal(run(0,1,'duck-only').ok,false);
});
test('fixed map and game mode are isolated from random generator and auto-play QA',()=>{
 const fs=require('node:fs'),source=fs.readFileSync(require.resolve('../game-handcrafted.js'),'utf8');
 assert.ok(source.includes('H.makeSection('));
 assert.ok(source.includes("state='cleared'"));
 assert.ok(source.includes('goalX'));
 assert.ok(!source.includes('C.makeSegment('));
 assert.ok(!source.includes('__qa'));
 assert.ok(!source.includes('__renderGatePreview'));
 for(let i=0;i<H.totalSections;i++){
  const a=H.makeSection(i,3000,45),b=H.makeSection(i,3000,45);
  assert.deepEqual(a,b);
 }
});