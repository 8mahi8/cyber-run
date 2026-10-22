/* CYBER RUN v0.5 — action-first courses with shared physics and one-way platforms.
 * Units: logical canvas pixels, 120 Hz simulation. No dependencies or remote services.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CyberRunCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUND=370,GRAVITY=1900,FIRST_JUMP=690,SECOND_JUMP=640,BASE_SPEED=335,MAX_SPEED=790;
const BODY_W=21,STAND_H=48,DUCK_H=27,MIN_SECOND_JUMP=.11,DT=1/120;
const PATTERNS=[
 {name:'street-pulse',theme:'GROUND FLOW',duration:2.20,weight:4,script:[[.22,'jump'],[1.04,'jump']],hazards:[[.48,'low'],[1.31,'low']]},
 {name:'duck-switch',theme:'GROUND FLOW',duration:2.17,weight:4,script:[[.23,'jump'],[.87,'duck-on'],[1.50,'duck-off']],hazards:[[.48,'low'],[1.28,'bar']]},
 {name:'reverse-switch',theme:'GROUND FLOW',duration:2.17,weight:4,script:[[.22,'duck-on'],[.62,'duck-off'],[.90,'jump']],hazards:[[.45,'bar'],[1.14,'low']]},
 {name:'tunnel-run',theme:'TUNNEL FLOW',duration:2.28,weight:3,script:[[.22,'duck-on'],[1.15,'duck-off'],[1.32,'jump']],hazards:[[.45,'bar'],[.87,'bar'],[1.60,'low']]},
 {name:'double-boost',theme:'AIR FLOW',duration:2.25,weight:2.5,minTime:14,script:[[.24,'jump'],[.49,'jump']],hazards:[[.83,'tall']]},
 {name:'sky-bridge',theme:'SKY FLOW',duration:2.29,weight:4,minTime:8,script:[[.20,'jump']],platforms:[[.48,1.42,80]],hazards:[[.99,'low'],[1.25,'low']]},
 {name:'sky-crouch',theme:'SKY FLOW',duration:2.35,weight:3.5,minTime:12,script:[[.18,'jump'],[.93,'duck-on'],[1.38,'duck-off']],platforms:[[.45,1.49,77]],hazards:[[1.17,'platform-bar',0],[1.18,'low']]},
 {name:'fall-and-hop',theme:'SKY FLOW',duration:2.53,weight:3.2,minTime:16,script:[[.18,'jump'],[1.47,'jump']],platforms:[[.45,1.10,77]],hazards:[[.78,'low'],[1.79,'low']]},
 {name:'tunnel-to-sky',theme:'SKY FLOW',duration:2.67,weight:3,minTime:20,script:[[.23,'duck-on'],[.60,'duck-off'],[.79,'jump']],platforms:[[1.00,1.91,81]],hazards:[[.44,'bar'],[1.41,'low'],[1.70,'low']]},
 {name:'sky-gap',theme:'SKY FLOW',duration:2.30,weight:2,minTime:22,script:[[.20,'jump']],platforms:[[.48,1.43,80]],hazards:[[.83,'low']],gaps:[[1.06,58]]},
 {name:'rhythm-three',theme:'GROUND FLOW',duration:2.90,weight:3,minTime:28,script:[[.19,'jump'],[.99,'duck-on'],[1.34,'duck-off'],[1.47,'jump']],hazards:[[.44,'low'],[1.15,'bar'],[1.75,'low']]},
 {name:'sky-low-high',theme:'SKY FLOW',duration:2.65,weight:2.5,minTime:35,script:[[.20,'jump'],[1.47,'jump']],platforms:[[.49,1.13,82]],hazards:[[.87,'low'],[1.83,'low']]},
 {name:'breather',theme:'RECOVERY',duration:1.35,weight:.7,script:[],hazards:[]},
];
function speedAt(seconds){return Math.min(MAX_SPEED,BASE_SPEED+Math.max(0,seconds)*7.5)}
function randomizer(seed){let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function intersectsGap(rect,g){return rect.x+rect.w*.77>g.x&&rect.x+rect.w*.23<g.x+g.w}
function rectAt(x,bottom,duck){const h=duck?DUCK_H:STAND_H;return{x,y:bottom-h+4,w:BODY_W,h:h-7}}
function hazardAt(h,time){return h.kind==='moving'?{...h,y:GROUND-87+Math.sin(time*3.5+h.phase)*27}:h}
function makeRunner(x=0){return{x,bottom:GROUND,vy:0,jumps:0,duck:false,support:'ground',coyote:0,jumpBuffer:0,lastJump:-100,hp:3}}
function isSupported(state){return state.support!==null}
function physicsStep(p,dt,x,platforms,gaps,duckHeld,jumpRequested,time,rescue=0){
 const prevBottom=p.bottom,wasSupported=p.support!==null;p.x=x;
 if(jumpRequested)p.jumpBuffer=.105;else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
 p.coyote=Math.max(0,p.coyote-dt);
 if(p.jumpBuffer>0&&p.jumps<2&&time-p.lastJump>=MIN_SECOND_JUMP&&(p.jumps>0||wasSupported||p.coyote>0)){
  const first=p.jumps===0;p.vy=-(first?FIRST_JUMP:SECOND_JUMP);p.jumps++;p.lastJump=time;p.support=null;p.coyote=0;p.jumpBuffer=0;
 }
 p.duck=!!duckHeld&&p.jumps===0&&p.support!==null;
 p.vy+=GRAVITY*dt;p.bottom+=p.vy*dt;
 let landing=null;
 if(p.vy>=0){
  for(const platform of platforms){
   if(prevBottom<=platform.y+.001&&p.bottom>=platform.y&&x+BODY_W*.86>platform.x&&x+BODY_W*.14<platform.x+platform.w){
    if(!landing||platform.y<landing.y)landing={y:platform.y,id:platform.id};
   }
  }
  if(prevBottom<=GROUND+.001&&p.bottom>=GROUND){
   const feet=rectAt(x,p.bottom,p.duck);
   if(rescue>0||!gaps.some(g=>intersectsGap(feet,g))){if(!landing||GROUND<landing.y)landing={y:GROUND,id:'ground'}}
  }
 }
 if(landing){p.bottom=landing.y;p.vy=0;p.jumps=0;p.support=landing.id;p.coyote=.075;p.duck=!!duckHeld;p.jumpBuffer=0}
 else {p.support=null;if(wasSupported&&p.jumps===0)p.coyote=.075;if(p.jumps===0&&p.coyote<=0)p.jumps=1;p.duck=false}
 return p;
}
function buildPattern(x,seconds,speed,pattern,rng){
 const distance=t=>speed*t;
 const platforms=(pattern.platforms||[]).map(([a,b,height],i)=>({id:pattern.name+':'+i,x:x+distance(a),w:distance(b-a),y:GROUND-height,kind:'one-way'}));
 const hazards=[];for(const [at,kind,extra] of pattern.hazards){
  const sz={low:[32,36,GROUND-36],bar:[69,29,GROUND-64],tall:[40,158,GROUND-158],moving:[34,28,GROUND-87],
   'platform-bar':[65,28,GROUND-(pattern.platforms?.[extra]?.[2]||80)-62]};
  const [w,h,y]=sz[kind];hazards.push({x:x+distance(at)-w/2,y,w,h,kind,phase:0});
 }
 const gaps=(pattern.gaps||[]).map(([at,width])=>({x:x+distance(at)-width/2,w:width}));
 return {type:pattern.name,theme:pattern.theme,x,length:speed*pattern.duration,seconds,speed,hazards,gaps,platforms,pickups:[],script:pattern.script,pattern};
}
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
  physicsStep(runner,dt,worldX,segment.platforms,segment.gaps,duck,request,initialTime+time,0);
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
 const speed=speedAt(seconds),allowed=PATTERNS.filter(p=>(p.minTime||0)<=seconds);
 const target=2.2+.65*Math.sin(seconds*.20);
 const weighted=allowed.map(p=>{
  const difficulty=p.name==='breather'?.65:p.platforms?.length?2.75:p.hazards.length>=3?2.7:2.1;
  let weight=p.weight*Math.max(.20,1-Math.abs(target-difficulty)*.46);
  if(p.name===recent.type)weight*=.08;
  if(p.theme===recent.theme&&p.theme!=='GROUND FLOW')weight*=.42;
  if(p.name==='breather'&&recent.type==='breather')weight*=.1;
  return {p,weight};
 });
 const total=weighted.reduce((sum,z)=>sum+z.weight,0);
 let needle=rng()*total,pattern=allowed[allowed.length-1];
 for(const {p,weight} of weighted){needle-=weight;if(needle<0){pattern=p;break}}
 const segment=buildPattern(x,seconds,speed,pattern,rng);
 if(hp<3&&seconds>20&&rng()<.0025)segment.pickups.push({x:x+speed*.10,y:GROUND-24,r:13,kind:'heart'});
 return segment;
}
return {GROUND,GRAVITY,FIRST_JUMP,SECOND_JUMP,BASE_SPEED,MAX_SPEED,BODY_W,STAND_H,DUCK_H,DT,MIN_SECOND_JUMP,PATTERNS,
 speedAt,randomizer,overlap,intersectsGap,rectAt,hazardAt,makeRunner,isSupported,physicsStep,buildPattern,replayPattern,verifyPattern,makeSegment};
});
