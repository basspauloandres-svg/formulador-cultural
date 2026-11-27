const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 const page=await context.newPage();
 await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin==='http://127.0.0.1:8765'||u.hostname==='cdn.jsdelivr.net'?r.continue():r.abort()});
 await context.addInitScript(()=>{if(!localStorage.getItem('qa-h01-seeded')){localStorage.setItem('formulador-cultural-prototipo-v1',JSON.stringify({S01:{nombre_del_proyecto:'Neira histórico',municipio:'Neira'},S02:{territorio_o_lugar_de_intervencion:'Neira'},S16:{review_state:{confirmed:false}}}));localStorage.setItem('qa-h01-seeded','1')}});
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
 const activeProject=page.locator('#h01ActiveProject');
 assert.match(await activeProject.innerText(),/1\/16 secciones con registro/);
 for(let i=2;i<=16;i++){
   const code='S'+String(i).padStart(2,'0');
   await page.locator(`#guidedJourney [data-code="${code}"]`).click();
   await page.waitForFunction(expected=>active===expected,code);
 }
 assert.match(await activeProject.innerText(),/1\/16 secciones con registro/);
 await page.locator('#guidedJourney [data-code="S02"]').click();
 await page.locator('#territorio_o_lugar_de_intervencion').fill('Contexto sintético de Villamaría');
 await page.locator('#guidedJourney [data-code="S01"]').click();
 assert.match(await activeProject.innerText(),/2\/16 secciones con registro/);
 console.log('H01_PROJECT_SECTION_COUNT_PASS');
 const exportHtml=async expected=>{await page.locator('#guidedJourney [data-code="S16"]').click();const download=page.waitForEvent('download');await page.locator('#expHtml').click();const file=await download;const fs=require('node:fs');const html=fs.readFileSync(await file.path(),'utf8');assert.ok(html.includes(expected));return html};
 const htmlB=await exportHtml('Talleres Villamaría');assert.ok(!htmlB.includes('Neira histórico'));
 await page.locator('#guidedJourney [data-code="S01"]').click();
 await switchTo(a);
 const htmlA=await exportHtml('Neira histórico');assert.ok(!htmlA.includes('Talleres Villamaría'));
 await page.locator('#guidedJourney [data-code="S01"]').click();
 console.log('H01_09_HTML_ISOLATION_PASS');
 await page.context().setOffline(true);
 await title.fill('Neira editado sin conexión');await page.locator('#save').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(storeKey)).S01.nombre_del_proyecto),'Neira editado sin conexión');
 await page.context().setOffline(false);
 await page.reload({waitUntil:'domcontentloaded'});await title.waitFor();assert.equal(await title.inputValue(),'Neira editado sin conexión');
 console.log('H01_10_LOCAL_OFFLINE_RECOVERY_PASS');
 await page.locator('#fields [data-field="idea_inicial_usuario"]').fill('Talleres musicales en Villamaría, Caldas');
 await page.locator('#fields [data-field="municipio"]').fill('Neira');
 await page.locator('#h01TerritoryWarning').waitFor({state:'visible'});
 assert.ok((await page.locator('#h01TerritoryWarning').innerText()).includes('Villamaría'));
 page.once('dialog',d=>d.accept('Proyecto intermunicipal sintético'));
 await page.locator('#h01TerritoryWarning button').click();
 assert.equal(await page.locator('#fields [data-field="municipio"]').inputValue(),'Neira');
 assert.equal(await page.evaluate(()=>draft.S01.h01_territory_decision.reason),'Proyecto intermunicipal sintético');
 console.log('H01_11_CALDAS_WARNING_PASS');
 const other=await page.context().newPage();
 try{
  await other.goto('http://127.0.0.1:8765/?project='+b,{waitUntil:'domcontentloaded'});
  const otherTitle=other.locator('#fields [data-field="nombre_del_proyecto"]');
  await otherTitle.waitFor({state:'attached'});
  assert.equal(await other.evaluate(()=>window.fcLocalProjectId()),b);
  assert.equal(await otherTitle.inputValue(),'Talleres Villamaría');
  assert.equal(await active(),a);
  await other.evaluate(()=>{draft.S01.nombre_del_proyecto='Villamaría segunda pestaña';localStorage.setItem(storeKey,JSON.stringify(draft))});
  await page.reload({waitUntil:'domcontentloaded'});
  await title.waitFor();
  assert.equal(await active(),a);assert.equal(await title.inputValue(),'Neira editado sin conexión');
  await other.reload({waitUntil:'domcontentloaded'});
  assert.equal(await other.evaluate(()=>window.fcLocalProjectId()),b);
  assert.equal(await otherTitle.inputValue(),'Villamaría segunda pestaña');
  console.log('H01_CROSS_TAB_IDENTITY_PASS');
  // Synthetic session and intercepted response: never contact the model or Supabase.
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-test-token',user:{id:'h01-user-A'}}}})});
  await other.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-test-token',user:{id:'h01-user-A'}}}})});
  await page.locator('#guidedJourney [data-code="S02"]').click();
  const field=page.locator('#fields [data-field="territorio_o_lugar_de_intervencion"]');
  await field.fill('Observación sintética de Neira');await page.locator('#save').click();
  let release,arrived;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>arrived=resolve);
  await page.route('**/assistant/s02/guide',async route=>{
    arrived();await gate;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({section:'S02',field:'territorio_o_lugar_de_intervencion',territory_context:'Neira',suggestion:'Respuesta sintética exclusiva de Neira',suggestion_origin:'SYNTHETIC_TEST',claims:[],evidence_manifest:[{id:'QA-SRC-01',url:'https://example.test/qa',prompt_excerpt:'Pasaje sintético QA-SRC-01'}],claim_audit:[{fragment:'Afirmación ficticia',status:'INSUFFICIENT_EVIDENCE'}]})});
  });
  const panel=page.locator('[data-review-field="territorio_o_lugar_de_intervencion"]');
  await panel.locator('[data-review-action="verify"]').click();await started;
  assert.equal(await page.evaluate(()=>window.fcH01PendingReviewCount()),1);
  await page.locator('#h01ProjectSelect').selectOption(b);
  const opened=page.waitForEvent('popup');
  await page.locator('#h01Continue').click();
  const next=await opened;
  try{
    await next.waitForLoadState('domcontentloaded');
    assert.equal(await next.evaluate(()=>window.fcLocalProjectId()),b);
    assert.equal(await next.evaluate(()=>window.fcH01GetReview('S02','territorio_o_lugar_de_intervencion')),null);
    release();
    await page.waitForFunction(()=>window.fcH01PendingReviewCount()===0);
    const stored=await page.evaluate(()=>window.fcH01GetReview('S02','territorio_o_lugar_de_intervencion'));
    assert.equal(stored.projectId,a);assert.equal(stored.ownerId,'h01-user-A');
    assert.equal(stored.data.suggestion,'Respuesta sintética exclusiva de Neira');
    assert.equal(await next.evaluate(()=>window.fcH01GetReview('S02','territorio_o_lugar_de_intervencion')),null);
    assert.equal(await field.inputValue(),'Observación sintética de Neira');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-test-token',user:{id:'h01-user-B'}}}})});
    await panel.locator('[data-review-action="restore"]').click();
    assert.equal(await panel.locator('.vt-evidence-draft').isVisible(),false);
    await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-test-token',user:{id:'h01-user-A'}}}})});
    await panel.locator('[data-review-action="restore"]').click();
    await panel.locator('.vt-evidence-draft').waitFor({state:'visible'});
    assert.equal(await panel.locator('.vt-evidence-draft textarea').inputValue(),'Respuesta sintética exclusiva de Neira');
    assert.equal(await field.inputValue(),'Observación sintética de Neira');
    await panel.getByText('Pasaje sintético QA-SRC-01', {exact:true}).waitFor();
    const approve=panel.locator('[data-review-action="approve"]');
    page.once('dialog',dialog=>dialog.dismiss());
    await approve.click();
    assert.equal(await field.inputValue(),'Observación sintética de Neira');
    page.once('dialog',dialog=>dialog.accept());
    await approve.click();
    assert.equal(await field.inputValue(),'Respuesta sintética exclusiva de Neira');
    await page.reload({waitUntil:'domcontentloaded'});
    await field.waitFor({state:'visible'});
    assert.equal(await field.inputValue(),'Respuesta sintética exclusiva de Neira');
    const review=await page.evaluate(()=>draft.S02.evidence_review_state.fields.territorio_o_lugar_de_intervencion);
    assert.equal(review.status,'ACCEPTED_UNVERIFIED');
    assert.equal(review.manifest[0].id,'QA-SRC-01');
    assert.equal(review.claim_audit[0].status,'INSUFFICIENT_EVIDENCE');
    console.log('H01_SYNTHETIC_APPROVAL_AND_PROVENANCE_PASS');
    console.log('H01_07_SYNTHETIC_DEFERRED_REVIEW_PASS');
  }finally{release();await next.close()}

 }finally{await other.close()}

 // Emulate the auth lifecycle with synthetic identities, never real accounts.
 // Keep the synthetic getSession result across reloads by replacing the served
 // auth client method in the intercepted app script, only in this test context.
 const accountContext=await browser.newContext({reducedMotion:'reduce'});
 try{
  let identity=null;
  await accountContext.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin==='http://127.0.0.1:8765'&&u.pathname==='/app.js'){
      const response=await route.fetch();
      const source=await response.text();
      const marker='let stagingSession=null;';
      assert.ok(source.includes(marker));
      const session=identity?{user:{id:identity},access_token:'synthetic-test-token'}:null;
      const injection='\nif(sb){sb.auth.getSession=async()=>({data:{session:'+JSON.stringify(session)+'}});sb.auth.onAuthStateChange=()=>({data:{subscription:{unsubscribe(){}}}});}\n';
      await route.fulfill({response,body:source.replace(marker,marker+injection)});return;
    }
    if(u.origin==='http://127.0.0.1:8765'||u.hostname==='cdn.jsdelivr.net')return route.continue();
    return route.abort();
  });
  const p=await accountContext.newPage();
  await p.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  const setOwner=async id=>{
    identity=id;
    await p.evaluate(id=>window.fcH01SetAuthenticatedOwner(id),id);
    await p.waitForFunction(expected=>typeof storeKey==='string'&&window.fcH01LocalOwner?.()===(expected||'guest'),id);
  };
  const mark=async text=>{
    const field=p.locator('#fields [data-field="nombre_del_proyecto"]');
    // Enter through the actual welcome screen, never type through an overlay.
    if(await p.locator('#vtWelcome').isVisible()){
      await p.locator('#vtContinueTop').click();
    }
    await p.locator('#vtWelcome').waitFor({state:'hidden'});
    await field.waitFor({state:'visible'});
    await field.fill(text);
    assert.equal(await field.inputValue(),text,'Rendered S01 title after fill');
    await p.locator('#save').click();
    assert.equal(await field.inputValue(),text,'Rendered S01 title after save');
    assert.equal(await p.evaluate(()=>draft.S01?.nombre_del_proyecto),text,'In-memory S01 after save');
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(storeKey)||'{}').S01?.nombre_del_proyecto),text,'Persisted S01 after save');
    console.log('H01_ACCOUNT_FORM_SAVE_PASS',await p.evaluate(()=>window.fcH01LocalOwner()));
  };
  const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem(storeKey)||'{}').S01?.nombre_del_proyecto||'');
  await mark('Borrador invitado');
  const guestId=await p.evaluate(()=>window.fcLocalProjectId());
  await setOwner('synthetic-account-A');
  assert.equal(await read(),'');
  await mark('Proyecto privado A');
  const aId=await p.evaluate(()=>window.fcLocalProjectId());
  await setOwner(null);assert.equal(await read(),'Borrador invitado');
  assert.equal(await p.evaluate(()=>window.fcLocalProjectId()),guestId);
  await setOwner('synthetic-account-B');assert.equal(await read(),'');
  await mark('Proyecto privado B');
  const bId=await p.evaluate(()=>window.fcLocalProjectId());
  assert.equal(new Set([guestId,aId,bId]).size,3);
  await p.goto('http://127.0.0.1:8765/?project='+aId,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(id=>typeof storeKey==='string'&&window.fcLocalProjectId?.()===id,bId);
  assert.equal(await read(),'Proyecto privado B');
  assert.ok(!(await p.evaluate(()=>JSON.stringify(window.fcLocalProjects()))).includes(aId));
  await setOwner('synthetic-account-A');
  assert.equal(await read(),'Proyecto privado A');
  assert.equal(await p.evaluate(()=>window.fcLocalProjectId()),aId);
  console.log('H01_06_08_SYNTHETIC_LOCAL_ACCOUNT_PASS');
 }finally{await accountContext.close()}

 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
