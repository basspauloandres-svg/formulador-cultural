const fs=require('fs');
const {JSDOM}=require('jsdom');

function assert(ok,msg){if(!ok)throw new Error(msg)}
const html=fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/gi,'');
const dom=new JSDOM(html,{url:'https://example.test/formulador-cultural/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window,errors=[];
w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.requestAnimationFrame=cb=>setTimeout(cb,0);w.HTMLElement.prototype.scrollIntoView=()=>{};
w.addEventListener('error',e=>errors.push(e.error||e.message));

const legacyDraft={
 S01:{nombre_del_proyecto:'Proyecto de prueba de compatibilidad',entidad_u_organizacion:'Entidad',municipio:'Municipio'},
 S05:{situaciones_observables:'Situación A\nSituación B\nSituación C'},
 S07:{tree_state:{updatedAt:'2026-10-06T10:00:00Z',nodes:[
   {id:'P1',text:'Problema principal de prueba',zone:'central',parentId:null,origin:'S05',reviewed:true},
   {id:'P2',text:'Causa directa de prueba',zone:'direct_cause',parentId:'P1',origin:'S05',reviewed:true},
   {id:'P3',text:'Efecto directo de prueba',zone:'direct_effect',parentId:'P1',origin:'S05',reviewed:true}
 ]}},
 S09:{objetivo_central:'Objetivo antiguo',medios_directos:'Medio antiguo',objectives_state:{items:[],sourceSignature:'',updatedAt:null}},
 S10:{completion_state:{sourceSignature:'legacy',items:[
   {id:'A1',title:'Alternativa histórica 1',text:'Alternativa histórica conservada',sourceIds:['P2'],scores:{pertinencia:2,viabilidad:2,evidencia:1,alcance:2},selected:false,confirmed:false,note:''},
   {id:'A2',title:'Alternativa histórica 2',text:'Segunda alternativa histórica',sourceIds:['P2'],scores:{pertinencia:1,viabilidad:2,evidencia:1,alcance:1},selected:false,confirmed:false,note:''}
 ],updatedAt:'2026-10-06T10:10:00Z'}},
 S11:{results_state:{items:[],sourceSignature:'',updatedAt:null},completion_state:{items:[],sourceSignature:'',updatedAt:null}},
 S12:{completion_state:{items:[],sourceSignature:'',updatedAt:null}},
 S13:{schedule_state:{items:[],sourceSignature:'',updatedAt:null}},
 S14:{budget_state:{items:[],activityStatus:{},sourceSignature:'',updatedAt:null}},
 S15:{risk_state:{items:[],targets:[],assessments:{},sourceSignature:'',updatedAt:null}}
};
w.localStorage.setItem('formulador-cultural-prototipo-v1',JSON.stringify(legacyDraft));
w.localStorage.setItem('fc_active','S08');

const chain=()=>{const o={select:()=>o,order:()=>o,limit:()=>Promise.resolve({data:[],error:null}),eq:()=>o,maybeSingle:()=>Promise.resolve({data:null,error:null}),single:()=>Promise.resolve({data:null,error:null}),insert:()=>o,update:()=>o,upsert:()=>Promise.resolve({data:null,error:null}),delete:()=>o};return o};
w.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange:()=>{},signInWithPassword:()=>Promise.resolve({error:null}),signUp:()=>Promise.resolve({data:{},error:null}),signInWithOtp:()=>Promise.resolve({error:null}),updateUser:()=>Promise.resolve({error:null}),signOut:()=>Promise.resolve()},from:()=>chain()})};
w.XLSX={utils:{book_new:()=>({}),json_to_sheet:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};

const scripts=['preboot.js','app.js','sections_extension.js','guidance.js','evidence.js','s05_preflight.js','vester.js','causal_validation.js','decision_guidance.js','simple_causal_ui.js','tree_validation_bridge.js','tree.js','synthesis.js','visualization.js','s07_front.js','simple_tree_ui.js','semantic_writing.js','objectives.js','workflow.js','completion.js','planning.js','results_layer.js','coherence_engine.js','export_completion.js','deliverables.js','visual_exports_ui.js','review_dashboard.js','completion_bridge.js','guided_experience.js'];
for(const file of scripts){const s=w.document.createElement('script');s.textContent=fs.readFileSync(file,'utf8');w.document.body.appendChild(s)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 await wait(120);
 if(errors.length)throw errors[0];

 await w.fcNavigate('S10');await wait(80);
 assert(w.fcGetAlternatives().length===2,'S10 borró alternativas históricas antes de confirmar S09');

 await w.fcNavigate('S09');await wait(100);
 let stored=JSON.parse(w.localStorage.getItem('formulador-cultural-prototipo-v1'));
 assert((stored.S09.objectives_state?.items||[]).length===3,'S09 no reconstruyó objetivos desde el árbol existente');

 const ids=(stored.S09.objectives_state.items||[]).map(x=>x.id);
 for(let i=0;i<ids.length;i++){
   const id=ids[i],ta=w.document.querySelector('[data-obj-text="'+id+'"]'),b=w.document.querySelector('[data-confirm="'+id+'"]');
   assert(ta&&b,'No se encontraron controles para revisar el objetivo '+id);
   if(/^\s*\[POR REVISAR\]/i.test(ta.value)){
     ta.value='Redacción manual verificable para el elemento de prueba.';
     ta.dispatchEvent(new w.Event('input',{bubbles:true}));
   }
   b.click();await wait(25);
   if(i<ids.length-1){const next=w.document.querySelector('#objectiveNext');assert(next,'No existe navegación al siguiente objetivo');next.click();await wait(25)}
 }
 stored=JSON.parse(w.localStorage.getItem('formulador-cultural-prototipo-v1'));
 assert(stored.S09.objectives_state.items.every(x=>x.confirmed),'No se confirmaron las formulaciones de S09');

 await w.fcNavigate('S10');await wait(80);
 const alts=w.fcGetAlternatives();
 assert(alts.length>=1,'S10 no produjo alternativas tras confirmar objetivos');
 const first=alts[0];
 let confirm=w.document.querySelector('[data-alt-confirm="'+first.id+'"]');assert(confirm,'No existe confirmación de alternativa');confirm.click();await wait(25);
 let select=w.document.querySelector('[data-alt-select="'+first.id+'"]');assert(select,'No existe selección de alternativa');select.click();await wait(40);

 await w.fcNavigate('S11');await wait(100);
 let resultBtn=w.document.querySelector('[data-result-confirm]');
 assert(resultBtn,'S11 no presentó resultados para aprobación');
 let resultText=w.document.querySelector('[data-result-text]');
 if(resultText&&/^\s*\[POR REVISAR\]/i.test(resultText.value)){resultText.value='Resultado verificable redactado manualmente para la prueba.';resultText.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(20)}
 resultBtn=w.document.querySelector('[data-result-confirm]');resultBtn.click();await wait(100);
 const results=w.fcGetResults().filter(x=>x.confirmed);
 assert(results.length>=1,'No quedó un resultado confirmado');
 const activities=w.fcGetActivities();
 assert(activities.length>=1,'No se generaron actividades desde el resultado confirmado');
 assert(activities.every(x=>x.resultId),'Existe actividad propuesta sin resultId');
 assert(activities.every(x=>results.some(r=>r.id===x.resultId)),'Una actividad no deriva de un resultado confirmado');

 let actBtn=w.document.querySelector('[data-act-confirm]');
 assert(actBtn,'No existe control para confirmar actividad');
 let actText=w.document.querySelector('[data-act-text]');
 if(actText&&/^\s*\[POR REVISAR\]/i.test(actText.value)){actText.value='Realizar una actividad concreta y verificable para producir el resultado.';actText.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(20)}
 actBtn=w.document.querySelector('[data-act-confirm]');actBtn.click();await wait(60);
 const confirmedActs=w.fcGetActivities().filter(x=>x.confirmed);
 assert(confirmedActs.length>=1,'No quedó actividad confirmada');

 await w.fcNavigate('S12');await wait(80);
 const indicators=w.fcGetIndicators();
 assert(indicators.some(x=>x.linkedType==='Actividad'),'S12 no propuso indicador de actividad');
 assert(indicators.some(x=>x.linkedType==='Resultado'),'S12 no propuso indicador de resultado');
 assert(indicators.some(x=>x.linkedType==='Objetivo'),'S12 no propuso indicador del objetivo general');
 assert(indicators.filter(x=>x.linkedType==='Actividad').length>=1,'S12 perdió la batería de indicadores de actividad');
 assert(indicators.some(x=>x.indicatorFamily),'S12 no conserva la familia/dimensión del indicador');
 assert(indicators.every(x=>x.indicatorId||x.id),'S12 generó indicadores sin identificador estable');

 await w.fcNavigate('S13');await wait(60);
 assert(w.fcGetSchedule().length===confirmedActs.length,'S13 no creó un ítem de cronograma por actividad confirmada');

 await w.fcNavigate('S14');await wait(60);
 assert(w.fcGetBudgetState().activityStatus[confirmedActs[0].id]==='pending','S14 no inicializó la decisión financiera de la actividad');

 await w.fcNavigate('S15');await wait(60);
 assert((w.fcGetRiskState().targets||[]).length>=1,'S15 no creó objetivos de revisión de riesgo');
 const riskYes=w.document.querySelector('[data-risk-assess="yes"]');assert(riskYes,'S15 no muestra la decisión de registrar riesgo');riskYes.click();await wait(40);
 const riskValues={event:'Posible demora en una actividad crítica',effect:'Puede retrasar el resultado esperado',preventiveResponse:'Revisar anticipadamente disponibilidad y dependencias',contingencyResponse:'Reprogramar la actividad y reasignar recursos',owner:'Responsable de proyecto',trigger:'Retraso superior a una semana'};
 for(const [k,v] of Object.entries(riskValues)){const el=w.document.querySelector('[data-risk="'+k+'"]');assert(el,'Falta el campo de riesgo '+k);el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))}
 const confirmRisk=w.document.querySelector('#confirmRisk');assert(confirmRisk,'No existe botón Confirmar riesgo');confirmRisk.click();await wait(60);
 assert((w.fcGetRiskState().items||[]).some(x=>x.confirmed),'Confirmar riesgo no dejó ningún riesgo confirmado');

 await w.fcNavigate('S07');await wait(60);
 const easy=w.document.querySelector('[data-tree-help="easy"]');assert(easy,'S07 no muestra Explícame fácil');easy.click();await wait(20);
 const assist=w.document.querySelector('#treeAssist');assert(assist&&!assist.classList.contains('hidden')&&/Ayuda para razonar/.test(assist.textContent),'El botón Explícame fácil no produce respuesta visible');
 const causesBtn=w.document.querySelector('[data-tree-phase="direct_cause"]');assert(causesBtn,'S07 no muestra Revisar causas');causesBtn.click();await wait(20);
 assert(w.document.querySelector('#treeBody'),'Revisar causas no mantiene una vista activa del árbol');

 await w.fcNavigate('S16');await wait(80);
 assert(w.document.querySelector('.review-dashboard'),'S16 no renderizó el panel final');
 assert(typeof w.fcTreeSvg==='function'&&/^<svg/.test(w.fcTreeSvg('problem')),'No se pudo generar SVG del árbol de problemas');
 assert(typeof w.fcProjectReportHTML==='function'&&/Proyecto de prueba/.test(w.fcProjectReportHTML()),'No se pudo construir el documento final HTML');
 assert(typeof w.fcExportCompleteWorkbook==='function','No está disponible la exportación técnica Excel');
 assert(typeof w.fcExportProjectDOCX==='function'&&typeof w.fcExportProjectPDF==='function','No están disponibles las exportaciones documentales');

 if(errors.length)throw errors[0];
 console.log('Project compatibility test OK');
 w.close();process.exit(0);
})().catch(e=>{console.error(e);try{w.close()}catch{}process.exit(1)});
