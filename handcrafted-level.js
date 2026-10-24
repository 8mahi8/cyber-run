/* CYBER RUN — THE CIRCUIT / handcrafted finite benchmark.
 * A manually ordered and revised challenge level: never a procedural draw.
 * It reuses the certified physics engine so the later generator can learn
 * measurable action-role, transition and timing constraints from this route.
 */
(function(root,factory){
 const api=factory(root.CyberRunCore||(typeof require==='function'?require('./core.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.CyberRunHandcrafted=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 if(!C)throw Error('Handcrafted map requires the existing physics engine');
 // Fixed authored order. The labels are also the 20-stage design blueprint.
 const DESIGN=[
  ['SHUTTER WAKE','reverse-switch','01 • 切替','必須しゃがみ → ジャンプ'],
  ['DOUBLE HEIGHT','sky-ascend-duck','02 • 上昇','2段の足場 → 空中しゃがみ'],
  ['THREE BEATS','rhythm-five','03 • 連打','ジャンプと必須しゃがみの交互連携','hard-duck'],
  ['FALSE FLOOR','fracture-hop','04 • 崩落','崩れる床を踏み切る'],
  ['REBOUND GATE','orb-leap','05 • 空中反発','リングを使って穴を越える'],
  ['CROSS THREAD','duck-weave','06 • 切替連携','2回の必須しゃがみとジャンプ','hard-duck'],
  ['SPRING VAULT','spring-to-sky','07 • ブースト','跳ね上がって上段へ着地'],
  ['DROP SHUTTER','fracture-shutter','08 • 崩落通路','崩落後にしゃがむ'],
  ['STAGGERED SKY','sky-stepduck','09 • 段差','高低差を越えながらしゃがむ'],
  ['RING TO CRAWL','orb-gate','10 • 反発通路','空中反発 → 必須しゃがみ'],
  ['TIGHT RHYTHM','overdrive-rhythm','11 • 連続','3回のジャンプと3回のしゃがみ','hard-duck'],
  ['MASTER BRIDGE','fracture-rebound-gate','12 • 複合','崩落 → 空中リング → 必須しゃがみ'],
  ['HIGH ROUTE','sky-ascend','13 • 上段','2段の足場を踏んで離脱'],
  ['MOVING HAZARD','pulse-drone','14 • ドローン','移動障害物 → ジャンプ → しゃがみ'],
  ['FRACTURE RETURN','fracture-hop','15 • 再挑戦','速くなった速度で崩落床を踏み切る'],
  ['UPPER SHUTTER','sky-ascend-duck','16 • 上層','上段でしゃがみ、低い足場へ降りる'],
  ['REBOUND MASTERY','fracture-rebound-gate','17 • 熟練','複合装置を素早くつなぐ'],
  ['FINAL RHYTHM','overdrive-rhythm','18 • 高密度','必須しゃがみとジャンプを連続','hard-duck'],
  ['FINAL AIR','orb-gate','19 • 空中','反発から短い猶予で通路へ'],
  ['LAST CIRCUIT','fracture-rebound-gate','20 • 終点','最後の複合ギミックを越えてゴール']
 ];
 const SECTIONS=Object.freeze(DESIGN.map(([title,base,chapter,objective,variation],i)=>{
  const source=C.PATTERNS.find(p=>p.name===base);
  if(!source)throw Error('Missing authored template: '+base);
  const hazards=(source.hazards||[]).map(h=>h.slice());
  if(variation==='hard-duck'){
   // Rework optional bars into actual mandatory crawlspaces while preserving
   // the hand-authored action sequence and its collision-tested timing.
   const target=base==='duck-weave'?[1.82]:base==='rhythm-five'?[1.07]:[1.07,3.45];
   for(const h of hazards)if(h[1]==='bar'&&target.some(t=>Math.abs(t-h[0])<.001))h[1]='duck-gate';
  }
  const pattern={...source,
   name:'authored-'+String(i+1).padStart(2,'0')+'-'+base,
   theme:chapter,script:source.script.map(v=>v.slice()),
   hazards,platforms:(source.platforms||[]).map(v=>v.slice()),
   gaps:(source.gaps||[]).map(v=>v.slice()),pads:(source.pads||[]).map(v=>v.slice()),
   weight:0,minTime:0,challenge:false};
  return Object.freeze({index:i,title,base,chapter,objective,pattern});
 }));
 function makeSection(i,x,entrySeconds){
  if(!Number.isInteger(i)||i<0||i>=SECTIONS.length)return null;
  const section=SECTIONS[i];
  const seg=C.buildPattern(x,entrySeconds,C.speedAt(entrySeconds),section.pattern,C.randomizer(1),0);
  seg.authoredSection=i;
  seg.authoredLabel=section.title;
  seg.authoredObjective=section.objective;
  seg.handcrafted=true;
  return seg;
 }
 return Object.freeze({SECTIONS,makeSection,totalSections:SECTIONS.length,title:'THE CIRCUIT · 01'});
});