const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function simulate(probe){
const handlers=new Map(),elements=new Map(),ctx=new Proxy({createLinearGradient:()=>({addColorStop:()=>{}}),setTransform:()=>{},beginPath:()=>{}},{get:(t,k)=>t[k]??(()=>{})});let now=0;let queued=[];
function elem(id){if(elements.has(id))return elements.get(id);const listeners={};const e={id,style:{},classList:{add:()=>{},remove:()=>{},toggle:()=>{}},textContent:'',width:100,height:100,addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn)},trigger:(type,v={})=>{for(let fn of listeners[type]||[])fn({preventDefault(){},pointerId:1,...v})},setPointerCapture:()=>{}};elements.set(id,e);return e}
const canvas=elem('game');canvas.getContext=()=>ctx;const core={...require('../core.js')};if(probe){const original=core.physicsStep;core.physicsStep=function(p,dt,x,...args){original(p,dt,x,...args);probe(p.x,x)}}const windowObj={CyberRunCore:core};const globals={window:windowObj,document:{getElementById:elem,hidden:false,addEventListener:(name,fn)=>handlers.set('document:'+name,fn)},innerWidth:1200,innerHeight:675,devicePixelRatio:1,localStorage:{getItem:()=>null,setItem:()=>{}},performance:{now:()=>now},requestAnimationFrame:fn=>{queued.push(fn);return queued.length},cancelAnimationFrame:()=>{queued=[]},addEventListener:(name,fn)=>handlers.set(name,fn),Math,Date,console};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'game.js'),'utf8'),globals,{filename:'game.js'});return{elem,tick:()=>{now+=16.667;const q=queued;queued=[];for(const cb of q)cb(now)},events:handlers}
}
test('game boots, score advances, pause and resume work, controls are registered',()=>{let x=simulate();assert.ok(x.elem('primary'));x.elem('primary').trigger('click');for(let i=0;i<250;i++)x.tick();let score=Number(x.elem('score').textContent.replace(/[^0-9]/g,''));assert.ok(score>0,'expected score to advance');x.elem('jump').trigger('pointerdown');x.elem('duck').trigger('pointerdown');x.elem('duck').trigger('pointerup');x.elem('pause').trigger('click');assert.match(x.elem('message').textContent,/一時停止/);x.elem('primary').trigger('click');for(let i=0;i<200;i++)x.tick();assert.ok(Number(x.elem('score').textContent.replace(/[^0-9]/g,''))>score)});

test('runner remains anchored on screen across frames, jumps and acceleration',()=>{
 const points=[],x=simulate((px,argumentX)=>points.push([px,argumentX]));
 x.elem('primary').trigger('click');
 for(let i=0;i<1200;i++){if(i%45===0)x.elem('jump').trigger('pointerdown');x.tick()}
 assert.ok(points.length>1000,'expected many physics updates');
 const anchor=points[0][0];
 for(const [actual,target] of points){
  assert.ok(Math.abs(actual-anchor)<.00001,'runner drifted off-screen: '+actual);
  assert.ok(Math.abs(target-anchor)<.00001,'physics received an unstable x coordinate: '+target);
 }
});
