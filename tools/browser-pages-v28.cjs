'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',process.env.CHROME_BIN].filter(Boolean).find(fs.existsSync);
const root=path.resolve(__dirname,'..');
const allowed=new Set(['playtest-v28/index.html']);
async function until(f,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){try{const v=await f();if(v)return v}catch(_){}await pause(75)}throw Error('Timed out waiting for browser')}
test('Chromium V2 smoke: canvas, coin, start and pause',{timeout:145000},async t=>{
 if(!chrome){t.skip('Chromium unavailable on test runner');return}
 const server=http.createServer((req,res)=>{
  const file=decodeURIComponent((req.url||'').split('?')[0]).slice(1);
  if(file==='favicon.ico'){res.writeHead(204);res.end();return}
  if(!allowed.has(file)){res.writeHead(404);res.end();return}
  fs.readFile(path.join(root,file),(err,bytes)=>{
   if(err){res.writeHead(404);res.end();return}
   res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(bytes);
  });
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cyber-v2-'));
 const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
  '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const port=await until(()=>{const s=fs.readFileSync(path.join(tmp,'DevToolsActivePort'),'utf8').split('\n')[0];return /^\d+$/.test(s)?Number(s):null});
  const target=await until(async()=>{const a=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());return a.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)});
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  let n=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',e=>{
   const m=JSON.parse(String(e.data));
   if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.text||'JS error');
   if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('JS eval error: '+r.exceptionDetails.text);return r.result?.value};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});
  // A standalone direct-code build must bootstrap with only the one HTML asset.
  assert(allowed.has('playtest-v28/index.html'));
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/playtest-v28/index.html'});
  await until(()=>ev("document.readyState==='complete' && !!window.CyberRunHandcrafted"));
  assert.equal(await ev('window.CyberRunInfinite.totalSections===Infinity'),true);
  assert.equal(await ev("window.CyberRunHandcrafted.SECTIONS.some(s=>s.base==='skyline-exit')"),true);
  assert.equal(await ev("window.CyberRunHandcrafted.SECTIONS.some(s=>s.base==='tunnel-bridge')"),true);
  assert.equal(await ev("window.CyberRunHandcrafted.SECTIONS.some(s=>s.base==='spring-pressure')"),true);
  assert.equal(await ev("document.getElementById('primary').textContent"),'RUN START');
  assert.equal(await ev("document.getElementById('game').width>0"),true);
   const plan=await ev("(()=>{const C=window.CyberRunCore,I=window.CyberRunInfinite;\nwindow.CYBER_RUN_TEST_SEED=424242;\nlet t=C.timeToTravel(0,C.BASE_SPEED*1.45-C.HITBOX_OFFSET_X),x=C.BASE_SPEED*1.45;\nconst g=I.makeGenerator(424242),q=[],sections=[];\nwhile(t<230&&sections.length<100){const s=g.next(x,t,3);\nfor(const [at,cmd] of s.script)q.push({at:t+at,cmd});\nsections.push({at:+t.toFixed(1),tier:s.difficulty.tier,idx:s.authoredSection});\nt+=s.pattern.duration;x+=s.length}\nq.sort((a,b)=>a.at-b.at);let id=0;const tasks=new Map();\nwindow.requestAnimationFrame=cb=>{const n=++id;tasks.set(n,cb);return n};\nwindow.cancelAnimationFrame=n=>tasks.delete(n);\nwindow.__qa={q,tasks,sections,base:performance.now()};\nreturn {events:q.length,sections:sections.length,end:t}})()");
   assert(plan.events>180&&plan.sections>45,'too few authored events: '+JSON.stringify(plan));
   await ev("document.getElementById('primary').click();true");
   await until(()=>ev("document.getElementById('overlay').classList.contains('hidden')"));
   const result=await ev("(()=>{const qa=window.__qa,dt=1000/30;let ei=0,frames=0;const snaps=[],faults=[];\nfor(let n=1;n<=6630;n++){const now=n/30;\nwhile(ei<qa.q.length&&qa.q[ei].at<=now+.000001){\nconst c=qa.q[ei++].cmd;\nif(c==='jump'){window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));\nwindow.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}))}\nif(c==='duck-on')window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown',bubbles:true}));\nif(c==='duck-off')window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowDown',bubbles:true}))}\nconst entry=qa.tasks.entries().next();if(entry.done){faults.push('no rAF at '+now);break}\nconst [id,fn]=entry.value;qa.tasks.delete(id);fn(qa.base+n*dt);frames++;\nif(n%900===0)snaps.push({at:n/30,score:document.getElementById('score').textContent,\nhp:document.getElementById('hearts').textContent,label:document.getElementById('region').textContent});\nif(!document.getElementById('overlay').classList.contains('hidden')){\nfaults.push('early finish at '+now+': '+document.getElementById('message').textContent);break}}\nreturn {frames,inputs:ei,score:document.getElementById('score').textContent,\nhp:document.getElementById('hearts').textContent,ongoing:document.getElementById('overlay').classList.contains('hidden'),\nsnaps,late:qa.sections.filter(s=>s.at>165).slice(0,15),faults}})()");
   assert(result.frames>=6600,'220s replay incomplete: '+JSON.stringify(result));
   assert(result.ongoing,'endless run unexpectedly ended: '+JSON.stringify(result));
   assert.match(result.hp,/♥ ♥ ♥/,'scripted route got hit: '+JSON.stringify(result));
   assert(Number(result.score.replace(/[^0-9]/g,''))>20000,'distance stalled');
   assert(result.late.some(s=>s.tier===5),'endurance never reached');
   assert.deepEqual(result.faults,[]);
   assert.deepEqual(errors,[]);
   console.log('PASS 220s Chromium infinite route: '+JSON.stringify(result));
 }finally{try{ws?.close()}catch(_){}if(browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([once(browser,'exit').catch(()=>{}),pause(2000)])}server.close();try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch(err){console.warn('Chrome profile cleanup deferred:',err.code)}}
});
