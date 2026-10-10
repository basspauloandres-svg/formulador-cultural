(()=>{
const $=s=>document.querySelector(s);const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEYS={S10:'formulador-cultural-alternatives-v1',S11:'formulador-cultural-activities-v1',S12:'formulador-cultural-indicators-v1'};const cursors={S10:0,S11:0,S12:0};const indicatorSteps={};let focusedResultId='';
function read(code){try{return draft?.[code]?.completion_state||JSON.parse(localStorage.getItem(KEYS[code])||'{}')}catch{return {}}}
function write(code,state){state.updatedAt=new Date().toISOString();localStorage.setItem(KEYS[code],JSON.stringify(state));if(typeof draft!=='undefined'){draft[code]=draft[code]||{};draft[code].completion_state=state;localStorage.setItem(storeKey,JSON.stringify(draft))}}
function continueView(target,fallback){
 const run=()=>{const el=(typeof target==='string'?document.querySelector(target):target)||(fallback?(typeof fallback==='string'?document.querySelector(fallback):fallback):null);if(!el)return;try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch{el.scrollIntoView()}};
 requestAnimationFrame(()=>requestAnimationFrame(run))
}
window.fcContinueView=continueView;

function objectives(){try{return draft?.S09?.objectives_state||JSON.parse(localStorage.getItem('formulador-cultural-objectives-v1')||'{}')}catch{return {}}}
function confirmedMeans(){return (objectives().items||[]).filter(x=>x.confirmed&&x.zone==='direct_cause').map(x=>({id:x.id,text:x.text,zone:x.zone,sourceText:x.sourceText||'',confirmed:true}))}
function registeredSpecificObjectives(){const xs=(objectives().items||[]).filter(x=>x.zone==='direct_cause'&&String(x.text||'').trim()).map(x=>({id:x.id,text:x.text,zone:x.zone,sourceText:x.sourceText||'',confirmed:!!x.confirmed}));if(xs.length)return xs;const raw=String(draft?.S09?.medios_directos||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);return raw.map((text,i)=>({id:'legacy-specific-'+(i+1),text,zone:'direct_cause',sourceText:'',confirmed:false}))}
function selectedAlternative(){return (read('S10').items||[]).find(x=>x.selected)||null}
function confirmedActivities(){return (read('S11').items||[]).filter(x=>x.confirmed)}
function confirmedResults(){try{return (draft?.S11?.results_state?.items||JSON.parse(localStorage.getItem('formulador-cultural-results-v1')||'{}').items||[]).filter(x=>x.confirmed)}catch{return []}}
function makeAlternatives(){
 const means=confirmedMeans();
 const items=means.map((m,i)=>({id:`A${i+1}`,title:`Alternativa ${i+1}`,text:'',sourceIds:[m.id],scores:{pertinencia:'',viabilidad:'',evidencia:'',alcance:''},selected:false,confirmed:false,note:''}));
 if(means.length>1)items.push({id:`A${items.length+1}`,title:'Alternativa integrada',text:'',sourceIds:means.map(x=>x.id),scores:{pertinencia:'',viabilidad:'',evidencia:'',alcance:''},selected:false,confirmed:false,note:''});
 for(const x of items){const src=means.filter(m=>(x.sourceIds||[]).includes(m.id)).map(m=>m.text);x.text=window.fcWriting?.strategyProposals?window.fcWriting.strategyProposals(src)[0]:'[POR REVISAR]'}
 return items
}
function sourceMeansForAlternative(x){
 const ids=new Set(x?.sourceIds||[]);return confirmedMeans().filter(m=>ids.has(m.id))
}
function cleanSourceText(v){
 return String(v||'').replace(/^\s*\[POR REVISAR\]\s*/i,'').replace(/^\s*Situación deseada respecto de:\s*/i,'').replace(/^\s*\d+[.)-]?\s*/,'').replace(/\s+/g,' ').trim()
}
function writingProposals(x){
 const src=sourceMeansForAlternative(x).map(m=>cleanSourceText(m.text)).filter(Boolean);
 return window.fcWriting?.strategyProposals?window.fcWriting.strategyProposals(src):['[POR REVISAR]']
}
function ensureS10(){
 let s=read('S10'),means=confirmedMeans(),sig=means.map(x=>`${x.id}:${x.text}`).join('|');
 if(!means.length){
   // La falta temporal de dependencias no autoriza borrar alternativas registradas.
   return s
 }
 if(!s.items||s.sourceSignature!==sig){
   const proposals=makeAlternatives(),existing=Array.isArray(s.items)?s.items:[];
   // La identidad de la alternativa depende de los objetivos vinculados, no de su posición.
   const sourceKey=x=>(x.sourceIds||[]).slice().sort().join('|');
   const existingKeys=new Set(existing.map(sourceKey)),usedIds=new Set(existing.map(x=>x.id));
   let nextId=1;
   const additions=proposals.filter(x=>!existingKeys.has(sourceKey(x))).map(x=>{
     while(usedIds.has('A'+nextId))nextId++;
     const id='A'+nextId++;usedIds.add(id);
     return {...x,id,selected:false,confirmed:false}
   });
   const activeKeys=new Set(proposals.map(sourceKey));
   const retained=existing.map(x=>activeKeys.has(sourceKey(x))?x:{...x,requiresReview:true,reviewReason:'objetivo_no_disponible'});
   s={...s,sourceSignature:sig,items:[...retained,...additions],requiresReview:retained.some(x=>x.requiresReview),updatedAt:null};write('S10',s)
 }
 return s
}
function activityProposals(){
 const alt=selectedAlternative();if(!alt)return[];
 const allowed=new Set(alt.sourceIds||[]),res=confirmedResults().filter(r=>allowed.has(r.objectiveId));
 let out=[];
 for(const r of res){
   const obj=(objectives().items||[]).find(o=>o.id===r.objectiveId)||{};
   const base={objectiveId:r.objectiveId,objectiveText:r.objectiveText||'',causeId:obj.id||r.objectiveId,resultId:r.id,resultText:r.text,status:'propuesta',source:'sistema',provenance:'resultado_confirmado',note:'',context:{objectiveText:r.objectiveText||'',resultText:r.text||''}};
   const proposals=window.fcWriting?.activityProposals?window.fcWriting.activityProposals(r.text,r.objectiveText):['[POR REVISAR] Definir una actividad concreta para: '+r.text];
   proposals.forEach((text,i)=>out.push({...base,id:`ACT-${r.id}-${i+1}`,activityId:`ACT-${r.id}-${i+1}`,text,confirmed:false,updatedAt:null}))
 }
 return out
}
function ensureS11(){
 let s=read('S11'),alt=selectedAlternative(),res=confirmedResults().filter(r=>alt?.sourceIds?.includes(r.objectiveId));
 const sig=alt?`s11-migration-v2|${alt.id}:${(alt.sourceIds||[]).join(',')}|${res.map(r=>r.id+':'+r.text).join('|')}`:'';
 // Dependencias vacías o pendientes requieren revisión explícita, no reconciliación destructiva.
 if((!alt||!res.length)&&Array.isArray(s.items)&&s.items.length)return s;
 if(!s.items||s.sourceSignature!==sig){
   const old=s.items||[],validResultIds=new Set(res.map(r=>r.id)),items=[];
   for(const r of res){
     const obj=(objectives().items||[]).find(o=>o.id===r.objectiveId)||{};
     const existing=old.filter(x=>x.resultId===r.id||(!x.resultId&&x.objectiveId===r.objectiveId));
     if(existing.length){
       const freshForResult=activityProposals().filter(x=>x.resultId===r.id);
       for(let i=0;i<existing.length;i++){
         const x=existing[i],fresh=freshForResult[i]||freshForResult[0],placeholder=window.fcWriting?.isPlaceholder?.(x.text),generatedSource=!x.source||['histórico','compatibilidad','propuesta_sistema','sistema'].includes(x.source),needsSynthesis=!!window.fcWriting?.activityNeedsSynthesis?.(x.text,r.text);
         const synthesized=generatedSource&&needsSynthesis?window.fcWriting?.activitySynthesisFromResult?.(r.text):'';
         const replacement=x.confirmed?x.text:(placeholder&&fresh?.text?fresh.text:(synthesized||x.text));
         const repaired=String(replacement||'')!==String(x.text||'');
         items.push({...x,id:x.id||x.activityId,activityId:x.activityId||x.id,objectiveId:r.objectiveId,objectiveText:r.objectiveText||x.objectiveText||'',causeId:x.causeId||obj.id||r.objectiveId,resultId:r.id,resultText:r.text,text:replacement,confirmed:placeholder?false:!!x.confirmed,source:repaired?'propuesta_sistema':(x.source||'histórico'),provenance:repaired?'sintesis_actividad_heredada':(x.provenance||'compatibilidad'),updatedAt:repaired?new Date().toISOString():(x.updatedAt||null)})
       }
     }else items.push(...activityProposals().filter(x=>x.resultId===r.id))
   }
   for(const x of old){
     if(!items.some(y=>y.id===x.id)&&x.resultId&&!validResultIds.has(x.resultId))items.push({...x,requiresReview:true,reviewReason:'resultado_no_disponible'});
     if(x.status==='risk_response'&&x.resultId&&validResultIds.has(x.resultId)&&!items.some(y=>y.id===x.id))items.push({...x,activityId:x.activityId||x.id})
     else if(!x.resultId&&!x.objectiveId&&!items.some(y=>y.id===x.id))items.push({...x,activityId:x.activityId||x.id,status:x.status||'manual_sin_vinculo',confirmed:false})
   }
   s={...s,sourceSignature:sig,alternativeId:alt?.id||'',alternativeText:alt?.text||'',items,updatedAt:new Date().toISOString()};write('S11',s)
 }
 let contextChanged=false;(s.items||[]).forEach(x=>{if(!x.context||typeof x.context!=='object'){x.context=activityStoredContext(x,s);contextChanged=true}});
 if(contextChanged)write('S11',s);
 return s
}
function activityContext(x){
 const obj=(objectives().items||[]).find(o=>o.id===x?.objectiveId)||{};
 const tree=draft?.S07?.tree_state?.nodes||[];
 const central=tree.find(n=>n.zone==='central');
 const cause=tree.find(n=>n.id===(x?.causeId||x?.objectiveId));
 return {problem:central?.text||'[POR VERIFICAR]',cause:cause?.text||obj.sourceText||'[POR VERIFICAR]',objective:x?.objectiveText||obj.text||'[POR VERIFICAR]',result:x?.resultText||'[POR VERIFICAR]'}
}
function participantContext(){
 return draft?.S03?.poblacion_participante||draft?.S03?.población_participante||draft?.S03?.poblacion_atendida||draft?.S03?.población_atendida||''
}
function activityProjectContext(x,s){
 const base=activityContext(x),population=participantContext();
 const territory=draft?.S02?.territorio_o_lugar_de_intervencion||draft?.S01?.municipio||'';
 const existing=(s?.items||[]).filter(i=>i.id!==x?.id&&i.resultId&&i.resultId===x?.resultId&&i.confirmed).map(i=>i.text).filter(Boolean);
 return {...base,population,territory,existingActivities:existing,plainText:x?.plainText||''}
}
function activityStoredContext(x,s){
 const ctx=activityProjectContext(x,s);
 return {population:ctx.population||'',territory:ctx.territory||'',problem:ctx.problem||'',cause:ctx.cause||'',objectiveText:ctx.objective||'',resultText:ctx.result||'',capturedAt:new Date().toISOString()}
}
function activityHelp(x,s){
 const context=activityProjectContext(x,s);
 return window.fcWriting?.activityGuidance?window.fcWriting.activityGuidance(x?.resultText||'',x?.objectiveText||'',context):{suggestions:[],questions:[],context}
}
function activitySufficiencyFor(x,s){
 const related=(s.items||[]).filter(i=>i.resultId&&i.resultId===x?.resultId&&i.confirmed);
 return window.fcWriting?.activitySufficiency?window.fcWriting.activitySufficiency(related,x?.resultText||''):{ok:true,issues:[]}
}
function activityLinkOptions(){
 const alt=selectedAlternative(),allowed=new Set(alt?.sourceIds||[]);
 return confirmedResults().filter(r=>!alt||allowed.has(r.objectiveId)).map(r=>{
   const obj=(objectives().items||[]).find(o=>o.id===r.objectiveId)||{};
   return {resultId:r.id,resultText:r.text,objectiveId:r.objectiveId||obj.id||'',objectiveText:r.objectiveText||obj.text||'',causeId:obj.id||r.objectiveId||''}
 }).filter(x=>x.resultId&&x.objectiveId)
}
function linkActivityToResult(x,resultId){
 const option=activityLinkOptions().find(r=>r.resultId===resultId);if(!x||!option)return false;
 x.resultId=option.resultId;x.resultText=option.resultText;x.objectiveId=option.objectiveId;x.objectiveText=option.objectiveText;x.causeId=option.causeId;
 x.status='manual_vinculada';x.provenance=x.provenance==='actividad_adicional'?'actividad_adicional_vinculada':'actividad_historica_vinculada';x.confirmed=false;x.updatedAt=new Date().toISOString();
 return true
}
function activityLinkerHtml(x){
 if(x?.resultId&&x?.objectiveId)return '';
 const options=activityLinkOptions();
 const body=options.length?options.map((r,i)=>'<button type="button" data-act-link-result="'+esc(x.id)+':'+esc(r.resultId)+'"><small>Resultado '+(i+1)+'</small><b>'+esc(r.resultText)+'</b><span>Objetivo específico: '+esc(r.objectiveText||'[POR VERIFICAR]')+'</span></button>').join(''):'<div class="activity-link-empty"><b>No hay resultados confirmados disponibles.</b><span>Vuelve al resultado esperado, confírmalo y regresa a esta actividad.</span></div>';
 return '<div class="activity-warning activity-linker"><strong>Falta conectar esta actividad</strong><p>Para continuar, elige el resultado al que contribuye. El sistema completará automáticamente el objetivo específico relacionado.</p><div class="activity-link-options">'+body+'</div></div>'
}
function indicatorProposal(source,i,type='Actividad',template=null){
 const linkedId=source.id,linkedText=source.text||source.activityText||source.objectiveText||'';
 const t=template||(window.fcWriting?.indicatorBattery?window.fcWriting.indicatorBattery(linkedText,type,{source})[0]:null)||{};
 const family=t.indicatorFamily||'principal';
 const safe=String(family).replace(/[^a-z0-9_-]/gi,'_');
 const selected=type!=='Actividad'||family==='cumplimiento';
 return{id:`I-${type}-${linkedId}-${safe}`,indicatorId:`I-${type}-${linkedId}-${safe}`,linkedType:type,linkedId,linkedText,activityId:type==='Actividad'?linkedId:(source.activityId||''),activityText:type==='Actividad'?linkedText:(source.activityText||''),resultId:type==='Resultado'?linkedId:(source.resultId||''),objectiveId:type==='Objetivo'?linkedId:(source.objectiveId||''),indicatorFamily:family,indicator:t.indicator||'[POR REVISAR]',formula:t.formula||'[POR VERIFICAR]',meta:t.meta||'[POR VERIFICAR]',lineaBase:t.lineaBase||'[POR VERIFICAR]',unidad:t.unidad||'[POR VERIFICAR]',periodicidad:t.periodicidad||'[POR VERIFICAR]',medioVerificacion:t.medioVerificacion||'[POR VERIFICAR]',responsable:t.responsable||'[POR VERIFICAR]',plazo:t.plazo||'[POR VERIFICAR]',verificationSuggestions:t.verificationSuggestions||[],provenance:t.provenance||'propuesta_sistema',verificationStatus:t.verificationStatus||'POR_VERIFICAR',definitionStatus:selected?'PENDIENTE':'NO_SELECCIONADO',technicalStatus:'PENDIENTE',selected,dismissed:false,confirmed:false,stale:false}
}
function normalizeIndicatorState(x){
 const q=indicatorQuality(x);
 if(x.selected===undefined)x.selected=!!x.confirmed||x.linkedType!=='Actividad'||x.indicatorFamily==='cumplimiento';
 x.definitionStatus=x.selected?(x.confirmed?'DEFINIDO':'PENDIENTE'):'NO_SELECCIONADO';
 x.technicalStatus=q.ok?'COMPLETA':'PENDIENTE';
 return x
}
function editorialSource(v){
 return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
}
function indicatorSources(){
 const out=[];confirmedActivities().forEach(x=>out.push({source:x,type:'Actividad'}));
 try{(window.fcGetResults?.()||draft?.S11?.results_state?.items||[]).filter(x=>x.confirmed).forEach(x=>out.push({source:x,type:'Resultado'}))}catch{}
 try{const central=(draft?.S09?.objectives_state?.items||[]).find(x=>x.confirmed&&x.zone==='central');if(central)out.push({source:central,type:'Objetivo'})}catch{}
 return out
}
function ensureS12(){
 let s=read('S12');const src=indicatorSources(),sig='s12-context-v3|'+src.map(x=>`${x.type}:${x.source.id}:${x.source.text}`).join('|');
 if(!src.length&&Array.isArray(s.items)&&s.items.length)return s;
 if(!s.items||s.sourceSignature!==sig){
   const old=s.items||[],used=new Set(),items=[];let seq=0;
   for(const x of src){
     const text=x.source.text||x.source.activityText||x.source.objectiveText||'';
     const battery=window.fcWriting?.indicatorBattery?window.fcWriting.indicatorBattery(text,x.type,{source:x.source}):[];
     const templates=battery.length?battery:[{}];
     templates.forEach((tpl,idx)=>{
       const family=tpl.indicatorFamily||'principal';
       let prev=old.find(o=>!used.has(o)&&o.linkedType===x.type&&(o.linkedId||o.activityId||o.resultId||o.objectiveId)===x.source.id&&o.indicatorFamily===family);
       if(!prev&&idx===0)prev=old.find(o=>!used.has(o)&&(o.linkedType||'Actividad')===x.type&&(o.linkedId||o.activityId||o.resultId||o.objectiveId)===x.source.id&&!o.indicatorFamily);
       const fresh=indicatorProposal(x.source,seq++,x.type,tpl);
       if(prev){
         used.add(prev);const changed=String(prev.linkedText||'')!==String(text||''),migrationOnly=x.type==='Actividad'&&x.source?.provenance==='sintesis_actividad_heredada',materialChange=changed&&!migrationOnly&&editorialSource(prev.linkedText)!==editorialSource(text),placeholder=window.fcWriting?.isPlaceholder?.(prev.indicator);
         const refreshed=placeholder&&!window.fcWriting?.isPlaceholder?.(fresh.indicator);
         const derived={};for(const k of ['formula','unidad','lineaBase','meta'])if(window.fcWriting?.isPlaceholder?.(prev[k])&&!window.fcWriting?.isPlaceholder?.(fresh[k]))derived[k]=fresh[k];
         const selected=prev.selected!==undefined?!!prev.selected:(!!prev.confirmed||fresh.selected);
         items.push({...fresh,...prev,...derived,...(refreshed?{indicator:fresh.indicator,formula:fresh.formula,unidad:fresh.unidad,medioVerificacion:fresh.medioVerificacion,verificationSuggestions:fresh.verificationSuggestions}:{}),id:prev.id||fresh.id,indicatorId:prev.indicatorId||prev.id||fresh.id,linkedType:x.type,linkedId:x.source.id,linkedText:text,activityId:fresh.activityId,resultId:fresh.resultId,objectiveId:fresh.objectiveId,indicatorFamily:family,verificationSuggestions:tpl.verificationSuggestions||prev.verificationSuggestions||[],selected,dismissed:prev.dismissed===true&&!selected,confirmed:(materialChange||refreshed)?false:!!prev.confirmed,verificationStatus:(materialChange||refreshed)?'REQUIERE_REVISIÓN':(prev.verificationStatus||fresh.verificationStatus),stale:false})
       }else items.push(fresh)
     })
   }
   const removed=old.filter(o=>!used.has(o)).map(o=>({...o,confirmed:false,stale:true,status:'desactualizado',verificationStatus:'REQUIERE_REVISIÓN'}));
   items.forEach(normalizeIndicatorState);
   s={...s,sourceSignature:sig,items,staleItems:[...(s.staleItems||[]),...removed],updatedAt:null};write('S12',s)
 }
 let normalized=false;(s.items||[]).forEach(x=>{if(x.selected===undefined){x.selected=!!x.confirmed||x.linkedType!=='Actividad'||x.indicatorFamily==='cumplimiento';normalized=true}const d=x.selected?(x.confirmed?'DEFINIDO':'PENDIENTE'):'NO_SELECCIONADO',t=indicatorQuality(x).ok?'COMPLETA':'PENDIENTE';if(x.definitionStatus!==d||x.technicalStatus!==t){x.definitionStatus=d;x.technicalStatus=t;normalized=true}});
 if(normalized)write('S12',s);
 return s
}
function sync(code){if(typeof session!=='undefined'&&session&&typeof syncSection==='function')syncSection(code).catch(()=>{})}
function renderS10(){
 const host=$('#fields');if(!host)return;const gate=window.fcS09TransitionStatus?.(),confirmedSpecific=confirmedMeans(),registeredSpecific=registeredSpecificObjectives();
 if((gate&&!gate.ok)||!confirmedSpecific.length){
   const objectiveList=registeredSpecific.length?'<div class="writing-source"><small>Objetivos específicos registrados:</small>'+registeredSpecific.map(o=>'<p>• '+esc(cleanSourceText(o.text))+(o.confirmed?'':' <b>[POR VERIFICAR]</b>')+'</p>').join('')+'</div>':'<p>No hay objetivos específicos registrados todavía.</p>';
   host.innerHTML='<section id="completionS10" class="completion-wrap didactic-flow"><div class="completion-note"><strong>Antes de definir una alternativa, necesitamos un objetivo específico confirmado.</strong><p>La alternativa se construye a partir de los objetivos reales del proyecto. El sistema no generará una estrategia genérica mientras ese vínculo no esté confirmado.</p>'+objectiveList+'<button type="button" id="backToS09">Revisar y confirmar S09 · objetivos</button></div></section>';$('#backToS09')?.addEventListener('click',()=>window.fcNavigate?.('S09'));return}
 const s=ensureS10(),xs=s.items||[];cursors.S10=Math.min(cursors.S10,Math.max(0,xs.length-1));const x=xs[cursors.S10];
 host.innerHTML=`<section id="completionS10" class="completion-wrap didactic-flow">
 <div class="didactic-intro"><strong>Elegir el camino de trabajo</strong><p>Revisa una opción cada vez. La herramienta te muestra de dónde viene; tú decides si sirve para tu proyecto.</p></div>
 ${x?`<div class="didactic-progress">Opción ${cursors.S10+1} de ${xs.length}</div>
 <article class="didactic-card">
   <small>${esc(x.title)}</small>
   <label class="didactic-main-label">¿Qué camino general podría seguir el proyecto?<textarea data-alt-text="${x.id}" placeholder="Escribe una frase general. Las actividades se definirán después.">${esc(x.text)}</textarea></label>
   <div class="writing-help">
     <button type="button" data-writing-help="${x.id}">Ayúdame a redactarla</button>
     <div class="writing-help-panel ${x.showWritingHelp?'':'hidden'}" data-writing-panel="${x.id}">
       <div class="writing-help-explain"><strong>¿Qué debes escribir aquí?</strong><p>Una alternativa describe el <b>camino general</b> que seguirá el proyecto para alcanzar los objetivos. Todavía no escribas actividades concretas.</p></div>
       <div class="writing-source"><small>La herramienta está usando como base estos objetivos específicos confirmados:</small>${sourceMeansForAlternative(x).map(m=>`<p>• ${esc(cleanSourceText(m.text))}</p>`).join('')}</div>
       <div class="writing-proposals">${writingProposals(x).map((p,i)=>`<article><small>Propuesta ${i+1}</small><p>${esc(p)}</p><button type="button" data-use-writing="${x.id}:${i}">Usar esta propuesta</button></article>`).join('')}</div>
     </div>
   </div>
   <div class="didactic-question">¿Esta opción parece adecuada para lograr los objetivos del proyecto?</div>
   <div class="didactic-choice-row">
     <button data-alt-decision="${x.id}:yes" class="${x.decision==='yes'?'selected':''}">Sí, parece adecuada</button>
     <button data-alt-decision="${x.id}:doubt" class="${x.decision==='doubt'?'selected':''}">Tengo dudas</button>
     <button data-alt-decision="${x.id}:no" class="${x.decision==='no'?'selected':''}">No parece adecuada</button>
   </div>
   <div class="didactic-suggestion"><small>Orientación</small><p>Esta opción se relaciona con ${(x.sourceIds||[]).length||1} elemento(s) aprobados del árbol de objetivos. Si tienes dudas, revisa el detalle antes de decidir.</p></div>
   <details class="didactic-detail" ${x.decision==='doubt'?'open':''}><summary>Revisar con más detalle</summary>
     <p>Estas preguntas ayudan a pensar la decisión. No son una calificación.</p>
     <div class="completion-grid">${['pertinencia','viabilidad','evidencia','alcance'].map(k=>`<label>${k==='pertinencia'?'¿Responde al problema?':k==='viabilidad'?'¿Parece realizable?':k==='evidencia'?'¿Tiene respaldo?':'¿El alcance es adecuado?'}<select data-alt-score="${x.id}:${k}"><option value="">No sé todavía</option><option value="3" ${String(x.scores?.[k])==='3'?'selected':''}>Sí</option><option value="2" ${String(x.scores?.[k])==='2'?'selected':''}>Más o menos</option><option value="1" ${String(x.scores?.[k])==='1'?'selected':''}>No</option></select></label>`).join('')}</div>
     <label>Si quieres, explica tu decisión<textarea data-alt-note="${x.id}" placeholder="Una frase corta es suficiente.">${esc(x.note||'')}</textarea></label>
   </details>
   <div class="didactic-actions"><button data-alt-confirm="${x.id}">${x.confirmed?'Revisada ✓':'Guardar esta revisión'}</button><button data-alt-select="${x.id}" class="${x.selected?'primary':''}">${x.selected?'Elegida para el proyecto':'Elegir esta opción'}</button></div>
 </article>
 <div class="didactic-nav"><button id="altPrev" ${cursors.S10===0?'disabled':''}>← Opción anterior</button><button id="altNext" ${cursors.S10>=xs.length-1?'disabled':''}>Ver siguiente opción →</button></div>`:'<div class="completion-note"><strong>Aún no hay opciones para revisar.</strong><p>Confirma primero los objetivos y medios del paso anterior.</p></div>'}
 <div class="completion-toolbar"><button id="goS11" class="primary" ${xs.some(i=>i.selected&&i.confirmed)?'':'disabled'}>Continuar</button></div>
 </section>`;bindS10(s)
}
function bindS10(s){
 document.querySelectorAll('[data-alt-text]').forEach(el=>el.oninput=()=>{const x=s.items.find(i=>i.id===el.dataset.altText);if(!x)return;x.text=el.value.trim();x.confirmed=false;x.source='usuario_editado';write('S10',s)});
 document.querySelectorAll('[data-writing-help]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.writingHelp);x.showWritingHelp=!x.showWritingHelp;renderS10()});
 document.querySelectorAll('[data-use-writing]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useWriting.split(':');const x=s.items.find(i=>i.id===id),p=writingProposals(x)[Number(idx)];if(!p)return;x.text=p;x.confirmed=false;x.showWritingHelp=false;write('S10',s);renderS10()});
 document.querySelectorAll('[data-alt-decision]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.altDecision.split(':');const x=s.items.find(i=>i.id===id);x.decision=v;write('S10',s);renderS10()});
 document.querySelectorAll('[data-alt-score]').forEach(el=>el.onchange=()=>{const [id,k]=el.dataset.altScore.split(':');const x=s.items.find(i=>i.id===id);x.scores[k]=el.value?Number(el.value):'';write('S10',s)});
 document.querySelectorAll('[data-alt-note]').forEach(el=>el.oninput=()=>{const x=s.items.find(i=>i.id===el.dataset.altNote);if(!x)return;x.note=el.value.trim();write('S10',s)});
 document.querySelectorAll('[data-alt-confirm]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.altConfirm);if(!x)return;const editor=document.querySelector('[data-alt-text="'+x.id+'"]');if(editor)x.text=editor.value.trim();const note=document.querySelector('[data-alt-note="'+x.id+'"]');if(note)x.note=note.value.trim();x.confirmed=!!x.text.trim()&&!window.fcWriting?.isPlaceholder?.(x.text);if(!x.confirmed&&window.fcWriting?.isPlaceholder?.(x.text)){alert('Antes de confirmar la alternativa, reemplaza la marca [POR REVISAR] por una estrategia concreta.')}write('S10',s);sync('S10');renderS10()});
 document.querySelectorAll('[data-alt-select]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.altSelect);if(!x)return;const editor=document.querySelector('[data-alt-text="'+x.id+'"]');if(editor)x.text=editor.value.trim();const note=document.querySelector('[data-alt-note="'+x.id+'"]');if(note)x.note=note.value.trim();if(!x.confirmed){x.confirmed=!!x.text.trim()&&!window.fcWriting?.isPlaceholder?.(x.text)}if(!x.confirmed){alert('Antes de elegir esta alternativa, redacta una estrategia concreta.');return}s.items.forEach(i=>i.selected=i.id===b.dataset.altSelect);write('S10',s);sync('S10');renderS10()});
 $('#altPrev')&&($('#altPrev').onclick=()=>{cursors.S10=Math.max(0,cursors.S10-1);renderS10()});$('#altNext')&&($('#altNext').onclick=()=>{cursors.S10=Math.min(s.items.length-1,cursors.S10+1);renderS10()});
 $('#goS11')?.addEventListener('click',()=>window.fcNavigate?.('S11'))
}
function renderS11(){
 const host=$('#fields');if(!host)return;const s=ensureS11(),xs=s.items||[];cursors.S11=Math.min(cursors.S11,Math.max(0,xs.length-1));const x=xs[cursors.S11],ctx=x?activityContext(x):null,help=x?activityHelp(x,s):null,suff=x?activitySufficiencyFor(x,s):null,writingReview=x&&window.fcWriting?.activityWritingReview?window.fcWriting.activityWritingReview(x.text):{ok:true,issues:[]},focusedResult=focusedResultId?confirmedResults().find(r=>r.id===focusedResultId):null,focusedHasActivity=focusedResult?xs.some(a=>a.resultId===focusedResult.id):false;
 host.innerHTML=`<section id="completionS11" class="completion-wrap didactic-flow">
 <div class="didactic-intro"><strong>Construir las actividades desde el objetivo</strong><p>Trabajaremos un resultado por vez. Puedes escribir con tus propias palabras y el sistema te ayudará a convertir la idea en una actividad técnicamente formulada.</p></div>
 ${focusedResult?`<div class="s16-focus-banner"><strong>Corrección solicitada desde S16</strong><p>Resultado pendiente: ${esc(focusedResult.text)}</p>${focusedHasActivity?'<span>Ya existe una actividad vinculada. Revísala en esta pantalla.</span>':'<button type="button" id="focusCreateActivity">Crear actividad para este resultado</button>'}</div>`:''}
 ${x?`<div class="didactic-progress">Actividad ${cursors.S11+1} de ${xs.length}</div>
 <article class="didactic-card activity-assistant-card">
  <details class="trace-context" open><summary>Viene de</summary><div class="trace-context-grid"><p><b>Problema central</b><span>${esc(ctx.problem)}</span></p><p><b>Causa directa</b><span>${esc(ctx.cause)}</span></p><p><b>Objetivo específico</b><span>${esc(ctx.objective)}</span></p><p><b>Resultado esperado</b><span>${esc(ctx.result)}</span></p></div></details>
  ${activityLinkerHtml(x)}
  <div class="didactic-question">¿Qué debe ocurrir para lograr este resultado?</div>
  <p class="assistant-lead">Responde con ideas sencillas. El sistema las convertirá en actividades bien formuladas.</p>
  <label class="didactic-main-label">Tu idea<textarea data-act-plain="${x.id}" placeholder="Ejemplo: Se necesitan 6 talleres de trombón.">${esc(x.plainText||'')}</textarea></label>
  <div class="activity-ai-actions"><button type="button" data-act-help="${x.id}">Ayúdame con IA</button><button type="button" data-act-convert="${x.id}" ${x.plainText?'':'disabled'}>Convertir en actividad técnica</button></div>
  <div class="writing-help-panel ${x.showActivityHelp?'':'hidden'}" data-act-help-panel="${x.id}">
    <strong>Ayuda basada en este proyecto</strong>
    <div class="writing-source">
      <small>Resultado que debe producirse</small><p>• ${esc(ctx.result)}</p>
      <small>Objetivo específico relacionado</small><p>• ${esc(ctx.objective)}</p>
      ${ctx.problem&&ctx.problem!=='[POR VERIFICAR]'?'<small>Problema central</small><p>• '+esc(ctx.problem)+'</p>':''}
      ${help.context?.population?'<small>Población registrada</small><p>• '+esc(help.context.population)+'</p>':''}
      ${help.context?.territory?'<small>Territorio registrado</small><p>• '+esc(help.context.territory)+'</p>':''}
      ${help.context?.existingActivities?.length?'<small>Actividades ya aprobadas para este resultado</small>'+help.context.existingActivities.map(v=>'<p>• '+esc(v)+'</p>').join(''):''}
    </div>
    <p>Elige una propuesta solo si corresponde a la realidad del proyecto. El sistema no agrega cantidades, responsables, fechas ni recursos que no hayas proporcionado.</p>
    <div class="activity-suggestion-pills">${(help.suggestions||[]).map((v,i)=>`<button type="button" data-act-suggestion="${x.id}:${i}">${esc(v)}</button>`).join('')}</div>
    <details><summary>Preguntas orientadoras para este resultado</summary>${(help.questions||[]).map(v=>`<p>• ${esc(v)}</p>`).join('')}</details>
  </div>
  <div class="proposal-box"><small>Propuesta de redacción</small><label class="didactic-main-label">Actividad propuesta<textarea data-act-text="${x.id}">${esc(x.text)}</textarea></label><p>La actividad debe expresar una acción, su objeto y solo la población estrictamente necesaria. El contexto completo queda en “Viene de”.</p>${!writingReview.ok?'<div class="activity-writing-review"><strong>Acorta la redacción antes de aprobar</strong>'+writingReview.issues.map(v=>'<p>'+esc(v)+'</p>').join('')+'</div>':''}</div>
  <div class="didactic-question compact">¿Esta acción contribuye de manera necesaria y plausible a producir el resultado?</div>
  <div class="didactic-actions"><button data-act-confirm="${x.id}" class="${x.confirmed?'primary':''}">${x.confirmed?'Actividad aprobada ✓':'Aprobar esta actividad'}</button><button data-act-delete="${x.id}">Eliminar propuesta</button></div>
  ${suff&&!suff.ok?`<div class="activity-warning"><strong>Revisa si falta alguna acción</strong>${suff.issues.map(v=>`<p>${esc(v)}</p>`).join('')}</div>`:''}
  <details class="didactic-detail"><summary>Agregar una observación</summary><textarea data-act-note="${x.id}" placeholder="Opcional">${esc(x.note||'')}</textarea></details>
 </article>
 <div class="didactic-nav"><button id="actPrev" ${cursors.S11===0?'disabled':''}>← Anterior</button><button id="actNext" ${cursors.S11>=xs.length-1?'disabled':''}>Siguiente →</button></div>`:'<div class="completion-note"><strong>Faltan resultados aprobados.</strong><p>Confirma primero al menos un resultado derivado de un objetivo específico.</p></div>'}
 <div class="completion-toolbar"><button id="addAct">+ Añadir otra actividad para este resultado</button><button id="goS12" class="primary" ${xs.some(i=>i.confirmed)?'':'disabled'}>Continuar a indicadores</button></div></section>`;bindS11(s)
}
function bindS11(s){
 $('#focusCreateActivity')&&($('#focusCreateActivity').onclick=()=>{const r=confirmedResults().find(x=>x.id===focusedResultId);if(!r)return;const id=`ACT${s.items.length+1}-${Date.now().toString().slice(-4)}`;s.items.push({id,activityId:id,objectiveId:r.objectiveId||'',objectiveText:r.objectiveText||'',causeId:r.causeId||r.objectiveId||'',resultId:r.id,resultText:r.text||'[POR VERIFICAR]',text:'',plainText:'',confirmed:false,status:'manual',source:'usuario',provenance:'correccion_s16',note:'',showActivityHelp:true,updatedAt:null});cursors.S11=s.items.length-1;focusedResultId='';write('S11',s);renderS11()});
 document.querySelectorAll('[data-act-plain]').forEach(el=>el.oninput=()=>{const x=s.items.find(i=>i.id===el.dataset.actPlain);x.plainText=el.value;x.confirmed=false;write('S11',s)});
 document.querySelectorAll('[data-act-text]').forEach(el=>el.oninput=()=>{const x=s.items.find(i=>i.id===el.dataset.actText);if(!x)return;x.text=el.value.trim();x.confirmed=false;x.source='usuario_editado';x.updatedAt=new Date().toISOString();write('S11',s)});
 document.querySelectorAll('[data-act-note]').forEach(el=>el.oninput=()=>{const x=s.items.find(i=>i.id===el.dataset.actNote);if(!x)return;x.note=el.value.trim();write('S11',s)});
 document.querySelectorAll('[data-act-help]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.actHelp);x.showActivityHelp=!x.showActivityHelp;write('S11',s);renderS11()});
 document.querySelectorAll('[data-act-suggestion]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.actSuggestion.split(':');const x=s.items.find(i=>i.id===id),h=activityHelp(x,s),v=(h.suggestions||[])[Number(idx)];if(!v)return;x.plainText=v;x.text=window.fcWriting?.activityFromPlainLanguage?window.fcWriting.activityFromPlainLanguage(v,x.resultText,x.objectiveText,participantContext()):v;x.source='propuesta_sistema';x.provenance='respuesta_guiada';x.context=activityStoredContext(x,s);x.confirmed=false;x.showActivityHelp=false;x.updatedAt=new Date().toISOString();write('S11',s);renderS11()});
 document.querySelectorAll('[data-act-convert]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.actConvert);if(!x?.plainText?.trim())return;x.text=window.fcWriting?.activityFromPlainLanguage?window.fcWriting.activityFromPlainLanguage(x.plainText,x.resultText,x.objectiveText,participantContext()):x.plainText.trim();x.source='propuesta_sistema';x.provenance='lenguaje_cotidiano';x.context=activityStoredContext(x,s);x.confirmed=false;x.updatedAt=new Date().toISOString();write('S11',s);renderS11()});
 document.querySelectorAll('[data-act-link-result]').forEach(b=>b.onclick=()=>{const parts=b.dataset.actLinkResult.split(':');const x=s.items.find(i=>i.id===parts[0]);if(linkActivityToResult(x,parts[1])){write('S11',s);renderS11()}});
 document.querySelectorAll('[data-act-confirm]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.actConfirm);if(!x)return;const editor=document.querySelector('[data-act-text="'+x.id+'"]');if(editor){x.text=editor.value.trim();x.source='usuario_editado'}const note=document.querySelector('[data-act-note="'+x.id+'"]');if(note)x.note=note.value.trim();const linked=!!x.resultId&&!!x.objectiveId,review=window.fcWriting?.activityWritingReview?window.fcWriting.activityWritingReview(x.text):{ok:true,issues:[]};x.confirmed=linked&&review.ok&&!!x.text.trim()&&!window.fcWriting?.isPlaceholder?.(x.text);if(!linked){alert('Antes de aprobar esta actividad, debe quedar vinculada a un objetivo específico y a un resultado.')}else if(!review.ok){alert('Acorta la actividad antes de aprobarla: '+review.issues.join(' '))}else if(!x.confirmed){alert('Antes de aprobar la actividad, reemplaza la marca [POR REVISAR] por una acción concreta.')}x.updatedAt=new Date().toISOString();write('S11',s);sync('S11');renderS11()});
 document.querySelectorAll('[data-act-delete]').forEach(b=>b.onclick=()=>{s.items=s.items.filter(i=>i.id!==b.dataset.actDelete);cursors.S11=Math.max(0,Math.min(cursors.S11,s.items.length-1));write('S11',s);renderS11()});
 $('#addAct')&&($('#addAct').onclick=()=>{const current=s.items[cursors.S11],id=`ACT${s.items.length+1}-${Date.now().toString().slice(-4)}`,item={id,activityId:id,objectiveId:current?.objectiveId||'',objectiveText:current?.objectiveText||'',causeId:current?.causeId||current?.objectiveId||'',resultId:current?.resultId||'',resultText:current?.resultText||'[POR VERIFICAR]',text:'',plainText:'',confirmed:false,status:'manual',source:'usuario',provenance:'actividad_adicional',note:'',showActivityHelp:true,updatedAt:null};s.items.push(item);item.context=activityStoredContext(item,s);cursors.S11=s.items.length-1;write('S11',s);renderS11()});
 $('#actPrev')&&($('#actPrev').onclick=()=>{cursors.S11=Math.max(0,cursors.S11-1);renderS11()});$('#actNext')&&($('#actNext').onclick=()=>{cursors.S11=Math.min(s.items.length-1,cursors.S11+1);const next=s.items[cursors.S11];renderS11();const id=next?.id;if(!id){continueView('#completionS11');return}const target=!String(next.text||'').trim()?'[data-act-plain="'+id+'"]':!next.confirmed?'[data-act-confirm="'+id+'"]':'.didactic-card';continueView(target,'#completionS11 .didactic-card')});
 $('#goS12')?.addEventListener('click',async()=>{if(typeof window.fcNavigate==='function')await window.fcNavigate('S12');continueView('#completionS12 .didactic-card','#completionS12')})
}
function indicatorProjectContext(x){
 const obj=(objectives().items||[]).find(o=>o.id===x?.objectiveId)||{};
 const results=confirmedResults();
 const result=results.find(r=>r.id===x?.resultId)||{};
 const acts=confirmedActivities();
 const activity=acts.find(a=>a.id===x?.activityId)||{};
 const population=participantContext();
 const territory=draft?.S02?.territorio_o_lugar_de_intervencion||draft?.S01?.municipio||'';
 return {objectiveText:obj.text||result.objectiveText||activity.objectiveText||'',resultText:result.text||activity.resultText||'',activityText:activity.text||x?.activityText||'',population,territory}
}
function indicatorHelp(x){
 const context=indicatorProjectContext(x);
 return window.fcWriting?.indicatorGuidance?window.fcWriting.indicatorGuidance(x.linkedText||x.activityText||'',x.linkedType||'Actividad',x.indicatorFamily,context):{level:'Indicador',purpose:'Define una medida verificable.',question:'¿Qué vamos a medir?',formulaHint:'Explica cómo se obtiene el dato.',unitHint:'Define una unidad.',suggestions:[x.indicator],formulaExamples:[],context}
}
function indicatorQuality(x){return window.fcWriting?.indicatorQuality?window.fcWriting.indicatorQuality(x):{ok:false,issues:['Completa los datos del indicador.']}}
function indicatorMissingFields(x){
 const miss=v=>!String(v||'').trim()||/^\s*\[POR (VERIFICAR|REVISAR|DEFINIR)\]/i.test(String(v||''));
 const defs=[
  ['formula','Fórmula o criterio','¿Cómo se obtiene este dato a partir del indicador?'],
  ['unidad','Unidad de medida','¿En qué unidad debe expresarse el resultado del indicador?'],
  ['lineaBase','Línea base','¿Cuál es el valor actual antes de ejecutar el proyecto?'],
  ['meta','Meta','¿Qué valor quieres alcanzar con este indicador?'],
  ['medioVerificacion','Medio de verificación','¿Qué registro permitirá comprobar este indicador?'],
  ['periodicidad','Periodicidad','¿Cada cuánto revisarás este indicador?'],
  ['responsable','Responsable','¿Quién consolidará o verificará este dato?'],
  ['plazo','Plazo','¿En qué fecha o momento debe comprobarse el cumplimiento?']
 ];
 return defs.filter(([k])=>miss(x[k]))
}
function indicatorScheduleSuggestions(x){
 const sch=draft?.S13?.schedule_state?.items||[];let rows=[];
 if(x.activityId)rows=sch.filter(r=>r.activityId===x.activityId&&r.confirmed);
 else if(x.resultId){const ids=new Set(confirmedActivities().filter(a=>a.resultId===x.resultId).map(a=>a.id));rows=sch.filter(r=>ids.has(r.activityId)&&r.confirmed)}
 else if(x.objectiveId){const ids=new Set(confirmedActivities().filter(a=>a.objectiveId===x.objectiveId).map(a=>a.id));rows=sch.filter(r=>ids.has(r.activityId)&&r.confirmed)}
 const responsible=[...new Set(rows.map(r=>String(r.responsible||r.responsable||'').trim()).filter(Boolean))];
 const dates=rows.map(r=>String(r.endDate||r.end||'').trim()).filter(Boolean).sort();
 const frequencies=[...new Set(rows.map(r=>String(r.frequency||'').trim()).filter(Boolean))];
 return {responsible:responsible.length===1?responsible:[],plazo:dates.length?[dates[dates.length-1]]:[],frequency:frequencies.length===1?frequencies:[],rows}
}
function scheduleReconciliationForIndicator(x){
 const sch=indicatorScheduleSuggestions(x),out={source:'S13',linkedIndicatorId:x.id,updatedAt:new Date().toISOString(),fields:{}};
 if(sch.responsible.length)out.fields.responsable={value:sch.responsible[0],source:'Cronograma confirmado'};
 if(sch.plazo.length)out.fields.plazo={value:sch.plazo[0],source:'Fecha final confirmada en cronograma'};
 if(x.linkedType==='Actividad'&&sch.frequency.length&&sch.frequency[0]==='Una vez')out.fields.periodicidad={value:'Al cierre de la actividad',source:'Actividad programada una vez en el cronograma'};
 return out
}
function reconcileIndicatorsFromSchedule(s=ensureS12()){
 let changed=false,count=0;
 for(const x of s.items||[]){
  const rec=scheduleReconciliationForIndicator(x),fields=rec.fields;
  if(!Object.keys(fields).length)continue;
  const prevJson=JSON.stringify(x.scheduleReconciliation?.fields||{}),nextJson=JSON.stringify(fields);
  if(prevJson!==nextJson){x.scheduleReconciliation=rec;changed=true;count++}
 }
 if(changed)write('S12',s);
 return {count,changed}
}
function indicatorResolutionHint(k,x){
 const unit=String(x?.unidad||'').trim(),formula=String(x?.formula||''),type=x?.linkedType||'Actividad',family=x?.indicatorFamily||'';
 if(k==='meta'){
  if(type==='Actividad'&&family==='cumplimiento'&&(unit==='%'||/×\s*100|\*\s*100|porcentaje/i.test(formula)))return 'Este indicador mide el cumplimiento de una actividad programada. Si el compromiso es ejecutar todo lo previsto, 100 % es una meta coherente y puedes usarla. Si el alcance real es menor, escribe el porcentaje realmente comprometido.';
  if(unit&&!/\[POR /i.test(unit))return 'La meta es una decisión del proyecto, no un dato que el sistema deba inventar. Define el valor mínimo en '+unit+' que permitirá afirmar que este indicador se cumplió.';
  return 'Primero define la unidad del indicador. Después establece el valor mínimo que el proyecto se compromete a alcanzar en esa misma unidad.';
 }
 const hints={
  formula:'Si el indicador expresa un porcentaje, identifica con claridad qué valor va arriba, cuál va abajo y multiplica por 100. Si mide una variación, compara el valor de seguimiento con la línea base.',
  unidad:'Usa la misma unidad que produce la fórmula: % para porcentajes, personas para conteos de personas, actividades para conteos de acciones o la unidad propia del resultado.',
  lineaBase:'Busca el valor existente antes de iniciar la ejecución. Puede provenir de un diagnóstico, registro previo o primera medición. Si aún no existe, conserva [POR VERIFICAR] y levántalo antes de medir el avance.',
  medioVerificacion:'Elige el registro donde quedará el dato: lista de asistencia, acta, rúbrica, informe, base de datos, registro audiovisual u otro soporte que realmente vaya a existir.',
  periodicidad:'Relaciona la medición con el ritmo real del proyecto: después de cada actividad, mensual, al inicio y cierre o al finalizar el proceso.',
  responsable:'Selecciona el rol que realmente recogerá o consolidará el dato. Puede ser coordinación, responsable de seguimiento u otro rol registrado en el proyecto.',
  plazo:'Usa el momento en que el indicador debe quedar comprobado. Para actividades puede ser su cierre; para resultados, el cierre del proceso; para el objetivo general, el cierre del proyecto.'
 };
 return hints[k]||'Completa este dato con información real del proyecto o conserva [POR VERIFICAR] hasta contar con respaldo.'
}
function indicatorDecisionQuestion(k,x){
 const unit=String(x?.unidad||'').trim(),type=(x?.linkedType||'indicador').toLowerCase(),source=String(x?.linkedText||x?.activityText||'').trim();
 const qs={
  formula:'¿Qué operación o criterio permite obtener este indicador a partir de datos reales?',
  unidad:'¿En qué unidad quedará expresado el resultado de la fórmula?',
  lineaBase:'¿Cuál es el valor de este indicador antes de iniciar la ejecución?',
  medioVerificacion:'¿En qué documento, registro o instrumento quedará el dato que demuestra este indicador?',
  periodicidad:'¿En qué momentos o con qué frecuencia conviene medir este indicador?',
  responsable:'¿Qué persona o rol se encargará realmente de consolidar y verificar este dato?',
  plazo:'¿En qué fecha o hito debe estar comprobado este indicador?'
 };
 if(k==='meta')return unit&&!/\[POR /i.test(unit)?'¿Qué valor mínimo en '+unit+' debe alcanzarse para considerar cumplido este '+type+'?':'¿Qué valor mínimo debe alcanzarse para considerar cumplido este indicador?';
 return qs[k]||(source?'¿Qué dato real del proyecto permite completar este campo?':'¿Qué dato necesitas registrar para cerrar este campo?')
}
function indicatorNoProposalText(k,x){
 if(k==='meta')return 'Este campo requiere una decisión de compromiso del proyecto. El sistema evita inventar una cifra. Responde la pregunta anterior y escribe el valor que realmente asumirás como meta.';
 if(k==='lineaBase')return 'Este campo requiere un dato del punto de partida. Si todavía no existe una medición inicial, conserva [POR VERIFICAR] y regístrala antes de evaluar el avance.';
 return 'No hay una propuesta segura con la información disponible. Usa la pregunta anterior para resolverlo o conserva [POR VERIFICAR] hasta contar con respaldo.'
}
function indicatorAssistHtml(x){
 const missing=indicatorMissingFields(x),sch=indicatorScheduleSuggestions(x),rec=x.scheduleReconciliation?.fields||{},ctx=indicatorProjectContext(x);
 const fieldAssist=window.fcWriting?.indicatorFieldAssist?window.fcWriting.indicatorFieldAssist(x.linkedText||x.activityText||'',x.linkedType||'Actividad',x.indicatorFamily,ctx,x):{};
 const fieldGuide=window.fcWriting?.indicatorFieldGuide?window.fcWriting.indicatorFieldGuide(x.linkedText||x.activityText||'',x.linkedType||'Actividad',x.indicatorFamily,ctx,x):{};
 if(!missing.length)return '<div class="indicator-assist-done"><b>No hay datos pendientes en esta ficha.</b></div>';
 const existing=Object.entries(rec).filter(([k,v])=>missing.some(([mk])=>mk===k)&&v?.value);
 return '<div class="indicator-completion-assist">'+(x.confirmed&&x.selected?'<div class="indicator-approved-note"><b>Indicador aprobado ✓</b><p>La aprobación ya está registrada. Lo que aparece aquí son datos de la ficha técnica que todavía faltan; completarlos no obliga a volver a aprobar el indicador.</p></div>':'<div class="indicator-approved-note pending"><b>Indicador todavía sin aprobar</b><p>Puedes completar la ficha técnica antes o después de aprobar la definición del indicador.</p></div>')+'<strong>Resolver datos pendientes, uno por uno</strong><p>Cada campo debe llevarte a una decisión o a un dato verificable. Cuando el sistema no puede inferir un valor sin inventarlo, te formula la pregunta concreta que debes responder.</p>'+(existing.length?'<div class="indicator-schedule-reconciliation"><b>El cronograma ya aporta datos que puedes reutilizar</b>'+existing.map(([k,v])=>'<button type="button" data-accept-schedule="'+x.id+':'+k+'"><small>'+esc(v.source)+'</small><span>'+esc(v.value)+'</span></button>').join('')+'</div>':'')+missing.map(([k,label,q])=>{let opts=[...(fieldAssist[k]||[])];if(k==='responsable')opts.push(...sch.responsible);if(k==='plazo')opts.push(...sch.plazo);opts=[...new Set(opts.filter(Boolean))];const g=fieldGuide[k]||{};return '<article class="indicator-assist-card"><small>'+label+' · pendiente</small><b>'+esc(q)+'</b><div class="indicator-field-guide"><p><strong>¿Qué significa?</strong> '+esc(g.meaning||'Dato técnico del indicador.')+'</p><p><strong>¿Qué debes escribir?</strong> '+esc(g.write||'Escribe un dato real y verificable.')+'</p><p><strong>Ejemplo de forma</strong> '+esc(g.example||'[POR VERIFICAR]')+'</p><p class="indicator-decision-question"><strong>Pregunta para resolverlo</strong> '+esc(indicatorDecisionQuestion(k,x))+'</p><p><strong>Criterio de decisión</strong> '+esc(indicatorResolutionHint(k,x))+'</p></div>'+(opts.length?'<div class="indicator-assist-options"><small>Propuestas derivadas del proyecto que puedes usar si corresponden</small>'+opts.map(v=>'<button type="button" data-ind-assist="'+x.id+':'+k+':'+esc(v)+'">'+esc(v)+'</button>').join('')+'</div>':'<p class="indicator-no-proposal">'+esc(indicatorNoProposalText(k,x))+'</p>')+'<textarea data-ind-field="'+x.id+':'+k+'">'+esc(x[k])+'</textarea><button type="button" class="secondary" data-ind-keep-pending="'+x.id+':'+k+'">Aún no tengo este dato · dejar [POR VERIFICAR]</button></article>'}).join('')+'</div>'
}
function indicatorStepHtml(x,step){
 const g=indicatorHelp(x);
 if(step===1)return `<div class="indicator-step"><span class="indicator-step-tag">Paso 1 de 4</span><h4>Definir qué vamos a medir</h4><p>${esc(g.question)}</p><label class="didactic-main-label">Indicador<textarea data-ind-field="${x.id}:indicator">${esc(x.indicator)}</textarea></label><div class="indicator-help"><button type="button" data-ind-help="${x.id}">Ayúdame a formularlo</button><div class="writing-help-panel ${x.showHelp?'':'hidden'}"><strong>${esc(g.level)}</strong><p>${esc(g.purpose)}</p>${(g.suggestions||[]).map((s,i)=>`<article><small>Propuesta ${i+1}</small><p>${esc(s)}</p><button type="button" data-use-indicator="${x.id}:${i}">Usar esta propuesta</button></article>`).join('')}</div></div></div>`;
 if(step===2)return `<div class="indicator-step"><span class="indicator-step-tag">Paso 2 de 4</span><h4>Explicar cómo se obtiene el dato</h4><p>${esc(g.formulaHint)}</p><label class="didactic-main-label">Fórmula o criterio de cálculo<textarea data-ind-field="${x.id}:formula">${esc(x.formula)}</textarea></label><label class="didactic-main-label">Unidad de medida<textarea data-ind-field="${x.id}:unidad" placeholder="${esc(g.unitHint)}">${esc(x.unidad)}</textarea></label><details class="didactic-detail"><summary>Ver ejemplos de fórmula</summary>${(g.formulaExamples||[]).map(v=>`<p>• ${esc(v)}</p>`).join('')}</details></div>`;
 if(step===3)return `<div class="indicator-step"><span class="indicator-step-tag">Paso 3 de 4</span><h4>Definir desde dónde partimos y a dónde queremos llegar</h4><div class="indicator-baseline-note">La meta tiene sentido cuando puede compararse con una línea base. Si aún no existe el dato inicial, conserva <b>[POR VERIFICAR]</b> y no inventes una cifra.</div><label class="didactic-main-label">Línea base<textarea data-ind-field="${x.id}:lineaBase">${esc(x.lineaBase)}</textarea></label><label class="didactic-main-label">Meta<textarea data-ind-field="${x.id}:meta">${esc(x.meta)}</textarea></label></div>`;
 return `<div class="indicator-step"><span class="indicator-step-tag">Paso 4 de 4</span><h4>Definir cómo y cuándo lo vamos a comprobar</h4><label class="didactic-main-label">Medio o fuente de verificación<textarea data-ind-field="${x.id}:medioVerificacion">${esc(x.medioVerificacion)}</textarea></label><div class="completion-grid"><label>Periodicidad<textarea data-ind-field="${x.id}:periodicidad">${esc(x.periodicidad)}</textarea></label><label>Plazo<textarea data-ind-field="${x.id}:plazo">${esc(x.plazo)}</textarea></label><label>Responsable<textarea data-ind-field="${x.id}:responsable">${esc(x.responsable)}</textarea></label></div></div>`
}
function renderS12(){
 const host=$('#fields');if(!host)return;const s=ensureS12();reconcileIndicatorsFromSchedule(s);const xs=s.items||[];cursors.S12=Math.min(cursors.S12,Math.max(0,xs.length-1));const x=xs[cursors.S12];const g=x?indicatorHelp(x):null,q=x?indicatorQuality(x):null;
 const same=x?xs.filter(i=>i.linkedType===x.linkedType&&i.linkedId===x.linkedId):[];
 host.innerHTML=`<section id="completionS12" class="completion-wrap didactic-flow">
 <div class="didactic-intro"><strong>¿Cómo comprobaremos que esto ocurrió?</strong><p>El sistema propone una batería de indicadores a partir de actividades, resultados y objetivos confirmados. Tú decides cuáles usar y completas únicamente los datos que realmente conoces.</p></div>
 ${x?`<div class="didactic-progress">Indicador ${cursors.S12+1} de ${xs.length}</div><article class="didactic-card indicator-card">
  <div class="indicator-level"><small>${esc(x.linkedType||'Elemento')} relacionado</small><strong>${esc(g.level)}</strong></div>
  <div class="didactic-context">${esc(x.linkedText||x.activityText||'')}</div>
  <div class="battery-overview"><small>Batería sugerida para este elemento</small><div>${same.map(i=>`<button type="button" data-ind-jump="${i.id}" class="${i.id===x.id?'selected ':''}${i.confirmed&&i.selected?'approved':i.selected===false?'skipped':'pending'}">${i.confirmed&&i.selected?'✓ ':i.selected===false?'— ':'○ '}${esc((i.indicatorFamily||'indicador').replaceAll('_',' '))}</button>`).join('')}</div><p class="indicator-approval-progress"><b>${same.filter(i=>i.confirmed&&i.selected).length}</b> aprobado(s) · <b>${same.filter(i=>i.selected!==false&&!i.confirmed).length}</b> pendiente(s) · <b>${same.filter(i=>i.selected===false).length}</b> no seleccionado(s)</p></div>
  <div class="proposal-box"><small>Propuesta del sistema</small><p class="indicator-main-question">${esc(g.question)}</p><label class="didactic-main-label">Indicador<textarea data-ind-field="${x.id}:indicator">${esc(x.indicator)}</textarea></label><p>${esc(g.purpose)}</p><div class="indicator-help"><button type="button" data-ind-help="${x.id}">Ayúdame a formularlo</button><div class="writing-help-panel ${x.showHelp?'':'hidden'}" data-ind-help-panel="${x.id}"><strong>Ayuda basada en este proyecto</strong>${g.context?.objectiveText?'<p><small>Objetivo:</small> '+esc(g.context.objectiveText)+'</p>':''}${g.context?.resultText?'<p><small>Resultado:</small> '+esc(g.context.resultText)+'</p>':''}${g.context?.activityText?'<p><small>Actividad:</small> '+esc(g.context.activityText)+'</p>':''}${g.context?.population?'<p><small>Población:</small> '+esc(g.context.population)+'</p>':''}${g.context?.territory?'<p><small>Territorio:</small> '+esc(g.context.territory)+'</p>':''}<div class="writing-proposals">${(g.suggestions||[]).map((v,i)=>`<article><small>Propuesta ${i+1}</small><p>${esc(v)}</p><button type="button" data-use-indicator="${x.id}:${i}">Usar esta propuesta</button></article>`).join('')}</div></div></div></div>
  <div class="indicator-status-summary"><span class="indicator-definition-status ${x.confirmed?'ok':'pending'}">${x.confirmed?'Indicador aprobado ✓':'Indicador pendiente de aprobación'}</span><span class="indicator-technical-status ${q.ok?'ok':'pending'}">${q.ok?'Ficha técnica completa ✓':'Ficha técnica: '+q.issues.length+' dato(s) pendiente(s)'}</span></div><div class="indicator-quality ${q.ok?'ok':'pending'}"><strong>${q.ok?'Ficha técnica completa':x.confirmed?'El indicador ya está aprobado; faltan datos técnicos':'Puedes aprobar la definición aunque falten datos técnicos'}</strong><p>${q.ok?'Los elementos técnicos mínimos están completos.':'Los campos [POR VERIFICAR] quedan visibles para la revisión final y no anulan la aprobación de la definición del indicador.'}</p>${!q.ok?'<div class="indicator-progress-hint"><span>Estado actual:</span><b>'+(x.confirmed?'Aprobación registrada. Resuelve los datos técnicos que puedas sustentar.':'Revisa la definición y pulsa “Aprobar este indicador”.')+'</b></div>':''}</div>
  ${!q.ok?'<button type="button" class="indicator-complete-btn" data-open-indicator-completion="'+x.id+'">Completar datos pendientes con ayuda</button>':''}
  <div class="indicator-completion-panel ${x.showCompletionHelp?'':'hidden'}" data-indicator-completion-panel="${x.id}">${indicatorAssistHtml(x)}</div>
  <details class="indicator-tech-detail"><summary>Ver y completar ficha técnica</summary>
   ${!q.ok?'<div class="indicator-pending-list"><strong>Datos pendientes</strong><ul>'+q.issues.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></div>':''}
   <div class="completion-grid"><label>Fórmula o criterio<textarea data-ind-field="${x.id}:formula">${esc(x.formula)}</textarea></label><label>Unidad<textarea data-ind-field="${x.id}:unidad">${esc(x.unidad)}</textarea></label><label>Línea base<textarea data-ind-field="${x.id}:lineaBase">${esc(x.lineaBase)}</textarea></label><label>Meta<textarea data-ind-field="${x.id}:meta">${esc(x.meta)}</textarea></label><label>Medio de verificación<textarea data-ind-field="${x.id}:medioVerificacion">${esc(x.medioVerificacion)}</textarea></label><label>Periodicidad<textarea data-ind-field="${x.id}:periodicidad">${esc(x.periodicidad)}</textarea></label><label>Responsable<textarea data-ind-field="${x.id}:responsable">${esc(x.responsable)}</textarea></label><label>Plazo<textarea data-ind-field="${x.id}:plazo">${esc(x.plazo)}</textarea></label></div>
   ${(x.verificationSuggestions||[]).length?`<div class="verification-suggestions"><small>Fuentes que podrían servir, si existen en tu proyecto:</small>${x.verificationSuggestions.map((v,i)=>`<button type="button" data-use-verification="${x.id}:${i}">${esc(v)}</button>`).join('')}</div>`:''}
  </details>
  <div class="didactic-actions">${x.confirmed&&x.selected?'<span class="indicator-approved-action">Indicador aprobado ✓</span><button type="button" data-ind-reopen="'+x.id+'">Reabrir para editar la definición</button>':'<button data-ind-confirm="'+x.id+'" class="primary">Aprobar este indicador</button>'}<button type="button" data-ind-skip="${x.id}">${x.selected||x.confirmed?'No usar esta propuesta':'Propuesta no seleccionada'}</button></div>
 </article><div class="didactic-nav"><button id="indPrev" ${cursors.S12===0?'disabled':''}>← Indicador anterior</button><button id="indNext">${cursors.S12>=xs.length-1?'Continuar a S13 →':'Siguiente indicador →'}</button></div>`:'<div class="completion-note"><strong>Aún no hay indicadores para revisar.</strong><p>Confirma primero resultados y actividades.</p></div>'}
 <div class="completion-toolbar"><button id="exportFull">Ver respaldo técnico en Excel</button></div></section>`;bindS12(s)
}
function bindS12(s){
 document.querySelectorAll('[data-accept-schedule]').forEach(b=>b.onclick=()=>{const [id,k]=b.dataset.acceptSchedule.split(':');const x=s.items.find(i=>i.id===id);const rec=x?.scheduleReconciliation?.fields?.[k];if(!x||!rec?.value)return;x[k]=rec.value;x.technicalStatus=indicatorQuality(x).ok?'COMPLETA':'PENDIENTE';x.verificationStatus=x.technicalStatus==='COMPLETA'&&x.confirmed?'VERIFICADO':'POR_VERIFICAR';x.provenanceDetails={...(x.provenanceDetails||{}),[k]:{source:'S13',acceptedAt:new Date().toISOString(),value:rec.value}};write('S12',s);renderS12()});
 document.querySelectorAll('[data-open-indicator-completion]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.openIndicatorCompletion);if(!x)return;x.showCompletionHelp=!x.showCompletionHelp;write('S12',s);renderS12()});
 document.querySelectorAll('[data-ind-assist]').forEach(b=>b.onclick=()=>{const [id,k,...rest]=b.dataset.indAssist.split(':');const x=s.items.find(i=>i.id===id);if(!x)return;x[k]=rest.join(':');x.technicalStatus=indicatorQuality(x).ok?'COMPLETA':'PENDIENTE';x.verificationStatus=x.technicalStatus==='COMPLETA'&&x.confirmed?'VERIFICADO':'POR_VERIFICAR';write('S12',s);renderS12()});
 document.querySelectorAll('[data-ind-keep-pending]').forEach(b=>b.onclick=()=>{const [id,k]=b.dataset.indKeepPending.split(':');const x=s.items.find(i=>i.id===id);if(!x)return;x[k]='[POR VERIFICAR]';x.technicalStatus='PENDIENTE';x.verificationStatus='POR_VERIFICAR';write('S12',s);renderS12()});
 document.querySelectorAll('[data-ind-help]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.indHelp);if(!x)return;x.showHelp=!x.showHelp;write('S12',s);renderS12()});
 document.querySelectorAll('[data-use-indicator]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useIndicator.split(':');const x=s.items.find(i=>i.id===id);if(!x)return;const g=indicatorHelp(x),v=(g.suggestions||[])[Number(idx)];if(v){x.indicator=v;x.selected=true;x.dismissed=false;x.confirmed=false;x.definitionStatus='PENDIENTE';x.technicalStatus=indicatorQuality(x).ok?'COMPLETA':'PENDIENTE';x.verificationStatus='POR_VERIFICAR';x.showHelp=false;write('S12',s);renderS12()}});
 document.querySelectorAll('[data-ind-field]').forEach(el=>el.oninput=()=>{const [id,k]=el.dataset.indField.split(':');const x=s.items.find(i=>i.id===id);if(!x)return;x[k]=el.value.trim()||'[POR VERIFICAR]';if(k==='indicator'){x.selected=true;x.dismissed=false;x.confirmed=false;x.definitionStatus='PENDIENTE'}x.technicalStatus=indicatorQuality(x).ok?'COMPLETA':'PENDIENTE';x.verificationStatus=x.technicalStatus==='COMPLETA'&&x.confirmed?'VERIFICADO':'POR_VERIFICAR';write('S12',s);renderS12()});
 document.querySelectorAll('[data-ind-jump]').forEach(b=>b.onclick=()=>{const idx=s.items.findIndex(i=>i.id===b.dataset.indJump);if(idx>=0){cursors.S12=idx;renderS12()}});
 document.querySelectorAll('[data-use-verification]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useVerification.split(':');const x=s.items.find(i=>i.id===id),v=(x.verificationSuggestions||[])[Number(idx)];if(v){x.medioVerificacion=v;x.technicalStatus=indicatorQuality(x).ok?'COMPLETA':'PENDIENTE';x.verificationStatus=x.technicalStatus==='COMPLETA'&&x.confirmed?'VERIFICADO':'POR_VERIFICAR';write('S12',s);renderS12()}});
 document.querySelectorAll('[data-ind-confirm]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.indConfirm);if(!x)return;document.querySelectorAll('[data-ind-field^="'+x.id+':"]').forEach(el=>{const [,k]=el.dataset.indField.split(':');x[k]=el.value.trim()||'[POR VERIFICAR]'});const invalid=!x.indicator?.trim()||window.fcWriting?.isPlaceholder?.(x.indicator);if(invalid){alert('Antes de aprobar, el indicador necesita una redacción suficientemente precisa. Usa “Ayúdame a formularlo” o edítalo.');return}const q=indicatorQuality(x);x.selected=true;x.dismissed=false;x.confirmed=true;x.definitionStatus='DEFINIDO';x.technicalStatus=q.ok?'COMPLETA':'PENDIENTE';x.verificationStatus=q.ok?'VERIFICADO':'POR_VERIFICAR';write('S12',s);sync('S12');window.fcRenderJourney?.();renderS12()});
 document.querySelectorAll('[data-ind-reopen]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.indReopen);if(!x)return;x.confirmed=false;x.definitionStatus='PENDIENTE';x.verificationStatus='POR_VERIFICAR';write('S12',s);sync('S12');window.fcRenderJourney?.();renderS12()});
 document.querySelectorAll('[data-ind-skip]').forEach(b=>b.onclick=async()=>{const x=s.items.find(i=>i.id===b.dataset.indSkip);if(!x)return;x.selected=false;x.dismissed=true;x.confirmed=false;x.definitionStatus='NO_SELECCIONADO';x.verificationStatus='NO_APLICA';write('S12',s);sync('S12');if(cursors.S12<s.items.length-1){cursors.S12+=1;renderS12();return}window.fcRenderJourney?.();if(typeof window.fcNavigate==='function')await window.fcNavigate('S13')});
 $('#indPrev')&&($('#indPrev').onclick=()=>{cursors.S12=Math.max(0,cursors.S12-1);renderS12()}); $('#indNext')&&($('#indNext').onclick=async()=>{const current=s.items[cursors.S12];if(current?.selected!==false&&!current?.confirmed){continueView('[data-ind-confirm="'+current.id+'"]','#completionS12 .didactic-card');alert('Aprueba este indicador o marca “No usar esta propuesta” antes de continuar. Los datos técnicos que aún falten pueden quedar como [POR VERIFICAR].');return}if(cursors.S12<s.items.length-1){cursors.S12+=1;const next=s.items[cursors.S12];renderS12();const id=next?.id,q=next?indicatorQuality(next):null;const target=next?.selected!==false&&!next?.confirmed?'[data-ind-field="'+id+':indicator"]':q&&!q.ok?'[data-open-indicator-completion="'+id+'"]':'.indicator-card';continueView(target,'#completionS12 .didactic-card');return}window.fcRenderJourney?.();if(typeof window.fcNavigate==='function')await window.fcNavigate('S13');continueView('#fields .plan-card','#fields .plan-wrap')});
 $('#exportFull')&&($('#exportFull').onclick=()=>window.fcExportCompleteWorkbook?.())
}
function mount(){const c=$('#counter')?.textContent||'';if(c.startsWith('S10')&&!$('#completionS10'))renderS10();else if(c.startsWith('S11')&&!$('#completionS11'))renderS11();else if(c.startsWith('S12')&&!$('#completionS12'))renderS12()}
window.fcRefreshCompletionSection=code=>{if(code==='S10'&&($('#counter')?.textContent||'').startsWith('S10'))renderS10();if(code==='S11'&&($('#counter')?.textContent||'').startsWith('S11'))renderS11();if(code==='S12'&&($('#counter')?.textContent||'').startsWith('S12'))renderS12()};window.fcGetAlternatives=()=>ensureS10().items||[];window.fcGetActivities=()=>ensureS11().items||[];window.fcGetIndicators=()=>ensureS12().items||[];window.fcGetAlternativesSnapshot=()=>JSON.parse(JSON.stringify(read('S10').items||[]));window.fcGetActivitiesSnapshot=()=>JSON.parse(JSON.stringify(read('S11').items||[]));window.fcGetIndicatorsSnapshot=()=>JSON.parse(JSON.stringify(read('S12').items||[]));window.fcReconcileIndicatorsFromSchedule=()=>reconcileIndicatorsFromSchedule(ensureS12());window.fcFocusIndicator=async(id,{openCompletion=true}={})=>{const s=ensureS12(),idx=s.items.findIndex(x=>x.id===id||x.indicatorId===id);if(idx<0)return false;cursors.S12=idx;const x=s.items[idx];if(openCompletion)x.showCompletionHelp=true;write('S12',s);if(typeof window.fcNavigate==='function')await window.fcNavigate('S12');setTimeout(()=>renderS12(),0);return true};window.fcFocusResultActivities=async id=>{focusedResultId=id;const s=ensureS11(),idx=s.items.findIndex(x=>x.resultId===id);if(idx>=0)cursors.S11=idx;if(typeof window.fcNavigate==='function')await window.fcNavigate('S11');setTimeout(()=>renderS11(),0);return true};
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});mount();
})();