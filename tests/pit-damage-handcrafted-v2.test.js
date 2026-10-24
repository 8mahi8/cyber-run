'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const G=require('../core.js');

function simulate(jumpOnLip){
 const observed=[],elems=new Map(),handlers=new Map();
 let now=0,queue=[],lastId=0;
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),setTransform(){},beginPath(){}},
  {get:(t,k)=>t[k]??(()=>{})});
 function element(id){
  if(elems.has(id))return elems.get(id);
  const listeners=new Map();
  const item={id,textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},
   width:1024,height:768,addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
   trigger(type){for(const cb of listeners.get(type)||[])cb({preventDefault(){},pointerId:1})},
   setPointerCapture(){}};
  elems.set(id,item);return item;
 }
 element('game').getContext=()=>ctx;
 const core={...G};
 const physics=core.physicsStep;
 core.physicsStep=function(p,dt,x,platforms,gaps,duck,jump,t,rescue,pads){
  const v=physics(p,dt,x,platforms,gaps,duck,jump,t,rescue,pads);
  observed.push({time:t,bottom:p.bottom,support:p.support,hp:p.hp,jumps:p.jumps});
  return v;
 };
 const H={totalSections:1,makeSection(i,x,t){
  // 160px pit reached while accelerating at ~2s; long safe platform after.
  return {type:'gap-test',theme:'GROUND FLOW',x,length:3200,seconds:t,speed:core.speedAt(t),
   authoredLabel:'GAP QA',authoredSection:0,script:[],pattern:{duration:7},
   hazards:[],gaps:[{x:x+240,w:160}],pads:[],platforms:[],pickups:[]};
 }};
 const globals={window:{CyberRunCore:core,CyberRunHandcrafted:H,
    CyberRunStickman:{draw(){} }},
  innerWidth:1200,innerHeight:675,devicePixelRatio:1,
  document:{getElementById:element,hidden:false,addEventListener:(name,fn)=>handlers.set('doc:'+name,fn)},
  performance:{now:()=>now},localStorage:{getItem:()=>null,setItem(){}},
  addEventListener:(name,fn)=>handlers.set(name,fn),
  requestAnimationFrame:(fn)=>{const id=++lastId;queue.push({id,fn});return id},
  cancelAnimationFrame:id=>{queue=queue.filter(e=>e.id!==id)},
  Math,Date,console};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'game-handcrafted-v2.js'),'utf8'),globals,
  {filename:'game-handcrafted-v2.js'});
 element('primary').trigger('click');
 let jumped=false;
 for(let frame=0;frame<210;frame++){
  now+=1000/60;
  const q=queue;queue=[];
  for(const task of q)task.fn(now);
  const latest=observed.at(-1);
  if(jumpOnLip&&!jumped&&latest&&latest.support===null&&
     latest.bottom>core.GROUND&&latest.bottom<core.GROUND+4){
   element('jump').trigger('pointerdown');
   jumped=true;
  }
 }
 return {observed,jumped,hearts:element('hearts').textContent};
}

test('pit edge removes floor support but cannot damage before a true fall',()=>{
 const {observed}=simulate(false);
 assert(observed.length>200,'expected actual frame physics');
 const firstAir=observed.find(x=>x.support===null&&x.bottom>G.GROUND);
 assert(firstAir,'never began falling into the gap');
 assert.equal(firstAir.hp,3,'standing at the visible lip must NOT instantly lose HP');
 const firstHpLoss=observed.findIndex(x=>x.hp===2);
 assert(firstHpLoss>=0,'genuine deep pit fall must still damage');
 const deepestBeforeLoss=Math.max(...observed.slice(0,firstHpLoss).map(s=>s.bottom));
 assert(deepestBeforeLoss>G.GROUND+105,
  'HP must only be lost after a real visible fall, deepest='+deepestBeforeLoss);
});

test('jump from the edge during coyote window clears pit without accidental damage',()=>{
 const {observed,jumped,hearts}=simulate(true);
 assert(jumped,'the test did not trigger the lip jump');
 assert(observed.length>200,'insufficient game frames');
 assert(observed.some(s=>s.jumps>0&&s.support===null),'jump failed to launch');
 assert(observed.every(s=>s.hp===3),
  'pit lip jump unexpectedly lost health: '+hearts);
});
