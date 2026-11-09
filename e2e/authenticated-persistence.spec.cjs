const { test, expect } = require('@playwright/test');

const email = process.env.FC_QA_EMAIL;
const password = process.env.FC_QA_PASSWORD;
const originalId = process.env.FC_QA_PROJECT_ID || '54e79ac9-a83b-4457-b701-4b485c3565c0';
const runId = process.env.GITHUB_RUN_ID || 'local';
const qaTitle = 'QA-PERSIST-ISSUE93-' + runId;
const qaTerritory = 'TERRITORIO-QA-SINTETICO-' + runId;
const qaContext = 'Texto sintético de comprobación de persistencia; no constituye evidencia cultural.';

async function login(page) {
  await page.goto('', { waitUntil: 'domcontentloaded' });
  expect(new URL(page.url()).pathname).toBe('/formulador-cultural/');
  await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#passwordLoginBtn').click();
  await expect(page.locator('#authSignedIn')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('#projectSelect')).toBeVisible({ timeout: 20000 });
}

test('AUTH-PERSIST-01: guardar y recuperar S02 en proyecto QA independiente', async ({ page, browser }) => {
  test.skip(!email || !password, 'INSUFFICIENT_EVIDENCE: faltan credenciales QA');
  const violations = [];
  const writes = [];
  let qaId = null;

  page.on('request', request => {
    const url = new URL(request.url());
    if (url.hostname !== 'rmaevwlxcuqimxdzxdmq.supabase.co' ||
        !url.pathname.startsWith('/rest/v1/') ||
        !['POST','PUT','PATCH','DELETE'].includes(request.method())) return;
    const table = url.pathname.slice('/rest/v1/'.length);
    if (!['projects','sections','evidence'].includes(table)) return;
    let data;
    try { data = request.postDataJSON(); } catch { data = null; }
    const rows = Array.isArray(data) ? data : [data];
    const projectIds = rows.filter(Boolean).map(row => row.project_id).filter(Boolean);
    const filter = url.searchParams.get('id') || '';
    if (projectIds.includes(originalId) || filter === 'eq.' + originalId) violations.push('MUTACION_PROYECTO_ORIGINAL');
    if (table === 'projects' && request.method() === 'POST' &&
        !rows.every(row => typeof row?.title === 'string' && row.title === qaTitle)) violations.push('CREACION_NO_QA');
    if (table === 'sections' && projectIds.some(id => id !== qaId && id !== originalId)) violations.push('SECCION_OTRO_PROYECTO');
    if (table === 'evidence') violations.push('MUTACION_EVIDENCIA');
    writes.push(table + ':' + request.method());
  });

  await login(page);
  await expect(page.locator('#projectSelect option[value="' + originalId + '"]')).toHaveCount(1, { timeout: 20000 });

  // Crear copia sintética NUEVA. No se duplica contenido personal del proyecto original.
  page.once('dialog', dialog => dialog.accept(qaTitle));
  const createResponsePromise = page.waitForResponse(r => {
    const url = new URL(r.url());
    return url.pathname.endsWith('/rest/v1/projects') && r.request().method() === 'POST';
  });
  await page.locator('#newProjectBtn').click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), 'La API aceptó la creación QA').toBe(true);
  const created = await createResponse.json();
  qaId = created.id;
  expect(qaId).toMatch(/^[a-f0-9-]{36}$/i);
  expect(qaId).not.toBe(originalId);
  await expect(page.locator('#projectSelect option[value="' + qaId + '"]')).toHaveCount(1, { timeout: 25000 });

  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await expect(page.locator('#counter')).toContainText('S02');
  await page.locator('#territorio_o_lugar_de_intervencion').fill(qaTerritory);
  await page.locator('#caracteristicas_culturales').fill(qaContext);
  const savingResponse = page.waitForResponse(r =>
    new URL(r.url()).pathname.endsWith('/rest/v1/sections') &&
    ['POST','PATCH','PUT'].includes(r.request().method()) &&
    (r.request().postData() || '').includes(qaId), { timeout: 30000 });
  await page.locator('#save').click();
  const saved = await savingResponse;
  expect(saved.ok(), 'S02 se escribió en Supabase').toBe(true);
  await expect(page.locator('#status')).toContainText('sincronizada en la nube', { timeout: 20000 });

  // Contexto nuevo: sin localStorage previo, obliga a recuperar la sección desde la nube.
  const freshContext = await browser.newContext();
  try {
    const fresh = await freshContext.newPage();
    await login(fresh);
    await expect(fresh.locator('#projectSelect option[value="' + qaId + '"]')).toHaveCount(1, { timeout: 20000 });
    if (await fresh.locator('#projectSelect').inputValue() !== qaId) {
      await fresh.locator('#projectSelect').selectOption(qaId);
    }
    await expect.poll(() => fresh.evaluate(() =>
      localStorage.getItem('formulador-cultural-cloud-project-v1')), { timeout: 20000 }).toBe(qaId);
    await fresh.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
    await expect(fresh.locator('#territorio_o_lugar_de_intervencion')).toHaveValue(qaTerritory, { timeout: 20000 });
    await expect(fresh.locator('#caracteristicas_culturales')).toHaveValue(qaContext);
  } finally {
    await freshContext.close();
  }

  expect(violations, 'Prohibida toda escritura sobre Prueba 3 y otras entidades').toEqual([]);
  expect(writes).toContain('projects:POST');
  expect(writes).toContain('sections:POST');
  console.log('AUTH-PERSIST-01 PASS; copia sintética QA creada para trazabilidad; no se imprime UUID.');
});
