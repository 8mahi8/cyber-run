'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js'),I=require('../infinite-level-v1.js');
test('endless one-use fragile platform and ring records are pruned once off-screen',()=>{
 const runner=C.makeRunner(0);
 runner.fragileTimes['old-bridge']=1;
 runner.fragileTimes['current-bridge']=30;
 runner.airBoosts['old-ring']=true;
 runner.airBoosts['current-ring']=true;
 const platforms=[{id:'current-bridge',kind:'fragile'}];
 const pads=[{id:'current-ring',kind:'airboost'}];
 const before={...runner.fragileTimes};
 const kept=I.pruneExpiredPhysics(runner,platforms,pads);
 assert.deepEqual(kept,{fragile:1,airBoosts:1});
 assert(!Object.hasOwn(runner.fragileTimes,'old-bridge'));
 assert(!Object.hasOwn(runner.airBoosts,'old-ring'));
 assert.equal(runner.fragileTimes['current-bridge'],30);
 assert.equal(runner.airBoosts['current-ring'],true);
 // Still need the live record to prevent re-activating a ring or a broken bridge.
 assert(Object.hasOwn(runner.fragileTimes,'current-bridge'));
 assert.deepEqual(before['current-bridge'],runner.fragileTimes['current-bridge']);
});
test('cleanup keeps long-running collision state bounded without affecting HP/physics',()=>{
 const runner=C.makeRunner(0),platforms=[],pads=[];
 for(let i=0;i<2000;i++){
  runner.fragileTimes['bridge'+i]=i;
  runner.airBoosts['ring'+i]=true;
  platforms.length=0;pads.length=0;
  platforms.push({id:'bridge'+i,kind:'fragile'});
  pads.push({id:'ring'+i,kind:'airboost'});
  const retained=I.pruneExpiredPhysics(runner,platforms,pads);
  assert.equal(retained.fragile,1);
  assert.equal(retained.airBoosts,1);
 }
 assert.equal(Object.keys(runner.fragileTimes).length,1);
 assert.equal(Object.keys(runner.airBoosts).length,1);
 assert.equal(runner.hp,3);
 assert.deepEqual(I.pruneExpiredPhysics(null,[],[]),{fragile:0,airBoosts:0});
});
