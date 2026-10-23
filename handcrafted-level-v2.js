/* CYBER RUN — V2 handcrafted study course, 2026-10-23.
 * Isolated prototype: NOT the procedural generator or Google Sites release.
 * Coin positions are sampled from the actual 120Hz physics witness, with no scoring.
 */
(function(root,factory){
 const api=factory(root.CyberRunCore||(typeof require==='function'?require('./core.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.CyberRunHandcrafted=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 if(!C)throw Error('CYBER RUN core missing');
 // Fixed warm-up occupies ~8.3s of obstacles after the short initial lead-in
 // (roughly 9.7s from RUN START). Remaining motifs test learned action chains.
 const CUSTOM=Object.freeze({'skyline-exit':{
  name:'skyline-exit',theme:'SKYLINE EXIT',duration:4.5,weight:0,
  script:[[.19,'jump'],[.89,'jump'],[2.83,'duck-on'],[3.38,'duck-off'],[3.56,'jump']],
  platforms:[[.46,1.19,75],[1.32,2.1,142]],
  hazards:[[.81,'low'],[1.81,'low'],[3.12,'duck-gate'],[3.90,'low']],gaps:[],pads:[]
 },'tunnel-bridge':{
  name:'tunnel-bridge',theme:'TUNNEL BRIDGE',duration:4.32,weight:0,
  script:[[.13,'duck-on'],[.61,'duck-off'],[.77,'jump'],[1.57,'jump'],[2.81,'duck-on'],[3.34,'duck-off'],[3.55,'jump']],
  platforms:[[1.04,1.65,77],[1.70,2.53,125]],
  hazards:[[.43,'duck-gate'],[3.06,'duck-gate'],[3.83,'low']],gaps:[],pads:[]
 },'relay-bridge':{
  name:'relay-bridge',theme:'SWITCHBACK RELAY',duration:4.4,weight:0,
  script:[[.12,'duck-on'],[.56,'duck-off'],[.72,'jump'],[1.59,'jump'],[2.67,'duck-on'],[3.16,'duck-off'],[3.36,'jump']],
  platforms:[[1.06,1.83,77]],hazards:[[.42,'duck-gate'],[2.96,'duck-gate'],[3.68,'low']],gaps:[],pads:[]
 }});
 const DESIGN=[
  ['GATE BEAT','reverse-switch','WARM-UP','しゃがみ → 解除 → ジャンプ'],
  ['UPSTEP','sky-ascend','WARM-UP','着地 → 再ジャンプ → 上段へ'],
  ['EXIT LINK','drop-and-duck','WARM-UP','下降 → 着地してしゃがむ → 跳ぶ'],
  ['SHUTTER SWITCH','duck-weave','MOTIF A','しゃがみ解除 → ジャンプ → 必須しゃがみ',[1.82]],
  ['TWO-STEP SKY','sky-stepduck','MOTIF B','二段足場 → 空中の高さ変化 → 着地'],
  ['FRAGILE STEP','fracture-hop','MOTIF C','崩れる足場を踏み切る'],
  ['RING VAULT','orb-leap','MOTIF D','空中リング → 長めの空中横断'],
  ['PULSE DRONE','pulse-drone','MOTIF E','移動障害物 → 跳ぶ → 通路'],
  ['SKYLINE EXIT','skyline-exit','CHAIN SKY','高台2段を登る → 降下 → 必須しゃがみ → 最後にジャンプ'],
  ['FRACTURE SHUTTER','fracture-shutter','CHAIN A','崩落 → 着地後の必須しゃがみ'],
  ['BROKEN CIRCUIT','fracture-rebound-gate','CHAIN B','崩落 → リング → 必須しゃがみ'],
  ['SWITCHBACK RELAY','relay-bridge','CHAIN C','しゃがみ→高台着地→再跳躍→着地しゃがみ→最後の跳躍'],
  ['TUNNEL BRIDGE','tunnel-bridge','CHAIN BRIDGE','しゃがみ→中段着地→上段着地→落下してしゃがみ→ジャンプ'],
  ['RING TO CRAWL','orb-gate','CHAIN D','空中リング → 着地後の必須しゃがみ'],
  ['FINAL RHYTHM','overdrive-rhythm','CHAIN E','高密度連続アクション',[1.07,3.45]]
 ];
 const SECTIONS=Object.freeze(DESIGN.map(([title,base,chapter,objective,gates],i)=>{
  const source=C.PATTERNS.find(p=>p.name===base)||CUSTOM[base];
  if(!source)throw Error('Missing pattern: '+base);
  const pattern={...source,name:'slice-v2-'+String(i+1).padStart(2,'0')+'-'+base,
   script:source.script.map(a=>a.slice()),
   hazards:(source.hazards||[]).map(([at,kind,...rest])=>
    [at,kind==='bar'&&(gates||[]).some(t=>Math.abs(t-at)<.001)?'duck-gate':kind,...rest]),
   platforms:(source.platforms||[]).map(a=>a.slice()),
   gaps:(source.gaps||[]).map(a=>a.slice()),pads:(source.pads||[]).map(a=>a.slice()),
   weight:0,minTime:0,challenge:false};
  return Object.freeze({index:i,title,base,chapter,objective,pattern});
 }));
 function makeGuideCoins(segment){
  // Exact sample path as a HINT, not a guarantee of first-try success.
  // Coin pickups intentionally carry zero score, zero HP and no currency.
  const evidence=C.replayPattern(segment,{trace:true});
  if(!evidence.ok)throw Error('Handcrafted section lost witnessed solution: '+segment.type+' '+evidence.reason);
  const trace=evidence.route,coins=[];
  for(let t=.34;t<segment.pattern.duration-.25;t+=.255){
   const sample=trace[Math.min(trace.length-1,Math.round(t/C.DT))];
   if(!sample)continue;
   coins.push({id:segment.type+':coin:'+coins.length,
    kind:'guide-coin',x:sample.worldX+C.HITBOX_OFFSET_X+C.BODY_W/2,
    y:sample.bottom-(sample.duck?14:26),r:7,taken:false});
  }
  return coins;
 }
 function makeSection(i,x,entrySeconds){
  if(!Number.isInteger(i)||i<0||i>=SECTIONS.length)return null;
  const section=SECTIONS[i];
  const seg=C.buildPattern(x,entrySeconds,C.speedAt(entrySeconds),section.pattern,C.randomizer(1),0);
  seg.authoredSection=i;
  seg.authoredLabel=section.title;
  seg.authoredObjective=section.objective;
  seg.handcrafted=true;
  seg.pickups.push(...makeGuideCoins(seg));
  return seg;
 }
 return Object.freeze({SECTIONS,makeSection,totalSections:SECTIONS.length,title:'CIRCUIT STUDY · V2'});
});