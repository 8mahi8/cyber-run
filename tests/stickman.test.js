const test=require('node:test'),assert=require('node:assert/strict'),Stick=require('../stickman.js');
function bounds(p){const all=[p.head,...p.arms.flat(),...p.legs.flat()];return {minY:Math.min(...all.map(x=>x.y))-p.radius,maxY:Math.max(...all.map(x=>x.y)),minX:Math.min(...all.map(x=>x.x))-2,maxX:Math.max(...all.map(x=>x.x))+2}}
function mock(){const calls=[];const ctx={save(){},restore(){},translate(){},beginPath(){},moveTo(...a){calls.push(['move',...a])},lineTo(...a){calls.push(['line',...a])},stroke(){},fill(){},arc(){},fillRect(){}};return {ctx,calls}}
for(const [name,args] of [
 ['run',{time:0,supported:true}],['jump',{supported:false,jumps:1,vy:-300}],
 ['double',{supported:false,jumps:2,vy:-500}],['fall',{supported:false,jumps:1,vy:600}],
 ['crouch',{supported:true,duck:true}],['boost',{supported:false,jumps:1,boost:true}]
])test('render '+name+' inside its appropriate silhouette',()=>{
 const p=Stick.pose(args),b=bounds(p),{ctx,calls}=mock();
 Stick.draw(ctx,185,370,args);
 assert.ok(calls.length>=16,'must draw articulated limbs');
 assert.ok(b.minY>=-48.5,name+' head outside 48px height: '+b.minY);
 assert.ok(b.maxY<=0.5,name+' foot below ground: '+b.maxY);
 assert.ok(b.minX>=-19&&b.maxX<=20,name+' limbs too wide');
 if(name==='crouch')assert.ok(b.minY>=-27,name+' exceeds 27px crouch clearance');
});
test('running limbs visibly swing and feet lift',()=>{
 const first=Stick.pose({time:0,supported:true,intensity:.6});
 const second=Stick.pose({time:.083,supported:true,intensity:.6});
 assert.notDeepEqual(first.legs,second.legs);
 assert.ok(Math.abs(first.legs[0][2].x-second.legs[0][2].x)>=4);
});
test('double jump has a distinct star pose and crouch a compact silhouette',()=>{
 const jump=Stick.pose({supported:false,jumps:1,vy:-400});
 const second=Stick.pose({supported:false,jumps:2,vy:-400});
 const crouch=Stick.pose({duck:true,supported:true});
 assert.notDeepEqual(jump.arms,second.arms);
 assert.ok(crouch.head.y>second.head.y+15);
});
test('animation has no RNG input or core physics dependency',()=>{
 const a=Stick.pose({time:2.72,supported:true,intensity:.9});
 const b=Stick.pose({time:2.72,supported:true,intensity:.9});
 assert.deepEqual(a,b);
});
