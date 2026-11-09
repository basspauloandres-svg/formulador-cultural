const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('TALLER-EXPORT-02: descargar PDF y DOCX desde botones S16 con motor Python real', async ({ page }) => {
  test.setTimeout(95000);
  const writes = [];
  page.on('request', req => {
    if (req.url().includes('rmaevwlxcuqimxdzxdmq.supabase.co/rest/v1/') &&
        ['POST','PUT','PATCH','DELETE'].includes(req.method())) writes.push(req.method());
  });
  await page.addInitScript(() => {
    window.FC_DOCUMENT_API_URL = 'http://127.0.0.1:8000';
  });
  // El servidor estático del puerto 5500 está en la lista CORS vigente del backend.
  await page.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#counter')).toContainText('S01');
  await page.locator('#nombre_del_proyecto').fill('TALLER SINTETICO DE ACEPTACION DOCUMENTAL');
  await page.locator('#save').click();
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await page.locator('#territorio_o_lugar_de_intervencion').fill('TERRITORIO SINTETICO PARA EXPORTACION');
  await page.locator('#save').click();
  await page.locator('#guidedJourney .guided-subsection[data-code="S16"]').click();
  await expect(page.locator('#expPdf')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#expDocx')).toBeVisible();

  for (const kind of ['pdf', 'docx']) {
    const api = page.waitForResponse(r =>
      r.url() === 'http://127.0.0.1:8000/documents/' + kind &&
      r.request().method() === 'POST',
    {timeout:65000});
    const download = page.waitForEvent('download', { timeout: 65000 });
    await page.locator(kind === 'pdf' ? '#expPdf' : '#expDocx').click();
    const response = await api;
    expect(response.ok(), 'El generador Python debe responder HTTP 200').toBe(true);
    const file = await download;
    expect(file.suggestedFilename()).toMatch(new RegExp('\\.' + kind + '$'));
    const bytes = fs.readFileSync(await file.path());
    expect(bytes.length).toBeGreaterThan(18000);
    expect(bytes.subarray(0, kind === 'pdf' ? 5 : 2).toString()).toBe(kind === 'pdf' ? '%PDF-' : 'PK');
    if (kind === 'docx') {
      expect(bytes.includes(Buffer.from('word/document.xml'))).toBe(true);
    }
  }
  expect(writes, 'La exportación no necesita escribir en Supabase').toEqual([]);
});
