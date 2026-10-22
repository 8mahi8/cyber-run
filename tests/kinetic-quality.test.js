const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');

test('a jump tapped just before landing is buffered (no dead input)',()=>{
 const p=C.makeRunner(200);p.support=null;p.jumps=2;p.lastJump=-1;p.bottom=C.GROUND-4;p.vy=500;
 C.physicsStep(p,C.DT,200,[],[],false,true,1,0,[]);
 assert.equal(p.support,'ground','must first land');
 assert.ok(p.jumpBuffer>0,'jump should remain buffered through touchdown');
 C.physicsStep(p,C.DT,200,[],[],false,false,1+C.DT,0,[]);
 assert.equal(p.support,null,'should launch immediately after landing');
 assert.equal(p.jumps,1,'should consume new grounded jump');
 assert.ok(p.vy<-600,'jump starts with normal upward velocity');
});

test('old jump presses expire well before an unrelated landing',()=>{
 const p=C.makeRunner(200);p.support=null;p.jumps=2;p.lastJump=-1;p.bottom=C.GROUND-115;p.vy=0;
 C.physicsStep(p,C.DT,200,[],[],false,true,1,0,[]);
 for(let i=1;i<65;i++)C.physicsStep(p,C.DT,200,[],[],false,false,1+i*C.DT,0,[]);
 assert.equal(p.support,'ground');assert.equal(p.jumps,0);assert.equal(p.jumpBuffer,0);
});

test('late game favors richer action courses without losing aerial variety',()=>{
 const summary={early:{acts:0,secs:0,multi:0,all:0,aerial:0},late:{acts:0,secs:0,multi:0,all:0,aerial:0}};
 for(let seed=1;seed<=160;seed++)for(const [key,start] of [['early',0],['late',120]]){
  let rng=C.randomizer(seed),t=start,prev={};
  while(t<start+30){const s=C.makeSegment(500,t,rng,3,prev);const p=s.pattern;
   const actions=p.script.filter(x=>x[1]==='jump'||x[1]==='duck-on').length;
   const m=summary[key];m.acts+=actions;m.secs+=p.duration;m.multi+=+(actions>=3);m.aerial+=+(p.platforms?.length>0);m.all++;
   t+=C.timeToTravel(t,s.length);prev={type:s.type,theme:s.theme,recentTypes:[...(prev.recentTypes||[]),s.type].slice(-3),recentThemes:[...(prev.recentThemes||[]),s.theme].slice(-2)};
  }
 }
 const early=summary.early,late=summary.late;
 assert.ok(late.acts/late.secs>early.acts/early.secs+.12,JSON.stringify(summary));
 assert.ok(late.multi/late.all>early.multi/early.all+.14,JSON.stringify(summary));
 assert.ok(late.aerial/late.all>.26,'late play should still feature meaningful aerial sequences');
});
