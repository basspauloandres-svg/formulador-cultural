const { test, expect } = require('@playwright/test');
const fs = require('fs');

const fields = {
  S01: ['nombre_del_proyecto', 'CASO TALLER QA - CULTURA'],
  S02: ['territorio_o_lugar_de_intervencion', 'TERRITORIO SINTETICO DEL TALLER'],
  S03: ['poblacion_afectada', 'POBLACION SINTETICA: veinte participantes hipoteticos'],
  S04: ['evidencia_disponible', 'EVIDENCIA SIMULADA - pendiente de fuente primaria'],
  S05: ['situaciones_observables', 'SITUACION SINTETICA: discontinuidad de talleres']
};

test('TALLER-UI-01: recorrer S01-S16, diligenciar campos base y exportar HTML/XLSX', async ({ page }) => {
  const mutations = [];
  page.on('request', request => {
    if (request.url().includes('rmaevwlxcuqimxdzxdmq.supabase.co/rest/v1/') &&
        ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())) mutations.push(request.method());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#guidedJourney .guided-subsection[data-code]')).toHaveCount(16);
  const observed = [];
  for (let i = 1; i <= 16; i++) {
    const code = 'S' + String(i).padStart(2, '0');
    await page.locator('#guidedJourney .guided-subsection[data-code="' + code + '"]').click();
    await expect(page.locator('#counter')).toContainText(code);
    const title = await page.locator('#title').innerText();
    expect(title.trim().length, code + ': debe tener una pregunta o título pedagógico').toBeGreaterThan(4);
    const field = fields[code];
    if (field) {
      await expect(page.locator('#fields [data-field="' + field[0] + '"]')).toBeVisible();
      await page.locator('#fields [data-field="' + field[0] + '"]').fill(field[1]);
      await page.locator('#save').click();
      await expect(page.locator('#status')).toContainText('guardado');
    }
    observed.push(code);
  }
  expect(observed).toHaveLength(16);
  await expect(page.locator('#counter')).toContainText('S16');

  // La aplicación permite exportar con pendientes, pero no puede presentarlos como resueltos.
  const audit = await page.evaluate(() => ({
    report: window.fcGetCoherenceReport?.(),
    integrity: window.fcGetProjectIntegrityReport?.(),
    payload: window.fcProjectDocumentPayload?.()
  }));
  expect(audit.report?.checks?.length).toBeGreaterThan(5);
  expect(audit.report.checks.some(c => c.status !== 'COHERENTE')).toBe(true);
  expect(audit.payload?.document_status).toBe('Proyecto en revisión');
  expect(audit.integrity?.schema).toBe('project_integrity_report_v1');

  await expect(page.locator('#expHtml')).toBeVisible({ timeout: 15000 });
  const htmlDownload = page.waitForEvent('download');
  await page.locator('#expHtml').click();
  const html = await htmlDownload;
  const htmlText = fs.readFileSync(await html.path(), 'utf8');
  expect(html.suggestedFilename()).toMatch(/\.html$/);
  for (const needed of [fields.S01[1], fields.S02[1], fields.S03[1]]) {
    expect(htmlText, 'HTML debe conservar datos introducidos desde la interfaz: ' + needed).toContain(needed);
  }
  expect(htmlText).toContain('[POR VERIFICAR]');

  await expect(page.locator('#expXlsx')).toBeVisible();
  const xlsxDownload = page.waitForEvent('download');
  await page.locator('#expXlsx').click();
  const xlsx = await xlsxDownload;
  expect(xlsx.suggestedFilename()).toMatch(/\.xlsx$/);
  const bytes = fs.readFileSync(await xlsx.path());
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
  expect(bytes.includes(Buffer.from('xl/workbook.xml'))).toBe(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await expect(page.locator('#fields [data-field="territorio_o_lugar_de_intervencion"]')).toHaveValue(fields.S02[1]);
  expect(mutations).toEqual([]);
});
