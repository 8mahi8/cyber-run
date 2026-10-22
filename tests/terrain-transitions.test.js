const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const signature=s=>({hazards:s.hazards.map(h=>[h.x-s.x,h.y,h.w,h.h,h.kind]),platforms:s.platforms.map(p=>[p.x-s.x,p.w,p.y]),gaps:s.gaps.map(g=>[g.x-s.x,g.w]),script:s.script});
test('movement-derived terrain is invariant when a segment starts farther along the map',()=>{
 let compared=0;
 for(const time of [20,55,100])for(let seed=1;seed<=45;seed++){
  const a=C.composeTrajectorySegment(100,time,C.randomizer(seed*113));
  const b=C.composeTrajectorySegment(3000,time,C.randomizer(seed*113));
  assert.equal(!!a,!!b,'acceptance depends on world x at '+time+', '+seed);
  if(!a)continue;compared++;
  const left=signature(a),right=signature(b);
  assert.deepEqual(left.script,right.script);
  for(const part of ['hazards','platforms','gaps']){
   assert.equal(left[part].length,right[part].length);
   for(let i=0;i<left[part].length;i++)for(let j=0;j<left[part][i].length;j++){
    const x=left[part][i][j],y=right[part][i][j];
    if(typeof x==='number')assert.ok(Math.abs(x-y)<.01,part+' '+i+' '+j);
    else assert.equal(x,y);
   }
  }
  assert.ok(C.replayPattern(b).ok);
 }
 assert.ok(compared>=85,'too few translated routes '+compared);
});
test('multiple ascending floors are genuinely landed on, not background decoration',()=>{
 let accepted=0,stairRuns=0,multi=0,ascending=0,raisedBar=0;
 for(const time of [30,80,120])for(let seed=1;seed<=150;seed++){
  const s=C.composeTrajectorySegment(250,time,C.randomizer(seed*37+3));
  if(!s)continue;accepted++;
  if(s.platforms.length<2)continue;stairRuns++;
  const r=C.replayPattern(s,{trace:true});assert.ok(r.ok);
  const touched=new Set(r.route.map(p=>p.support));
  for(const platform of s.platforms)assert.ok(touched.has(platform.id),'unused sky floor');
  if(s.platforms[1].y<s.platforms[0].y)ascending++;
  let previous=null,landings=0;
  for(const step of r.route){if(step.support&&step.support!=='ground'&&step.support!==previous)landings++;previous=step.support}
  if(landings>=2)multi++;
  raisedBar+=+(s.hazards.some(h=>h.kind==='platform-bar'));
 }
 assert.ok(accepted>=300,'too few accepted '+accepted);
 assert.ok(stairRuns>=90&&multi>=90,'multi-floor traversal missing '+stairRuns+'/'+multi);
 assert.ok(ascending>=80,'not enough upward staircase routes '+ascending);
 assert.ok(raisedBar>=85,'not enough elevated action combinations '+raisedBar);
});
test('raised beam actually makes crouch relevant on upper floor',()=>{
 let inspected=0,needsDuck=0;
 for(let seed=1;seed<=125;seed++){
  const s=C.composeTrajectorySegment(250,85,C.randomizer(seed));
  if(!s||!s.hazards.some(h=>h.kind==='platform-bar'))continue;inspected++;
  const alternative={...s,pattern:{...s.pattern,script:s.script.filter(([,action])=>action!=='duck-on'&&action!=='duck-off')}};
  if(!C.replayPattern(alternative).ok)needsDuck++;
 }
 assert.ok(inspected>=35,'not enough raised beams '+inspected);
 assert.ok(needsDuck>=30,'raised beams are largely decorative '+needsDuck+'/'+inspected);
});