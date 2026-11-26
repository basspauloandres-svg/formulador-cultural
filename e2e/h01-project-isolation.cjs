const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.route('**/*',r=>{const u=new URL(r.request().url());return u.origin==='http://127.0.0.1:8765'||u.hostname==='cdn.jsdelivr.net'?r.continue():r.abort()});
 await page.addInitScript(()=>{if(!localStorage.getItem('qa-h01-seeded')){localStorage.setItem('formulador-cultural-prototipo-v1',JSON.stringify({S01:{nombre_del_proyecto:'Neira histórico',municipio:'Neira'},S02:{territorio_o_lugar_de_intervencion:'Neira'},S16:{review_state:{confirmed:false}}}));localStorage.setItem('qa-h01-seeded','1')}});
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.locator('#vtContinueTop').click();
 const title=page.locator('#fields [data-field="nombre_del_proyecto"]');
 await title.waitFor();
 assert.equal(await title.inputValue(),'Neira histórico');
 const a=await page.evaluate(()=>window.fcLocalProjectId());
 const active=()=>page.evaluate(()=>window.fcLocalProjectId());
 const newProject=async()=>{const old=await active();await page.locator('#h01New').click();await page.waitForFunction(id=>typeof window.fcLocalProjectId==='function'&&window.fcLocalProjectId()!==id,old);await title.waitFor();return active()};
 const switchTo=async id=>{await page.locator('#h01ProjectSelect').selectOption(id);await page.locator('#h01Continue').click();await page.waitForFunction(id=>typeof window.fcLocalProjectId==='function'&&window.fcLocalProjectId()===id,id);await title.waitFor()};
 const b=await newProject();assert.notEqual(a,b);
 assert.equal(await title.inputValue(),'');
 assert.equal(await page.evaluate(()=>Object.values(draft.S02||{}).some(Boolean)),false);
 assert.equal(await page.evaluate(()=>Object.values(draft.S16||{}).some(Boolean)),false);
 await title.fill('Talleres Villamaría');await page.locator('#save').click();
 await switchTo(a);assert.equal(await title.inputValue(),'Neira histórico');
 for(let i=0;i<2;i++){await switchTo(b);assert.equal(await title.inputValue(),'Talleres Villamaría');await switchTo(a);assert.equal(await title.inputValue(),'Neira histórico')}
 await page.reload({waitUntil:'domcontentloaded'});await title.waitFor();assert.equal(await active(),a);assert.equal(await title.inputValue(),'Neira histórico');
 const c=await newProject();assert.equal(new Set([a,b,c]).size,3);assert.equal(await title.inputValue(),'');
 await title.fill('Proyecto tercero');await page.locator('#save').click();
 await switchTo(b);assert.equal(await title.inputValue(),'Talleres Villamaría');
 assert.equal(await page.evaluate(()=>window.fcLocalProjects().length),3);
 console.log('H01_LOCAL_BROWSER_PASS H01-01 H01-02 H01-03 H01-04 H01-05 H01-12 H01-13');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});