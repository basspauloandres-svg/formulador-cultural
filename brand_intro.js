/* Cinematic procedural brand reveal — no external media, audio or network requests. */
(()=>{
 const intro=document.getElementById('vtIntro');
 const welcome=document.getElementById('vtWelcome');
 if(!intro||!welcome||welcome.hidden)return;
 const key='vt-intro-played-v1';
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(motion.matches)return;
 try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{return}
 const canvas=intro.querySelector('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 const W=1000,H=340;
 const TIMING=Object.freeze({assemble:3.15,solidStart:3.12,solidEnd:3.62,fadeStart:4.25,end:4.9});
 canvas.width=W;canvas.height=H;
 const logo=document.createElement('canvas');logo.width=W;logo.height=H;
 const l=logo.getContext('2d',{willReadFrequently:true});if(!l)return;
 const symbol=(c)=>{
  c.fillStyle='#50e0c3';c.beginPath();c.moveTo(100,89);c.lineTo(154,89);c.lineTo(190,166);c.lineTo(227,89);c.lineTo(280,89);c.lineTo(190,255);c.closePath();c.fill();
  c.fillStyle='#159a91';c.beginPath();c.moveTo(190,166);c.lineTo(227,89);c.lineTo(256,89);c.lineTo(190,218);c.closePath();c.fill();
 };
 const drawLogo=c=>{
  symbol(c);c.fillStyle='#f5f9f7';c.textBaseline='middle';c.font='750 108px system-ui, sans-serif';c.fillText('VÉRTICE',318,174,590);
 };
 drawLogo(l);
 const pixels=l.getImageData(0,0,W,H).data,particles=[];
 let seed=87321;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let y=60;y<280;y+=6)for(let x=75;x<950;x+=6){
  const i=(y*W+x)*4;if(pixels[i+3]<180)continue;
  const a=rand()*Math.PI*2,r=115+rand()*510,depth=rand();
  particles.push({x,y,sx:W/2+Math.cos(a)*r,sy:H/2+Math.sin(a)*r*.39,
   arc:(rand()-.5)*115,color:pixels[i]>190?'#f5f9f7':pixels[i+1]>165?'#50e0c3':'#159a91',delay:.15+rand()*.65,peak:12+depth*10,initial:1.2+depth*2.6});
 }
 let done=false,frame=0,timer=0;
 const finish=()=>{
  if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(timer);
  intro.hidden=true;document.removeEventListener('keydown',onKey,true);
  document.removeEventListener('pointerdown',onPointer,true);
  document.removeEventListener('visibilitychange',onVisibility);
  motion.removeEventListener?.('change',onMotion);
  if(document.activeElement===intro.querySelector('button'))document.getElementById('vtWelcomeTitle')?.focus({preventScroll:true});
 };
 const onKey=e=>{if(e.key==='Escape'||e.key==='Tab')finish()};
 const onPointer=e=>{if(!intro.contains(e.target))finish()};
 const onVisibility=()=>{if(document.hidden)finish()};
 const onMotion=e=>{if(e.matches)finish()};
 intro.querySelector('button').addEventListener('click',finish,{once:true});
 document.addEventListener('keydown',onKey,true);document.addEventListener('pointerdown',onPointer,true);
 document.addEventListener('visibilitychange',onVisibility);motion.addEventListener?.('change',onMotion);
 intro.hidden=false;
 const begin=performance.now();
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
 function render(now){
  if(done)return;
  const t=(now-begin)/1000;
  if(t>=TIMING.end){finish();return}
  ctx.clearRect(0,0,W,H);
  // A quiet, depth-like field of light, followed by a deliberate assembly.
  const atmosphere=ctx.createRadialGradient(W*.5,H*.5,8,W*.5,H*.5,390);
  atmosphere.addColorStop(0,'rgba(31,143,139,'+(.12+.10*smooth(t/2.7))+')');
  atmosphere.addColorStop(.55,'rgba(20,83,93,.08)');
  atmosphere.addColorStop(1,'rgba(7,27,35,0)');
  ctx.fillStyle=atmosphere;ctx.fillRect(0,0,W,H);
  const solid=smooth((t-TIMING.solidStart)/(TIMING.solidEnd-TIMING.solidStart));
  const camera=1+.045*smooth(t/2.2)-.045*smooth((t-2.2)/1.25);
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(camera,camera);ctx.translate(-W/2,-H/2);
  if(solid<1){
   for(const p of particles){
    const age=t-p.delay;
    if(age<=0)continue;
    const travel=smooth((age-.30)/(TIMING.assemble-p.delay-.30));
    const curve=Math.sin(Math.PI*travel);
    const x=p.sx+(p.x-p.sx)*travel+p.arc*curve;
    const y=p.sy+(p.y-p.sy)*travel-p.arc*.28*curve;
    // Squares expand from specks to 12–22 px before settling into the 6 px logo grid.
    const expand=smooth(age/.85),settle=smooth((travel-.45)/.55);
    const s=(p.initial+(p.peak-p.initial)*expand)*(1-settle)+6.05*settle;
    const a=(1-solid)*smooth(age/.38)*(.46+.54*travel);
    ctx.fillStyle=p.color;ctx.globalAlpha=a*.16;
    ctx.fillRect(x-s*.76,y-s*.76,s*1.52,s*1.52);
    ctx.globalAlpha=a;
    ctx.fillRect(x-s/2,y-s/2,s,s);
   }
  }
  if(solid>0){ctx.globalAlpha=solid;ctx.drawImage(logo,0,0)}
  ctx.restore();ctx.globalAlpha=1;
  if(t>TIMING.fadeStart)intro.style.opacity=String(1-smooth((t-TIMING.fadeStart)/(TIMING.end-TIMING.fadeStart)));
  frame=requestAnimationFrame(render);
 }
 timer=setTimeout(finish,5200);
 frame=requestAnimationFrame(render);
})();
