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

const scripts=['preboot.js','app.js','sections_extension.js','guidance.js','evidence.js','s05_preflight.js','vester.js','causal_validation.js','decision_guidance.js','simple_causal_ui.js','tree_validation_bridge.js','tree.js','synthesis.js','visualization.js','s07_front.js','simple_tree_ui.js','semantic_writing.js','data_cleanup.js','objectives.js','workflow.js','completion.js','planning.js','results_layer.js','coherence_engine.js','export_completion.js','deliverables.js','visual_exports_ui.js','review_dashboard.js','completion_bridge.js','guided_experience.js'];
for(const file of scripts){const s=w.document.createElement('script');s.textContent=fs.readFileSync(file,'utf8');w.document.body.appendChild(s)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 await wait(120);
 const completionSource=fs.readFileSync('completion.js','utf8');
 assert(completionSource.includes("data-ind-skip"),'S12 no permite descartar propuestas de la batería');
 assert(completionSource.includes("selected=true"),'S12 no registra explícitamente los indicadores elegidos');
 assert(completionSource.includes("definitionStatus='NO_SELECCIONADO'"),'S12 no distingue propuestas descartadas de indicadores pendientes');
 const guidedSource=fs.readFileSync('guided_experience.js','utf8');
 assert(guidedSource.includes("covered===groups.size"),'El recorrido sigue exigiendo confirmar toda la batería de S12');
 assert(guidedSource.includes("prior.some(x=>state(x)!=='complete')"),'S16 no retrocede cuando una dependencia previa deja de estar completa');
 const coherenceSource=fs.readFileSync('coherence_engine.js','utf8');
 assert(coherenceSource.includes("x.selected!==false"),'La coherencia sigue tratando propuestas no seleccionadas como indicadores obligatorios');

 const planningSource=fs.readFileSync('planning.js','utf8');
 assert(planningSource.includes("scheduleActivityLabel(x,16)")&&planningSource.includes("activitySynthesisFromResult"),'S13 vuelve a mostrar la actividad completa en lugar de una síntesis operativa');
 const completionGuidanceSource=fs.readFileSync('completion.js','utf8');
 assert(completionGuidanceSource.includes("Pregunta para resolverlo")&&completionGuidanceSource.includes("Criterio de decisión"),'S12 no ofrece orientación operativa para resolver campos técnicos pendientes');
 assert(completionGuidanceSource.includes("indicatorResolutionHint"),'S12 perdió la guía específica por campo técnico');

 const completionMigrationSource=fs.readFileSync('completion.js','utf8');
 assert(completionMigrationSource.includes("s11-migration-v2"),'S11 no fuerza la migración de actividades históricas');
 assert(completionMigrationSource.includes("activitySynthesisFromResult"),'S11 no sintetiza actividades históricas extensas');
 assert(completionMigrationSource.includes("migrationOnly=x.type==='Actividad'"),'S12 desconfirma indicadores por una migración editorial de actividad');
 const planningMigrationSource=fs.readFileSync('planning.js','utf8');
 assert(planningMigrationSource.includes("compactLabel(y.activityText,16)"),'La tabla S13 vuelve a mostrar etiquetas de actividad demasiado extensas');

 const completionApprovalSource=fs.readFileSync('completion.js','utf8');
 assert(completionApprovalSource.includes('Aprobar este indicador'),'S12 no ofrece aprobación explícita por indicador');
 assert(completionApprovalSource.includes('Reabrir para editar la definición')&&completionApprovalSource.includes('data-ind-reopen'),'S12 no permite reabrir una aprobación individual');
 assert(completionApprovalSource.includes('indicator-approval-progress'),'S12 no muestra el avance de aprobación por batería');
 const reviewDualSource=fs.readFileSync('review_dashboard.js','utf8');
 assert(reviewDualSource.includes('Ausencias y pendientes'),'S16 no separa el control de ausencias');
 assert(reviewDualSource.includes('Coherencia metodológica'),'S16 no separa el control de coherencia');
 assert(reviewDualSource.includes('coherenceIssues'),'S16 no calcula rupturas de coherencia de forma independiente');

 const completionHelpSource=fs.readFileSync('completion.js','utf8');
 assert(completionHelpSource.includes('Indicador aprobado ✓'),'S12 no comunica con claridad que la definición ya está aprobada');
 assert(completionHelpSource.includes('Pregunta para resolverlo'),'La ayuda de S12 sigue siendo explicativa y no orienta una decisión concreta');
 assert(completionHelpSource.includes('Reabrir para editar la definición'),'S12 no separa aprobación de edición posterior');
 assert(completionHelpSource.includes('indicatorNoProposalText'),'S12 no distingue ausencia de propuesta de ausencia de orientación');

 const planningOrderSource=fs.readFileSync('planning.js','utf8');
 assert(planningOrderSource.includes('Orden de las actividades'),'S13 perdió la sección visible para ordenar actividades');
 assert(planningOrderSource.includes('data-order-up')&&planningOrderSource.includes('data-order-down'),'S13 no permite modificar la secuencia general de actividades');
 assert(planningOrderSource.includes('Orden y dependencias de esta actividad'),'S13 no presenta dependencias como una decisión explícita');
 assert(planningOrderSource.includes('moveScheduleItem'),'S13 no persiste el reordenamiento de actividades');
 assert(!planningOrderSource.includes("</label></div>'+\n '<details><summary>¿Necesita que otra actividad termine antes?"),'S13 conserva la estructura HTML mal cerrada que ocultaba dependencias');

 if(errors.length)throw errors[0];

 let cleaned=JSON.parse(w.localStorage.getItem('formulador-cultural-prototipo-v1'));
 assert((cleaned.S10.completion_state?.archivedItems||[]).length===2,'La depuración no archivó las alternativas históricas no confirmadas');
 assert((cleaned.S10.completion_state?.items||[]).length===0,'Las propuestas históricas pendientes siguen interfiriendo con el flujo activo');

 await w.fcNavigate('S08');await wait(100);
 const finalProblem=w.document.querySelector('#finalProblem');assert(finalProblem,'S08 no muestra la formulación final editable');
 finalProblem.value='Problema central confirmado para prueba integral.';
 finalProblem.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(25);
 let storedS08=JSON.parse(w.localStorage.getItem('formulador-cultural-prototipo-v1'));
 assert(storedS08.S08?.synthesis_state?.final==='Problema central confirmado para prueba integral.','S08 no guarda el borrador mientras se escribe');
 const confirmS08=w.document.querySelector('#confirmFinal');assert(confirmS08,'S08 no muestra Guardar y continuar a S09');
 confirmS08.click();await wait(120);
 storedS08=JSON.parse(w.localStorage.getItem('formulador-cultural-prototipo-v1'));
 assert(storedS08.S08?.enunciado==='Problema central confirmado para prueba integral.','S08 no guardó el enunciado confirmado');
 assert(storedS08.S08?.synthesis_state?.confirmed===true,'S08 no quedó confirmada');
 assert(w.localStorage.getItem('fc_active')==='S09'||w.document.querySelector('#counter')?.textContent.startsWith('S09'),'S08 no avanzó a S09');

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
 let altText=w.document.querySelector('[data-alt-text="'+first.id+'"]');
 if(altText&&/^\s*\[POR REVISAR\]/i.test(altText.value)){altText.value='Estrategia verificable de prueba para alcanzar el objetivo específico.';altText.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(25)}
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
 assert(confirmedActs.every(x=>x.context&&typeof x.context==='object'),'Las actividades confirmadas no conservan contexto estructurado separado');
 assert(confirmedActs.every(x=>w.fcWriting.activityWritingReview(x.text).ok),'El flujo integral confirmó una actividad semánticamente extensa');
 assert(confirmedActs.every(x=>x.context&&typeof x.context==='object'),'Las actividades confirmadas no conservan contexto estructurado separado');

 const addAct=w.document.querySelector('#addAct');assert(addAct,'S11 no muestra el control para añadir otra actividad');addAct.click();await wait(50);
 const allActsAfterAdd=w.fcGetActivities();
 const added=allActsAfterAdd[allActsAfterAdd.length-1];
 assert(added&&added.provenance==='actividad_adicional','S11 no creó una actividad adicional trazable');
 assert(added.resultId===confirmedActs[0].resultId,'La actividad adicional perdió el resultId del contexto actual');
 assert(added.objectiveId===confirmedActs[0].objectiveId,'La actividad adicional perdió el objectiveId del contexto actual');
 const helpPanel=w.document.querySelector('[data-act-help-panel="'+added.id+'"]');
 assert(helpPanel&&!helpPanel.classList.contains('hidden'),'La actividad adicional no abrió automáticamente la asistencia contextual');
 assert(/Resultado que debe producirse/.test(helpPanel.textContent)&&helpPanel.textContent.includes(added.resultText),'La ayuda de la actividad adicional no muestra el resultado real');

 await w.fcNavigate('S12');await wait(80);
 const firstCompletionHelp=w.document.querySelector('[data-open-indicator-completion]');
 assert(firstCompletionHelp,'S12 no muestra el control para completar datos pendientes con ayuda');
 firstCompletionHelp.click();await wait(35);
 assert(w.document.querySelector('[data-indicator-completion-panel]')&&!w.document.querySelector('[data-indicator-completion-panel]').classList.contains('hidden'),'S12 no abre la guía de datos pendientes');
 const indicators=w.fcGetIndicators();
 assert(indicators.some(x=>x.linkedType==='Actividad'),'S12 no propuso indicador de actividad');
 assert(indicators.some(x=>x.linkedType==='Resultado'),'S12 no propuso indicador de resultado');
 assert(indicators.some(x=>x.linkedType==='Objetivo'),'S12 no propuso indicador del objetivo general');
 assert(indicators.filter(x=>x.linkedType==='Actividad').length>=1,'S12 perdió la batería de indicadores de actividad');
 assert(indicators.some(x=>x.indicatorFamily),'S12 no conserva la familia/dimensión del indicador');
 assert(indicators.every(x=>x.indicatorId||x.id),'S12 generó indicadores sin identificador estable');

 for(let i=0;i<indicators.length;i++){
   let current=w.fcGetIndicators()[i],ta=w.document.querySelector('[data-ind-field="'+current.id+':indicator"]');
   if(ta&&/^\s*\[POR REVISAR\]/i.test(ta.value)){ta.value='Indicador verificable de prueba '+(i+1);ta.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(25)}
   const use=w.document.querySelector('[data-ind-confirm]');assert(use,'S12 no muestra el control específico de aprobación para el indicador '+(i+1));use.click();await wait(35);
   assert(w.fcGetIndicators()[i].confirmed,'S12 no registró la aprobación individual del indicador '+(i+1));
   const next=w.document.querySelector('#indNext');assert(next,'S12 no muestra navegación después de aprobar el indicador '+(i+1));next.click();await wait(45);
  }
  assert(w.localStorage.getItem('fc_active')==='S13'||w.document.querySelector('#counter')?.textContent.startsWith('S13'),'S12 no avanzó a S13 después de aprobar y recorrer todos los indicadores');
 assert(w.fcGetIndicators().every(x=>x.confirmed),'S12 no confirmó todos los indicadores durante el recorrido asistido');
 assert(w.fcGetIndicators().every(x=>x.definitionStatus==='DEFINIDO'),'S12 no registró el estado DEFINIDO de los indicadores confirmados');
 assert(w.fcGetIndicators().some(x=>x.technicalStatus==='PENDIENTE'),'S12 confundió definición confirmada con ficha técnica completa');
 assert(w.fcGetIndicators().filter(x=>x.technicalStatus==='PENDIENTE').every(x=>x.verificationStatus==='POR_VERIFICAR'),'S12 no conserva POR_VERIFICAR en fichas técnicas incompletas');

 await wait(60);
 assert(w.fcGetSchedule().length===confirmedActs.length,'S13 no creó un ítem de cronograma por actividad confirmada');
 assert(w.fcGetSchedule().every(x=>x.activityText===w.fcGetActivities().find(a=>a.id===x.activityId)?.text),'S13 conserva una copia textual obsoleta de la actividad');
 const start=w.document.querySelector('[data-sch="startDate"]'),responsible=w.document.querySelector('[data-sch="responsible"]');
 assert(start&&responsible,'S13 no muestra fecha y responsable para reconciliar indicadores');
 start.value='2026-10-07';start.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(30);
 const responsible2=w.document.querySelector('[data-sch="responsible"]');responsible2.value='Responsable de prueba';responsible2.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(30);
 const confirmSchedule=w.document.querySelector('#confirmSchedule');assert(confirmSchedule,'S13 no muestra Confirmar esta actividad');confirmSchedule.click();await wait(50);
 const activityIndicatorAfterSchedule=w.fcGetIndicators().find(x=>x.linkedType==='Actividad'&&x.activityId===confirmedActs[0].id);
 assert(activityIndicatorAfterSchedule?.scheduleReconciliation?.fields?.responsable?.value==='Responsable de prueba','S13 no propuso el responsable confirmado para el indicador');
 assert(activityIndicatorAfterSchedule?.scheduleReconciliation?.fields?.plazo?.value,'S13 no propuso el plazo confirmado para el indicador');
 assert(/^\[POR VERIFICAR\]/.test(activityIndicatorAfterSchedule.responsable),'La reconciliación sobrescribió silenciosamente el responsable del indicador');
 assert(/^\[POR VERIFICAR\]/.test(activityIndicatorAfterSchedule.plazo),'La reconciliación sobrescribió silenciosamente el plazo del indicador');

 await w.fcNavigate('S14');await wait(60);
 assert(w.fcGetBudgetState().activityStatus[confirmedActs[0].id]==='pending','S14 no inicializó la decisión financiera de la actividad');

 await w.fcNavigate('S15');await wait(60);
 assert((w.fcGetRiskState().targets||[]).length>=1,'S15 no creó objetivos de revisión de riesgo');
 const riskYes=w.document.querySelector('[data-risk-assess="yes"]');assert(riskYes,'S15 no muestra la decisión de registrar riesgo');riskYes.click();await wait(40);
 const riskValues={event:'Posible demora en una actividad crítica',effect:'Puede retrasar el resultado esperado',preventiveResponse:'Revisar anticipadamente disponibilidad y dependencias',contingencyResponse:'Reprogramar la actividad y reasignar recursos',owner:'Responsable de proyecto',trigger:'Retraso superior a una semana'};
 for(const [k,v] of Object.entries(riskValues)){const el=w.document.querySelector('[data-risk="'+k+'"]');assert(el,'Falta el campo de riesgo '+k);el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))}
 const confirmRisk=w.document.querySelector('#confirmRisk');assert(confirmRisk,'No existe botón Confirmar riesgo');confirmRisk.click();await wait(60);
 assert((w.fcGetRiskState().items||[]).some(x=>x.confirmed),'Confirmar riesgo no dejó ningún riesgo confirmado');

 const totalRiskTargets=(w.fcGetRiskState().targets||[]).length;
 for(let i=1;i<totalRiskTargets;i++){
   const next=w.document.querySelector('#riskNext');assert(next,'S15 perdió el botón Siguiente');next.click();await wait(35);
   const no=w.document.querySelector('[data-risk-assess="no"]');assert(no,'S15 no permite resolver sin riesgo el elemento '+(i+1));no.click();await wait(35);
 }
 const finishRisks=w.document.querySelector('#riskNext');assert(finishRisks,'S15 no muestra el control final de avance');
 assert(/Continuar a S16/.test(finishRisks.textContent),'El último paso de S15 no explica que continúa a S16');
 finishRisks.click();await wait(80);
 assert(w.localStorage.getItem('fc_active')==='S16'||w.document.querySelector('#counter')?.textContent.startsWith('S16'),'S15 no avanzó a S16 después de completar la revisión de riesgos');

 await w.fcNavigate('S07');await wait(60);
 const easy=w.document.querySelector('[data-tree-help="easy"]');assert(easy,'S07 no muestra Explícame fácil');easy.click();await wait(20);
 const assist=w.document.querySelector('#treeAssist');assert(assist&&!assist.classList.contains('hidden')&&/Ayuda para razonar/.test(assist.textContent),'El botón Explícame fácil no produce respuesta visible');
 const causesBtn=w.document.querySelector('[data-tree-phase="direct_cause"]');assert(causesBtn,'S07 no muestra Revisar causas');causesBtn.click();await wait(20);
 assert(w.document.querySelector('#treeBody'),'Revisar causas no mantiene una vista activa del árbol');

 await w.fcNavigate('S16');await wait(80);
 assert(w.document.querySelector('.review-dashboard'),'S16 no renderizó el panel final');
 assert(w.document.querySelector('#saveReviewProgress'),'S16 no muestra Guardar avance');
 assert(/Cómo usar esta pantalla/.test(w.document.querySelector('.review-dashboard').textContent),'S16 no explica cómo trabajar los pendientes');
 const concretePending=w.document.querySelector('[data-focus-indicator]');
 assert(concretePending,'S16 no muestra un indicador pendiente específico');
 const targetIndicator=concretePending.dataset.focusIndicator;
 const pendingCard=concretePending.closest('.review-pending-card');
 assert(pendingCard&&/Falta:/.test(pendingCard.textContent),'S16 no explica qué dato concreto falta en el indicador');
 concretePending.click();await wait(80);
 assert(w.document.querySelector('#counter')?.textContent.startsWith('S12'),'El acceso directo de S16 no abrió S12');
 const currentIndicator=w.fcGetIndicators().find(x=>x.id===targetIndicator||x.indicatorId===targetIndicator);
 assert(currentIndicator,'El indicador objetivo del acceso directo dejó de existir');
 const fieldAssist=w.fcWriting.indicatorFieldAssist(currentIndicator.linkedText||currentIndicator.activityText||'',currentIndicator.linkedType||'Actividad',currentIndicator.indicatorFamily,{},currentIndicator);
 assert(fieldAssist&&typeof fieldAssist==='object','No existe asistencia técnica contextual para completar el indicador');
 const fieldGuide=w.fcWriting.indicatorFieldGuide(currentIndicator.linkedText||currentIndicator.activityText||'',currentIndicator.linkedType||'Actividad',currentIndicator.indicatorFamily,{},currentIndicator);
 assert(fieldGuide?.formula?.meaning&&fieldGuide?.unidad?.write&&fieldGuide?.meta?.meaning,'La ficha técnica no ofrece explicación de principiante por campo');
 const panel=w.document.querySelector('[data-indicator-completion-panel="'+currentIndicator.id+'"]');
 assert(panel&&!panel.classList.contains('hidden'),'S16 no abrió la ayuda de completitud del indicador específico');
 const sharedValidation=w.fcGetCurrentValidationSnapshot();
 assert(sharedValidation&&Array.isArray(sharedValidation.indicatorPending),'No existe la estructura común de validación vigente');
 const reviewSnapshot=w.fcGetReviewSnapshot();
 assert(reviewSnapshot.indicatorPending.length===sharedValidation.indicatorPending.filter(x=>x.definitionPending||x.technicalPending).length,'S16 y coherencia discrepan sobre los indicadores pendientes');
 await w.fcNavigate('S16');await wait(80);
 assert(typeof w.fcTreeSvg==='function'&&/^<svg/.test(w.fcTreeSvg('problem')),'No se pudo generar SVG del árbol de problemas');
 assert(typeof w.fcProjectReportHTML==='function'&&/Proyecto de prueba/.test(w.fcProjectReportHTML()),'No se pudo construir el documento final HTML');
 assert(/Formulador Cultural · Desarrollo por Paulo Olarte/.test(w.fcProjectReportHTML()),'El documento HTML no conserva la huella de autoría');
 const reportHtml=w.fcProjectReportHTML();
 assert(/Priorización de situaciones · Matriz Vester/.test(reportHtml),'El documento final no incluye la matriz Vester como soporte');
 assert(/Tabla resumida/.test(reportHtml)&&/Matriz técnica de indicadores/.test(reportHtml),'El documento final no separa lectura resumida y ficha técnica de indicadores');
 assert(/Cronograma/.test(reportHtml)&&/Recursos y presupuesto/.test(reportHtml),'El documento final perdió cronograma o presupuesto');
 const currentObjectives=w.fcGetObjectives();assert(Array.isArray(currentObjectives)&&currentObjectives.length,'No están disponibles los objetivos vigentes para exportación');
 const confirmedObjective=currentObjectives.find(x=>x.confirmed);if(confirmedObjective)assert(w.fcProjectReportHTML().includes(confirmedObjective.text),'El documento final no usa el objetivo estructurado vigente');
 assert(typeof w.fcExportCompleteWorkbook==='function','No está disponible la exportación técnica Excel');
 assert(typeof w.fcExportProjectDOCX==='function'&&typeof w.fcExportProjectPDF==='function','No están disponibles las exportaciones documentales');
 assert(typeof w.fcProjectDocumentPayload==='function','No existe el payload profesional de documentos');
 const payload=w.fcProjectDocumentPayload();assert(payload&&payload.title&&Array.isArray(payload.indicators)&&Array.isArray(payload.schedule),'El payload profesional no conserva la estructura vigente');
 assert(typeof w.fcGetDocumentGeneratorStatus==='function','No se puede consultar el estado del generador profesional');

 if(errors.length)throw errors[0];
 console.log('Project compatibility test OK');
 w.close();process.exit(0);
})().catch(e=>{console.error(e);try{w.close()}catch{}process.exit(1)});
