/* Deterministic, validated procedural segments; unit-testable without a browser. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CyberRunCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUND=370,GRAVITY=1600,FIRST_JUMP=590,SECOND_JUMP=550,MAX_SPEED=490,BASE_SPEED=245;
function speedAt(time){return BASE_SPEED+Math.min(MAX_SPEED-BASE_SPEED,Math.max(0,time)*2.05)}
function randomizer(seed){let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function choose(rng,list){return list[Math.floor(rng()*list.length)]}
function makeSegment(x,time,rng,health,worldWidth){
 const speed=speedAt(time),difficulty=time<26?0:time<65?1:2;
 const types=difficulty===0?['empty','low','bar','low','empty']:difficulty===1?['low','bar','tall','empty','low','gap']:['low','bar','tall','moving','gap','low','empty'];
 const type=choose(rng,types),length=Math.max(330,speed*(1.35+rng()*.24));
 const center=x+length*.49;const hazards=[],gaps=[],pickups=[];
 const obstacle=(kind,w,h,y)=>hazards.push({x:center-w/2,y,w,h,kind,phase:rng()*Math.PI*2});
 if(type==='low')obstacle('low',32,32,GROUND-32);
 if(type==='bar')obstacle('bar',80,32,GROUND-65);
 if(type==='tall')obstacle('tall',37,128,GROUND-128);
 if(type==='moving')obstacle('moving',32,28,GROUND-89);
 if(type==='gap'){
   // Crossing takes < .19 s at all permitted speeds. A first jump remains sufficient.
   const width=Math.min(66,Math.max(38,speed*.16));gaps.push({x:center-width/2,w:width});
 }
 const coinHeight=type==='bar'?GROUND-18:type==='tall'?GROUND-105:type==='gap'?GROUND-74:GROUND-66;
 for(let i=0;i<5;i++){
   const cx=x+length*(.17+.14*i),cy=coinHeight-(type==='empty'?Math.sin(i/4*Math.PI)*35:0);
   pickups.push({x:cx,y:cy,kind:i===4&&rng()<.06?'gem':'coin',r:8});
 }
 // Rare, independent chance (~one appearance per 10-15 average runs).
 // A recovery is generated in a quiet position and never offered at full health.
 const healPossible=health<3&&time>=20&&rng()<.002;
 if(healPossible)pickups.push({x:x+length*.12,y:GROUND-35,kind:'heart',r:13});
 return {type,difficulty,x,length,hazards,gaps,pickups};
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function intersectsGap(rect,gap){return rect.x+rect.w*.77>gap.x&&rect.x+rect.w*.23<gap.x+gap.w}
function safeGap(gap,speed){return gap.w<=66&&gap.w/speed<=.19}
return {GROUND,GRAVITY,FIRST_JUMP,SECOND_JUMP,BASE_SPEED,MAX_SPEED,speedAt,randomizer,makeSegment,overlap,intersectsGap,safeGap};
});
