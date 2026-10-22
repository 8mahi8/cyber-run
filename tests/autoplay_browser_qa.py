from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text()
core=(R/'core.js').read_text();game=(R/'game.js').read_text();css=(R/'style.css').read_text()
needle=' C.physicsStep(runner,dt,runner.x,platforms,gaps,duckHeld,jumpQueued,elapsed,rescue,pads);'
assert game.count(needle)==1
# QA-only: follow the *pattern witness script* inside the same update loop.
inject='''
 for(const seg of segments){
  if(seg.__qaNext===undefined)seg.__qaNext=0;
  while(seg.__qaNext<seg.script.length && seg.seconds+seg.script[seg.__qaNext][0]<=elapsed+1e-6){
   const event=seg.script[seg.__qaNext++][1];
   if(event==='jump')jumpQueued=true;
   else if(event==='duck-on')duckHeld=true;
   else if(event==='duck-off')duckHeld=false;
  }
 }
'''
game=game.replace(needle,inject+needle)
needle2=' draw();ui.best.textContent='
assert game.count(needle2)==1
game=game.replace(needle2, ''' window.__qa={advance(seconds){cancelAnimationFrame(nextFrame);const limit=Math.round(seconds/C.DT);for(let i=0;i<limit&&state==='running';i++)step(C.DT);draw();return {elapsed,travel:Math.floor(travel/9),hp:runner.hp,state,speed:C.speedAt(elapsed),support:runner.support,bottom:runner.bottom,segments:segments.map(s=>s.type).slice(0,3)}},screen(){draw()}};
 draw();ui.best.textContent=''' )
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>').replace('<script src="core.js"></script><script src="stickman.js"></script><script src="game.js"></script>','<script>'+core+'</script><script>'+(R/'stickman.js').read_text()+'</script><script>'+game+'</script>')
(R/'qa-autoplay.html').write_text(html)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for screen in [(844,390),(1024,768)]:
  page=browser.new_page(viewport={'width':screen[0],'height':screen[1]},has_touch=True,is_mobile=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.locator('#primary').click()
  samples=[]
  for i in range(12):
   result=page.evaluate('()=>window.__qa.advance(10)')
   samples.append(result)
   if i in (0,3,7):page.screenshot(path=str(R/f'qa-auto-{screen[0]}-{i:02}.png'))
   if result['state']!='running':break
  print(screen,'samples',samples,'errors',errors)
  page.close()
 browser.close()
