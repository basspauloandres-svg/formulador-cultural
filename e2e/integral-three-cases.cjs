/* Three synthetic project snapshots: regression of actual integrated engines.
 * Seeded states are NOT evidence of independent teacher-led completion. */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ORIGIN='http://127.0.0.1:8765';
const cases=[
 {id:'Q07-A',title:'Taller musical de prueba',city:'Villamaría',dept:'Caldas',idea:'Quiero organizar talleres musicales con recursos limitados.',problem:'Acceso limitado a encuentros de formación musical',cause:'Disponibilidad limitada de espacios de formación',objective:'Ampliar las oportunidades de formación musical',specific:'Organizar espacios de formación musical',result:'Cuatro talleres musicales realizados',activity:'Realizar talleres musicales',quantity:4,rate:50000,condition:'recursos limitados',gap:'[POR VERIFICAR] Disponibilidad real de recursos.'},
 {id:'Q07-B',title:'Circulación artística de prueba',city:'Quibdó',dept:'Chocó',idea:'Quiero organizar una muestra artística, pero desconozco cuántas personas asistirían.',problem:'Escasas oportunidades de circulación artística',cause:'Espacios de presentación insuficientes',objective:'Ampliar las oportunidades de circulación artística',specific:'Organizar espacios de presentación',result:'Dos muestras artísticas realizadas',activity:'Realizar muestras artísticas',quantity:2,rate:null,condition:'información incompleta',gap:'[POR VERIFICAR] Población y tarifa desconocidas.'},
 {id:'Q07-C',title:'Memoria cultural de prueba',city:'Leticia',dept:'Amazonas',idea:'Quiero construir un archivo de memoria cultural con testimonios que presentan diferencias.',problem:'Documentación fragmentaria de memorias culturales',cause:'Registros comunitarios dispersos',objective:'Organizar un archivo comunitario de memorias',specific:'Documentar versiones de memorias culturales',result:'Tres encuentros de documentación realizados',activity:'Realizar encuentros de documentación',quantity:3,rate:40000,condition:'evidencia contradictoria',gap:'[POR VERIFICAR] Dos relatos sintéticos discrepan sobre la fecha; conservar ambas versiones.'}
];
function seed(c){
 const act={id:'A1',resultId:'R1',objectiveId:'C1',text:c.activity,confirmed:true};
 const result={id:'R1',objectiveId:'C1',text:c.result,confirmed:true};
 const indicators=['Actividad','Resultado','Objetivo'].map((linkedType,i)=>({id:'I'+i,linkedType,linkedId:['A1','R1','P1'][i],indicator:'Número de encuentros realizados',formula:'Conteo de actas',lineaBase:'0',meta:String(c.quantity),unidad:'Encuentros',periodicidad:'Mensual',medioVerificacion:'Actas sintéticas',confirmed:true,selected:true}));
 const budget={id:'B1',activityId:'A1',activityText:c.activity,description:'Acompañamiento de encuentros',unit:'Encuentro',quantity:c.quantity,frequency:1,unitCost:c.rate,totalCost:c.rate===null?null:c.quantity*c.rate,costType:'Monetario',fundingSource:'Aporte hipotético',confirmed:c.rate!==null};
 return {S01:{idea_inicial_usuario:c.idea,nombre_del_proyecto:c.title,pais:'Colombia',departamento:c.dept,municipio:c.city,entidad_u_organizacion:'Organización ficticia de ensayo',responsable:'Rol de coordinación ficticio'},
 S02:{territorio_o_lugar_de_intervencion:c.city+', '+c.dept,caracteristicas_culturales:c.gap},S03:{poblacion_afectada:'Participantes hipotéticos',cantidad_estimada:'[POR VERIFICAR]'},S04:{evidencia_disponible:c.gap,datos_por_verificar:c.gap,fuentes:'Material sintético; ninguna fuente primaria verificada'},
 S05:{situaciones_observables:c.problem},S06:{justificacion:'Juicios hipotéticos, sin inferencia causal demostrada'},S07:{tree_state:{nodes:[{id:'P1',zone:'central',text:c.problem,origin:'S05',reviewed:true},{id:'C1',zone:'direct_cause',text:c.cause,parentId:'P1',reviewed:true}]}},S08:{enunciado:c.problem},S09:{objectives_state:{items:[{id:'P1',zone:'central',text:c.objective,sourceText:c.problem,confirmed:true},{id:'C1',zone:'direct_cause',text:c.specific,sourceText:c.cause,parentId:'P1',confirmed:true}]}},
 S10:{completion_state:{items:[{id:'ALT1',text:c.activity,sourceIds:['C1'],confirmed:true,selected:true}]}},S11:{results_state:{items:[result]},completion_state:{items:[act]}},S12:{completion_state:{items:indicators}},S13:{schedule_state:{items:[{id:'SCH1',activityId:'A1',activityText:c.activity,startDate:'2026-12-01',endDate:'2026-12-31',responsible:'Coordinación ficticia',dependencyIds:[],confirmed:true}]}},S14:{budget_state:{items:[budget],activityStatus:{A1:'cost'}}},S15:{risk_state:{items:[],assessments:{}}},S16:{revision_final:'Pendiente de revisión humana independiente'}};
}
(async()=>{
 const browser=await chromium.launch();const reports=[];
 fs.mkdirSync('test-results/integral',{recursive:true});
 try{
  for(const c of cases){
   const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:900},acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===ORIGIN||u.hostname==='cdn.jsdelivr.net'?r.continue():r.abort()});
   await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#vtWelcome').waitFor();
   await page.locator('#vtContinueTop').click();
   const input=seed(c);
   // Seed only in the ephemeral browser, never a real user's storage.
   const audit=await page.evaluate(({input,c})=>{
    for(const k of Object.keys(draft))delete draft[k];
    Object.assign(draft,input);
    localStorage.setItem(storeKey,JSON.stringify(draft));
    const before=JSON.stringify(draft),snap=window.fcGetProjectSnapshot(),integrity=window.fcGetProjectIntegrityReport();
    const broken=JSON.parse(JSON.stringify(snap));broken.derived.activities.push({id:'ORPHAN',resultId:'MISSING'});
    const negative=window.fcAuditProjectSnapshot(broken);
    const budget=window.fcBudgetAudit(input.S14.budget_state);
    const schedule=window.fcAuditSchedule(input.S13.schedule_state);
    const cycle=window.fcAuditSchedule({items:[{activityId:'A',startDate:'2026-12-01',endDate:'2026-12-02',responsible:'QA',dependencyIds:['A']}]});
    const coherence=window.fcGetCoherenceReport();
    const status=window.fcGetDocumentStatus();
    const payload=window.fcProjectDocumentPayload();
    return {snapshotSections:Object.keys(snap.sections).length,integrity,negative,budget,schedule,cycle,coherence,status,payload,mutated:before!==JSON.stringify(draft),approval:window.fcReviewApprovalCurrent()};
   },{input,c});
   assert.equal(audit.snapshotSections,16);
   assert.equal(audit.negative.ok,false);
   assert(audit.negative.issues.some(x=>x.kind==='RESULTADO_AUSENTE'));
   assert.equal(audit.budget.items[0].calculated,c.rate===null?null:c.quantity*c.rate);
   assert.equal(audit.schedule.length,0);assert(audit.cycle.length>0);
   assert.equal(audit.approval,false);assert.equal(audit.status,'Proyecto en revisión');
   assert.equal(audit.mutated,false);
   assert.equal(audit.payload.title,c.title);
   assert(audit.payload.evidence.includes(c.gap));
   for(const ext of ['pdf','docx']){
    const resp=await page.request.post(ORIGIN+'/documents/'+ext,{data:audit.payload});
    assert.equal(resp.status(),200);const bytes=await resp.body();
    assert(bytes.length>1000);assert.equal(bytes.subarray(0,ext==='pdf'?4:2).toString(),ext==='pdf'?'%PDF':'PK');
    fs.writeFileSync('test-results/integral/'+c.id+'.'+ext,bytes);
   }
   await page.reload({waitUntil:'domcontentloaded'});
   const reopened=await page.evaluate(()=>JSON.parse(localStorage.getItem(storeKey)));
   assert.equal(reopened.S01.idea_inicial_usuario,c.idea);
   assert.equal(reopened.S04.datos_por_verificar,c.gap);
   assert.deepEqual(errors,[]);
   const {payload,...observed}=audit;
   reports.push({id:c.id,condition:c.condition,observed,reviewers:[null,null],human_status:'INSUFFICIENT_EVIDENCE',scope:'seeded integration; not teacher-led end-to-end'});
   console.log('INTEGRAL_CASE_PASS',c.id,JSON.stringify({status:audit.status,integrity:audit.integrity.ok,coherence:audit.coherence.score,budget:audit.budget.summary,model_calls:0}));
   await context.close();
  }
 }finally{await browser.close();fs.writeFileSync('test-results/integral/report.json',JSON.stringify(reports,null,2))}
 assert.equal(reports.length,3);
 console.log('INTEGRAL_SEEDED_REGRESSION_PASS');
})().catch(e=>{console.error(e);process.exit(1)});
