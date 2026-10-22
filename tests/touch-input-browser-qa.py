"""Run with Python Playwright + Chromium. Real pointer/touch interactions, no witness autopilot."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
page_html=(R/'index.html').read_text(encoding='utf-8')
game=(R/'game.js').read_text(encoding='utf-8')
tag=' draw();ui.best.textContent='
assert game.count(tag)==1
game=game.replace(tag," window.__qaRead=()=>({state,elapsed,runner:{...runner},duckHeld,viewW});\n"+tag)
page_html=page_html.replace('<link rel="stylesheet" href="style.css">','<style>'+(R/'style.css').read_text(encoding='utf-8')+'</style>')
page_html=page_html.replace('<script src="core.js"></script><script src="stickman.js"></script><script src="game.js"></script>','<script>'+(R/'core.js').read_text(encoding='utf-8')+'</script><script>'+(R/'stickman.js').read_text(encoding='utf-8')+'</script><script>'+game+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 errors=[]
 def boot():
  pg=b.new_page(viewport={'width':844,'height':390},has_touch=True,is_mobile=True,device_scale_factor=1)
  pg.on('pageerror',lambda exc:errors.append(str(exc)))
  pg.set_content(page_html,wait_until='load')
  pg.locator('#primary').tap()
  pg.wait_for_timeout(80)
  assert pg.evaluate("window.__qaRead().state")=='running'
  return pg
 pg=boot()
 before=pg.evaluate('window.__qaRead()')
 pg.locator('#jump').tap()
 pg.wait_for_timeout(120)
 first=pg.evaluate('window.__qaRead()')
 assert first['runner']['jumps']==1 and first['runner']['bottom']<before['runner']['bottom']
 pg.locator('#jump').tap()
 pg.wait_for_timeout(75)
 assert pg.evaluate('window.__qaRead().runner.jumps')==2
 pg.close()
 pg=boot()
 pg.locator('#duck').dispatch_event('pointerdown',{'pointerId':23,'isPrimary':True,'pointerType':'touch'})
 pg.wait_for_timeout(80)
 assert pg.evaluate('window.__qaRead().runner.duck')
 pg.locator('#duck').dispatch_event('pointerup',{'pointerId':23,'isPrimary':True,'pointerType':'touch'})
 pg.wait_for_timeout(50)
 assert not pg.evaluate('window.__qaRead().runner.duck')
 pg.locator('#pause').tap()
 assert pg.evaluate('window.__qaRead().state')=='paused'
 pg.locator('#primary').tap()
 assert pg.evaluate('window.__qaRead().state')=='running'
 pg.set_viewport_size({'width':390,'height':844})
 assert pg.evaluate('(()=>{const q=window.__qaRead();return q.runner.x>0&&q.runner.x<q.viewW-40})()')
 pg.set_viewport_size({'width':844,'height':390})
 assert pg.evaluate('(()=>{const q=window.__qaRead();return q.runner.x>0&&q.runner.x<q.viewW-40})()')
 assert not errors,errors
 print('PASS: double jump, hold/release crouch, pause/resume, rotate; JS errors=0')
 b.close()
