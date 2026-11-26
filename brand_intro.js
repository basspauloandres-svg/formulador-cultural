/* Cinematic procedural brand reveal — no external media, audio or network requests. */
(()=>{
 const intro=document.getElementById('vtIntro');
 const welcome=document.getElementById('vtWelcome');
 if(!intro||!welcome||welcome.hidden)return;
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(motion.matches)return;
 const canvas=intro.querySelector('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 const W=1000,H=340;
 const dpr=Math.min(4,Math.max(1,Math.min(innerWidth*.92,1180)* (window.devicePixelRatio||1)/W));
 const TIMING=Object.freeze({solidStart:4.75,solidEnd:5.25,fadeStart:7.65,end:8.25});
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.scale(canvas.width/W,canvas.height/H);
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
 // Camera-space fragments. Depth is projected with perspective, rather than a shared 2-D orbit.
 for(let y=60;y<280;y+=6)for(let x=75;x<950;x+=6){
  const i=(y*W+x)*4;if(pixels[i+3]<180)continue;
  const layer=rand(),front=layer>.93,back=layer<.36;
  const z=front?170+rand()*210:back?-510+rand()*250:-190+rand()*310;
  const angle=rand()*Math.PI*2,rad=180+rand()*490;
  const sx=W/2+Math.cos(angle)*rad,sy=H/2+Math.sin(angle)*rad*.53;
  const dx=x-sx,dy=y-sy,turn=(rand()-.5)*220;
  const isSymbol=x<300;
  const start=isSymbol?.18+rand()*1.2:1.15+rand()*1.8,arrival=isSymbol?2.45+rand()*.8:3.65+rand()*.9;
  particles.push({x,y,sx,sy,z,front,back,start,arrival,isSymbol,
   c1x:sx+dx*.18+turn,c1y:sy+dy*.08-turn*.5,
   c2x:x-dx*.19-turn*.22,c2y:y-dy*.23+turn*.23,
   phase:rand()*Math.PI*2,spin:(rand()-.5)*2.4,
   drift:18+rand()*36,peak:front?24+rand()*12:back?6+rand()*6:13+rand()*11,
   initial:.8+rand()*2.4,color:pixels[i]>190?'#f5f9f7':pixels[i+1]>165?'#50e0c3':'#159a91'});
 }
 // Far-to-near compositing makes foreground fragments occlude the distant ones.
 particles.sort((a,b)=>a.z-b.z);
 
 // Offscreen WebGL layer: real cube faces, perspective and per-fragment depth testing.
 // The existing Canvas 2D path remains the fallback and final vector-logo compositor.
 function createVolume(){
  const surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;
  const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
  if(!gl)return null;
  const shader=(type,source)=>{const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh};
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec4 aColor;
   varying vec4 vColor;void main(){float w=1.0-aPosition.z/790.0;
   gl_Position=vec4((aPosition.x-500.0)/500.0,(170.0-aPosition.y)/170.0,-aPosition.z/900.0,w);
   float light=.46+.54*max(0.0,dot(normalize(aNormal),normalize(vec3(-.45,-.65,1.0))));
   vColor=vec4(aColor.rgb*light,aColor.a);}`);
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vec4(vColor.rgb*vColor.a,vColor.a);}`);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aColor',4,24]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset)}
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const faces=[[[0,3,2,1],[0,0,-1]],[[4,5,6,7],[0,0,1]],[[0,4,7,3],[-1,0,0]],[[1,2,6,5],[1,0,0]],[[0,1,5,4],[0,-1,0]],[[3,7,6,2],[0,1,0]]];
  const vertices=new Float32Array(particles.length*36*10);
  let lost=false;surface.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});
  function draw(t,solid){
   if(lost||gl.isContextLost())return false;
   let n=0;
   for(const p of particles){
    const fade=p.isSymbol?smooth((t-3.15)/.35):solid;
    const alpha=(1-fade)*smooth((t-p.start*.31)/.9);
    if(alpha<.025)continue;
    const q=pose(p,t),u=smooth((t-p.start)/(p.arrival-p.start)),size=q.size/q.k/2;
    const z=790*(1-1/q.k),x=500+(q.x-500)/q.k,y=170+(q.y-170)/q.k;
    const ax=(p.phase+t*.75)*(1-u),ay=(p.spin*2+t*.43)*(1-u),az=q.angle;
    const ca=Math.cos(ax),sa=Math.sin(ax),cb=Math.cos(ay),sb=Math.sin(ay),cc=Math.cos(az),sc=Math.sin(az);
    const rot=([a,b,c])=>{const Y=b*ca-c*sa,Z=b*sa+c*ca,X=a*cb+Z*sb,D=-a*sb+Z*cb;return [X*cc-Y*sc,X*sc+Y*cc,D]};
    const rgb=p.color==='#f5f9f7'?[.96,.98,.97]:p.color==='#50e0c3'?[.31,.88,.76]:[.08,.60,.57];
    for(const [ids,normal] of faces){const m=rot(normal);for(const i of [0,1,2,0,2,3]){const v=rot(corners[ids[i]]);vertices[n++]=x+v[0]*size;vertices[n++]=y+v[1]*size;vertices[n++]=z+v[2]*size;vertices[n++]=m[0];vertices[n++]=m[1];vertices[n++]=m[2];vertices[n++]=rgb[0];vertices[n++]=rgb[1];vertices[n++]=rgb[2];vertices[n++]=alpha;}}
   }
   gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.bufferData(gl.ARRAY_BUFFER,vertices.subarray(0,n),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,n/10);
   ctx.drawImage(surface,0,0,W,H);return true;
  }
  return {draw,dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs)}};
 }
 let volume=null;try{volume=createVolume()}catch(e){console.warn('VÉRTICE: Canvas fallback',e)}

 let done=false,frame=0,timer=0;
 const finish=()=>{
  if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(timer);volume?.dispose();
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
 const ease=v=>{v=clamp(v);return v*v*v*(10+v*(-15+6*v))};
 const bezier=(a,b,c,d,u)=>{const v=1-u;return v*v*v*a+3*v*v*u*b+3*v*u*u*c+u*u*u*d};
 const project=(x,y,z)=>{const k=790/(790-z);return {x:W/2+(x-W/2)*k,y:H/2+(y-H/2)*k,k}};
 function pose(p,t){
  const age=t-p.start,raw=clamp(age/(p.arrival-p.start)),u=ease(raw);
  const quiet=1-smooth(raw);
  const time=Math.max(0,t);
  const driftX=Math.sin(time*.73+p.phase)*p.drift*quiet;
  const driftY=Math.cos(time*.89+p.phase)*p.drift*.48*quiet;
  const x=bezier(p.sx,p.c1x,p.c2x,p.x,u)+driftX;
  const y=bezier(p.sy,p.c1y,p.c2y,p.y,u)+driftY;
  const z=p.z*(1-u)+Math.sin(Math.PI*u)*p.z*.14;
  const point=project(x,y,z);
  const growth=smooth((t-.15-p.start*.24)/1.65),settle=smooth((raw-.55)/.45);
  const size=(p.initial+(p.peak-p.initial)*growth)*(1-settle)+6.05*settle;
  return {...point,size:size*point.k,angle:p.spin*(1-u)+Math.sin(time*.8+p.phase)*.19*quiet};
 }

 // Independent, advected fractal cloud field: no stars, no galaxies, no external assets.
 const mist=document.createElement('canvas');mist.width=384;mist.height=132;
 const mc=mist.getContext('2d');
 const mistImage=mc?.createImageData(mist.width,mist.height);
 const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
 function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b;const U=u*u*(3-2*u),V=v*v*(3-2*v);return (hash(a,b)*(1-U)+hash(a+1,b)*U)*(1-V)+(hash(a,b+1)*(1-U)+hash(a+1,b+1)*U)*V}
 function fbm(x,y){let n=0,w=.55;for(let i=0;i<5;i++){n+=w*noise(x,y);x=x*2.04+17.1;y=y*2.04+8.7;w*=.49}return n}
 let lastMist=-1;
 function paintMist(t){
  if(!mc||!mistImage)return;
  if(t-lastMist>=.075||lastMist<0){
   const d=mistImage.data,mw=mist.width,mh=mist.height;
   for(let j=0;j<mh;j++)for(let i=0;i<mw;i++){
    const x=i/(mw-1),y=j/(mh-1),X=x*6,Y=y*3.6;
    const warp=fbm(X*.78-t*.065,Y*.85+t*.025);
    const bend=.74+.095*Math.sin(x*6.2+t*.24)+.052*Math.sin(x*14-t*.2);
    const belt=Math.exp(-Math.pow((y-bend)/.155,2));
    const side=Math.exp(-Math.pow((x-.05)/.24,2)-Math.pow((y-.62)/.4,2));
    const upper=Math.exp(-Math.pow((x-.79)/.42,2)-Math.pow((y-.05)/.25,2));
    const n=fbm(X+t*.17+warp*1.7,Y-warp*1.9-t*.06);
    const detail=fbm(X*1.9-t*.11,Y*1.7+warp*2.4);
    const plume=Math.pow(Math.max(0,(n-.30)*1.75),1.8);
    const ridge=Math.pow(Math.max(0,1-Math.abs(detail-.50)*7),3);
    const density=Math.min(1,(belt*.93+side*.67+upper*.38)*(plume*1.6+ridge*plume*.55));
    const glow=Math.min(1,density*.75+ridge*density*.35),k=(j*mw+i)*4;
    d[k]=Math.round(2+7*glow);d[k+1]=Math.round(12+110*glow);d[k+2]=Math.round(15+104*glow);d[k+3]=Math.round(255*Math.min(1,density*1.65));
   }
   mc.putImageData(mistImage,0,0);lastMist=t;
  }
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(mist,0,0,W,H);ctx.restore();
 }

 function render(now){
  if(done)return;
  const t=(now-begin)/1000;
  if(t>=TIMING.end){finish();return}
  ctx.clearRect(0,0,W,H);
  const atmosphere=ctx.createRadialGradient(W*.5,H*.48,5,W*.5,H*.5,430);
  atmosphere.addColorStop(0,'rgba(35,130,132,'+(.075+.09*smooth(t/3.8))+')');
  atmosphere.addColorStop(.57,'rgba(20,73,83,.055)');
  atmosphere.addColorStop(1,'rgba(7,27,35,0)');
  ctx.fillStyle=atmosphere;ctx.fillRect(0,0,W,H);
  const solid=smooth((t-4.55)/.4);
  paintMist(t);
  const camera=.94+.085*ease(t/4.6)-.025*ease((t-4.5)/.85);
  const floating=smooth((t-4.55)/.6);
  ctx.save();ctx.translate(W/2+Math.sin(t*1.15)*4*floating,H/2+Math.sin((t-4.55)*2.1)*7*floating);ctx.scale(camera,camera);ctx.translate(-W/2,-H/2);
  if(solid<1&&!(volume&&volume.draw(t,solid))){
   for(const p of particles){
    const partSolid=p.isSymbol?smooth((t-3.15)/.35):solid;
    const alpha=(1-partSolid)*smooth((t-p.start*.31)/.9)*(p.back?.35+.65*smooth((t-p.start)/(p.arrival-p.start)):p.front?.65:.74+.26*smooth(t/4));
    if(alpha<.012)continue;
    const q=pose(p,t),s=q.size;
    if(q.x<-70||q.x>W+70||q.y<-70||q.y>H+70)continue;
    // Short exposure trail only for the few near-camera tiles; avoid uniform glow or strobing.
    if(p.front&&t>p.start&&t<p.arrival){
     const prev=pose(p,t-.045);
     ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(1,s*.38);ctx.lineCap='round';ctx.globalAlpha=alpha*.12;
     ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    }
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);
    ctx.fillStyle=p.color;ctx.globalAlpha=alpha*(p.front?.10:.055);
    ctx.fillRect(-s*.76,-s*.76,s*1.52,s*1.52);
    ctx.globalAlpha=alpha;ctx.fillRect(-s/2,-s/2,s,s);
    const depth=s*.32*(1-smooth((t-p.start)/(p.arrival-p.start)));
    ctx.beginPath();ctx.moveTo(-s/2,-s/2);ctx.lineTo(-s/2+depth,-s/2-depth);ctx.lineTo(s/2+depth,-s/2-depth);ctx.lineTo(s/2,-s/2);ctx.closePath();ctx.fillStyle='#b4f8e9';ctx.globalAlpha=alpha*.58;ctx.fill();
    ctx.beginPath();ctx.moveTo(s/2,-s/2);ctx.lineTo(s/2+depth,-s/2-depth);ctx.lineTo(s/2+depth,s/2-depth);ctx.lineTo(s/2,s/2);ctx.closePath();ctx.fillStyle='#075c60';ctx.globalAlpha=alpha*.85;ctx.fill();
    if(p.front&&s>10){ctx.fillStyle='#d5fff4';ctx.globalAlpha=alpha*.18;ctx.fillRect(-s/2,-s/2,s,Math.max(1,s*.075));}
    ctx.restore();
   }
  }
  const symbolSolid=smooth((t-3.15)/.35);
  if(symbolSolid>0){ctx.globalAlpha=symbolSolid;symbol(ctx)}
  if(solid>0){ctx.globalAlpha=solid;ctx.fillStyle='#f5f9f7';ctx.textBaseline='middle';ctx.font='750 108px system-ui, sans-serif';ctx.fillText('VÉRTICE',318,174,590)}
  ctx.restore();ctx.globalAlpha=1;
  if(t>TIMING.fadeStart)intro.style.opacity=String(1-smooth((t-TIMING.fadeStart)/(TIMING.end-TIMING.fadeStart)));
  frame=requestAnimationFrame(render);
 }
 timer=setTimeout(finish,8550);
 frame=requestAnimationFrame(render);
})();
