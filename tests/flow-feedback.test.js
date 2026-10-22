const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function createSimulation(){
 const elements=new Map(),ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),setTransform(){}},{get:(o,k)=>o[k]??(()=>{})});
 function elem(id){if(elements.has(id))return elements.get(id);const handlers={};const element={id,classList:{add(){},remove(){},toggle(){}},textContent:'',addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)},click(){for(const fn of handlers.click||[])fn({preventDefault(){}})},setPointerCapture(){},getContext:()=>ctx};elements.set(id,element);return element}
 const document={getElementById:elem,addEventListener(){},hidden:false};
 const sandbox={window:{CyberRunCore:require('../core.js'),CyberRunStickman:require('../stickman.js')},document,innerWidth:1024,innerHeight:768,devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener(){},localStorage:{getItem:()=>null,setItem(){}},console,Date,Math};
 let source=fs.readFileSync(path.join(root,'game.js'),'utf8');
 const anchor=' draw();ui.best.textContent=';
 assert.equal(source.split(anchor).length,2,'QA attachment point changed');
 source=source.replace(anchor,` window.__flowProbe={
   snapshot:()=>({chain:cleanStreak,flash:streakFlash,hp:runner.hp,travel,score:Math.floor(travel/9),state}),
   clearOne:()=>{hazards=[{x:runner.x-90,w:30,y:ground-36,h:36,kind:'low'}];step(C.DT);return window.__flowProbe.snapshot()},
   collide:()=>{invuln=0;hazards=[{x:runner.x+10,w:30,y:ground-150,h:150,kind:'tall'}];step(C.DT);return window.__flowProbe.snapshot()}
 };
`+anchor);
 vm.runInNewContext(source,sandbox,{filename:'game.js'});
 elem('primary').click();return sandbox.window.__flowProbe;
}
test('three consecutive clean passes show brief cosmetic FLOW reward',()=>{
 const sim=createSimulation();
 for(let n=1;n<=3;n++){
  const state=sim.clearOne();
  assert.equal(state.chain,n);
  assert.equal(state.flash>0,n===3);
  assert.equal(state.score,Math.floor(state.travel/9),'distance-only scoring unchanged');
 }
});
test('a real collision breaks the clean streak',()=>{
 const sim=createSimulation();for(let i=0;i<3;i++)sim.clearOne();
 const collision=sim.collide();
 assert.equal(collision.hp,2);assert.equal(collision.chain,0);assert.equal(collision.flash,0);
});
