const {test,expect}=require('@playwright/test');

test('EVIDENCIA-REDACCION-01: una consulta produce borrador y aprobación guarda el campo',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/section/review',async route=>{
    const req=route.request().postDataJSON();
    expect(req.compose).toBe(true);
    expect(req.section).toBe('S03');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      claims:[{statement:req.text,evidence_status:'INSUFFICIENT_EVIDENCE',
        classification:'USER_ASSERTION_UNVERIFIED',note:'Revisar fuente y periodo.'}],
      primary_passages:[],candidate_sources:[],conflicting_municipalities:[],
      suggestion:'La población del proyecto se estima preliminarmente a partir de la observación del formador [POR VERIFICAR].',
      draft_status:'EDITABLE_UNVERIFIED',review_flags:[],errors:[]
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#guidedJourney .guided-subsection[data-code="S03"]').click();
  const field=page.locator('#fields [data-field="caracterizacion"]');
  const original='La población participa según observación del formador.';
  await field.fill(original);
  const card=page.locator('.vt-evidence-audit[data-review-field="caracterizacion"]');
  await card.locator('[data-review-action="verify"]').click();
  const draft=card.locator('.vt-evidence-draft');
  await expect(draft).toBeVisible();
  await expect(field).toHaveValue(original);
  await card.locator('[data-review-action="discard"]').click();
  await expect(draft).toBeHidden();
  await expect(field).toHaveValue(original);
  await card.locator('[data-review-action="verify"]').click();
  await draft.locator('textarea').fill('Propuesta modificada y revisada por el formador.');
  await card.locator('[data-review-action="approve"]').click();
  await expect(field).toHaveValue('Propuesta modificada y revisada por el formador.');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S03"]').click();
  await expect(page.locator('#fields [data-field="caracterizacion"]')).toHaveValue('Propuesta modificada y revisada por el formador.');
});

test('EVIDENCIA-REDACCION-02: cambio de municipio invalida la propuesta',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/section/review',async route=>{
    const req=route.request().postDataJSON();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      claims:[],primary_passages:[],candidate_sources:[],
      suggestion:'Propuesta antigua de Neira.',
      draft_status:'EDITABLE_UNVERIFIED',review_flags:[],errors:[]
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Neira');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#guidedJourney .guided-subsection[data-code="S03"]').click();
  const field=page.locator('#fields [data-field="caracterizacion"]');
  await field.fill('Observación propia de la comunidad.');
  const card=page.locator('.vt-evidence-audit[data-review-field="caracterizacion"]');
  await card.locator('[data-review-action="verify"]').click();
  await expect(card.locator('.vt-evidence-draft')).toBeVisible();
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#guidedJourney .guided-subsection[data-code="S03"]').click();
  await expect(page.locator('.vt-evidence-audit[data-review-field="caracterizacion"] .vt-evidence-draft')).toBeHidden();
  await expect(page.locator('#fields [data-field="caracterizacion"]')).toHaveValue('Observación propia de la comunidad.');
});
