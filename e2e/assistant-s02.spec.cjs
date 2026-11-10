const {test,expect}=require('@playwright/test');

test('ASISTENTE-S02-01: orientación sin IA, aprobación explícita y preservación del original',async({page})=>{
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
  await card.locator('[data-assist-action="local"]').click();
  await expect(field).toHaveValue('en el barrio hay encuentros culturales con jóvenes');
  await expect(card.locator('.vt-assist-proposal textarea')).toHaveValue('En el barrio hay encuentros culturales con jóvenes.');
  await card.getByRole('button',{name:'Descartar'}).click();
  await expect(field).toHaveValue('en el barrio hay encuentros culturales con jóvenes');
  await card.locator('[data-assist-action="local"]').click();
  await card.getByRole('button',{name:'Usar esta propuesta'}).click();
  await expect(field).toHaveValue('En el barrio hay encuentros culturales con jóvenes.');
  await page.locator('#save').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await expect(page.locator('#fields [data-field="caracteristicas_culturales"]')).toHaveValue('En el barrio hay encuentros culturales con jóvenes.');
  expect(writes).toEqual([]);
});

test('ASISTENTE-S02-02: sin sesión o sin servidor la ayuda local sigue operativa',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const card=page.locator('.vt-assist[data-assist-field="antecedentes"]');
  await page.locator('#fields [data-field="antecedentes"]').fill('se realizaron reuniones de la comunidad');
  await card.locator('[data-assist-action="ai"]').click();
  await expect(card.locator('[role="status"]')).toContainText('inicia sesión');
  await card.locator('[data-assist-action="local"]').click();
  await expect(card.locator('.vt-assist-proposal')).toBeVisible();
});
