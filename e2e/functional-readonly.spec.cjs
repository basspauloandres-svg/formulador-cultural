const { test, expect } = require('@playwright/test');

test('E2E-04: auditoría detecta referencia huérfana sin escribir datos', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#counter')).not.toBeEmpty();
  const result = await page.evaluate(() => {
    const audit = window.fcAuditProjectSnapshot;
    if (typeof audit !== 'function') throw new Error('Motor de integridad no disponible');
    const snapshot = {
      project: { project_id: 'synthetic-qa' },
      sections: {},
      derived: {
        results: [{ id: 'R-1' }],
        activities: [{ id: 'A-1', resultId: 'R-INEXISTENTE' }],
        objectives: { items: [] },
        schedule: [{ id: 'T-1', activityId: 'A-INEXISTENTE' }],
        budget: [{ id: 'B-1', activityId: 'A-1' }],
        risks: [{ id: 'K-1', linkedObjectType: 'Resultado', linkedObjectId: 'R-INEXISTENTE' }],
        risk_state: { assessments: {} },
        budget_state: { activityStatus: {} }
      }
    };
    const invalid = audit(snapshot);
    const valid = audit({
      ...snapshot,
      derived: {
        ...snapshot.derived,
        activities: [{ id: 'A-1', resultId: 'R-1' }],
        schedule: [{ id: 'T-1', activityId: 'A-1' }],
        risks: [{ id: 'K-1', linkedObjectType: 'Resultado', linkedObjectId: 'R-1' }]
      }
    });
    return {
      invalidOk: invalid.ok,
      issueKinds: invalid.issues.map(x => x.kind).sort(),
      validOk: valid.ok,
      validIssues: valid.issues.length,
      schema: invalid.schema
    };
  });
  expect(result.invalidOk).toBe(false);
  expect(result.issueKinds).toEqual(['ACTIVIDAD_AUSENTE', 'RESULTADO_AUSENTE', 'RESULTADO_AUSENTE']);
  expect(result.validOk).toBe(true);
  expect(result.validIssues).toBe(0);
  expect(result.schema).toBe('project_integrity_report_v1');
});

test('E2E-05: exportación HTML local genera un archivo no vacío sin Word', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#counter')).not.toBeEmpty();
  const api = await page.evaluate(() => ({
    exportHtml: typeof window.fcExportProjectHTML,
    reportHtml: typeof window.fcProjectReportHTML
  }));
  expect(api.exportHtml).toBe('function');
  expect(api.reportHtml).toBe('function');
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.evaluate(() => window.fcExportProjectHTML());
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const stream = require('fs');
  const tmpPath = await download.path();
  expect(stream.statSync(tmpPath).size).toBeGreaterThan(100);
  const body = stream.readFileSync(tmpPath, 'utf8');
  expect(body.toLowerCase()).toContain('<html');
});
