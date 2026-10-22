/* CYBER RUN v0.6 — action-first courses with shared physics and one-way platforms.
 * Units: logical canvas pixels, 120 Hz simulation. No dependencies or remote services.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CyberRunCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUND=370,GRAVITY=1900,FIRST_JUMP=690,SECOND_JUMP=640,SPRING_JUMP=930,BASE_SPEED=400,MAX_SPEED=1150;
const BODY_W=21,STAND_H=48,DUCK_H=27,MIN_SECOND_JUMP=.11,DT=1/120;
const PATTERNS=[
 // 'script' records the intended action sequence, not the only valid route.
 {name:'street-pulse',theme:'GROUND FLOW',duration:2.20,weight:4,script:[[.22,'jump'],[1.04,'jump']],hazards:[[.48,'low'],[1.31,'low']]},
 {name:'duck-switch',theme:'GROUND FLOW',duration:2.17,weight:4,script:[[.23,'jump'],[.87,'duck-on'],[1.50,'duck-off']],hazards:[[.48,'low'],[1.28,'bar']]},
 {name:'reverse-switch',theme:'GROUND FLOW',duration:2.17,weight:4,script:[[.22,'duck-on'],[.62,'duck-off'],[.90,'jump']],hazards:[[.45,'bar'],[1.14,'low']]},
 {name:'tunnel-run',theme:'TUNNEL FLOW',duration:2.28,weight:3,script:[[.22,'duck-on'],[1.15,'duck-off'],[1.32,'jump']],hazards:[[.45,'bar'],[.87,'bar'],[1.60,'low']]},
 {name:'double-boost',theme:'AIR FLOW',duration:2.25,weight:2.5,minTime:5,script:[[.24,'jump'],[.49,'jump']],hazards:[[.83,'tall']]},
 {name:'sky-bridge',theme:'SKY FLOW',duration:2.29,weight:6,minTime:0,script:[[.20,'jump']],platforms:[[.48,1.42,80]],hazards:[[.99,'low'],[1.25,'low']]},
 {name:'sky-crouch',theme:'SKY FLOW',duration:2.35,weight:4.5,minTime:3,script:[[.18,'jump'],[.93,'duck-on'],[1.38,'duck-off']],platforms:[[.45,1.49,77]],hazards:[[1.17,'platform-bar',0],[1.18,'low']]},
 {name:'fall-and-hop',theme:'SKY FLOW',duration:2.53,weight:3.2,minTime:6,script:[[.18,'jump'],[1.47,'jump']],platforms:[[.45,1.10,77]],hazards:[[.78,'low'],[1.79,'low']]},
 {name:'tunnel-to-sky',theme:'SKY FLOW',duration:2.67,weight:3,minTime:8,script:[[.23,'duck-on'],[.60,'duck-off'],[.79,'jump']],platforms:[[1.00,1.91,81]],hazards:[[.44,'bar'],[1.41,'low'],[1.70,'low']]},
 {name:'sky-gap',theme:'SKY FLOW',duration:2.30,weight:2,minTime:15,script:[[.20,'jump']],platforms:[[.48,1.43,80]],hazards:[[.83,'low']],gaps:[[1.06,58]]},
 {name:'rhythm-three',theme:'GROUND FLOW',duration:2.90,weight:3,minTime:10,script:[[.19,'jump'],[.99,'duck-on'],[1.34,'duck-off'],[1.47,'jump']],hazards:[[.44,'low'],[1.15,'bar'],[1.75,'low']]},
 {name:'sky-low-high',theme:'SKY FLOW',duration:2.65,weight:2.5,minTime:17,script:[[.20,'jump'],[1.47,'jump']],platforms:[[.49,1.13,82]],hazards:[[.87,'low'],[1.83,'low']]},

 // Dense, action-distinct motifs. Scripts are witnessed and rejected at build time if unsafe.
 {name:'triple-strike',theme:'GROUND RHYTHM',duration:3.17,weight:3.7,minTime:3,
  script:[[.20,'jump'],[1.04,'jump'],[1.87,'jump']],hazards:[[.45,'low'],[1.31,'low'],[2.15,'low']]},
 {name:'duck-weave',theme:'TUNNEL FLOW',duration:2.96,weight:4.2,minTime:2,
  script:[[.18,'duck-on'],[.57,'duck-off'],[.78,'jump'],[1.56,'duck-on'],[2.12,'duck-off']],
  hazards:[[.40,'bar'],[1.04,'low'],[1.82,'bar']]},
 {name:'beam-chase',theme:'TUNNEL FLOW',duration:2.57,weight:3.7,minTime:5,
  script:[[.14,'duck-on'],[1.02,'duck-off'],[1.21,'jump']],
  hazards:[[.40,'bar'],[.77,'bar'],[1.46,'low']]},
 {name:'platform-weave',theme:'SKY FLOW',duration:2.68,weight:6.3,minTime:2,
  script:[[.18,'jump'],[.91,'duck-on'],[1.36,'duck-off'],[1.66,'jump']],
  platforms:[[.46,1.38,79]],hazards:[[.93,'low'],[1.14,'platform-bar',0],[1.98,'low']]},
 {name:'drop-and-duck',theme:'SKY FLOW',duration:3.05,weight:3.5,minTime:7,
  script:[[.18,'jump'],[1.44,'duck-on'],[1.90,'duck-off'],[2.06,'jump']],
  platforms:[[.46,1.03,79]],hazards:[[.85,'low'],[1.70,'bar'],[2.33,'low']]},
 {name:'pulse-drone',theme:'MOTION FLOW',duration:2.81,weight:4.1,minTime:4,
  script:[[.20,'duck-on'],[.75,'duck-off'],[.96,'jump'],[1.78,'duck-on'],[2.23,'duck-off']],
  hazards:[[.42,'moving'],[1.20,'low'],[2.02,'bar']]},
 {name:'aerial-surge',theme:'SKY FLOW',duration:2.73,weight:3.8,minTime:10,
  script:[[.17,'jump'],[.98,'jump'],[1.89,'duck-on'],[2.27,'duck-off']],
  platforms:[[.46,1.12,78]],hazards:[[.83,'low'],[1.40,'low'],[2.07,'bar']]},
 {name:'spring-overdrive',theme:'BOOST FLOW',duration:2.72,weight:3.8,minTime:6,
  script:[[1.80,'duck-on'],[2.24,'duck-off']],pads:[[.38,46]],hazards:[[.86,'tall'],[2.03,'bar']]},
 {name:'spring-to-sky',theme:'BOOST FLOW',duration:2.81,weight:3.0,minTime:10,
  script:[[1.30,'duck-on'],[1.69,'duck-off']],pads:[[.31,46]],
  platforms:[[.81,1.68,110]],hazards:[[1.48,'platform-bar',0],[1.37,'low']]},
 // Two-height courses are genuinely different traversals: the witnessed path
 // touches BOTH suspended floors, then releases naturally into the next section.
 {name:'sky-stepdown',theme:'SKY FLOW',duration:2.78,weight:3.0,minTime:8,
  script:[[.19,'jump'],[1.48,'jump']],platforms:[[.47,1.02,85],[1.12,1.63,45]],
  hazards:[[.77,'low'],[1.83,'low']]},
 {name:'sky-stepduck',theme:'SKY FLOW',duration:2.88,weight:2.8,minTime:12,
  script:[[.19,'jump'],[1.37,'duck-on'],[1.77,'duck-off'],[1.92,'jump']],
  platforms:[[.46,1.05,80],[1.12,1.88,45]],
  hazards:[[.80,'low'],[1.60,'platform-bar',1],[2.23,'low']]},
 // Higher-distance mastery bursts: several alternating commands in one continuous flow.
 {name:'rhythm-five',theme:'RHYTHM BURST',duration:3.52,weight:4.8,minTime:12,
  script:[[.18,'jump'],[.90,'duck-on'],[1.23,'duck-off'],[1.36,'jump'],[2.07,'duck-on'],[2.40,'duck-off'],[2.55,'jump']],
  hazards:[[.43,'low'],[1.07,'bar'],[1.61,'low'],[2.25,'bar'],[2.80,'low']]},
 {name:'overdrive-rhythm',theme:'RHYTHM BURST',duration:4.56,weight:6.0,minTime:40,
  script:[[.18,'jump'],[.90,'duck-on'],[1.23,'duck-off'],[1.36,'jump'],[2.07,'duck-on'],[2.40,'duck-off'],[2.55,'jump'],[3.27,'duck-on'],[3.60,'duck-off'],[3.73,'jump']],
  hazards:[[.43,'low'],[1.07,'bar'],[1.61,'low'],[2.25,'bar'],[2.80,'low'],[3.45,'bar'],[4.00,'low']]},
 {name:'breather',theme:'RECOVERY',duration:1.12,weight:.15,script:[],hazards:[]},
];
function speedAt(seconds){return Math.min(MAX_SPEED,BASE_SPEED+Math.max(0,seconds)*7.5)}
function timeToTravel(seconds,distance){
 const v=speedAt(seconds),a=7.5,cap=(MAX_SPEED-v)/a,capDistance=v*cap+.5*a*cap*cap;
 if(distance<=capDistance)return (Math.sqrt(v*v+2*a*distance)-v)/a;
 return cap+(distance-capDistance)/MAX_SPEED;
}
function randomizer(seed){let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function intersectsGap(rect,g){return rect.x+rect.w*.77>g.x&&rect.x+rect.w*.23<g.x+g.w}
function rectAt(x,bottom,duck){const h=duck?DUCK_H:STAND_H;return{x,y:bottom-h+4,w:BODY_W,h:h-7}}
function hazardAt(h,time){return h.kind==='moving'?{...h,y:GROUND-87+Math.sin(time*3.5+h.phase)*27}:h}
function makeRunner(x=0){return{x,bottom:GROUND,vy:0,jumps:0,duck:false,support:'ground',coyote:0,jumpBuffer:0,lastJump:-100,hp:3}}
function isSupported(state){return state.support!==null}
function physicsStep(p,dt,x,platforms,gaps,duckHeld,jumpRequested,time,rescue=0,pads=[]){
 const prevBottom=p.bottom,wasSupported=p.support!==null;
 p.x=x;
 if(jumpRequested)p.jumpBuffer=.105;else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
 p.coyote=Math.max(0,p.coyote-dt);
 if(p.jumpBuffer>0&&p.jumps<2&&time-p.lastJump>=MIN_SECOND_JUMP&&(p.jumps>0||wasSupported||p.coyote>0)){
  const first=p.jumps===0;p.vy=-(first?FIRST_JUMP:SECOND_JUMP);p.jumps++;p.lastJump=time;p.support=null;p.coyote=0;p.jumpBuffer=0;
 }
 p.duck=!!duckHeld&&p.jumps===0&&p.support!==null;
 p.vy+=GRAVITY*dt;
 p.bottom+=p.vy*dt;
 let landing=null;
 if(p.vy>=0){
  for(const platform of platforms){
   // Only collide when descending across the upper face: jump from underneath passes through.
   if(prevBottom<=platform.y+.001&&p.bottom>=platform.y&&x+BODY_W*.86>platform.x&&x+BODY_W*.14<platform.x+platform.w){
    if(!landing||platform.y<landing.y)landing={y:platform.y,id:platform.id};
   }
  }
  if(prevBottom<=GROUND+.001&&p.bottom>=GROUND){
   const feet=rectAt(x,p.bottom,p.duck);
   if(rescue>0||!gaps.some(g=>intersectsGap(feet,g))){if(!landing||GROUND<landing.y)landing={y:GROUND,id:'ground'}}
  }
 }
 if(landing){
  const spring=landing.id==='ground'&&pads.find(pad=>x+BODY_W*.86>pad.x&&x+BODY_W*.14<pad.x+pad.w);
  if(spring){p.bottom=GROUND;p.vy=-SPRING_JUMP;p.jumps=1;p.support=null;p.coyote=0;p.duck=false;p.jumpBuffer=0}
  else {p.bottom=landing.y;p.vy=0;p.jumps=0;p.support=landing.id;p.coyote=.075;p.duck=!!duckHeld;p.jumpBuffer=0}
 }
 else {p.support=null;if(wasSupported&&p.jumps===0)p.coyote=.075;if(p.jumps===0&&p.coyote<=0)p.jumps=1;p.duck=false}
 return p;
}
function buildPattern(x,seconds,speed,pattern,rng){
 const duration=pattern.duration;
 const distance=t=>{
  // Travel at the real acceleration curve, not the speed sampled at chunk entry.
  const initial=Math.max(0,Math.min(MAX_SPEED,BASE_SPEED+seconds*7.5));
  const untilCap=(MAX_SPEED-initial)/7.5;
  const rising=Math.min(t,Math.max(0,untilCap));
  return initial*rising+3.75*rising*rising+MAX_SPEED*Math.max(0,t-rising);
 };
 const platforms=(pattern.platforms||[]).map(([a,b,height],i)=>({id:pattern.name+':'+i,x:x+distance(a),w:distance(b-a),y:GROUND-height,kind:'one-way'}));
 const hazards=[];for(const [at,kind,extra] of pattern.hazards){
  const sz={low:[32,36,GROUND-36],bar:[69,29,GROUND-64],tall:[40,158,GROUND-158],moving:[34,28,GROUND-87],
   'platform-bar':[65,28,GROUND-(pattern.platforms?.[extra]?.[2]||80)-62]};
  const [w,h,y]=sz[kind];hazards.push({x:x+distance(at)-w/2,y,w,h,kind,phase:0});
 }
 const pads=(pattern.pads||[]).map(([at,width],i)=>({id:pattern.name+':spring:'+i,x:x+distance(at)-width/2,w:width,y:GROUND,kind:'spring'}));
 const gaps=(pattern.gaps||[]).map(([at,width])=>({x:x+distance(at)-width/2,w:width}));
 return {type:pattern.name,theme:pattern.theme,x,length:distance(duration),seconds,speed,hazards,gaps,platforms,pads,pickups:[],script:pattern.script,pattern};
}
// Replays a desired movement sequence using the SAME physics tick as the game, checking
// environment collision and cross-boundary grounded handoff. No search on the iPad.
function replayPattern(segment,opts={}){
 const dt=DT,offset=opts.offset||0,x0=segment.x,initialTime=segment.seconds;
 const pattern=segment.pattern||PATTERNS.find(p=>p.name===segment.type);
 if(!pattern)return {ok:false,reason:'unknown pattern'};
 const runner=makeRunner(x0);let time=0,covered=0,events=pattern.script||[],next=0,duck=false,steps=0;
 const route=[];
 while(covered<segment.length&&steps++<1000){
  let request=false;
  while(next<events.length&&events[next][0]+offset<=time+1e-6){const action=events[next++][1];if(action==='jump')request=true;else if(action==='duck-on')duck=true;else if(action==='duck-off')duck=false}
  covered+=speedAt(initialTime+time)*dt;
  const worldX=x0+covered;
  physicsStep(runner,dt,worldX,segment.platforms,segment.gaps,duck,request,initialTime+time,0,segment.pads);
  const rect=rectAt(worldX,runner.bottom,runner.duck);
  if(runner.bottom>GROUND+10)return {ok:false,reason:'fell',time,worldX};
  if(segment.hazards.some(h=>overlap(rect,hazardAt(h,initialTime+time))))return {ok:false,reason:'hazard',time,worldX};
  if(opts.trace)route.push({time,worldX,bottom:runner.bottom,jumps:runner.jumps,support:runner.support,duck:runner.duck});
  time+=dt;
 }
 if(steps>=1000||runner.support!=='ground'||runner.jumps!==0)return {ok:false,reason:'bad handoff',time,bottom:runner.bottom,support:runner.support};
 return {ok:true,time,steps,route};
}
function verifyPattern(p,seconds,opts={}){
 const segment=buildPattern(0,seconds,speedAt(seconds),p,randomizer(123));
 const offsets=opts.offsets||[0,.025,-.025];
 return offsets.every(offset=>replayPattern(segment,{offset}).ok);
}
function makeSegment(x,seconds,rng,hp,recent={}){
 const speed=speedAt(seconds);
 const allowed=PATTERNS.filter(p=>(p.minTime||0)<=seconds);
 // Recoveries appear intermittently, not repeated at random after every course.
 // Strong anti-repetition without fixing an exact sequence; a smooth pressure curve
 // alternates intense clusters and brief recovery beats.
 const target=2.65+.48*Math.sin(seconds*.18);
 const weighted=allowed.map(p=>{
  const difficulty=p.name==='breather'?.65:p.platforms?.length?3.2:p.hazards.length>=3?3.0:2.4;
  let weight=p.weight*Math.max(.20,1-Math.abs(target-difficulty)*.46);
  if(p.name===recent.type)weight*=.025;
  if(p.theme===recent.theme)weight*=.32;
  if(p.name==='breather'&&recent.type==='breather')weight*=.1;
  return {p,weight};
 });
 const total=weighted.reduce((sum,z)=>sum+z.weight,0);
 let needle=rng()*total,pattern=allowed[allowed.length-1];
 for(const {p,weight} of weighted){needle-=weight;if(needle<0){pattern=p;break}}
 const segment=buildPattern(x,seconds,speed,pattern,rng);
 // Healing is deliberately rare, random, and never spawns at full HP. No score pickups.
 if(hp<3&&seconds>20&&rng()<.0025){segment.pickups.push({x:x+speed*.10,y:GROUND-24,r:13,kind:'heart'})}
 return segment;
}
return {GROUND,GRAVITY,FIRST_JUMP,SECOND_JUMP,SPRING_JUMP,BASE_SPEED,MAX_SPEED,BODY_W,STAND_H,DUCK_H,DT,MIN_SECOND_JUMP,PATTERNS,
 speedAt,timeToTravel,randomizer,overlap,intersectsGap,rectAt,hazardAt,makeRunner,isSupported,physicsStep,buildPattern,replayPattern,verifyPattern,makeSegment};
});
