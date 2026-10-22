"""Manual Chrome/Chromium-only V0.7 QA. Never alters the public V0.6 version.
Run from repo root: python tests/v07_trajectory_browser_qa.py
Needs: playwright + Chromium installed. Safari hardware still needs user review.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'style.css').read_text(encoding='utf-8')
core=(root/'core.js').read_text(encoding='utf-8')
stick=(root/'stickman.js').read_text(encoding='utf-8')
game=(root/'game.js').read_text(encoding='utf-8')

# QA-only: follow each accepted procedural segment's witnessed input actions.
needle=' C.physicsStep(runner,dt,runner.x,platforms,gaps,duckHeld,jumpQueued,elapsed,rescue,pads);'
assert game.count(needle)==1
game=game.replace(needle, '''
 for(const seg of segments){
  if(seg.__testNext===undefined)seg.__testNext=0;
  while(seg.__testNext<seg.script.length&&seg.seconds+seg.script[seg.__testNext][0]<=elapsed+1e-6){
   const action=seg.script[seg.__testNext++][1];
   if(action==='jump')jumpQueued=true;
   else if(action==='duck-on')duckHeld=true;
   else if(action==='duck-off')duckHeld=false;
  }
 }
'''+needle)
startup=' draw();ui.best.textContent='
assert game.count(startup)==1
game=game.replace(startup, '''
 window.__qaV07={
  advance(secs){cancelAnimationFrame(nextFrame);
   const steps=Math.round(secs/C.DT);
   for(let i=0;i<steps&&state==='running';i++)step(C.DT);
   draw();
   return {elapsed,speed:C.speedAt(elapsed),hp:runner.hp,state,
    visibleTypes:segments.map(a=>a.type).slice(0,3),
    generated:segments.filter(a=>a.origin==='trajectory-first').length,
    gates:hazards.filter(h=>h.kind==='duck-gate').length};
  }
 };
'''+startup)

tag='<script src="core.js"></script><script src="stickman.js"></script><script src="game.js"></script>'
assert html.count(tag)==1 and html.count('<link rel="stylesheet" href="style.css">')==1
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
html=html.replace(tag,
 '<script>globalThis.CYBER_RUN_V07_EXPERIMENTAL=true;</script>'+
 '<script>'+core+'</script><script>'+stick+'</script><script>'+game+'</script>')

with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',
                                    args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(844,390),(1024,768)]:
  page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.locator('#primary').click()
  result=None
  for i in range(12):
   result=page.evaluate('()=>window.__qaV07.advance(10)')
   if i in (7,11):
    target=root/('v07-qa-'+str(width)+'-'+str(i)+'.png')
    page.screenshot(path=str(target))
   if result['state']!='running':break
  assert result is not None
  assert result['state']=='running' and result['hp']==3 and result['elapsed']>119,result
  assert result['speed']==1150,result
  assert not errors,errors
  print('PASS',width,height,result)
  page.close()
 browser.close()
