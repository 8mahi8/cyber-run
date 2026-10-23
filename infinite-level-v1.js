/* CYBER RUN infinite map V0.9: difficulty-gated authored chains.
 * The first three sections repeat exactly as a brief finger warmup.
 * Each selected section is a hand-authored, physics-certified movement chain;
 * deterministic seeded selection is independent of art/particle RNG.
 * No changes to score: distance only. Guide coins come from witnessed route.
 */
(function(root,factory){
 const api=factory(root.CyberRunCore||(typeof require==='function'?require('./core.js'):null),
  root.CyberRunHandcrafted||(typeof require==='function'?require('./handcrafted-level-v2.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.CyberRunInfinite=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,H){
 'use strict';
 if(!C||!H)throw Error('CYBER RUN core and authored motifs are required');
 const WARMUP=[0,1,2]; // unchanged V2.3.1 9.75-second rhythm.
 const EARLY=[3,4,5,6,7,8];
 const MIDDLE=[3,4,7,8,9,10,11,12,13,14];
 const ADVANCED=[8,9,10,11,12,13,14,15];
 const EXPERT=[9,12,13,15];
 const REST=[4,7,9,10,14]; // still active gameplay, not a long blank.
 const TITLES=['WARMUP','BUILD','COMBO','PRESSURE','EXPERT','ENDURANCE'];
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
  let count=0,queue=[],lastId=-1,prevId=-1,blockNumber=0,prevGroup=-1;
  function pick(pool){
   const candidates=pool.filter(id=>id!==lastId&&id!==prevId);
   return choose(candidates.length?candidates:pool,rng);
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
    const b=choose(EXPERT.filter(id=>id!==a),rng);
    block=[a,b];
    if(blockNumber%4===3)block=[pick(REST)]; // short, still active.
   } else if(band>=5){
    if(blockNumber%6===5)block=[pick(REST)];
    else {
     const count=Math.max(3,difficulty.chainLength);
     // Long, demanding alternation after top speed; no ever-growing
     // geometry density or impossible gaps.
     for(let k=0;k<count;k++){
      const options=EXPERT.filter(id=>id!==(block.at(-1)??lastId));
      block.push(choose(options.length?options:EXPERT,rng));
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
    if(index===lastId){index=choose((tierAt(seconds)>=4?EXPERT:MIDDLE).filter(id=>id!==lastId),rng)}
   }
   const segment=H.makeSection(index,x,seconds);
   // H.makeSection itself certifies a safe physics route while placing coins.
   segment.sequenceNumber=count;
   segment.difficulty=pressureAt(seconds);
   segment.authoredSection=index;
   segment.authoredLabel=H.SECTIONS[index].title;
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
   prevId=lastId;lastId=index;count++;
   return segment;
  }
  return Object.freeze({next,stats:()=>({count,lastId,queue:queue.slice(),blockNumber})});
 }
 return Object.freeze({makeGenerator,tierAt,pressureAt,WARMUP,
  totalSections:Infinity,title:'CYBER RUN · INFINITE STUDY 0.9'});
});