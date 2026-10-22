/* CYBER RUN — animated neon stick runner, cosmetic only; no hitbox or game RNG changes. */
(function(root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.CyberRunStickman=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2;
  function point(x,y){return {x,y}}
  function pose({time=0, phase=null, intensity=0, duck=false, supported=true, jumps=0, vy=0, boost=false}={}) {
    // Origin is ground level under the stick figure. Crouch fits 27px.
    if(duck && supported){
      const bob=Math.sin(time*15)*.5;
      const head=point(5,-20.0+bob),shoulder=point(1,-15.5+bob),hip=point(-4,-9.5);
      return {type:'crouch',head,radius:5.2,shoulder,hip,
        arms:[[shoulder,point(8,-13),point(14,-12)], [shoulder,point(-7,-10),point(-11,-5)]],
        legs:[[hip,point(5,-6),point(11,-1)], [hip,point(-11,-5),point(-14,-1)]]};
    }
    // Integrated phase keeps the gait continuous as running speed increases.
    // Time is a fallback for independent animation preview and test harnesses.
    const running=supported,gaitPhase=Number.isFinite(phase)?phase:time*(19+11*Math.min(1,Math.max(0,intensity)));
    const s=Math.sin(gaitPhase),c=Math.cos(gaitPhase);
    const lean=running?1.3+intensity*2.5:vy<0?1:0;
    // One foot plants while the other swings, instead of two free-spinning legs.
    const bounce=running?(1.0+intensity)*Math.pow(Math.sin(gaitPhase),2):0;
    const head=point(lean+1,-40+bounce),shoulder=point(lean,-30+bounce),hip=point(-1,-18+bounce);
    let arms,legs,type;
    if(running){
      type='run';
      const stride=17+intensity*5, duty=.47-intensity*.04, lift=9+intensity*4;
      const smooth=u=>u*u*(3-2*u);
      function foot(phaseOffset){
        const u=((gaitPhase/6.283185307179586+phaseOffset)%1+1)%1;
        if(u<duty)return point(stride*(.5-u/duty),-1);
        const w=(u-duty)/(1-duty);
        return point(stride*(-.5+smooth(w)),-1-lift*Math.sin(Math.PI*w));
      }
      const nearFoot=foot(0),farFoot=foot(.5);
      const knee=(end,bend)=>point(hip.x+(end.x-hip.x)*.52+bend,-10+(end.y+1)*.22);
      legs=[[hip,knee(nearFoot,3),nearFoot],[hip,knee(farFoot,-2),farFoot]];
      arms=[
        [point(shoulder.x-2,shoulder.y),point(-4-nearFoot.x*.50,-24),point(-5-nearFoot.x*.67,-18)],
        [point(shoulder.x+2,shoulder.y),point(4-farFoot.x*.50,-24),point(6-farFoot.x*.67,-18)]
      ];
    }else if(boost || jumps>=2){
      type='double';
      arms=[[shoulder,point(-10,-35),point(-15,-40)], [shoulder,point(11,-36),point(16,-39)]];
      legs=[[hip,point(10,-16),point(9,-8)], [hip,point(-10,-17),point(-7,-8)]];
    }else{
      // No one-frame pose snap at the jump apex: blend limb joints with vertical
      // velocity while keeping the collision state and hitbox unchanged.
      const t=Math.max(0,Math.min(1,(vy+150)/330));
      const fallBlend=t*t*(3-2*t);
      const interpolate=(a,b)=>point(a.x+(b.x-a.x)*fallBlend,a.y+(b.y-a.y)*fallBlend);
      const jumpingArms=[[shoulder,point(-8,-36),point(-12,-41)], [shoulder,point(9,-36),point(13,-42)]];
      const fallingArms=[[shoulder,point(-10,-28),point(-14,-23)], [shoulder,point(10,-28),point(15,-24)]];
      const jumpingLegs=[[hip,point(7,-12),point(13,-7)], [hip,point(-7,-11),point(-5,-3)]];
      const fallingLegs=[[hip,point(5,-10),point(7,0)], [hip,point(-5,-10),point(-9,0)]];
      const blend=(a,b)=>a.map((limb,i)=>limb.map((joint,j)=>interpolate(joint,b[i][j])));
      type=vy<90?'jump':'fall';
      arms=blend(jumpingArms,fallingArms);
      legs=blend(jumpingLegs,fallingLegs);
    }
    return {type,head,radius:6.2,shoulder,hip,arms,legs};
  }
  function draw(ctx, x, bottom, state={}) {
    const p=pose(state);
    ctx.save();ctx.translate(x+18,bottom);
    ctx.lineCap='round';ctx.lineJoin='round';
    const ink='#081728', neon=state.boost?'#ffef9b':'#71ffe3';
    function limb(points,color,width){
      ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    }
    for(let i=0;i<2;i++){
      limb(p.legs[i],ink,6.6);limb(p.legs[i],neon,3.2);
      limb(p.arms[i],ink,5.6);limb(p.arms[i],i===0?'#35c8dd':neon,2.8);
    }
    limb([p.hip,p.shoulder],ink,7.7);limb([p.hip,p.shoulder],neon,4.1);
    ctx.shadowColor=neon;ctx.shadowBlur=7;
    ctx.beginPath();ctx.arc(p.head.x,p.head.y,p.radius,0,TAU);
    ctx.fillStyle=ink;ctx.fill();ctx.strokeStyle=neon;ctx.lineWidth=3;ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#eafff8';ctx.fillRect(p.head.x+2.1,p.head.y-1,2.5,2.5);
    ctx.fillStyle='#b9fff0';
    for(const limbPoints of [...p.legs,...p.arms]){
      const joint=limbPoints[1];ctx.beginPath();ctx.arc(joint.x,joint.y,1.7,0,TAU);ctx.fill();
    }
    ctx.restore();
    return p;
  }
  return {pose,draw};
});
