from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+ (R/'style.css').read_text()+'</style>').replace('<script src="core.js"></script><script src="game.js"></script>','<script>'+ (R/'core.js').read_text()+'</script><script>'+ (R/'game.js').read_text()+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,size in [('iphone_landscape',(844,390)),('ipad',(1024,768)),('iphone_portrait',(390,844))]:
  page=b.new_page(viewport={'width':size[0],'height':size[1]},has_touch=True,is_mobile=True)
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content(html,wait_until='load');page.locator('#primary').click()
  for step in range(20):
   if step in [3,7,12,15]:page.keyboard.press('Space')
   if step in [8,16]:page.keyboard.down('ArrowDown')
   if step in [10,17]:page.keyboard.up('ArrowDown')
   page.wait_for_timeout(125)
  page.screenshot(path=str(R/f'qa-{name}.png'))
  print(name,'score',page.locator('#score').inner_text(),'hp',page.locator('#hearts').inner_text(),'status',page.locator('#overlay').get_attribute('class'),'errors',errors)
  page.close()
 b.close()
