const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function simulate(probe){
const handlers=new Map(),elements=new Map(),ctx=new Proxy({createLinearGradient:()=>({addColorStop:()=>{}}),setTransform:()=>{},beginPath:()=>{}},{get:(t,k)=>t[k]??(()=>{})});let now=0;let queued=[];
function elem(id){if(elements.has(id))return elements.get(id);const listeners={};const e={id,style:{},classList:{add:()=>{},remove:()=>{},toggle:()=>{}},textContent:'',width:100,height:100,addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn)},trigger:(type,v={})=>{for(let fn of listeners[type]||[])fn({preventDefault(){},pointerId:1,...v})},setPointerCapture:()=>{}};elements.set(id,e);return e}
const canvas=elem('game');canvas.getContext=()=>ctx;const core={...require('../core.js')};if(probe){const original=core.physicsStep;core.physicsStep=function(p,dt,x,...args){original(p,dt,x,...args);probe(p.x,x)}}const windowObj={CyberRunCore:core,CyberRunStickman:require('../stickman.js')};const globals={window:windowObj,document:{getElementById:elem,hidden:false,addEventListener:(name,fn)=>handlers.set('document:'+name,fn)},innerWidth:1200,innerHeight:675,devicePixelRatio:1,localStorage:{getItem:()=>null,setItem:()=>{}},performance:{now:()=>now},requestAnimationFrame:fn=>{queued.push(fn);return queued.length},cancelAnimationFrame:()=>{queued=[]},addEventListener:(name,fn)=>handlers.set(name,fn),Math,Date,console};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'game.js'),'utf8'),globals,{filename:'game.js'});return{elem,tick:()=>{now+=16.667;const q=queued;queued=[];for(const cb of q)cb(now)},events:handlers,pending:()=>queued.length,resize:(w,h)=>{globals.innerWidth=w;globals.innerHeight=h;handlers.get('resize')?.()}}
}
test('game boots, score advances, pause and resume work, controls are registered',()=>{let x=simulate();assert.ok(x.elem('primary'));x.elem('primary').trigger('click');for(let i=0;i<250;i++)x.tick();let score=Number(x.elem('score').textContent.replace(/[^0-9]/g,''));assert.ok(score>0,'expected score to advance');x.elem('jump').trigger('pointerdown');x.elem('duck').trigger('pointerdown');x.elem('duck').trigger('pointerup');x.elem('pause').trigger('click');assert.match(x.elem('message').textContent,/一時停止/);x.elem('primary').trigger('click');for(let i=0;i<200;i++)x.tick();assert.ok(Number(x.elem('score').textContent.replace(/[^0-9]/g,''))>score)});

test('runner remains anchored on screen across frames, jumps and acceleration',()=>{
 const points=[],x=simulate((px,argumentX)=>points.push([px,argumentX]));
 x.elem('primary').trigger('click');
 // A randomly generated course may cause game-over well before 1200 frames.
 // Restart only after a real loss to gather enough position samples; otherwise
 // this test flakes on obstacle-seed luck rather than detecting camera drift.
 let retries=0;
 for(let i=0;i<1200;i++){
  if(x.elem('message').textContent.includes('走破')){
   x.elem('primary').trigger('click');
   x.elem('message').textContent='';
   retries++;
  }
  if(i%45===0)x.elem('jump').trigger('pointerdown');
  x.tick();
 }
 assert.ok(points.length>1000,
  'expected 1000+ genuine physics updates across '+retries+' runs; got '+points.length);
 const anchor=points[0][0];
 for(const [actual,target] of points){
  assert.ok(Math.abs(actual-anchor)<.00001,'runner drifted off-screen: '+actual);
  assert.ok(Math.abs(target-anchor)<.00001,'physics received an unstable x coordinate: '+target);
 }
});

test('repeated pause and resume never schedules duplicate animation loops',()=>{
 const x=simulate();x.elem('primary').trigger('click');
 for(let i=0;i<15;i++){
  assert.equal(x.pending(),1,'one active frame before pausing');
  x.elem('pause').trigger('click');assert.equal(x.pending(),0,'no frame while paused');
  x.elem('primary').trigger('click');assert.equal(x.pending(),1,'only one active frame after resume');
  x.tick();assert.equal(x.pending(),1,'one frame after ticking');
 }
});
test('runner remains visible after landscape portrait landscape resize',()=>{
 const position=[];const x=simulate((px)=>position.push(px));
 x.elem('primary').trigger('click');for(let k=0;k<20;k++)x.tick();
 x.resize(390,844);for(let k=0;k<20;k++)x.tick();
 const width=390/(844/540);
 assert.ok(position.at(-1)>0&&position.at(-1)<width-21,'runner remained inside portrait viewport');
 const before=position.at(-1);for(let k=0;k<20;k++)x.tick();
 assert.equal(position.at(-1),before,'runner does not drift after portrait resize');
 x.resize(1180,664);for(let k=0;k<20;k++)x.tick();
 assert.ok(position.at(-1)>0&&position.at(-1)<1180/(664/540)-21);
});
