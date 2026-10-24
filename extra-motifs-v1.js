/* CYBER RUN extra V0.10 patterns — endless only.
 * Preserve the 16-section fixed study course unchanged.
 * All three are distinct action sequences, not random obstacle scatter:
 *  - SPRING CATWALK: spring to a crumbling elevated bridge, mandatory exit jump,
 *    then immediate ground duck and leap.
 *  - TWIN HALO: two physically necessary airboost rings over a long chasm.
 *  - SHATTER RELAY: elevated tunnel-swap with an intentionally collapsing
 *    foothold that enforces momentum.
 */
(function(root,factory){
 const api=factory(root.CyberRunCore||(typeof require==='function'?require('./core.js'):null),
  root.CyberRunHandcrafted||(typeof require==='function'?require('./handcrafted-level-v2.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.CyberRunExtraMotifs=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,H){
 'use strict';
 if(!C||!H||typeof H.makeGuideCoins!=='function')throw Error('Missing guide-coins or core');
 const STAGE=Object.freeze([
  {
   title:'SPRING CATWALK',chapter:'MID/LATE',objective:'バネで崩れる高台へ→崩落前に踏み切る→しゃがみゲート→ジャンプ',
   pattern:{name:'extra-spring-catwalk',theme:'SPRING CATWALK',duration:4.10,
    script:[[1.32,'jump'],[2.40,'duck-on'],[2.93,'duck-off'],[3.12,'jump']],
    pads:[[.31,46]],platforms:[[.81,1.68,110,'fragile']],
    gaps:[[1.35,1.15,'seconds']],
    hazards:[[.80,'tall'],[2.67,'duck-gate'],[3.40,'low']]}
  },
  {
   title:'TWIN HALO',chapter:'LATE',objective:'最初に1回ジャンプ→水色リング2つを順番に自動バウンド→長い穴を越える→しゃがむ',
   pattern:{name:'extra-twin-halo',theme:'DOUBLE REBOUND',duration:4.20,
    // The gold trail follows a single manual takeoff and two automatic
    // rebound contacts. No secret mid-air tap above the visible screen.
    script:[[.17,'jump'],[3.08,'duck-on'],[3.70,'duck-off']],
    pads:[[.80,100,80,'airboost',64],[1.75,140,55,'airboost',70]],
    gaps:[[1.775,1.55,'seconds']],hazards:[[3.43,'duck-gate']],platforms:[]}
  },
  {
   title:'SHATTER RELAY',chapter:'LATE',objective:'しゃがみゲート→崩れる上段へ2連ジャンプ→降下直後にしゃがみ→再跳躍',
   pattern:{name:'extra-shatter-relay',theme:'FRACTURE RELAY',duration:4.40,
    script:[[.12,'duck-on'],[.56,'duck-off'],[.72,'jump'],[1.59,'jump'],
     [2.67,'duck-on'],[3.16,'duck-off'],[3.36,'jump']],
    platforms:[[1.06,1.83,77,'fragile']],
    hazards:[[.38,'duck-gate'],[1.11,'low'],[2.24,'low'],[2.96,'duck-gate'],[3.68,'low']],
    gaps:[],pads:[]}
  }
 ]);
 const SECTIONS=Object.freeze(STAGE.map((entry,i)=>Object.freeze({
  index:H.totalSections+i,title:entry.title,chapter:entry.chapter,
  objective:entry.objective,pattern:entry.pattern
 })));
 function makeSection(i,x,seconds){
  const stage=SECTIONS.find(s=>s.index===i);
  if(!stage)throw Error('Unknown extra motif '+i);
  const segment=C.buildPattern(x,seconds,C.speedAt(seconds),stage.pattern,C.randomizer(1),0);
  segment.authoredLabel=stage.title;
  segment.authoredSection=i;
  segment.authoredObjective=stage.objective;
  segment.handcrafted=true;
  segment.pickups.push(...H.makeGuideCoins(segment));
  return segment;
 }
 return Object.freeze({SECTIONS,makeSection,firstIndex:H.totalSections,
  totalSections:H.totalSections+SECTIONS.length});
});
