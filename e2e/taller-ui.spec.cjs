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


test('TALLER-VKE-01: consulta metodológica aislada, procedencia, saturación y cambio de sección', async ({page}) => {
  // Never use the hosted database or the real model from this browser test.
  const hosted=[];
  await page.route('**/rmaevwlxcuqimxdzxdmq.supabase.co/**', route=>{hosted.push(route.request().method());return route.abort()});
  const calls=[];
  let scenario='rule';
  let received, release;
  let pending=new Promise(resolve=>received=resolve);
  let gate=new Promise(resolve=>release=resolve);
  await page.route('**/assistant/knowledge',async route=>{
    if(route.request().method()==='OPTIONS'){
      await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, content-type'}});return;
    }
    const body=route.request().postDataJSON();
    calls.push(body);
    const headers={'access-control-allow-origin':'*'};
    if(scenario==='busy'){await route.fulfill({status:429,headers,json:{detail:'busy'}});return}
    if(scenario==='delayed'){received();await gate;}
    const doc=scenario==='doc';
    try{await route.fulfill({status:200,headers,json:{section:body.section,generation_used:false,
      route:doc?'DOCUMENT_RETRIEVAL':'DETERMINISTIC_GUIDANCE',
      answer:doc?'Fragmento recuperado':'Orientación sintética para la prueba.',
      source:doc?undefined:'Regla operativa VÉRTICE, no evidencia externa.',
      passages:doc?[{title:'Fuente sintética',publisher:'Institución ficticia',edition:'1',locator:'p. 7',excerpt:'<img src=x onerror=alert(1)>',url:'javascript:alert(1)',excerpt_sha256:'a'.repeat(64)}]:[]}})}catch(e){if(scenario!=='delayed')throw e}
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#counter')).toContainText('S01');
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-browser-test'}}})});
  await page.locator('#vtKnowledge summary').click();
  const question=page.locator('#vtKnowledgeQuestion'),ask=page.locator('#vtKnowledgeAsk'),out=page.locator('#vtKnowledgeResult');
  await question.fill('¿Qué es un indicador?');
  await ask.click();
  await expect(out).toContainText('Orientación operativa');
  expect(calls[0]).toEqual({section:'S01',question:'¿Qué es un indicador?'});
  // An ordinary rerender of the same section must not erase the answer.
  await page.evaluate(()=>render());
  await expect(out).toContainText('Orientación operativa');
  scenario='doc';
  await question.fill('presupuesto costos');
  await ask.click();
  await expect(out).toContainText('p. 7');
  await expect(out).toContainText('<img src=x onerror=alert(1)>');
  await expect(out.locator('img, a')).toHaveCount(0);
  scenario='busy';
  await question.fill('cronograma');
  await ask.click();
  await expect(out).toContainText('Capacidad temporalmente ocupada');
  scenario='delayed';
  await question.fill('meta');
  await ask.click();
  await pending;
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  await expect(page.locator('#counter')).toContainText('S02');
  release();
  await expect(page.locator('#vtKnowledge')).not.toHaveAttribute('open','');
  await expect(out).toBeEmpty();
  await expect(question).toHaveValue('');
  expect(hosted.filter(m=>['POST','PATCH','PUT','DELETE'].includes(m))).toEqual([]);
});


// Q07/P01: three scenario-specific smoke tests; not an expert quality verdict.
// Independent browser contexts, offline from hosted services. User inputs are
// synthetic; tests stop at an honest incomplete project rather than fabricating
// evidence, quotes, or approvals. Recover the draft from a local reload.
for (const fixture of [
 {id:'C01',title:'QA C01 Formación musical',population:'Grupo escolar; número de participantes [POR VERIFICAR]',evidence:'Propuesta docente sintética; registro de asistencia pendiente',problem:'Discontinuidad de talleres de iniciación musical'},
 {id:'C02',title:'QA C02 Circulación artística',population:'Artistas locales; cupos por definir',evidence:'Recursos limitados; financiación y cotizaciones [POR VERIFICAR]',problem:'Disponibilidad insuficiente de espacios y fechas para presentaciones'},
 {id:'C03',title:'QA C03 Memoria y conocimientos culturales',population:'Participantes comunitarios; consentimiento pendiente',evidence:'Fuente sintética A indica cuatro encuentros; fuente sintética B indica dos. Contradicción sin resolver; autorización documental pendiente.',problem:'Documentación incompleta de conocimientos culturales'}
]) {
 test('Q07/P01 '+fixture.id+': conservar datos pendientes y recuperar borrador local',async({page})=>{
  const prohibited=[];
  await page.route(/https:\/\/(?:rmaevwlxcuqimxdzxdmq\.supabase\.co|formulador-cultural-api\.onrender\.com)\//,route=>{
    if(['POST','PUT','PATCH','DELETE'].includes(route.request().method()))prohibited.push(route.request().method());
    return route.abort();
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const data={
   S01:['nombre_del_proyecto',fixture.title],
   S02:['territorio_o_lugar_de_intervencion',fixture.id==='C03'?'Granada, departamento por verificar':'Municipio sintético de prueba'],
   S03:['poblacion_afectada',fixture.population],
   S04:['evidencia_disponible',fixture.evidence],
   S05:['situaciones_observables',fixture.problem]
  };
  for(const [code,[field,value]] of Object.entries(data)){
   await page.locator('#guidedJourney .guided-subsection[data-code="'+code+'"]').click();
   await page.locator('#fields [data-field="'+field+'"]').fill(value);
   await page.locator('#save').click();
   await expect(page.locator('#status')).toContainText('guardado');
  }
  await page.reload({waitUntil:'domcontentloaded'});
  for(const [code,[field,value]] of Object.entries(data)){
   await page.locator('#guidedJourney .guided-subsection[data-code="'+code+'"]').click();
   await expect(page.locator('#fields [data-field="'+field+'"]')).toHaveValue(value);
  }
  await page.locator('#guidedJourney .guided-subsection[data-code="S16"]').click();
  await expect(page.locator('#callReadiness')).toContainText('pendiente de perfil oficial verificado');
  const before=await page.evaluate(()=>window.fcProjectDocumentPayload());
  expect(before.document_status).toBe('Proyecto en revisión');
  await page.locator('#confirmReview').check();
  await page.locator('#saveReview').click();
  await expect(page.locator('#finalReviewStatus')).toContainText('aprobación pendiente');
  const after=await page.evaluate(()=>({payload:window.fcProjectDocumentPayload(),html:window.fcProjectReportHTML()}));
  expect(after.payload.document_status).toBe('Proyecto en revisión');
  expect(after.html).toContain(fixture.title);
  expect(after.html).toContain('[POR VERIFICAR]');
  expect(after.html).toContain(fixture.evidence);
  expect(prohibited).toEqual([]);
 });
}
