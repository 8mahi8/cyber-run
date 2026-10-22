const C=require('../core.js');
function trial(seed, mode, duration=100){
 const dt=C.DT, anchor=190;let p=C.makeRunner(anchor), rng=C.randomizer(seed), cursor=anchor+C.speedAt(0)*1.45, t=0, travel=0, inv=0, rescue=0, lastTheme='', preceding={}, hits=0, generated=0, usedPlatforms=0, types={}, hi=0;const hazards=[],gaps=[],platforms=[],pads=[];
 function spawn(){let guard=0;while(cursor<2000&&guard++<12){let eta=Math.max(0,(cursor-anchor)/C.speedAt(t));let s=C.makeSegment(cursor,t+eta,rng,p.hp,preceding);preceding={type:s.type,theme:s.theme};cursor+=s.length;hazards.push(...s.hazards);gaps.push(...s.gaps);platforms.push(...s.platforms);pads.push(...s.pads);types[s.type]=(types[s.type]||0)+1;generated++}}
 function hit(){if(inv>0)return;p.hp--;hits++;inv=1.35}
 for(let i=0;i<duration/dt && p.hp>0;i++){
  let speed=C.speedAt(t);const dx=speed*dt;travel+=dx;cursor-=dx;for(const l of [hazards,gaps,platforms,pads])for(const o of l)o.x-=dx;
  t+=dt;inv=Math.max(0,inv-dt);rescue=Math.max(0,rescue-dt);
  const curr=C.rectAt(p.x+6,p.bottom,p.duck);
  if(gaps.some(g=>C.intersectsGap(curr,g))&&p.support==='ground'&&rescue<=0){hit();rescue=1}
  let jump=mode==='spamJump'&&i%32===0;
  let duck=mode==='duckAlways';
  C.physicsStep(p,dt,p.x,platforms,gaps,duck,jump,t,rescue,pads);
  if(p.support&&p.support!=='ground')usedPlatforms++;
  if(p.bottom>C.GROUND+112){hit();p.bottom=C.GROUND;p.vy=0;p.jumps=0;p.support='ground';rescue=1;inv=Math.max(inv,1.4)}
  const rect=C.rectAt(p.x+6,p.bottom,p.duck);
  for(const h of hazards){if(C.overlap(rect,C.hazardAt(h,t))){hit();break}}
  for(const l of [hazards,gaps,platforms,pads]){let at=0;while(at<l.length){if(l[at].x+(l[at].w||0)<-100)l.splice(at,1);else at++}}
  spawn();
 }
 return {seed,mode,seconds:Number(t.toFixed(2)),metres:Math.floor(travel/9),hits,segments:generated,platformTicks:usedPlatforms,types};
}
for(const mode of ['idle','spamJump','duckAlways']){
 const sample=Array.from({length:30},(_,i)=>trial(i+1,mode));const sorted=sample.map(x=>x.seconds).sort((a,b)=>a-b);const types=sample.reduce((m,x)=>(Object.entries(x.types).forEach(([k,v])=>m[k]=(m[k]||0)+v),m),{});
 console.log(JSON.stringify({mode,medianSeconds:sorted[15],minSeconds:sorted[0],maxSeconds:sorted[29],avgSegments:(sample.reduce((a,x)=>a+x.segments,0)/30).toFixed(1),platformUseRuns:sample.filter(x=>x.platformTicks).length,topTypes:Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,7),examples:sample.slice(0,3)},null,2));
}
