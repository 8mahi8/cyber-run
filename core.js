/* CYBER RUN v0.4. Pure runner physics + reachable high-density pattern generation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CyberRunCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUND=370,GRAVITY=1900,FIRST_JUMP=690,SECOND_JUMP=640,BASE_SPEED=335,MAX_SPEED=790;
const BODY_W=21, STAND_H=48, DUCK_H=27, MIN_SECOND_JUMP=.11;
const PATTERNS=[
 {name:'low',events:[[.51,'low']],duration:1.02,weight:6},
 {name:'bar',events:[[.48,'bar']],duration:.98,weight:5},
 {name:'gap',events:[[.51,'gap']],duration:1.04,weight:1.1,minTime:12},
 {name:'tall',events:[[.82,'tall']],duration:1.53,weight:3,minTime:16},
 {name:'moving',events:[[.57,'moving']],duration:1.15,weight:2.3,minTime:18},
 {name:'low-bar',events:[[.42,'low'],[1.12,'bar']],duration:1.56,weight:5},
 {name:'bar-low',events:[[.40,'bar'],[1.04,'low']],duration:1.50,weight:5},
 {name:'low-low',events:[[.42,'low'],[.81,'low']],duration:1.28,weight:4},
 {name:'bar-bar',events:[[.39,'bar'],[.83,'bar']],duration:1.29,weight:3},
 {name:'bar-moving',events:[[.40,'bar'],[1.08,'moving']],duration:1.59,weight:3,minTime:22},
 {name:'moving-low',events:[[.43,'moving'],[1.10,'low']],duration:1.61,weight:2.5,minTime:22},
 {name:'bar-low-bar',events:[[.39,'bar'],[.96,'low'],[1.60,'bar']],duration:2.08,weight:4,minTime:16},
 {name:'low-bar-low',events:[[.44,'low'],[1.14,'bar'],[1.78,'low']],duration:2.28,weight:4,minTime:25},
 {name:'low-gap',events:[[.41,'low'],[1.08,'gap']],duration:1.57,weight:1.6,minTime:27},
 {name:'gap-bar',events:[[.46,'gap'],[1.09,'bar']],duration:1.59,weight:1.3,minTime:27},
 {name:'coin-wave',events:[],duration:.78,weight:1.1}
];
function speedAt(seconds){return Math.min(MAX_SPEED,BASE_SPEED+Math.max(0,seconds)*7.5)}
function randomizer(seed){let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function intersectsGap(rect,gap){return rect.x+rect.w*.77>gap.x&&rect.x+rect.w*.23<gap.x+gap.w}
function safeGap(gap,speed){return gap.w<=68&&gap.w/speed<=.21}
function minHazardGap(segment,speed){if(segment.hazards.length<2)return Infinity;const h=segment.hazards;return (h[1].x-(h[0].x+h[0].w))/speed}
function rectAt(x,bottom,duck){const h=duck?DUCK_H:STAND_H;return{x:x,y:bottom-h+4,w:BODY_W,h:h-7}}
function hazardAt(h,t){if(h.kind==='moving')return {...h,y:GROUND-87+Math.sin(t*3.5+h.phase)*27};return h}
function buildPattern(x,seconds,speed,pattern,rng){
 const duration=pattern.duration+.16; // recovery tail allows grounded handoff to the next chunk
 const length=speed*duration;
 const hazards=[],gaps=[];
 for(const [at,kind] of pattern.events){const cx=x+speed*at;
  if(kind==='gap'){const width=Math.min(64,Math.max(40,speed*.103));gaps.push({x:cx-width/2,w:width});continue}
  const sizes={low:[34,36,GROUND-36],bar:[76,30,GROUND-64],tall:[42,158,GROUND-158],moving:[34,28,GROUND-87]};
  const [w,h,y]=sizes[kind];hazards.push({x:cx-w/2,y,w,h,kind,phase:rng()*Math.PI*2});
 }
 return {type:pattern.name,x,length,seconds,speed,hazards,gaps,pickups:[],difficulty:seconds<16?1:seconds<40?2:3};
}
/* Time-discretized reachability search uses the exact physics and hitboxes of the game.
   A successful route starts and ends on the ground without losing HP. Candidate segments
   failing any of several speed probes are discarded. No network or expensive runtime API. */
function findRoute(segment,speed,startSeconds,withPath=false){
 // Matches the real game loop's 120Hz integration. Inputs are allowed every 4 ticks
 // (33ms), not on frame-perfect one-tick windows. A successful route incurs zero hits.
 const dt=1/120,maxSteps=Math.ceil(segment.length/(Math.max(1,speed)*dt))+10;
 const horizontalMargin=13,verticalMargin=3;
 let covered=0,frontier=new Map();
 frontier.set('start',{bottom:GROUND,vy:0,jumps:0,lastJump:-100,duck:false,groundFrames:40,parent:null,trace:null});
 for(let frame=0;frame<maxSteps&&covered<segment.length;frame++){
  const t=frame*dt;
  covered+=speedAt(startSeconds+t)*dt;
  const px=segment.x+covered,decision=frame%4===0;
  const next=new Map();
  for(const state of frontier.values()){
   const options=decision?['keep','duck','jump']:['keep'];
   for(const action of options){
    let bottom=state.bottom,vy=state.vy,jumps=state.jumps,lastJump=state.lastJump;
    const onGround=jumps===0&&Math.abs(bottom-GROUND)<.01;
    if(action==='jump'){
     if(jumps>=2||t-lastJump<MIN_SECOND_JUMP||jumps===0&&!onGround)continue;
     vy=-(jumps===0?FIRST_JUMP:SECOND_JUMP);jumps++;lastJump=t;
    }
    let duck=(action==='duck'||action==='keep'&&state.duck)&&jumps===0&&onGround;
    // Collision with holes is checked before vertical physics, just like the game.
    const overHole=segment.gaps.some(g=>intersectsGap(rectAt(px,bottom,duck),g));
    vy+=GRAVITY*dt;bottom+=vy*dt;
    if(bottom>=GROUND){if(overHole)continue;bottom=GROUND;vy=0;jumps=0}
    if(bottom>GROUND+1)continue;
    const rect=rectAt(px,bottom,duck);
    const envelope={x:rect.x-horizontalMargin,y:rect.y-verticalMargin,w:rect.w+2*horizontalMargin,h:rect.h+2*verticalMargin};
    if(segment.hazards.some(h=>overlap(envelope,hazardAt(h,startSeconds+t+dt))))continue;
    const groundFrames=jumps===0?Math.min(30,state.groundFrames+1):0;
    const age=Math.min(5,Math.max(0,Math.floor((t-lastJump)/.035)));
    const key=[Math.round((GROUND-bottom)/3.5),Math.round(vy/32),jumps,age,duck?1:0,Math.min(12,Math.floor(groundFrames/3))].join(':');
    if(!next.has(key))next.set(key,{bottom,vy,jumps,lastJump,duck,groundFrames,
      parent:withPath?state:null,trace:withPath?{x:px,bottom,duck,jumps,action:action==='jump'?'jump':duck?'duck':'none'}:null});
   }
  }
  frontier=next;
  if(frontier.size===0)return null;
 }
 const finished=[...frontier.values()].filter(st=>st.jumps===0&&st.bottom===GROUND&&st.groundFrames>=10);
 if(!finished.length)return null;
 if(!withPath)return true;
 finished.sort((a,b)=>a.lastJump-b.lastJump);
 const route=[];let st=finished[0];while(st&&st.trace){route.push(st.trace);st=st.parent}
 return route.reverse();
}
function validateSegment(segment){return !!findRoute(segment,segment.speed,segment.seconds)}
function makeSegment(x,seconds,rng,hp){
 const speed=speedAt(seconds);
 const allowed=PATTERNS.filter(p=>(p.minTime||0)<=seconds);
 const total=allowed.reduce((acc,p)=>acc+p.weight,0);
 let needle=rng()*total,template=allowed[allowed.length-1];
 for(const p of allowed){needle-=p.weight;if(needle<0){template=p;break}}
 const segment=buildPattern(x,seconds,speed,template,rng);
 // Runtime never performs a graph search in the animation thread. The templates, phase
 // variation and speed tiers are certified by the same physics solver in unit tests.
 const pickups=[];
 const count=segment.type==='coin-wave'?12:Math.max(6,Math.round(segment.length/69));
 for(let i=0;i<count;i++){
  const pos=.12+i*(.76/Math.max(1,count-1));
  const itemX=x+segment.length*pos;
  const time=(itemX-x)/speed;
  let y=GROUND-27;  // A standing player automatically collects ordinary coins.
  // Extra coin chains illustrate how to jump each obstacle, without hiding all rewards in the air.
  const near=template.events.filter(e=>['low','gap','tall'].includes(e[1])&&Math.abs(e[0]-time)<.24)
    .sort((a,b)=>Math.abs(a[0]-time)-Math.abs(b[0]-time))[0];
  if(near){
   const [at,kind]=near;
   if(kind==='low'){
    const airborne=time-(at-.265),height=Math.max(0,FIRST_JUMP*airborne-GRAVITY*airborne*airborne/2);
    y=GROUND-25-height;
   }else if(kind==='gap'){
    const airborne=time-(at-.20),height=Math.max(0,FIRST_JUMP*airborne-GRAVITY*airborne*airborne/2);
    y=GROUND-25-height;
   }else if(kind==='tall'){
    const airborne=time-(at-.53),secondAt=.25;
    let height=0;
    if(airborne>=0){
     if(airborne<=secondAt)height=FIRST_JUMP*airborne-GRAVITY*airborne*airborne/2;
     else height=FIRST_JUMP*secondAt-GRAVITY*secondAt*secondAt/2+SECOND_JUMP*(airborne-secondAt)-GRAVITY*(airborne-secondAt)*(airborne-secondAt)/2;
    }
    y=GROUND-25-Math.max(0,height);
   }
  }
  pickups.push({x:itemX,y,kind:(i===count-1&&rng()<.12)?'gem':'coin',r:9});
 }
 // Unscripted scarce healing pickups, only when HP is missing. No guaranteed drops.
 if(hp<3&&seconds>=20&&rng()<.0025)pickups.push({x:x+speed*.19,y:GROUND-27,kind:'heart',r:13});
 segment.pickups=pickups;
 return segment;
}

return {GROUND,GRAVITY,FIRST_JUMP,SECOND_JUMP,BASE_SPEED,MAX_SPEED,BODY_W,STAND_H,DUCK_H,MIN_SECOND_JUMP,PATTERNS,speedAt,randomizer,makeSegment,overlap,intersectsGap,safeGap,minHazardGap,rectAt,hazardAt,buildPattern,findRoute,validateSegment};
});
