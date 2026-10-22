const test=require('node:test'),assert=require('node:assert/strict'),Stick=require('../stickman.js');
test('two stickman feet alternate planted and swinging contact rather than windmill',()=>{
 let seenNear=0,seenFar=0,seenBoth=0;
 for(let i=0;i<180;i++){
  const phase=2*Math.PI*i/180;
  const p=Stick.pose({phase,intensity:.8,supported:true});
  const feet=p.legs.map(leg=>leg[2]),on=feet.map(foot=>Math.abs(foot.y+1)<.15);
  if(on[0]&&!on[1])seenNear++;
  if(on[1]&&!on[0])seenFar++;
  if(on[0]&&on[1])seenBoth++;
  assert.ok(feet.every(foot=>foot.y<=-.99),'the planted/rising feet must never dip underground');
 }
 assert.ok(seenNear>35&&seenFar>35,'both alternating contact phases must exist');
 assert.ok(seenBoth<30,'excessive double-ground-contact would resemble walking');
});
test('stick runner posture stays bounded and frame-continuous at sprint speed',()=>{
 let prev=null;
 for(let i=0;i<720;i++){
  const p=Stick.pose({phase:2*Math.PI*i/720,intensity:1,supported:true});
  const pts=[p.head,...p.legs.flat(),...p.arms.flat()];
  for(const pt of pts)assert.ok(Number.isFinite(pt.x)&&Number.isFinite(pt.y));
  if(prev){
   const feet=[p.legs[0][2],p.legs[1][2]],other=[prev.legs[0][2],prev.legs[1][2]];
   for(let k=0;k<2;k++)assert.ok(Math.hypot(feet[k].x-other[k].x,feet[k].y-other[k].y)<1);
  }
  prev=p;
 }
});
