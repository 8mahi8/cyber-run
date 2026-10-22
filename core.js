/* CYBER RUN: pure rules and reproducible pattern generator (no browser globals). */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CyberRunCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUND=370,GRAVITY=1600,FIRST_JUMP=590,SECOND_JUMP=550,MAX_SPEED=570,BASE_SPEED=260;
function speedAt(seconds){return Math.min(MAX_SPEED,BASE_SPEED+Math.max(0,seconds)*2.8)}
function randomizer(seed){let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function choose(rng,list){return list[Math.min(list.length-1,Math.floor(rng()*list.length))]}
function makeSegment(x,seconds,rng,hp){
 const speed=speedAt(seconds),difficulty=seconds<28?0:seconds<70?1:2;
 const types=[
  ['empty','low','bar','empty','low','bar','coins'],
  ['low','bar','tall','empty','low','bar','gap','moving','coins','low-bar'],
  ['low','bar','tall','moving','gap','low-bar','bar-low','coins','empty','tall','moving']
 ];
 const type=choose(rng,types[difficulty]);
 const combo=type==='low-bar'||type==='bar-low';
 // Time spacing, not fixed pixels: even maximum-speed transitions allow a full jump cycle.
 const length=Math.max(combo?610:360,speed*((combo?2.5:1.48)+rng()*.18));
 const hazards=[],gaps=[],pickups=[];
 const obstacle=(kind,cx)=>{
  const specs={low:[33,34,GROUND-34],bar:[82,30,GROUND-65],tall:[39,128,GROUND-128],moving:[34,28,GROUND-89]};
  const [w,h,y]=specs[kind];hazards.push({x:cx-w/2,y,w,h,kind,phase:rng()*Math.PI*2});
 };
 const center=x+length*.5;
 if(['low','bar','tall','moving'].includes(type))obstacle(type,center);
 if(combo){obstacle(type==='low-bar'?'low':'bar',x+length*.28);obstacle(type==='low-bar'?'bar':'low',x+length*.73)}
 if(type==='gap'){
  const width=Math.min(66,Math.max(38,speed*.16));gaps.push({x:center-width/2,w:width});
 }
 const count=type==='coins'?9:5;
 for(let i=0;i<count;i++){
  const cx=x+length*(.15+.7*(i/(count-1)));
  let cy=GROUND-65;
  if(type==='bar')cy=GROUND-15;
  if(type==='tall')cy=GROUND-170;
  if(type==='gap')cy=GROUND-82;
  if(type==='coins')cy=GROUND-72-Math.sin(i/(count-1)*Math.PI)*67;
  if(combo)cy=GROUND-(i<Math.ceil(count/2)?(type==='low-bar'?94:15):(type==='low-bar'?15:94));
  pickups.push({x:cx,y:cy,kind:i===count-1&&rng()<.09?'gem':'coin',r:8});
 }
 // Low-probability random recovery, conditioned on being injured when the segment is created.
 // In endless runs it can recur, but is never forced or guaranteed.
 if(hp<3&&seconds>=20&&rng()<.004){
  pickups.push({x:x+length*.12,y:GROUND-35,kind:'heart',r:13});
 }
 return {type,difficulty,x,length,hazards,gaps,pickups};
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function intersectsGap(rect,gap){return rect.x+rect.w*.77>gap.x&&rect.x+rect.w*.23<gap.x+gap.w}
function safeGap(gap,speed){return gap.w<=66&&gap.w/speed<=.19}
// Horizontal separation, converted back into seconds to check every speed tier.
function minHazardGap(segment,speed){if(segment.hazards.length<2)return Infinity;const h=segment.hazards;return (h[1].x-(h[0].x+h[0].w))/speed}
return {GROUND,GRAVITY,FIRST_JUMP,SECOND_JUMP,BASE_SPEED,MAX_SPEED,speedAt,randomizer,makeSegment,overlap,intersectsGap,safeGap,minHazardGap};
});
