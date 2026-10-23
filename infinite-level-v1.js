/* CYBER RUN infinite map V0.9: difficulty-gated authored chains.
 * The first three sections repeat exactly as a brief finger warmup.
 * Each selected section is a hand-authored, physics-certified movement chain;
 * deterministic seeded selection is independent of art/particle RNG.
 * No changes to score: distance only. Guide coins come from witnessed route.
 */
(function(root,factory){
 const api=factory(root.CyberRunCore||(typeof require==='function'?require('./core.js'):null),
  root.CyberRunHandcrafted||(typeof require==='function'?require('./handcrafted-level-v2.js'):null),
  root.CyberRunExtraMotifs||(typeof require==='function'?require('./extra-motifs-v1.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.CyberRunInfinite=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,H,EXTRA){
 'use strict';
 if(!C||!H||!EXTRA)throw Error('CYBER RUN core, authored motifs and extra motifs are required');
 const WARMUP=[0,1,2]; // unchanged V2.3.1 9.75-second rhythm.
 const EARLY=[3,4,5,6,7,8];
 const MIDDLE=[3,4,7,8,9,10,11,12,13,14,16];
 const ADVANCED=[8,9,10,11,12,13,14,15,16,17,18];
 const EXPERT=[9,12,13,15,16,17,18];
 const REST=[4,7,9,10,14]; // still active gameplay, not a long blank.
 const TITLES=['WARMUP','BUILD','COMBO','PRESSURE','EXPERT','ENDURANCE'];
 // Variation must be mechanical, not cosmetic: several elevated-bridge patterns
 // share the same jump rhythm despite having different IDs and names.
 const FAMILIES=Object.freeze([
  'gate','elevated','elevated','gate','elevated','fragile',
  'ring','spring','drone','elevated','fragile','ring',
  'elevated','elevated','ring','rhythm','spring','ring','elevated'
 ]);
 const familyOf=id=>FAMILIES[id]||'other';
 function tierAt(seconds){
  if(seconds<10)return 0;
  if(seconds<30)return 1;
  if(seconds<60)return 2;
  if(seconds<100)return 3;
  if(seconds<160)return 4;
  return 5;
 }
 function pressureAt(seconds){
  const tier=tierAt(seconds);
  // An ever longer string of difficult hand-authored moves is required once
  // maximum speed is reached. Length grows gradually, not obstruction count.
  return {tier,rank:TITLES[tier],chainLength:tier<4?1:tier===4?2:
    Math.min(12,3+Math.floor(Math.max(0,seconds-160)/100))};
 }
 const choose=(array,rng)=>array[Math.floor(rng()*array.length)];
 function makeGenerator(seed=1){
  const rng=C.randomizer(seed>>>0||1);
  const heartRng=C.randomizer(((seed>>>0)^0x85ebca6b)>>>0); // separate from terrain seed
  let count=0,queue=[],lastId=-1,blockNumber=0,history=[];
  function pick(pool,previous=lastId,planned=[]){
   let candidates=pool.filter(id=>id!==previous);
   if(!candidates.length)candidates=pool.slice();
   // Prefer a different family whenever the pool offers one.
   // Don't return to exactly the same motif after only one other section.
   // This restriction is stronger than the family preference: at deep speeds
   // the expert pool has several singleton mechanics (ring, spring, rhythm).
   const recent=[...history,...planned].slice(-2);
   const fresh=candidates.filter(id=>!recent.includes(id));
   if(fresh.length)candidates=fresh;
   const otherFamily=candidates.filter(id=>familyOf(id)!==familyOf(previous));
   if(otherFamily.length)candidates=otherFamily;
   return choose(candidates,rng);
  }
  function refill(seconds){
   const difficulty=pressureAt(seconds),band=difficulty.tier;
   let block=[];
   if(band===1)block=[pick(EARLY)];
   else if(band===2)block=[pick(MIDDLE)];
   else if(band===3){
    // Expert moves enter reliably; calmer connections add breath without
    // removing obstacles or dropping all the way back to tutorial level.
    block=[pick(blockNumber%3===0?EXPERT:ADVANCED)];
   } else if(band===4){
    const a=pick(EXPERT);
    const b=pick(EXPERT,a,[a]);
    block=[a,b];
    if(blockNumber%4===3)block=[pick(REST)]; // short, still active.
   } else if(band>=5){
    if(blockNumber%6===5)block=[pick(REST)];
    else {
     const count=Math.max(3,difficulty.chainLength);
     // Long, demanding alternation after top speed; no ever-growing
     // geometry density or impossible gaps.
     for(let k=0;k<count;k++){
      const previous=block.length?block[block.length-1]:lastId;
      block.push(pick(EXPERT,previous,block));
     }
    }
   } else block=[pick(EARLY)];
   queue=block;
   blockNumber++;
  }
  function next(x,seconds,hp=3){
   let index;
   if(count<WARMUP.length) index=WARMUP[count];
   else{
    if(!queue.length)refill(seconds);
    index=queue.shift();
    // Guard the same section from starting immediately twice.
    if(index===lastId){
     // Exact immediate repetition should remain impossible even if a future
     // pool change creates a constrained two-item block.
     index=pick(tierAt(seconds)>=4?EXPERT:tierAt(seconds)>=3?ADVANCED:tierAt(seconds)>=2?MIDDLE:EARLY);
    }
   }
   const segment=index<H.totalSections?H.makeSection(index,x,seconds):EXTRA.makeSection(index,x,seconds);
   // H.makeSection itself certifies a safe physics route while placing coins.
   segment.sequenceNumber=count;
   segment.difficulty=pressureAt(seconds);
   segment.authoredSection=index;
   segment.authoredLabel=index<H.totalSections?H.SECTIONS[index].title:EXTRA.SECTIONS[index-H.totalSections].title;
   segment.infinite=true;
   // The only randomized non-score collectible is a rare accessible heart,
   // never a required route waypoint or a groundless trap.
   if(hp<3&&seconds>30&&heartRng()<.0035){
    const witness=C.replayPattern(segment,{trace:true}).route;
    const first=witness.find(p=>p.time>.6&&p.support==='ground'&&p.bottom===C.GROUND);
    if(first){
     const coin=segment.pickups.find(p=>Math.abs(p.x-(first.worldX+C.HITBOX_OFFSET_X+C.BODY_W/2))<60);
     if(coin){coin.kind='heart';coin.r=13;coin.y=C.GROUND-26;}
    }
   }
   history.push(index);if(history.length>3)history.shift();
   lastId=index;count++;
   return segment;
  }
  return Object.freeze({next,stats:()=>({count,lastId,queue:queue.slice(),blockNumber,history:history.slice()})});
 }
 // Physics tracks consumed rings and fragile touchdown timestamps by object ID.
 // In a truly endless run those IDs would otherwise grow forever, long after
 // the geometry has scrolled away. Retain only active geometry records.
 function pruneExpiredPhysics(runner,platforms,pads){
  if(!runner)return {fragile:0,airBoosts:0};
  const liveFragile=new Set(platforms.filter(p=>p.kind==='fragile').map(p=>p.id));
  const liveRings=new Set(pads.filter(p=>p.kind==='airboost').map(p=>p.id));
  for(const id of Object.keys(runner.fragileTimes||{})){
   if(!liveFragile.has(id))delete runner.fragileTimes[id];
  }
  for(const id of Object.keys(runner.airBoosts||{})){
   if(!liveRings.has(id))delete runner.airBoosts[id];
  }
  return {fragile:Object.keys(runner.fragileTimes||{}).length,
   airBoosts:Object.keys(runner.airBoosts||{}).length};
 }
 return Object.freeze({makeGenerator,tierAt,pressureAt,familyOf,pruneExpiredPhysics,WARMUP,
  totalSections:Infinity,title:'CYBER RUN · INFINITE STUDY 0.9'});
});