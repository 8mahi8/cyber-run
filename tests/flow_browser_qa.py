"""Optional Chromium QA: verifies cosmetic FLOW feedback, damage reset and HUD clearance.
Requirements: python playwright and local chromium. Not an iPad Safari substitute.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text(encoding='utf-8')
game=(R/'game.js').read_text(encoding='utf-8')
core=(R/'core.js').read_text(encoding='utf-8')
fig=(R/'stickman.js').read_text(encoding='utf-8')
css=(R/'style.css').read_text(encoding='utf-8')
physics=' C.physicsStep(runner,dt,runner.x,platforms,gaps,duckHeld,jumpQueued,elapsed,rescue,pads);'
assert game.count(physics)==1
game=game.replace(physics,''' for(const seg of segments){
 if(seg.__qaNext===undefined)seg.__qaNext=0;
 while(seg.__qaNext<seg.script.length&&seg.seconds+seg.script[seg.__qaNext][0]<=elapsed+1e-6){
 const action=seg.script[seg.__qaNext++][1];
 if(action==='jump')jumpQueued=true;
 else if(action==='duck-on')duckHeld=true;
 else if(action==='duck-off')duckHeld=false;
 }}
'''+physics)
anchor=' draw();ui.best.textContent='
assert game.count(anchor)==1
game=game.replace(anchor,''' window.__flowQa={
 advance(seconds){cancelAnimationFrame(nextFrame);
 for(let i=0;i<Math.floor(seconds/C.DT);i++){
  if(state!=='running')break;step(C.DT)
 }
 draw();return{chain:cleanStreak,flash:streakFlash,hp:runner.hp,state,elapsed}
 },
 damage(){invuln=0;hit();draw();return{chain:cleanStreak,flash:streakFlash,hp:runner.hp}}
 };
'''+anchor)
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
tag='<script src="core.js"></script><script src="stickman.js"></script><script src="game.js"></script>'
html=html.replace(tag,'<script>'+core+'</script><script>'+fig+'</script><script>'+game+'</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(844,390),(1024,768),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=True,is_mobile=True)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  pause=page.locator('#pause').bounding_box()
  region=page.locator('#distance').bounding_box()
  assert pause and region and (pause['y']>=region['y']+region['height']),('HUD overlap',width,height,pause,region)
  page.locator('#primary').click()
  hit_event=None
  for _ in range(12000):
   now=page.evaluate('()=>window.__flowQa.advance(1/120)')
   if now['flash']>0 and now['chain']>=3:
    hit_event=now;break
   if now['state']!='running':break
  assert hit_event and hit_event['hp']==3,('FLOW not triggered',width,height,hit_event)
  damaged=page.evaluate('()=>window.__flowQa.damage()')
  assert damaged['hp']==2 and damaged['chain']==0 and damaged['flash']==0,damaged
  assert not errors,errors
  print('PASS',width,height,'first FLOW at',round(hit_event['elapsed'],2),'seconds')
  page.close()
 browser.close()
