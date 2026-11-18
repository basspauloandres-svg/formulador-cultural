const {test,expect}=require('@playwright/test');

test('ASISTENTE-S02-TERR-01: Villamaría sustituye contexto de Neira sin heredar fuentes',async({page})=>{
  const contexts=[];
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/s02/guide',async route=>{
    const body=route.request().postDataJSON();
    contexts.push(body.context);
    const villamaria=body.context.toLowerCase().includes('villamaria')||body.context.toLowerCase().includes('villamaría');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      territory_context:body.context,
      territory:{municipality:villamaria?'Villamaría':'Neira',department:'Caldas',
        divipola:villamaria?'17873':'17486',url:villamaria
          ?'https://www.villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx'
          :'https://mng.mincultura.gov.co/prensa/noticias/Documents/Fomento/FichaTerritorial_17486_2016_SIFO.pdf'},
      guidance:['Delimita el territorio'],sources:[],candidate_sources:[],errors:[],
      suggestion:null,blocked_for_evidence:false,review_flags:[],requires_approval:true,
      claim_status:'INSUFFICIENT_EVIDENCE',note:'Sin fuentes temáticas comprobadas.'
    })});
  });
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#fields [data-field="municipio"]').fill('Neira');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  let card=page.locator('.vt-assist[data-assist-field="territorio_o_lugar_de_intervencion"]');
  await card.locator('[data-assist-action="research"]').click();
  await expect(card.locator('.vt-assist-references')).toContainText('Neira, Caldas');
  await expect(card.locator('.vt-assist-references')).toContainText('17486');

  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  card=page.locator('.vt-assist[data-assist-field="territorio_o_lugar_de_intervencion"]');
  await expect(card.locator('.vt-assist-references')).toBeHidden();
  await card.locator('[data-assist-action="research"]').click();
  await expect(card.locator('.vt-assist-references')).toContainText('Villamaría, Caldas');
  await expect(card.locator('.vt-assist-references')).toContainText('17873');
  await expect(card.locator('.vt-assist-references')).not.toContainText('Neira');
  expect(contexts).toEqual(['Neira, Caldas','Villamaría, Caldas']);
});

test('ASISTENTE-S02-TERR-02: un cambio del municipio invalida respuesta pendiente',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{sb.auth.getSession=async()=>({data:{session:{access_token:'synthetic-e2e'}}});});
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="departamento"]').fill('Caldas');
  await page.locator('#fields [data-field="municipio"]').fill('Neira');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  const field=page.locator('#fields [data-field="caracteristicas_culturales"]');
  await field.fill('Se describen encuentros musicales en la comunidad.');
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('https://formulador-cultural-api.onrender.com/assistant/s02/guide',async route=>{
    await gate;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      territory_context:'Neira, Caldas',
      territory:{municipality:'Neira',department:'Caldas',divipola:'17486',url:'https://mng.mincultura.gov.co/documento.pdf'},
      guidance:['Antigua orientación de Neira'],sources:[],candidate_sources:[],errors:[],
      suggestion:'Borrador anterior de Neira',blocked_for_evidence:false,review_flags:[],
    })});
  });
  await page.locator('.vt-assist[data-assist-field="caracteristicas_culturales"] [data-assist-action="research"]').click();
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  await page.locator('#fields [data-field="municipio"]').fill('Villamaría');
  await page.locator('#guidedJourney .guided-subsection[data-code="S02"]').click();
  release();
  const current=page.locator('.vt-assist[data-assist-field="caracteristicas_culturales"]');
  await expect(current.locator('.vt-assist-references')).toBeHidden();
  await expect(current.locator('.vt-assist-proposal')).toBeHidden();
  await expect(page.locator('#fields [data-field="caracteristicas_culturales"]')).toHaveValue('Se describen encuentros musicales en la comunidad.');
});
