(()=>{
const $=s=>document.querySelector(s);const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEYS={S10:'formulador-cultural-alternatives-v1',S11:'formulador-cultural-activities-v1',S12:'formulador-cultural-indicators-v1'};const cursors={S10:0,S11:0,S12:0};const indicatorSteps={};
function read(code){try{return draft?.[code]?.completion_state||JSON.parse(localStorage.getItem(KEYS[code])||'{}')}catch{return {}}}
function write(code,state){state.updatedAt=new Date().toISOString();localStorage.setItem(KEYS[code],JSON.stringify(state));if(typeof draft!=='undefined'){draft[code]=draft[code]||{};draft[code].completion_state=state;localStorage.setItem(storeKey,JSON.stringify(draft))}}
function objectives(){try{return draft?.S09?.objectives_state||JSON.parse(localStorage.getItem('formulador-cultural-objectives-v1')||'{}')}catch{return {}}}
function confirmedMeans(){return (objectives().items||[]).filter(x=>x.confirmed&&(x.zone==='direct_cause'||x.zone==='indirect_cause')).map(x=>({id:x.id,text:x.text,zone:x.zone}))}
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
 if(!means.length&&Array.isArray(s.items)&&s.items.length)return s;
 if(!s.items||s.sourceSignature!==sig){
   const old=new Map((s.items||[]).map(x=>[x.id,x]));
   s={sourceSignature:sig,items:makeAlternatives().map(x=>old.get(x.id)||x),updatedAt:null};write('S10',s)
 }
 return s
}
function activityProposals(){
 const alt=selectedAlternative();if(!alt)return[];
 const allowed=new Set(alt.sourceIds||[]),res=confirmedResults().filter(r=>allowed.has(r.objectiveId));
 let out=[];
 for(const r of res){
   const base={objectiveId:r.objectiveId,objectiveText:r.objectiveText||'',resultId:r.id,resultText:r.text,status:'propuesta',note:''};
   const proposals=window.fcWriting?.activityProposals?window.fcWriting.activityProposals(r.text,r.objectiveText):['[POR REVISAR] Definir una actividad concreta para: '+r.text];
   proposals.forEach((text,i)=>out.push({...base,id:`ACT-${r.id}-${i+1}`,text,confirmed:false}))
 }
 return out
}
function ensureS11(){
 let s=read('S11'),alt=selectedAlternative(),res=confirmedResults().filter(r=>alt?.sourceIds?.includes(r.objectiveId));
 const sig=alt?`${alt.id}:${(alt.sourceIds||[]).join(',')}|${res.map(r=>r.id+':'+r.text).join('|')}`:'';
 if(!s.items||s.sourceSignature!==sig){
   const old=s.items||[],validResultIds=new Set(res.map(r=>r.id)),items=[];
   for(const r of res){
     const existing=old.filter(x=>x.resultId===r.id||(!x.resultId&&x.objectiveId===r.objectiveId));
     if(existing.length){
       for(const x of existing)items.push({...x,objectiveId:r.objectiveId,objectiveText:r.objectiveText||x.objectiveText||'',resultId:r.id,resultText:r.text})
     }else{
       items.push(...activityProposals().filter(x=>x.resultId===r.id))
     }
   }
   for(const x of old){
     if(x.status==='risk_response'&&x.resultId&&validResultIds.has(x.resultId)&&!items.some(y=>y.id===x.id))items.push(x)
   }
   s={sourceSignature:sig,alternativeId:alt?.id||'',alternativeText:alt?.text||'',items,updatedAt:new Date().toISOString()};write('S11',s)
 }
 return s
}
function indicatorProposal(source,i,type='Actividad'){
 const linkedId=source.id,linkedText=source.text||source.activityText||source.objectiveText||'';
 const indicator=window.fcWriting?.indicatorProposal?window.fcWriting.indicatorProposal(linkedText,type):'[POR REVISAR]';
 return{id:`I${i+1}`,linkedType:type,linkedId,linkedText,activityId:type==='Actividad'?linkedId:'',activityText:type==='Actividad'?linkedText:'',resultId:type==='Resultado'?linkedId:'',objectiveId:type==='Objetivo'?linkedId:'',indicator,formula:'[POR VERIFICAR]',meta:'[POR VERIFICAR]',lineaBase:'[POR VERIFICAR]',unidad:'[POR VERIFICAR]',periodicidad:'[POR VERIFICAR]',medioVerificacion:'[POR VERIFICAR]',responsable:'[POR VERIFICAR]',plazo:'[POR VERIFICAR]',confirmed:false}
}
function indicatorSources(){
 const out=[];confirmedActivities().forEach(x=>out.push({source:x,type:'Actividad'}));
 try{(window.fcGetResults?.()||draft?.S11?.results_state?.items||[]).filter(x=>x.confirmed).forEach(x=>out.push({source:x,type:'Resultado'}))}catch{}
 try{const central=(draft?.S09?.objectives_state?.items||[]).find(x=>x.confirmed&&x.zone==='central');if(central)out.push({source:central,type:'Objetivo'})}catch{}
 return out
}
function ensureS12(){let s=read('S12');const src=indicatorSources(),sig=src.map(x=>`${x.type}:${x.source.id}:${x.source.text}`).join('|');if(!s.items||s.sourceSignature!==sig){const old=new Map((s.items||[]).map(x=>[(x.linkedType||'Actividad')+':'+(x.linkedId||x.activityId),x]));s={sourceSignature:sig,items:src.map((x,i)=>{const prev=old.get(x.type+':'+x.source.id);return prev?{...prev,formula:prev.formula||'[POR VERIFICAR]',linkedType:x.type,linkedId:x.source.id,linkedText:x.source.text||x.source.activityText||x.source.objectiveText||'',activityId:x.type==='Actividad'?x.source.id:'',activityText:x.type==='Actividad'?(x.source.text||''):'',resultId:x.type==='Resultado'?x.source.id:'',objectiveId:x.type==='Objetivo'?x.source.id:(prev.objectiveId||'')}:indicatorProposal(x.source,i,x.type)}),updatedAt:null};write('S12',s)}return s}
function sync(code){if(typeof session!=='undefined'&&session&&typeof syncSection==='function')syncSection(code).catch(()=>{})}
function renderS10(){
 const host=$('#fields');if(!host)return;const s=ensureS10(),xs=s.items||[];cursors.S10=Math.min(cursors.S10,Math.max(0,xs.length-1));const x=xs[cursors.S10];
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
       <div class="writing-source"><small>La herramienta está usando como base:</small>${sourceMeansForAlternative(x).map(m=>`<p>• ${esc(cleanSourceText(m.text))}</p>`).join('')||'<p>• Objetivos previamente registrados [POR VERIFICAR]</p>'}</div>
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
 document.querySelectorAll('[data-alt-text]').forEach(el=>el.onchange=()=>{const x=s.items.find(i=>i.id===el.dataset.altText);x.text=el.value.trim();x.confirmed=false;write('S10',s)});
 document.querySelectorAll('[data-writing-help]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.writingHelp);x.showWritingHelp=!x.showWritingHelp;renderS10()});
 document.querySelectorAll('[data-use-writing]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useWriting.split(':');const x=s.items.find(i=>i.id===id),p=writingProposals(x)[Number(idx)];if(!p)return;x.text=p;x.confirmed=false;x.showWritingHelp=false;write('S10',s);renderS10()});
 document.querySelectorAll('[data-alt-decision]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.altDecision.split(':');const x=s.items.find(i=>i.id===id);x.decision=v;write('S10',s);renderS10()});
 document.querySelectorAll('[data-alt-score]').forEach(el=>el.onchange=()=>{const [id,k]=el.dataset.altScore.split(':');const x=s.items.find(i=>i.id===id);x.scores[k]=el.value?Number(el.value):'';write('S10',s)});
 document.querySelectorAll('[data-alt-note]').forEach(el=>el.onchange=()=>{const x=s.items.find(i=>i.id===el.dataset.altNote);x.note=el.value.trim();write('S10',s)});
 document.querySelectorAll('[data-alt-confirm]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.altConfirm);x.confirmed=!!x.text.trim()&&!window.fcWriting?.isPlaceholder?.(x.text);if(!x.confirmed&&window.fcWriting?.isPlaceholder?.(x.text)){alert('Antes de confirmar la alternativa, reemplaza la marca [POR REVISAR] por una estrategia concreta.')}write('S10',s);sync('S10');renderS10()});
 document.querySelectorAll('[data-alt-select]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.altSelect);if(!x.confirmed){x.confirmed=!!x.text.trim()&&!window.fcWriting?.isPlaceholder?.(x.text)}if(!x.confirmed){alert('Antes de elegir esta alternativa, redacta una estrategia concreta.');return}s.items.forEach(i=>i.selected=i.id===b.dataset.altSelect);write('S10',s);sync('S10');renderS10()});
 $('#altPrev')&&($('#altPrev').onclick=()=>{cursors.S10=Math.max(0,cursors.S10-1);renderS10()});$('#altNext')&&($('#altNext').onclick=()=>{cursors.S10=Math.min(s.items.length-1,cursors.S10+1);renderS10()});
 $('#goS11')?.addEventListener('click',()=>window.fcNavigate?.('S11'))
}
function renderS11(){
 const host=$('#fields');if(!host)return;const s=ensureS11(),xs=s.items||[];cursors.S11=Math.min(cursors.S11,Math.max(0,xs.length-1));const x=xs[cursors.S11];
 host.innerHTML=`<section id="completionS11" class="completion-wrap didactic-flow"><div class="didactic-intro"><strong>Elegir las actividades necesarias</strong><p>Revisa una actividad por vez. Cada actividad debe ayudar a producir un resultado ya aprobado.</p></div>
 ${x?`<div class="didactic-progress">Actividad ${cursors.S11+1} de ${xs.length}</div><article class="didactic-card"><small>Resultado al que aporta</small><div class="didactic-context">${esc(x.resultText||x.objectiveText||'[POR VERIFICAR]')}</div><div class="didactic-question">¿Esta actividad es necesaria para lograr ese resultado?</div><label class="didactic-main-label">Actividad propuesta<textarea data-act-text="${x.id}">${esc(x.text)}</textarea></label><div class="didactic-actions"><button data-act-confirm="${x.id}" class="${x.confirmed?'primary':''}">${x.confirmed?'Actividad aprobada ✓':'Sí, aprobar actividad'}</button><button data-act-delete="${x.id}">No, eliminarla</button></div><details class="didactic-detail"><summary>Agregar una observación</summary><textarea data-act-note="${x.id}" placeholder="Opcional">${esc(x.note||'')}</textarea></details></article><div class="didactic-nav"><button id="actPrev" ${cursors.S11===0?'disabled':''}>← Anterior</button><button id="actNext" ${cursors.S11>=xs.length-1?'disabled':''}>Siguiente →</button></div>`:'<div class="completion-note"><strong>Faltan resultados aprobados.</strong><p>Confirma primero al menos un resultado en esta sección.</p></div>'}
 <div class="completion-toolbar"><button id="addAct">+ Añadir otra actividad</button><button id="goS12" class="primary" ${xs.some(i=>i.confirmed)?'':'disabled'}>Continuar</button></div></section>`;bindS11(s)
}
function bindS11(s){
 document.querySelectorAll('[data-act-text]').forEach(el=>el.onchange=()=>{const x=s.items.find(i=>i.id===el.dataset.actText);x.text=el.value.trim();x.confirmed=false;write('S11',s)});
 document.querySelectorAll('[data-act-note]').forEach(el=>el.onchange=()=>{const x=s.items.find(i=>i.id===el.dataset.actNote);x.note=el.value.trim();write('S11',s)});
 document.querySelectorAll('[data-act-confirm]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.actConfirm);x.confirmed=!!x.text.trim()&&!window.fcWriting?.isPlaceholder?.(x.text);if(!x.confirmed&&window.fcWriting?.isPlaceholder?.(x.text)){alert('Antes de aprobar la actividad, reemplaza la marca [POR REVISAR] por una acción concreta.')}write('S11',s);sync('S11');renderS11()});
 document.querySelectorAll('[data-act-delete]').forEach(b=>b.onclick=()=>{s.items=s.items.filter(i=>i.id!==b.dataset.actDelete);cursors.S11=Math.max(0,Math.min(cursors.S11,s.items.length-1));write('S11',s);renderS11()});
 $('#addAct')&&($('#addAct').onclick=()=>{const id=`ACT${s.items.length+1}-${Date.now().toString().slice(-4)}`;s.items.push({id,objectiveId:'',objectiveText:'Actividad adicional',resultId:'',resultText:'[POR VERIFICAR]',text:'',confirmed:false,status:'manual',note:''});cursors.S11=s.items.length-1;write('S11',s);renderS11()});
 $('#actPrev')&&($('#actPrev').onclick=()=>{cursors.S11=Math.max(0,cursors.S11-1);renderS11()});$('#actNext')&&($('#actNext').onclick=()=>{cursors.S11=Math.min(s.items.length-1,cursors.S11+1);renderS11()});
 $('#goS12')?.addEventListener('click',()=>window.fcNavigate?.('S12'))
}
function indicatorHelp(x){return window.fcWriting?.indicatorGuidance?window.fcWriting.indicatorGuidance(x.linkedText||x.activityText||'',x.linkedType||'Actividad'):{level:'Indicador',purpose:'Define una medida verificable.',question:'¿Qué vamos a medir?',formulaHint:'Explica cómo se obtiene el dato.',unitHint:'Define una unidad.',suggestions:[x.indicator],formulaExamples:[]}}
function indicatorQuality(x){return window.fcWriting?.indicatorQuality?window.fcWriting.indicatorQuality(x):{ok:false,issues:['Completa los datos del indicador.']}}
function indicatorStepHtml(x,step){
 const g=indicatorHelp(x);
 if(step===1)return `<div class="indicator-step"><span class="indicator-step-tag">Paso 1 de 4</span><h4>Definir qué vamos a medir</h4><p>${esc(g.question)}</p><label class="didactic-main-label">Indicador<textarea data-ind-field="${x.id}:indicator">${esc(x.indicator)}</textarea></label><div class="indicator-help"><button type="button" data-ind-help="${x.id}">Ayúdame a formularlo</button><div class="writing-help-panel ${x.showHelp?'':'hidden'}"><strong>${esc(g.level)}</strong><p>${esc(g.purpose)}</p>${(g.suggestions||[]).map((s,i)=>`<article><small>Propuesta ${i+1}</small><p>${esc(s)}</p><button type="button" data-use-indicator="${x.id}:${i}">Usar esta propuesta</button></article>`).join('')}</div></div></div>`;
 if(step===2)return `<div class="indicator-step"><span class="indicator-step-tag">Paso 2 de 4</span><h4>Explicar cómo se obtiene el dato</h4><p>${esc(g.formulaHint)}</p><label class="didactic-main-label">Fórmula o criterio de cálculo<textarea data-ind-field="${x.id}:formula">${esc(x.formula)}</textarea></label><label class="didactic-main-label">Unidad de medida<textarea data-ind-field="${x.id}:unidad" placeholder="${esc(g.unitHint)}">${esc(x.unidad)}</textarea></label><details class="didactic-detail"><summary>Ver ejemplos de fórmula</summary>${(g.formulaExamples||[]).map(v=>`<p>• ${esc(v)}</p>`).join('')}</details></div>`;
 if(step===3)return `<div class="indicator-step"><span class="indicator-step-tag">Paso 3 de 4</span><h4>Definir desde dónde partimos y a dónde queremos llegar</h4><div class="indicator-baseline-note">La meta tiene sentido cuando puede compararse con una línea base. Si aún no existe el dato inicial, conserva <b>[POR VERIFICAR]</b> y no inventes una cifra.</div><label class="didactic-main-label">Línea base<textarea data-ind-field="${x.id}:lineaBase">${esc(x.lineaBase)}</textarea></label><label class="didactic-main-label">Meta<textarea data-ind-field="${x.id}:meta">${esc(x.meta)}</textarea></label></div>`;
 return `<div class="indicator-step"><span class="indicator-step-tag">Paso 4 de 4</span><h4>Definir cómo y cuándo lo vamos a comprobar</h4><label class="didactic-main-label">Medio o fuente de verificación<textarea data-ind-field="${x.id}:medioVerificacion">${esc(x.medioVerificacion)}</textarea></label><div class="completion-grid"><label>Periodicidad<textarea data-ind-field="${x.id}:periodicidad">${esc(x.periodicidad)}</textarea></label><label>Plazo<textarea data-ind-field="${x.id}:plazo">${esc(x.plazo)}</textarea></label><label>Responsable<textarea data-ind-field="${x.id}:responsable">${esc(x.responsable)}</textarea></label></div></div>`
}
function renderS12(){
 const host=$('#fields');if(!host)return;const s=ensureS12(),xs=s.items||[];cursors.S12=Math.min(cursors.S12,Math.max(0,xs.length-1));const x=xs[cursors.S12];const step=x?(indicatorSteps[x.id]||1):1;const g=x?indicatorHelp(x):null;const q=x?indicatorQuality(x):null;
 host.innerHTML=`<section id="completionS12" class="completion-wrap didactic-flow"><div class="didactic-intro"><strong>Construir la batería de indicadores</strong><p>Trabajaremos un indicador por vez y en cuatro pasos. El sistema te ayudará a distinguir si estás midiendo ejecución, un resultado o el cambio del objetivo.</p></div>
 ${x?`<div class="didactic-progress">Indicador ${cursors.S12+1} de ${xs.length}</div><article class="didactic-card indicator-card"><div class="indicator-level"><small>${esc(x.linkedType||'Elemento')} relacionado</small><strong>${esc(g.level)}</strong></div><div class="didactic-context">${esc(x.linkedText||x.activityText||'')}</div><div class="didactic-suggestion"><small>Qué debe medir este nivel</small><p>${esc(g.purpose)}</p></div>${indicatorStepHtml(x,step)}<div class="indicator-step-nav"><button id="indicatorStepPrev" ${step===1?'disabled':''}>← Paso anterior</button><button id="indicatorStepNext" ${step===4?'disabled':''}>Siguiente paso →</button></div><div class="indicator-quality ${q.ok?'ok':'pending'}"><strong>${q.ok?'Indicador listo para aprobar':'Antes de aprobar, revisa:'}</strong>${q.ok?'<p>La ficha contiene los elementos mínimos para seguimiento.</p>':'<ul>'+q.issues.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>'}</div><div class="didactic-actions"><button data-ind-confirm="${x.id}" class="${x.confirmed?'primary':''}" ${q.ok?'':'disabled'}>${x.confirmed?'Indicador aprobado ✓':'Aprobar indicador'}</button></div></article><div class="didactic-nav"><button id="indPrev" ${cursors.S12===0?'disabled':''}>← Indicador anterior</button><button id="indNext" ${cursors.S12>=xs.length-1?'disabled':''}>Siguiente indicador →</button></div>`:'<div class="completion-note"><strong>Aún no hay indicadores para revisar.</strong><p>Confirma primero resultados y actividades.</p></div>'}
 <div class="completion-toolbar"><button id="exportFull">Ver respaldo técnico en Excel</button></div></section>`;bindS12(s)
}
function bindS12(s){
 document.querySelectorAll('[data-ind-field]').forEach(el=>el.onchange=()=>{const [id,k]=el.dataset.indField.split(':');const x=s.items.find(i=>i.id===id);x[k]=el.value.trim()||'[POR VERIFICAR]';x.confirmed=false;write('S12',s);renderS12()});
 document.querySelectorAll('[data-ind-help]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.indHelp);x.showHelp=!x.showHelp;renderS12()});
 document.querySelectorAll('[data-use-indicator]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useIndicator.split(':');const x=s.items.find(i=>i.id===id),g=indicatorHelp(x),v=(g.suggestions||[])[Number(idx)];if(v){x.indicator=v;x.confirmed=false;x.showHelp=false;write('S12',s);renderS12()}});
 document.querySelectorAll('[data-ind-confirm]').forEach(b=>b.onclick=()=>{const x=s.items.find(i=>i.id===b.dataset.indConfirm),q=indicatorQuality(x);x.confirmed=q.ok;if(!q.ok){alert('Aún faltan datos para aprobar este indicador. Revisa la lista de verificación.')}write('S12',s);sync('S12');renderS12()});
 $('#indicatorStepPrev')&&($('#indicatorStepPrev').onclick=()=>{const x=s.items[cursors.S12];indicatorSteps[x.id]=Math.max(1,(indicatorSteps[x.id]||1)-1);renderS12()});
 $('#indicatorStepNext')&&($('#indicatorStepNext').onclick=()=>{const x=s.items[cursors.S12];indicatorSteps[x.id]=Math.min(4,(indicatorSteps[x.id]||1)+1);renderS12()});
 $('#indPrev')&&($('#indPrev').onclick=()=>{cursors.S12=Math.max(0,cursors.S12-1);renderS12()});$('#indNext')&&($('#indNext').onclick=()=>{cursors.S12=Math.min(s.items.length-1,cursors.S12+1);renderS12()});
 $('#exportFull')&&($('#exportFull').onclick=()=>window.fcExportCompleteWorkbook?.())
}
function mount(){const c=$('#counter')?.textContent||'';if(c.startsWith('S10')&&!$('#completionS10'))renderS10();else if(c.startsWith('S11')&&!$('#completionS11'))renderS11();else if(c.startsWith('S12')&&!$('#completionS12'))renderS12()}
window.fcRefreshCompletionSection=code=>{if(code==='S10'&&($('#counter')?.textContent||'').startsWith('S10'))renderS10();if(code==='S11'&&($('#counter')?.textContent||'').startsWith('S11'))renderS11();if(code==='S12'&&($('#counter')?.textContent||'').startsWith('S12'))renderS12()};window.fcGetAlternatives=()=>ensureS10().items||[];window.fcGetActivities=()=>ensureS11().items||[];window.fcGetIndicators=()=>ensureS12().items||[];
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});mount();
})();