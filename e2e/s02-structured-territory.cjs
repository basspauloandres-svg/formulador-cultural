/* Actual UI, synthetic identity and intercepted public/assistant responses. */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const ORIGIN='http://127.0.0.1:8765';
const city={codigo:'17873',nombre:'Villamaría',departamento:'Caldas',tipo:'Municipio'};
const other={codigo:'27001',nombre:'Quibdó',departamento:'Chocó',tipo:'Municipio'};
const text='La banda estudiantil de Villamaría realiza actividades musicales documentadas.';
const manifest=[{citation:'M1',title:'Fuente sintética',period:'2025',geographic_scope:'municipal',divipola:'17873',url:'https://example.org/a',locator:'Párrafo 1',sha256:'a'.repeat(64),excerpt_sha256:'b'.repeat(64),prompt_excerpt:text}];
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  let hold=false,release,arrived,requests=0;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());
   if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('@supabase/supabase-js')){
    return r.fulfill({contentType:'application/javascript',body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),onAuthStateChange:()=>({}),signOut:async()=>({})}})};"});
   }
   if(u.origin!==ORIGIN&&u.hostname!=='cdn.jsdelivr.net')return r.abort();
   if(u.pathname==='/territory/catalog')return r.fulfill({json:{dataset:'synthetic',cutoff:'2024-12-30',data_updated:'2025-01-24',count:2,snapshot_sha256:'c'.repeat(64),territorios:[city,other]}});
   if(u.pathname==='/territory/resolve'){
    const q=r.request().postDataJSON();const t=q.context.includes('Quibdó')?other:city;
    return r.fulfill({json:{status:'FOUND',identity:{municipality:t.nombre,department:t.departamento,divipola:t.codigo,territory_type:t.tipo}}});
   }
   if(u.pathname==='/assistant/s02/contexto-territorial'){
    requests++;const q=r.request().postDataJSON();
    assert(q.consulta);assert.equal(q.codigo_divipola,'17873');
    if(hold){arrived();await new Promise(ok=>release=ok);}
    try{return await r.fulfill({json:{section:'S02',field:q.field,codigo_divipola:q.codigo_divipola,territory:{divipola:q.codigo_divipola},suggestion:text+' [M1]',suggestion_origin:'STRUCTURED_MODEL_DRAFT_UNVERIFIED',blocked_for_evidence:false,evidence_manifest:manifest,used_references:manifest,claim_audit:[{fragment:text,status:'MODEL_SUPPORT_PROPOSED',citations:['M1']}],afirmaciones:[{texto:text,estado:'respaldo_propuesto'}],guidance:[]}})}catch{return}
   }
   return r.continue();
  });
  await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#vtWelcome').waitFor();
  await page.locator('#vtContinueTop').click();
  const nav=code=>page.locator('#guidedJourney [data-code="'+code+'"]');
  await nav('S01').click();
  await page.locator('#nombre_del_proyecto').fill('QA territorial sintético');
  await page.getByRole('button',{name:'Seleccionar en catálogo nacional'}).click();
  await page.getByLabel('Municipio o distrito y departamento').selectOption('17873');
  assert.equal(await page.locator('#municipio').inputValue(),'Villamaría');
  await nav('S02').click();
  const field=page.locator('#caracteristicas_culturales');
  const panel=page.locator('[data-review-field="caracteristicas_culturales"]');
  const query=panel.getByLabel('Consulta territorial específica para este campo');
  const verify=panel.locator('[data-review-action="verify"]'),approve=panel.locator('[data-review-action="approve"]');
  await query.fill('Bandas estudiantiles 2025');
  await verify.click();
  await approve.waitFor();
  assert.equal(await field.inputValue(),'');
  page.once('dialog',d=>d.accept());
  await approve.click();
  assert((await field.inputValue()).includes('[M1]'));
  await page.reload({waitUntil:'domcontentloaded'});
  if(await page.locator('#vtWelcome').isVisible())await page.locator('#vtResume').click();
  await nav('S02').click();
  assert((await field.inputValue()).includes('[M1]'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('formulador-cultural-prototipo-v1')).S02.evidence_review_state.fields.caracteristicas_culturales);
  assert.equal(saved.manifest[0].citation,'M1');assert.equal(saved.status,'ACCEPTED_UNVERIFIED');
  hold=true;const started=new Promise(ok=>arrived=ok);
  await query.fill('Consulta tardía');
  await verify.click();await started;
  // Navigate to a different territory before the pending reply completes.
  await nav('S01').click();
  await page.getByRole('button',{name:'Seleccionar en catálogo nacional'}).click();
  await page.getByLabel('Municipio o distrito y departamento').selectOption('27001');
  release();await nav('S02').click();
  assert.equal(await approve.isVisible(),false);
  assert.equal(await page.locator('#caracteristicas_culturales').inputValue(),text+' [M1]');
  assert((await panel.locator('.vt-evidence-detail').first().textContent()).includes('otro territorio'));
  assert.equal(requests,2);assert.deepEqual(errors,[]);
  console.log('S02_STRUCTURED_BROWSER_PASS',JSON.stringify({requests,stored:true,stale_territory_rejected:true,model_calls:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
