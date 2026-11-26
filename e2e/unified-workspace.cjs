/* Real browser navigation, palette and basic contrast checks, synthetic local data only.
   This is a UI smoke/audit, not full WCAG conformance or methodological acceptance. */
const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ORIGIN='http://127.0.0.1:8765';
const OUT='test-results/unified-workspace';
fs.mkdirSync(OUT,{recursive:true});
const sections=Array.from({length:16},(_,i)=>'S'+String(i+1).padStart(2,'0'));
const results=[];
async function inspect(page,code,viewport){
 return page.evaluate(({code,viewport})=>{
  const cs=e=>getComputedStyle(e);
  const color=s=>{const m=s.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const v=m[1].split(/[,\s/]+/).filter(Boolean).map(Number);return v.length>=3?[v[0],v[1],v[2],v[3]??1]:null};
  const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
  const visible=e=>{const r=e.getBoundingClientRect(),s=cs(e);return r.width>0&&r.height>0&&s.visibility==='visible'&&s.display!=='none'&&e.getClientRects().length>0};
  const bg=e=>{for(let p=e;p;p=p.parentElement){const c=color(cs(p).backgroundColor);if(c&&c[3]>=.95)return c}return [7,27,35,1]};
  const label=e=>String(e.id||e.className||e.tagName).slice(0,100);
  const panel=document.querySelector('#panel'),journey=document.querySelector('#guidedJourney');
  const body=cs(document.body);
  const surfaces=[...panel.querySelectorAll('section,article,div,details,textarea,select,input,th,td')].filter(e=>{if(!visible(e)||e.closest('svg')||e.matches('input[type=checkbox],input[type=radio],input[type=range]'))return false;const r=e.getBoundingClientRect();return r.width>=120&&r.height>=40});
  const legacy=surfaces.filter(e=>{const c=color(cs(e).backgroundColor);return c&&c[3]>.85&&lum(c)>.42}).map(e=>({node:label(e),bg:cs(e).backgroundColor})).slice(0,30);
  const samples=[...document.querySelectorAll('#panel input:not([type=checkbox]):not([type=radio]):not([type=range]),#panel textarea,#panel select,#panel button,#panel h2,#panel h3,#panel label,#panel summary,#guidedJourney .guided-subsection')].filter(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!e.closest('svg'));
  const ratios=samples.map(e=>{const f=color(cs(e).color),b=bg(e);if(!f)return null;const a=lum(f),z=lum(b);return {node:label(e),ratio:Number(((Math.max(a,z)+.05)/(Math.min(a,z)+.05)).toFixed(2)),text:cs(e).color,bg:b.slice(0,3)} }).filter(Boolean);
  const contrast=ratios.filter(x=>x.ratio<4.5).slice(0,30);
  return {code,viewport,theme:body.colorScheme,panel:cs(panel).backgroundColor,journey:cs(journey).backgroundColor,brand:document.querySelector('.hero.app-brand h1').textContent.trim(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,legacy,contrast,samples:ratios.length}
 },{code,viewport})
}
(async()=>{
 const browser=await chromium.launch();
 const problems=[];
 try{
  for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce',hasTouch:viewport.width===390,isMobile:viewport.width===390});
   const errors=[],blocked=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===ORIGIN||u.hostname==='cdn.jsdelivr.net')return r.continue();blocked.push(u.hostname);return r.abort()});
   await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#vtWelcome').waitFor();
   await page.locator('#vtContinueTop').click();
   await page.locator('#panel').waitFor();
   for(const code of sections){
    await page.locator('#guidedJourney [data-code="'+code+'"]').click();
    await page.waitForFunction(c=>document.querySelector('#counter')?.textContent.startsWith(c),code);
    await page.waitForFunction(c=>document.querySelector('#guidedJourney [data-code="'+c+'"]')?.classList.contains('current'),code);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const a=await inspect(page,code,viewport.width);
    results.push(a);
    if(a.theme!=='dark'||a.panel!=='rgb(17, 44, 55)'||a.journey!=='rgb(13, 38, 48)'||a.brand!=='VÉRTICE'||a.overflow||a.legacy.length||a.contrast.length)problems.push(a);
    if(viewport.width===1440||['S01','S06','S14','S16'].includes(code)){
     await page.screenshot({path:OUT+'/'+viewport.width+'-'+code+'.png'});
    }
   }
   if(errors.length||blocked.length)problems.push({viewport:viewport.width,errors,blocked});
   await page.close();
  }
 }finally{await browser.close();fs.writeFileSync(OUT+'/audit.json',JSON.stringify({results,problems},null,2))}
 console.log('UNIFIED_WORKSPACE_SCREENS',results.length,'CONTRAST_SAMPLES',results.reduce((a,x)=>a+x.samples,0),'PROBLEMS',problems.length);
 if(problems.length)console.error(JSON.stringify(problems,null,2));
 assert.equal(problems.length,0,'Unified workspace color/layout audit found defects');
 console.log('UNIFIED_WORKSPACE_PASS');
})().catch(e=>{console.error(e);process.exit(1)});
