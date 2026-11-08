const { test, expect } = require('@playwright/test');

test('E2E-01: carga pública y recorrido S01–S16 de solo lectura', async ({ page }) => {
  const mutations = [];
  page.on('request', request => {
    if (request.url().includes('rmaevwlxcuqimxdzxdmq.supabase.co') &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      mutations.push(request.method() + ' ' + request.url().split('?')[0]);
    }
  });
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#guidedJourney .guided-subsection[data-code]')).toHaveCount(16, { timeout: 30000 });
  await expect(page.locator('#panel')).toBeVisible();
  const observed = [];
  for (let i = 1; i <= 16; i++) {
    const code = 'S' + String(i).padStart(2, '0');
    await test.step(code + ': seleccionar y renderizar', async () => {
      await page.locator('#guidedJourney .guided-subsection[data-code="' + code + '"]').click();
      await expect(page.locator('#counter')).toContainText(code);
      await expect(page.locator('#title')).not.toBeEmpty();
      observed.push(code);
    });
  }
  expect(observed).toHaveLength(16);
  expect(mutations, 'Las visitas sin autenticación no deben escribir en Supabase').toEqual([]);
});

test('E2E-02: recarga sin edición y navegación', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#guidedJourney .guided-subsection[data-code]')).toHaveCount(16);
  await page.locator('#guidedJourney .guided-subsection[data-code="S03"]').click();
  await expect(page.locator('#counter')).toContainText('S03');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#counter')).toContainText('S03');
});

test('E2E-03: controles de acceso visibles (sin enviar credenciales)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#passwordLoginBtn')).toBeVisible();
  await expect(page.locator('#loginBtn')).toBeVisible();
});
