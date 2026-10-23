'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',process.env.CHROME_BIN].filter(Boolean).find(fs.existsSync);
const root=path.resolve(__dirname,'..');
const allowed=new Set(['handcrafted-playtest-v2.html','core.js','stickman.js','style.css','handcrafted-level-v2.js','game-handcrafted-v2.js']);
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
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/handcrafted-playtest-v2.html'});
  await until(()=>ev("document.readyState==='complete' && !!window.CyberRunHandcrafted"));
  assert.equal(await ev('window.CyberRunHandcrafted.totalSections'),15);
  assert.equal(await ev("document.getElementById('primary').textContent"),'RUN START');
  assert.equal(await ev("document.getElementById('game').width>0"),true);
  await ev("document.getElementById('primary').click();true");
  await until(()=>ev("document.getElementById('overlay').classList.contains('hidden')"));
  await pause(650);
  const result=await ev("(()=>{const c=document.getElementById('game'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let gold=0;for(let i=0;i<d.length;i+=4)if(d[i]>175&&d[i+1]>125&&d[i+2]<155&&d[i]>d[i+1])gold++;return {gold,score:document.getElementById('score').textContent,hearts:document.getElementById('hearts').textContent,width:c.width,height:c.height}})()");
  assert(result.gold>8,'coin pixels not detected: '+JSON.stringify(result));
  assert.match(result.score,/m$/);assert.match(result.hearts,/♥/);assert(result.width>=900&&result.height>=500);
  await ev("document.getElementById('pause').click();true");
  await until(()=>ev("document.getElementById('primary').textContent==='再開'"));
  await ev("document.getElementById('primary').click();true");
  await until(()=>ev("document.getElementById('overlay').classList.contains('hidden')"));
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS Chromium V2: start, guide coins, score, pause/resume');
 }finally{try{ws?.close()}catch(_){}if(browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([once(browser,'exit').catch(()=>{}),pause(2000)])}server.close();try{fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch(err){console.warn('Chrome profile cleanup deferred:',err.code)}}
});
