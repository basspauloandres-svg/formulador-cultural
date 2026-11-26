/* Local procedural brand animation — no external media, no network requests. */
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
  const a=rand()*Math.PI*2,r=80+rand()*470;
  particles.push({x,y,sx:W/2+Math.cos(a)*r,sy:H/2+Math.sin(a)*r*.45,
   color:pixels[i]>190?'#f5f9f7':pixels[i+1]>165?'#50e0c3':'#159a91',delay:rand()*.28,size:3+rand()*5});
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
 function render(now){
  if(done)return;
  const t=(now-begin)/1000;
  if(t>=1.95){finish();return}
  ctx.clearRect(0,0,W,H);
  const solid=clamp((t-1.0)/.35);
  if(solid<1){
   for(const p of particles){
    const u=clamp((t-p.delay)/(.95-p.delay)),e=1-Math.pow(1-u,3);
    const x=p.sx+(p.x-p.sx)*e,y=p.sy+(p.y-p.sy)*e,s=p.size+(5-p.size)*e;
    ctx.fillStyle=p.color;ctx.globalAlpha=(1-solid)*(.15+.85*clamp(t/.25));
    ctx.fillRect(x-s/2,y-s/2,s,s);
   }
  }
  if(solid>0){ctx.globalAlpha=solid;ctx.drawImage(logo,0,0)}
  ctx.globalAlpha=1;
  if(t>1.65)intro.style.opacity=String(1-clamp((t-1.65)/.30));
  frame=requestAnimationFrame(render);
 }
 timer=setTimeout(finish,2100);
 frame=requestAnimationFrame(render);
})();
