const {test,expect}=require('@playwright/test');

test('S02 integra una sola consulta, propuesta y aprobación',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/section/review',async route=>{
    const req=route.request().postDataJSON();
    expect(req.section).toBe('S02');
    expect(req.compose).toBe(true);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      claims:[{statement:req.text,evidence_status:'INSUFFICIENT_EVIDENCE',note:'Requiere fuente original'}],
      primary_passages:[],candidate_sources:[],conflicting_municipalities:[],
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
  await card.getByRole('button',{name:'Investigar y preparar redacción'}).click();
  await expect(card.locator('.vt-evidence-draft')).toBeVisible();
  await expect(field).toHaveValue('Se describen encuentros musicales en la comunidad.');
  await card.getByRole('button',{name:'Descartar redacción'}).click();
  await expect(field).toHaveValue('Se describen encuentros musicales en la comunidad.');
  await card.getByRole('button',{name:'Investigar y preparar redacción'}).click();
  await card.getByRole('button',{name:'Incorporar y guardar redacción'}).click();
  await expect(field).toContainText('Según la información preliminar del formador');
});

test('S02 conserva el original cuando no hay sesión',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="antecedentes"]');
  await field.fill('Se realizaron encuentros culturales.');
  const card=page.locator('.vt-evidence-audit[data-review-field="antecedentes"]');
  await card.getByRole('button',{name:'Investigar y preparar redacción'}).click();
  await expect(card.locator('[role="status"]')).toContainText('Inicia sesión');
  await expect(card.locator('.vt-evidence-draft')).toBeHidden();
  await expect(field).toHaveValue('Se realizaron encuentros culturales.');
});
