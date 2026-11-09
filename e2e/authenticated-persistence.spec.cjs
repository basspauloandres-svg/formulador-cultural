const { test, expect } = require('@playwright/test');

// Fijo por diseño: ninguna operación debe crear proyectos ni modificar identificadores ajenos.
const QA_ID = '517e5892-f39d-48c9-9305-d082a1f37240';
const email = process.env.FC_QA_EMAIL;
const password = process.env.FC_QA_PASSWORD;
const qaTerritory = 'TERRITORIO-QA-RELECTURA-' + (process.env.GITHUB_RUN_ID || 'local');
const qaContext = 'Registro sintético de ensayo. Sin valor de evidencia cultural.';

async function guardWrites(page, violations) {
  await page.route(/^https:\/\/rmaevwlxcuqimxdzxdmq\.supabase\.co\/rest\/v1\/(projects|sections|evidence)(?:\?|$)/, async route => {
    const req = route.request();
    const method = req.method();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return route.continue();
    const url = new URL(req.url());
    const table = url.pathname.split('/').at(-1);
    let ok = false;
    if (table === 'sections' && method === 'POST') {
      let data;
      try { data = req.postDataJSON(); } catch { data = null; }
      const rows = Array.isArray(data) ? data : [data];
      ok = rows.length > 0 && rows.every(row =>
        row && row.project_id === QA_ID && ['S01', 'S02'].includes(row.code));
    } else if (table === 'sections' && ['PUT', 'PATCH'].includes(method)) {
      ok = url.searchParams.get('project_id') === 'eq.' + QA_ID;
    } else if (table === 'projects' && ['PUT', 'PATCH'].includes(method)) {
      ok = url.searchParams.get('id') === 'eq.' + QA_ID;
    }
    // DELETE, INSERT projects, modificaciones evidence, identidades ambiguas: siempre se bloquean.
    if (!ok) {
      violations.push(table + ':' + method + ':BLOQUEADA');
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}

async function login(page) {
  await page.goto('', { waitUntil: 'domcontentloaded' });
  expect(new URL(page.url()).pathname).toBe('/formulador-cultural/');
  await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#passwordLoginBtn').click();
  await expect(page.locator('#authSignedIn')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('#projectSelect')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#projectSelect option[value="' + QA_ID + '"]')).toHaveCount(1, { timeout: 20000 });
}

async function selectQa(page) {
  const select = page.locator('#projectSelect');
  await select.selectOption(QA_ID);
  // La selección puede completarse en forma asíncrona. Exigir identidad en dos superficies.
  await expect.poll(() => page.evaluate(() =>
    localStorage.getItem('formulador-cultural-cloud-project-v1')), { timeout: 25000 }).toBe(QA_ID);
  await expect(select).toHaveValue(QA_ID, { timeout: 25000 });
  await expect(page.locator('#authHelp')).toContainText('QA-PERSIST-ISSUE93-', { timeout: 20000 });
}

test('AUTH-PERSIST-02: solo proyecto QA, escritura bloqueada para cualquier otro UUID', async ({ page, browser }) => {
  test.skip(!email || !password, 'INSUFFICIENT_EVIDENCE: faltan secretos QA');
  const violations = [];
  await guardWrites(page, violations);
  await login(page);
  await selectQa(page);
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await expect(page.locator('#counter')).toContainText('S02');
  await page.locator('#territorio_o_lugar_de_intervencion').fill(qaTerritory);
  await page.locator('#caracteristicas_culturales').fill(qaContext);

  // Verificar identidad inmediatamente antes de guardar; no basta el dropdown visual.
  await expect.poll(() => page.evaluate(() =>
    localStorage.getItem('formulador-cultural-cloud-project-v1'))).toBe(QA_ID);
  await expect(page.locator('#projectSelect')).toHaveValue(QA_ID);

  const savedResponse = page.waitForResponse(r => {
    if (!new URL(r.url()).pathname.endsWith('/rest/v1/sections') || r.request().method() !== 'POST') return false;
    try { return r.request().postDataJSON()?.project_id === QA_ID; } catch { return false; }
  }, { timeout: 30000 });
  await page.locator('#save').click();
  expect((await savedResponse).ok()).toBe(true);
  await expect(page.locator('#status')).toContainText('sincronizada en la nube', { timeout: 20000 });

  const freshContext = await browser.newContext({
    baseURL: process.env.FC_E2E_URL || 'https://basspauloandres-svg.github.io/formulador-cultural/'
  });
  try {
    const fresh = await freshContext.newPage();
    const freshViolations = [];
    await guardWrites(fresh, freshViolations);
    await login(fresh);
    await selectQa(fresh);
    await fresh.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
    await expect(fresh.locator('#territorio_o_lugar_de_intervencion')).toHaveValue(qaTerritory, { timeout: 20000 });
    await expect(fresh.locator('#caracteristicas_culturales')).toHaveValue(qaContext);
    expect(freshViolations).toEqual([]);
  } finally {
    await freshContext.close();
  }
  expect(violations, 'Si se intentó escribir otro proyecto, cancelar la prueba').toEqual([]);
});
