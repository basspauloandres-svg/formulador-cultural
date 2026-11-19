const {test,expect}=require('@playwright/test');

test('EVIDENCIA-TRANSVERSAL-01: revisa una cifra sin validarla desde metadatos',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/section/review',async route=>{
    const req=route.request().postDataJSON();
    expect(req.section).toBe('S03');
    expect(req.field).toBe('cantidad_estimada');
    expect(req.context).toContain('Villamaría');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      section:req.section,field:req.field,territory_context:req.context,
      claims:[{statement:req.text,evidence_status:'INSUFFICIENT_EVIDENCE',
          classification:'USER_ASSERTION_UNVERIFIED',note:'Verificar cifra, año y unidad.'}],
      candidate_sources:[{title:'Documento candidato',url:'https://www.datos.gov.co/d/abcd-1234'}],
      verified_claims:[],conflicting_municipalities:[],errors:[]
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#guidedJourney .guided-subsection[data-code="S03"]').click();
  const field=page.locator('#fields [data-field="cantidad_estimada"]');
  await field.fill('Villamaría tiene 500000 habitantes.');
  const audit=page.locator('.vt-evidence-audit[data-review-field="cantidad_estimada"]');
  await audit.getByRole('button',{name:'Investigar y preparar redacción'}).click();
  await expect(audit.locator('.vt-evidence-audit-results')).toContainText('Villamaría tiene 500000 habitantes.');
  await expect(audit.locator('.vt-evidence-audit-results')).toContainText('evidencia insuficiente');
  await expect(field).toHaveValue('Villamaría tiene 500000 habitantes.');
});

test('EVIDENCIA-TRANSVERSAL-02: no añade auditoría documental al valor Vester',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S06"]').click();
  await expect(page.locator('#fields .vt-evidence-audit')).toHaveCount(0);
  await page.locator('#guidedJourney .guided-subsection[data-code="S07"]').click();
  await expect(page.locator('#fields .vt-evidence-audit')).toHaveCount(5);
});
