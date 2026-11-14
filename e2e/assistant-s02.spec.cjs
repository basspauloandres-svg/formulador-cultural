const {test,expect}=require('@playwright/test');

test('ASISTENTE-S02-01: formulación con IA, aprobación explícita y preservación del original',async({page})=>{
  const writes=[];
  page.on('request',r=>{if(r.url().includes('.supabase.co/rest/v1/')&&['POST','PATCH','PUT','DELETE'].includes(r.method()))writes.push(r.url())});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="caracteristicas_culturales"]');
  await expect(field).toBeVisible();
  await field.fill('en el barrio hay encuentros culturales con jóvenes');
  const card=page.locator('.vt-assist[data-assist-field="caracteristicas_culturales"]');
  await expect(card).toBeVisible();
  await card.locator('[data-assist-action="questions"]').click();
  await expect(card.locator('[role="status"]')).toContainText('¿Qué prácticas');
  await page.evaluate(()=>{
    sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});
  });
  await page.route('https://formulador-cultural-api.onrender.com/assistant/s02',async route=>{
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      suggestion:'En el barrio se realizan encuentros culturales con jóvenes.',
      blocked_for_evidence:false,review_flags:[],requires_approval:true,
      evidence_status:'INSUFFICIENT_EVIDENCE'
    })});
  });
  await card.locator('[data-assist-action="local"]').click();
  await expect(field).toHaveValue('en el barrio hay encuentros culturales con jóvenes');
  await expect(card.locator('.vt-assist-proposal textarea')).toHaveValue('En el barrio se realizan encuentros culturales con jóvenes.');
  await card.getByRole('button',{name:'Descartar'}).click();
  await expect(field).toHaveValue('en el barrio hay encuentros culturales con jóvenes');
  await card.locator('[data-assist-action="local"]').click();
  await card.getByRole('button',{name:'Usar esta propuesta'}).click();
  await expect(field).toHaveValue('En el barrio se realizan encuentros culturales con jóvenes.');
  await page.locator('#save').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await expect(page.locator('#fields [data-field="caracteristicas_culturales"]')).toHaveValue('En el barrio se realizan encuentros culturales con jóvenes.');
  expect(writes).toEqual([]);
});

test('ASISTENTE-S02-02: sin sesión la guía funciona y la IA no modifica el original',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const card=page.locator('.vt-assist[data-assist-field="antecedentes"]');
  const field=page.locator('#fields [data-field="antecedentes"]');
  await field.fill('se realizaron reuniones de la comunidad');
  await card.locator('[data-assist-action="local"]').click();
  await expect(card.locator('[role="status"]')).toContainText('inicia sesión');
  await expect(card.locator('.vt-assist-proposal')).toBeHidden();
  await card.locator('[data-assist-action="questions"]').click();
  await expect(card.locator('[role="status"]')).toContainText('¿Qué acciones');
  await expect(field).toHaveValue('se realizaron reuniones de la comunidad');
});
