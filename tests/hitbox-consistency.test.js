const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../core.js');
test('live game and physics witness share the same x-offset for collision tests',()=>{
 const game=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 const core=fs.readFileSync(path.join(__dirname,'../core.js'),'utf8');
 assert.ok(Number.isFinite(C.HITBOX_OFFSET_X),'missing shared offset');
 assert.ok(game.includes('C.rectAt(runner.x+C.HITBOX_OFFSET_X,runner.bottom,runner.duck)'));
 assert.ok(core.includes('rectAt(worldX+HITBOX_OFFSET_X,runner.bottom,runner.duck)'));
 assert.ok(core.includes('rectAt(x+HITBOX_OFFSET_X,p.bottom,p.duck)'));
 assert.ok(core.includes('x+HITBOX_OFFSET_X+BODY_W*.86>platform.x'));
 assert.ok(core.includes('x+HITBOX_OFFSET_X+BODY_W*.86>pad.x'));
});
