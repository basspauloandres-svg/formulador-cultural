const {test,expect}=require('@playwright/test');

for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]){
 test('Workspace '+viewport.width+': layout, navigation, keyboard and saved draft',async({page})=>{
  await page.setViewportSize(viewport);
  const errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(?:rmaevwlxcuqimxdzxdmq\.supabase\.co|formulador-cultural-api\.onrender\.com)\//,route=>{
   if(['POST','PATCH','PUT','DELETE'].includes(route.request().method()))writes.push(route.request().method());
   return route.abort();
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/workspace-preview/);
  const nav=page.locator('#guidedJourney .guided-subsection[data-code]');
  await expect(nav).toHaveCount(16);
  const expected=Array.from({length:16},(_,i)=>'S'+String(i+1).padStart(2,'0'));
  expect(await nav.evaluateAll(nodes=>nodes.map(n=>n.dataset.code))).toEqual(expected);
  const layout=await page.evaluate(()=>{
   const n=document.querySelector('#guidedJourney').getBoundingClientRect(),p=document.querySelector('#panel').getBoundingClientRect();
   return {navRight:n.right,panelLeft:p.left,navBottom:n.bottom,panelTop:p.top,width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
  });
  if(viewport.width>=1100)expect(layout.navRight).toBeLessThan(layout.panelLeft);
  else expect(layout.navBottom).toBeLessThanOrEqual(layout.panelTop);
  expect(layout.scroll).toBeLessThanOrEqual(layout.width+1);
  for(const code of expected){
   await page.locator('#guidedJourney [data-code="'+code+'"]').click();
   await expect(page.locator('#counter')).toContainText(code);
   await expect(page.locator('#guidedJourney [data-code="'+code+'"]')).toHaveClass(/current/);
  }
  await page.locator('#guidedJourney [data-code="S01"]').focus();
  await expect(page.locator('#guidedJourney [data-code="S01"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#counter')).toContainText('S01');
  const name=page.locator('#fields [data-field="nombre_del_proyecto"]');
  await name.fill('QA workspace sintético '+viewport.width);
  const save=viewport.width<=720?page.locator('#mSave'):page.locator('#save');
  await save.click();
  await expect(page.locator('#status')).toContainText('guardado');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#guidedJourney [data-code="S01"]').click();
  await expect(name).toHaveValue('QA workspace sintético '+viewport.width);
  await page.locator('#vtKnowledge summary').click();
  await expect(page.locator('#vtKnowledgeQuestion')).toBeVisible();
  await page.screenshot({path:'test-results/workspace-'+viewport.width+'.png',fullPage:false});
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
 });
}
