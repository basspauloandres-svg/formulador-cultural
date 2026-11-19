const {test,expect}=require('@playwright/test');

test('DIVIPOLA-S01: valida municipio nacional y conserva valores del proyecto',async({page})=>{
  const sent=[];
  await page.route('https://formulador-cultural-api.onrender.com/territory/resolve',async route=>{
    const req=route.request().postDataJSON();sent.push(req.context);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'FOUND',identity:{
        municipality:'Anserma',department:'Caldas',divipola:'17042',
        territory_type:'Municipio',url:'https://www.datos.gov.co/d/gdxc-w37w'}
    })});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  const city=page.locator('#fields [data-field="municipio"]');
  const dept=page.locator('#fields [data-field="departamento"]');
  await dept.fill('Caldas');
  await city.fill('Anserma');
  await city.blur();
  const result=page.locator('.vt-territory-check');
  await expect(result).toContainText('Anserma, Caldas');
  await expect(result).toContainText('17042');
  expect(sent).toContain('Anserma, Caldas');
  await expect(city).toHaveValue('Anserma');
  await expect(dept).toHaveValue('Caldas');
});

test('DIVIPOLA-S01: municipios homónimos exigen departamento',async({page})=>{
  await page.route('https://formulador-cultural-api.onrender.com/territory/resolve',async route=>{
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'AMBIGUOUS_MUNICIPALITY',identity:null,
      candidates:[{municipality:'Granada',department:'Antioquia',divipola:'05313'},
                  {municipality:'Granada',department:'Meta',divipola:'50313'}]
    })});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  const city=page.locator('#fields [data-field="municipio"]');
  await city.fill('Granada');
  await city.blur();
  await expect(page.locator('.vt-territory-check')).toContainText('varios territorios');
  await expect(page.locator('.vt-territory-check')).toContainText('Antioquia');
  await expect(city).toHaveValue('Granada');
});

test('DIVIPOLA-S01: indisponibilidad del servicio no inventa código',async({page})=>{
  await page.route('https://formulador-cultural-api.onrender.com/territory/resolve',async route=>{
    await route.fulfill({status:503,contentType:'application/json',body:'{"detail":"offline"}'});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney .guided-subsection[data-code="S01"]').click();
  const city=page.locator('#fields [data-field="municipio"]');
  await city.fill('Quibdó');
  await city.blur();
  await expect(page.locator('.vt-territory-check')).toContainText('no respondió');
  await expect(city).toHaveValue('Quibdó');
});
