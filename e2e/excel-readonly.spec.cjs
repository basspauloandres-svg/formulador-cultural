const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('E2E-06: Excel XLSX completo se descarga desde Chromium sin Word ni sesión', async ({ page }) => {
  const writes = [];
  page.on('request', req => {
    const u = req.url();
    if (u.includes('rmaevwlxcuqimxdzxdmq.supabase.co/rest/v1/') &&
        ['POST','PUT','PATCH','DELETE'].includes(req.method())) writes.push(req.method());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#counter')).not.toBeEmpty();
  await expect.poll(() => page.evaluate(() => typeof window.fcExportProjectWorkbook)).toBe('function');
  await expect.poll(() => page.evaluate(() => typeof window.XLSX)).toBe('object');
  const waiting = page.waitForEvent('download', {timeout: 30000});
  await page.evaluate(() => window.fcExportProjectWorkbook());
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/formulacion-completa\.xlsx$/);
  const data = fs.readFileSync(await download.path());
  expect(data.length).toBeGreaterThan(2000);
  expect(data.subarray(0,2).toString('binary')).toBe('PK');
  expect(data.includes(Buffer.from('xl/workbook.xml'))).toBe(true);
  expect(data.includes(Buffer.from('[Content_Types].xml'))).toBe(true);
  expect(writes, 'Sin sesión no debe escribir en Supabase').toEqual([]);
});
