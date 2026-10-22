const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Stick=require('../stickman.js');
const flatten=p=>[p.head,p.shoulder,p.hip,...p.arms.flat(),...p.legs.flat()];
test('integrated stride phase does not jump when elapsed clock changes',()=>{
 const p=Stick.pose({phase:2.4,time:1.1,intensity:.4,supported:true});
 const q=Stick.pose({phase:2.4,time:45.1,intensity:.4,supported:true});
 assert.deepEqual(p,q);
});
test('jump-to-fall joints smoothly pass through the apex',()=>{
 for(const vy of [-150,-20,80,179]){
  const a=flatten(Stick.pose({supported:false,jumps:1,vy}));
  const b=flatten(Stick.pose({supported:false,jumps:1,vy:vy+.5}));
  assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++)assert.ok(Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y)<.3,`velocity=${vy} joint=${i}`);
 }
});
test('stick figure stays inside the collision-height silhouette at all phases',()=>{
 for(let i=0;i<=36;i++)for(const intensity of [0,.25,.5,1]){
  const p=Stick.pose({phase:i*Math.PI/9,intensity,supported:true});
  for(const joint of flatten(p))assert.ok(Number.isFinite(joint.x)&&Number.isFinite(joint.y));
  assert.ok(p.head.y-p.radius>=-48.5);
  for(const limb of [...p.legs,...p.arms])for(const joint of limb)assert.ok(joint.y<=.5&&joint.y>=-48.5);
 }
});
test('live gameplay advances gait by fixed timestep and passes phase into rendering',()=>{
 const game=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 assert.match(game,/gaitPhase\+=\(18\+17\*/);
 assert.match(game,/phase:gaitPhase/);
 assert.match(game,/gaitPhase=0;cleanFlash=0/);
});
