const { test, expect } = require('@playwright/test');

const projectId = process.env.FC_QA_PROJECT_ID || '54e79ac9-a83b-4457-b701-4b485c3565c0';
const email = process.env.FC_QA_EMAIL;
const password = process.env.FC_QA_PASSWORD;

// No se interceptan las solicitudes Auth: el ingreso requiere POST /auth/v1/token.
// Solo se vigilan mutaciones de las tablas de proyectos en la API de datos.
function watchWrites(page) {
  const writes = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('rmaevwlxcuqimxdzxdmq.supabase.co/rest/v1/') &&
        /\/(projects|sections|evidence)(\?|$)/.test(url) &&
        ['POST','PUT','PATCH','DELETE'].includes(request.method())) {
      writes.push(request.method() + ' ' + url.split('?')[0]);
    }
  });
  return writes;
}

test('AUTH-01: Prueba 3 autenticada, lectura S01–S16 y recuperación sin escrituras', async ({ page }) => {
  test.skip(!email || !password, 'INSUFFICIENT_EVIDENCE: faltan secretos QA; no se intentó autenticación');
  const writes = watchWrites(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#passwordLoginBtn').click();
  await expect(page.locator('#authSignedIn')).toBeVisible({ timeout: 40000 });
  const select = page.locator('#projectSelect');
  await expect(select).toBeVisible();
  await expect(select.locator('option[value="' + projectId + '"]')).toHaveCount(1, { timeout: 20000 });
  await select.selectOption(projectId);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('formulador-cultural-cloud-project-v1'))).toBe(projectId);
  for (let i = 1; i <= 16; i++) {
    const code = 'S' + String(i).padStart(2, '0');
    await test.step('Lectura ' + code, async () => {
      await page.locator('#guidedJourney .guided-subsection[data-code="' + code + '"]').click();
      await expect(page.locator('#counter')).toContainText(code);
      await expect(page.locator('#title')).not.toBeEmpty();
    });
  }
  const snapshot = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('formulador-cultural-prototipo-v1') || '{}');
    return { sections: Object.keys(raw).filter(k => /^S(0[1-9]|1[0-6])$/.test(k)).length };
  });
  expect(snapshot.sections).toBe(16);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#authSignedIn')).toBeVisible({ timeout: 40000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('formulador-cultural-cloud-project-v1'))).toBe(projectId);
  expect(writes, 'El recorrido de solo lectura no debe modificar tablas remotas').toEqual([]);
});
