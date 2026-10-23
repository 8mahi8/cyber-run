'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',process.env.CHROME_BIN].filter(Boolean).find(fs.existsSync);
const root=path.resolve(__dirname,'..');
const allowed=new Set(['cyber-run-v22-google-sites-draft.html']);
async function until(f,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){try{const v=await f();if(v)return v}catch(_){}await pause(75)}throw Error('Timed out waiting for browser')}
test('Chromium V2 smoke: canvas, coin, start and pause',{timeout:40000},async t=>{
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
  assert.deepEqual([...allowed],['cyber-run-v22-google-sites-draft.html']);
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/cyber-run-v22-google-sites-draft.html'});
  await until(()=>ev("document.readyState==='complete' && !!window.CyberRunHandcrafted"));
  assert.equal(await ev('window.CyberRunHandcrafted.totalSections'),16);
  assert.equal(await ev("window.CyberRunHandcrafted.SECTIONS.some(s=>s.base==='skyline-exit')"),true);
  assert.equal(await ev("window.CyberRunHandcrafted.SECTIONS.some(s=>s.base==='tunnel-bridge')"),true);
  assert.equal(await ev("window.CyberRunHandcrafted.SECTIONS.some(s=>s.base==='spring-pressure')"),true);
  assert.equal(await ev("document.getElementById('primary').textContent"),'RUN START');
  assert.equal(await ev("document.getElementById('game').width>0"),true);
  // Drive real game frames and real keyboard listeners with deterministic simulated time.
  const playback=await ev("(()=>{\n const C=window.CyberRunCore,H=window.CyberRunHandcrafted;\n const q=[];let t=C.timeToTravel(0,C.BASE_SPEED*1.45-C.HITBOX_OFFSET_X);\n for(const s of H.SECTIONS){for(const [at,cmd] of s.pattern.script)q.push({at:t+at,cmd});t+=s.pattern.duration}\n q.sort((a,b)=>a.at-b.at);const tasks=new Map();let next=1;\n window.requestAnimationFrame=cb=>{const id=next++;tasks.set(id,cb);return id};\n window.cancelAnimationFrame=id=>tasks.delete(id);\n window.__v2qa={q,tasks,base:performance.now()};\n return {events:q.length,last:t};\n})()");
  assert(playback.events>20,'missing input script');
  await ev("document.getElementById('primary').click();true");
  await until(()=>ev("document.getElementById('overlay').classList.contains('hidden')"));
  const route=await ev("(()=>{\n const qa=window.__v2qa;\n const start=qa.base,step=1000/30;\n let i=0,frames=0,last=0;\n const snapshots=[],faults=[];\n for(let f=1;f<Math.ceil(60000/step);f++){\n   const now=f*step/1000;\n   while(i<qa.q.length&&qa.q[i].at<=now+.000001){\n     const cmd=qa.q[i++].cmd;\n     if(cmd==='jump'){\n       window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));\n       window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));\n     }else if(cmd==='duck-on'){\n       window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowDown',bubbles:true}));\n     }else if(cmd==='duck-off'){\n       window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowDown',bubbles:true}));\n     }\n   }\n   const next=qa.tasks.entries().next();\n   if(next.done){faults.push('no rAF at '+now.toFixed(2));break}\n   const [id,callback]=next.value;qa.tasks.delete(id);\n   callback(start+f*step);\n   frames++;\n   const overlay=document.getElementById('overlay');\n   if(f%150===0)snapshots.push({\n     at:+now.toFixed(1),\n     distance:document.getElementById('score').textContent,\n     health:document.getElementById('hearts').textContent,\n     section:document.getElementById('region').textContent\n   });\n   if(!overlay.classList.contains('hidden')){last=now;break}\n }\n return {frames,inputEvents:i,totalEvents:qa.q.length,finishTime:+last.toFixed(2),\n   message:document.getElementById('message').textContent,\n   hearts:document.getElementById('hearts').textContent,\n   distance:document.getElementById('score').textContent,\n   snapshots,faults};\n})()");
  assert(route.frames>1300,'not enough full game frames: '+JSON.stringify(route));
  assert.match(route.message,/CLEAR!/,'real browser did not reach GOAL: '+JSON.stringify(route));
  assert.match(route.hearts,/♥ ♥ ♥/,'expected no-damage route: '+JSON.stringify(route));
  assert.deepEqual(route.faults,[]);
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS full Chrome V2 scripted route: '+JSON.stringify(route));
  // Retrying after a clear must fully reset HP and obstacles; intentionally
  // provide no input to check the ordinary three-hit loss/retry flow.
  const failed=await ev("(()=>{\n const qa=window.__v2qa;qa.base=performance.now();\n document.getElementById('primary').click();\n const startHp=document.getElementById('hearts').textContent;\n const step=1000/30;let frames=0,last=0;\n for(let f=1;f<=900;f++){\n   const next=qa.tasks.entries().next();\n   if(next.done)break;\n   const [id,fn]=next.value;qa.tasks.delete(id);\n   fn(qa.base+f*step);frames++;\n   if(!document.getElementById('overlay').classList.contains('hidden')){last=f*step/1000;break}\n }\n return {frames,startHp,endedAt:last,over:!document.getElementById('overlay').classList.contains('hidden'),\n  message:document.getElementById('message').textContent,\n  hp:document.getElementById('hearts').textContent};\n})()");
  assert.match(failed.startHp,/♥ ♥ ♥/,'retry should reset HP: '+JSON.stringify(failed));
  assert(failed.over&&failed.endedAt>0,'no-input run must terminate: '+JSON.stringify(failed));
  assert.match(failed.message,/走破/,'loss screen missing: '+JSON.stringify(failed));
  assert.deepEqual(errors,[],'browser runtime errors after retry');
  console.log('PASS Chrome V2 game-over and restart: '+JSON.stringify(failed));
 }finally{try{ws?.close()}catch(_){}if(browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([once(browser,'exit').catch(()=>{}),pause(2000)])}server.close();try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch(err){console.warn('Chrome profile cleanup deferred:',err.code)}}
});
