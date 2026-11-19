const {test,expect}=require('@playwright/test');

test('S02-TERR: cambio de municipio no reutiliza fuentes ni propuestas',async({page})=>{
  const contexts=[];
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/section/review',async route=>{
    const req=route.request().postDataJSON();contexts.push(req.context);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      territory:{municipality:req.context.split(',')[0],department:'Caldas'},
      claims:[],primary_passages:[],candidate_sources:[],conflicting_municipalities:[],
      suggestion:'Texto preliminar de '+req.context+'. [POR VERIFICAR]',
      draft_status:'EDITABLE_UNVERIFIED',review_flags:[],errors:[]
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#fields [data-field="municipio"]').fill('Neira');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="caracteristicas_culturales"]');
  await field.fill('Observaciones de bandas musicales de la comunidad.');
  let card=page.locator('.vt-evidence-audit[data-review-field="caracteristicas_culturales"]');
  await card.locator('[data-review-action="verify"]').click();
  await expect(card.locator('.vt-evidence-draft')).toBeVisible();
  await expect(card.locator('.vt-evidence-draft textarea')).toHaveValue(/Neira/);
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  card=page.locator('.vt-evidence-audit[data-review-field="caracteristicas_culturales"]');
  await expect(card.locator('.vt-evidence-draft')).toBeHidden();
  await expect(page.locator('#fields [data-field="caracteristicas_culturales"]')).toHaveValue(
    'Observaciones de bandas musicales de la comunidad.');
  await card.locator('[data-review-action="verify"]').click();
  await expect(card.locator('.vt-evidence-draft textarea')).toHaveValue(/Villamaría/);
  expect(contexts).toEqual(['Neira, Caldas','Villamaría, Caldas']);
});

test('S02-TERR: respuesta anterior no sustituye texto tras cambiar territorio',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#fields [data-field="municipio"]').fill('Neira');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="caracteristicas_culturales"]');
  await field.fill('Observación por comprobar de músicos en el territorio.');
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/section/review',async route=>{
    await gate;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:'S02',field:'caracteristicas_culturales',
      territory_context:'Neira, Caldas',
      claims:[],primary_passages:[],candidate_sources:[],conflicting_municipalities:[],
      suggestion:'Propuesta anterior de Neira.',draft_status:'EDITABLE_UNVERIFIED',
      review_flags:[],errors:[]
    })});
  });
  await page.locator('.vt-evidence-audit[data-review-field="caracteristicas_culturales"] [data-review-action="verify"]').click();
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  release();
  const current=page.locator('.vt-evidence-audit[data-review-field="caracteristicas_culturales"]');
  await expect(current.locator('.vt-evidence-draft')).toBeHidden();
  await expect(page.locator('#fields [data-field="caracteristicas_culturales"]')).toHaveValue(
    'Observación por comprobar de músicos en el territorio.');
});
