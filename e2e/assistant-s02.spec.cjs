const {test,expect}=require('@playwright/test');

test('S02 integra una sola consulta, propuesta y aprobación',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/s02/guide',async route=>{
    const req=route.request().postDataJSON();
    expect(req.section).toBe('S02');
    expect(req.generate).toBe(true);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      claims:[{statement:req.text,evidence_status:'INSUFFICIENT_EVIDENCE',note:'Requiere fuente original'}],
      sources:[],municipal_references:[],candidate_sources:[],conflicting_municipalities:[],
      suggestion:'Según la información preliminar del formador, se describen encuentros musicales. [POR VERIFICAR]',
      review_flags:[{type:'USER_ASSERTIONS_UNVERIFIED'}],
      draft_status:'EDITABLE_UNVERIFIED',errors:[]
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="caracteristicas_culturales"]');
  await field.fill('Se describen encuentros musicales en la comunidad.');
  await expect(page.locator('.vt-assist')).toHaveCount(0);
  const card=page.locator('.vt-evidence-audit[data-review-field="caracteristicas_culturales"]');
  await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'Investigar y generar propuesta'}).click();
  await expect(card.locator('.vt-evidence-draft')).toBeVisible();
  await expect(field).toHaveValue('Se describen encuentros musicales en la comunidad.');
  await card.getByRole('button',{name:'Descartar redacción'}).click();
  await expect(field).toHaveValue('Se describen encuentros musicales en la comunidad.');
  await card.getByRole('button',{name:'Investigar y generar propuesta'}).click();
  page.once('dialog',dialog=>dialog.accept());
  await card.getByRole('button',{name:'Incorporar y guardar redacción'}).click();
  await expect(field).toHaveValue(/Según la información preliminar del formador/);
});

test('S02 conserva el original cuando no hay sesión',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="antecedentes"]');
  await field.fill('Se realizaron encuentros culturales.');
  const card=page.locator('.vt-evidence-audit[data-review-field="antecedentes"]');
  await card.getByRole('button',{name:'Investigar y generar propuesta'}).click();
  await expect(card.locator('[role="status"]')).toContainText('Inicia sesión');
  await expect(card.locator('.vt-evidence-draft')).toBeHidden();
  await expect(field).toHaveValue('Se realizaron encuentros culturales.');
});


test('S02 rechaza una respuesta de otro territorio y conserva el texto',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/s02/guide',async route=>{
    const req=route.request().postDataJSON();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:'Neira, Caldas',
      suggestion:'Borrador de otro territorio',evidence_manifest:[],claim_audit:[]
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="antecedentes"]');
  await field.fill('Se realizaron encuentros culturales.');
  const card=page.locator('.vt-evidence-audit[data-review-field="antecedentes"]');
  await card.getByRole('button',{name:'Investigar y generar propuesta'}).click();
  await expect(card.locator('[role="status"]')).toContainText('no corresponde');
  await expect(card.locator('.vt-evidence-draft')).toBeHidden();
  await expect(field).toHaveValue('Se realizaron encuentros culturales.');
});


test('S02 descarta respuesta tardía después de cambiar municipio',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  let release, started;
  const pending=new Promise(resolve=>release=resolve);
  const received=new Promise(resolve=>started=resolve);
  await page.route('https://formulador-cultural-api.onrender.com/assistant/s02/guide',async route=>{
    const req=route.request().postDataJSON();started();
    await pending;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      suggestion:'Borrador anterior de Villamaría',sources:[],claim_audit:[]
    })});
  });
  const go=code=>page.locator('#guidedJourney .guided-subsection[data-code="'+code+'"]').click();
  await go('S01');
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await go('S02');
  const field=page.locator('#fields [data-field="antecedentes"]');
  await field.fill('Observación preliminar.');
  const card=page.locator('.vt-evidence-audit[data-review-field="antecedentes"]');
  await card.getByRole('button',{name:'Investigar y generar propuesta'}).click();
  await received;
  await go('S01');
  await page.locator('#fields [data-field="municipio"]').fill('Chinchiná');
  await go('S02');
  const response=page.waitForResponse(r=>r.url().endsWith('/assistant/s02/guide'));
  release();await response;
  await expect(card.locator('.vt-evidence-draft')).toBeHidden();
  await expect(field).toHaveValue('Observación preliminar.');
});
