// Synthetic state-level integration fixture; no real projects, AI, cloud or fabricated evidence claims.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.route('**/*',r=>{const u=new URL(r.request().url());return u.origin==='http://127.0.0.1:8765'||u.hostname==='cdn.jsdelivr.net'?r.continue():r.abort()});
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.locator('#vtContinueTop').click();
 const initial=await page.evaluate(()=>{
  const c={id:'C',zone:'central',text:'Baja participación cultural',origin:'S05',reviewed:true},d={id:'D',zone:'direct_cause',text:'Escasa oferta de talleres',parentId:'C',origin:'S05',reviewed:true};
  const objectives=[c,d].map(n=>({...n,sourceText:n.text,text:n.id==='C'?'Incrementar la participación cultural':'Ampliar la oferta de talleres',confirmed:true}));
  const indicator=(id,type,linkedId)=>({id,linkedType:type,linkedId,activityId:type==='Actividad'?linkedId:'',indicator:'Participación registrada',formula:'Conteo de registros',unidad:'Personas',lineaBase:'0',meta:'10',medioVerificacion:'Registro sintético',periodicidad:'Mensual',responsable:'Equipo QA',plazo:'Diciembre',selected:true,confirmed:true,definitionStatus:'DEFINIDO',technicalStatus:'COMPLETA'});
  const targets=['cause:D','result:R','activity:A'].map(id=>({id}));
  Object.assign(draft,{
   S01:{nombre_del_proyecto:'QA integral — caso sintético',municipio:'Municipio de prueba'},
   S02:{territorio_o_lugar_de_intervencion:'Territorio hipotético'},
   S03:{poblacion_afectada:'Participantes hipotéticos'},
   S04:{evidencia_disponible:'Registro simulado, exclusivamente para pruebas'},
   S05:{situaciones_observables:'Dos situaciones de prueba',vester_preparation_v2:{items:[{id:'C',confirmed:true,status:'ready'},{id:'D',confirmed:true,status:'ready'}]}},
   S06:{vester_state:{selected:[{id:'C'},{id:'D'}],relations:{'C>D':{score:0},'D>C':{score:3}}}},
   S07:{tree_state:{nodes:[c,d]}},
   S08:{enunciado:c.text},
   S09:{objectives_state:{items:objectives}},
   S10:{completion_state:{items:[{id:'ALT',sourceIds:['D'],text:'Talleres comunitarios',selected:true,confirmed:true}]}},
   S11:{results_state:{items:[{id:'R',objectiveId:'D',text:'Oferta cultural ampliada',confirmed:true}]},completion_state:{items:[{id:'A',objectiveId:'D',resultId:'R',text:'Realizar talleres',confirmed:true}]}},
   S12:{completion_state:{items:[indicator('I1','Actividad','A'),indicator('I2','Resultado','R'),indicator('I3','Objetivo','C')]}},
   S13:{schedule_state:{items:[{id:'SCH',activityId:'A',confirmed:true,startDate:'2026-12-01',endDate:'2026-12-02',responsible:'Equipo QA',dependencyIds:[]}]}},
   S14:{budget_state:{activityStatus:{A:'nocost'},items:[]}},
   S15:{risk_state:{targets,assessments:Object.fromEntries(targets.map(t=>[t.id,'no'])),items:[]}},
   S16:{}
  });
  localStorage.setItem(storeKey,JSON.stringify(draft));
  const review=window.fcGetReviewSnapshot();
  return {ready:review.ready,states:review.states,checks:review.coh.checks,integrity:window.fcGetProjectIntegrityReport(),pending:review.absenceCount};
 });
 console.log('INTEGRAL_INITIAL',JSON.stringify(initial));
 assert.equal(initial.ready,true,'Synthetic complete state must be reviewable');
 await page.locator('#guidedJourney [data-code="S16"]').click();
 await page.locator('#confirmReview').check();
 await page.locator('#saveReview').click();
 await page.waitForFunction(()=>window.fcSectionStatus('S16')==='complete');
 assert.equal(await page.evaluate(()=>window.fcGetDocumentStatus()),'Proyecto maestro revisado');
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem(storeKey)).S16.review_state.confirmed);
 assert.equal(persisted,true);
 // A later edit must revoke review and professional document status.
 await page.locator('#guidedJourney [data-code="S01"]').click();
 await page.locator('#nombre_del_proyecto').fill('QA integral — editado desde el formulario');
 await page.locator('#save').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>draft.S01?.nombre_del_proyecto==='QA integral — editado desde el formulario');
 const invalidated=await page.evaluate(()=>[window.fcReviewApprovalCurrent(),window.fcSectionStatus('S16'),window.fcGetDocumentStatus()]);
 assert.deepEqual(invalidated,[false,'progress','Proyecto en revisión']);
 console.log('INTEGRAL_CLOSURE_PASS');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
