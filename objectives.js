(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEY='formulador-cultural-objectives-v1';
const TREE_KEY='formulador-cultural-problem-tree-v1';
const MAP={central:'Objetivo central',direct_cause:'Medio directo',indirect_cause:'Medio indirecto',direct_effect:'Fin directo',indirect_effect:'Fin indirecto'};
let state={items:[],sourceSignature:'',updatedAt:null};let cursor=0;
function readTree(){try{return draft?.S07?.tree_state||JSON.parse(localStorage.getItem(TREE_KEY)||'{}')}catch{return {}}}
function sourceNodes(){return (readTree()?.nodes||[]).filter(n=>MAP[n.zone]).map(n=>({id:n.id,text:n.text,zone:n.zone,parentId:n.parentId||null}))}
function signature(){return sourceNodes().map(n=>`${n.id}:${n.zone}:${n.text}:${n.parentId||''}`).join('|')}
function load(){try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{};const cloud=typeof draft!=='undefined'?draft?.S09?.objectives_state:null;if(cloud){const lt=Date.parse(state.updatedAt||0)||0,ct=Date.parse(cloud.updatedAt||0)||0;if(!state.items.length||ct>=lt)state={...state,...cloud}}}
function save(){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));if(typeof draft!=='undefined'){draft.S09=draft.S09||{};draft.S09.objectives_state=state;draft.S09.objetivo_central=state.items.find(x=>x.zone==='central')?.text||'';draft.S09.medios_directos=state.items.filter(x=>x.zone==='direct_cause').map(x=>x.text).join('\n');draft.S09.medios_indirectos=state.items.filter(x=>x.zone==='indirect_cause').map(x=>x.text).join('\n');draft.S09.fines_directos=state.items.filter(x=>x.zone==='direct_effect').map(x=>x.text).join('\n');draft.S09.fines_indirectos=state.items.filter(x=>x.zone==='indirect_effect').map(x=>x.text).join('\n');localStorage.setItem(storeKey,JSON.stringify(draft))}}
function cleanProblemText(text){return window.fcWriting?.clean?window.fcWriting.clean(text):String(text||'').replace(/^\s*\d+[.)-]?\s*/,'').replace(/\s+/g,' ').trim()}
function objectiveProposals(text,zone){return window.fcWriting?.objectiveProposals?window.fcWriting.objectiveProposals(text,zone):['[POR REVISAR]']}
function suggest(text,zone){return objectiveProposals(text,zone)[0]}
function refreshFromTree(force=false){const src=sourceNodes(),sig=signature();if(!state.items.length||force){const old=new Map(state.items.map(x=>[x.id,x]));state.items=src.map(n=>{const prev=old.get(n.id);return prev&&prev.sourceText===n.text?{...prev,zone:n.zone,parentId:n.parentId}:{id:n.id,zone:n.zone,parentId:n.parentId,sourceText:n.text,text:suggest(n.text,n.zone),confirmed:false}});state.sourceSignature=sig;save()}return sig}
function changed(){return !!state.sourceSignature&&state.sourceSignature!==signature()}
function transitionStatus(){
 const src=sourceNodes(),central=src.filter(n=>n.zone==='central'),direct=src.filter(n=>n.zone==='direct_cause'),effects=src.filter(n=>n.zone==='direct_effect'||n.zone==='indirect_effect');
 const sourceChanged=!!state.sourceSignature&&state.sourceSignature!==signature();
 const issues=[];
 if(central.length!==1)issues.push({code:'central',message:central.length?'Hay más de un problema central en S07.':'S07 no tiene un problema central confirmado.'});
 if(!direct.length)issues.push({code:'direct_causes',message:'El árbol no tiene causas directas. Sin ellas no se pueden formular objetivos específicos de manera consistente.'});
 if(sourceChanged)issues.push({code:'changed',message:'El árbol de problemas cambió después de la última construcción de S09.'});
 return {ok:issues.length===0,issues,centralCount:central.length,directCauseCount:direct.length,effectCount:effects.length,sourceChanged}
}
window.fcS09TransitionStatus=transitionStatus;
function counts(){return {central:state.items.filter(x=>x.zone==='central').length,means:state.items.filter(x=>x.zone==='direct_cause'||x.zone==='indirect_cause').length,ends:state.items.filter(x=>x.zone==='direct_effect'||x.zone==='indirect_effect').length,pending:state.items.filter(x=>!x.confirmed).length}}
function questionFor(x){
 if(x.zone==='central')return '¿Qué cambio principal debería lograr el proyecto frente a este problema?';
 if(x.zone==='direct_cause')return '¿Qué cambio debería lograrse sobre esta causa para contribuir directamente al objetivo general?';
 if(x.zone==='indirect_cause')return '¿Qué condición debería mejorar para apoyar uno de los objetivos específicos?';
 if(x.zone==='direct_effect')return 'Si el problema mejora, ¿qué efecto positivo esperamos observar después?';
 return 'Si el proyecto avanza, ¿qué cambio posterior podría esperarse como consecuencia?'
}
function guidanceFor(x){
 if(x.zone==='central')return 'Este será el objetivo general. Debe expresar el cambio principal que se busca alcanzar, sin describir todavía actividades.';
 if(x.zone==='direct_cause')return 'Esta causa puede convertirse en objetivo específico. Debe indicar qué aspecto concreto necesita cambiar para contribuir al objetivo general.';
 if(x.zone==='indirect_cause')return 'Este elemento funciona como medio de apoyo. Ayuda a explicar cómo alcanzar un objetivo específico, pero no se convierte automáticamente en objetivo específico.';
 return 'Este elemento expresa un fin esperado. Sirve para mostrar qué mejora podría observarse como consecuencia del proyecto.'
}
function writingReviewFor(x){
 return window.fcWriting?.objectiveWritingReview?window.fcWriting.objectiveWritingReview(x?.text||'',x?.zone||''):{ok:true,issues:[]}
}
function writingReviewHtml(x){
 const r=writingReviewFor(x);if(r.ok)return '';
 return '<div class="objective-writing-warning"><strong>Antes de confirmar</strong>'+r.issues.map(v=>'<p>'+esc(v)+'</p>').join('')+'<p>Puedes usar <b>Ayúdame a redactarlo</b> para convertir la idea en una formulación adecuada para este nivel.</p></div>'
}

function listHtml(){
 if(!state.items.length)return '<div class="objectives-warning"><strong>S07 no contiene un árbol utilizable.</strong><p>Define al menos el problema central y sus relaciones antes de construir S09.</p></div>';
 cursor=Math.min(cursor,Math.max(0,state.items.length-1));const x=state.items[cursor];
 return `<div class="objective-guided">
   <div class="objective-progress">Elemento ${cursor+1} de ${state.items.length}</div>
   <article class="objective-card guided-objective" data-obj="${x.id}">
     <div class="objective-step-head">
       <div><small>${esc(MAP[x.zone])}</small><strong>${esc(questionFor(x))}</strong></div>
       <span class="objective-status ${x.confirmed?'confirmed':'pending'}">${x.confirmed?'Confirmado':'Por revisar'}</span>
     </div>
     <div class="objective-source-box"><small>Viene del árbol de problemas</small><p>${esc(cleanProblemText(x.sourceText))}</p></div>
     <div class="objective-suggestion"><small>Orientación</small><p>${esc(guidanceFor(x))}</p></div>
     <label class="objective-main-label">Redacción propuesta<textarea data-obj-text="${x.id}" placeholder="Escribe el cambio deseado, no una actividad.">${esc(x.text)}</textarea></label>
     ${writingReviewHtml(x)}
     <div class="objective-writing-help">
       <button type="button" data-toggle-objective-help="${x.id}">Ayúdame a redactarlo</button>
       <div class="objective-proposals ${x.showHelp?'':'hidden'}">${objectiveProposals(x.sourceText,x.zone).map((p,i)=>`<article><small>Propuesta ${i+1}</small><p>${esc(p)}</p><button type="button" data-use-objective="${x.id}:${i}">Usar esta propuesta</button></article>`).join('')}</div>
     </div>
     <details class="objective-detail"><summary>Ver detalle metodológico</summary><p>${x.zone==='central'?'Problema central → objetivo general':x.zone==='direct_cause'?'Causa directa → objetivo específico':x.zone==='indirect_cause'?'Causa indirecta → medio':'Efecto → fin esperado'}</p></details>
     <div class="objective-actions"><button type="button" data-confirm="${x.id}" class="primary">${x.confirmed?'Objetivo revisado ✓':'Confirmar redacción'}</button></div>
   </article>
   <div class="objective-nav"><button type="button" id="objectivePrev" ${cursor===0?'disabled':''}>← Anterior</button><button type="button" id="objectiveNext" ${cursor>=state.items.length-1?'disabled':''}>Siguiente →</button></div>
 </div>`
}
function diagramHtml(){const order=['indirect_effect','direct_effect','central','direct_cause','indirect_cause'];return `<div class="objective-diagram">${order.map((z,i)=>{const xs=state.items.filter(x=>x.zone===z);return `<section class="objective-level"><h4>${esc(MAP[z])}</h4><div class="objective-level-grid">${xs.length?xs.map(x=>`<div class="objective-node ${z==='central'?'central':''}"><strong>${esc(x.text)}</strong><div class="objective-source">${x.confirmed?'Confirmado':'[POR REVISAR]'}</div></div>`).join(''):'<div class="objective-source">Sin elementos</div>'}</div></section>${i<order.length-1?'<div class="objective-arrow">↑</div>':''}`}).join('')}</div>`}
function render(){
 const host=$('#objectivesBody');if(!host)return;const c=counts(),gate=transitionStatus();
 host.innerHTML=`${!gate.ok?`<div class="objectives-warning objective-transition-warning"><strong>Antes de continuar, revisa la conexión con el árbol de problemas.</strong>${gate.issues.map(i=>`<p>• ${esc(i.message)}</p>`).join('')}<div class="objective-transition-actions"><button type="button" id="goReviewS07">Revisar S07 · árbol de problemas</button>${gate.sourceChanged?'<button type="button" id="refreshObjectives">Actualizar S09 desde S07</button>':''}</div></div>`:''}
 <div class="objective-guidance-head"><div><strong>Vamos uno por uno</strong><p>${c.pending?c.pending+' elemento(s) todavía requieren tu revisión.':'Todas las formulaciones fueron revisadas.'}</p></div><details><summary>Ver regla metodológica</summary><p>Problema central → objetivo general. Causa directa → objetivo específico. Causa indirecta → medio. Efecto → fin esperado.</p></details></div>
 <div id="objectivesContent">${listHtml()}</div>
 <div class="objectives-secondary"><button type="button" id="showObjectiveDiagram">Ver árbol de objetivos</button><button type="button" id="saveObjectives">Guardar S09</button><button type="button" id="exportObjectivesWorkbook">Exportar respaldo técnico</button></div>`;
 $('#goReviewS07')?.addEventListener('click',()=>window.fcNavigate?.('S07')); $('#refreshObjectives')?.addEventListener('click',()=>{if(confirm('Se reconstruirán las propuestas desde S07. Las formulaciones confirmadas solo se conservarán cuando el texto fuente no haya cambiado. ¿Continuar?')){refreshFromTree(true);cursor=0;render()}});
 $('#showObjectiveDiagram')?.addEventListener('click',()=>{const content=$('#objectivesContent');if(!content)return;content.innerHTML=diagramHtml();const back=document.createElement('button');back.type='button';back.id='backObjectiveGuide';back.textContent='← Volver a la revisión';back.className='objective-back';content.prepend(back);back.onclick=()=>render()});
 $('#saveObjectives')?.addEventListener('click',async()=>{save();if(typeof session!=='undefined'&&session&&typeof syncSection==='function'){try{await syncSection('S09');if(typeof setStatus==='function')setStatus('S09 guardada y sincronizada en la nube.',true)}catch(e){if(typeof setStatus==='function')setStatus(`S09 guardada localmente. Error de sincronización: ${e.message||'desconocido'}`)}}else if(typeof setStatus==='function')setStatus('S09 guardada localmente. Inicia sesión para sincronizar.')});
 $('#exportObjectivesWorkbook')?.addEventListener('click',async()=>{const btn=$('#exportObjectivesWorkbook'),old=btn.textContent;btn.disabled=true;btn.textContent='Generando…';try{save();if(typeof window.fcExportCompleteWorkbook!=='function')throw new Error('El módulo de exportación no está disponible.');await window.fcExportCompleteWorkbook()}catch(e){console.error(e);alert(`No fue posible generar el archivo: ${e.message||'error desconocido'}`)}finally{btn.disabled=false;btn.textContent=old}});
 bindItems()
}
function bindItems(){
 document.querySelectorAll('[data-toggle-objective-help]').forEach(b=>b.onclick=()=>{const item=state.items.find(x=>x.id===b.dataset.toggleObjectiveHelp);if(!item)return;item.showHelp=!item.showHelp;render()});
 document.querySelectorAll('[data-use-objective]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useObjective.split(':');const item=state.items.find(x=>x.id===id);if(!item)return;item.text=objectiveProposals(item.sourceText,item.zone)[Number(idx)]||item.text;item.confirmed=false;item.showHelp=false;save();render()});
 document.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>{const item=state.items.find(x=>x.id===b.dataset.confirm),ta=document.querySelector(`[data-obj-text="${b.dataset.confirm}"]`);if(!item||!ta)return;item.text=ta.value.trim();if(!item.text||/\[POR REVISAR\]/i.test(item.text)){item.confirmed=false;alert('Antes de confirmar, elige o escribe una formulación limpia, sin [POR REVISAR].');save();render();return}item.confirmed=true;save();render()});
 document.querySelectorAll('[data-obj-text]').forEach(ta=>ta.oninput=()=>{const item=state.items.find(x=>x.id===ta.dataset.objText);if(item){item.confirmed=false;item.text=ta.value}});
 $('#objectivePrev')&&($('#objectivePrev').onclick=()=>{cursor=Math.max(0,cursor-1);render()});
 $('#objectiveNext')&&($('#objectiveNext').onclick=()=>{cursor=Math.min(state.items.length-1,cursor+1);render()})
}
function mount(){const counter=$('#counter'),fields=$('#fields');if(!counter||!fields||!counter.textContent.startsWith('S09'))return;if($('#objectivesWizard'))return;load();refreshFromTree(false);fields.innerHTML='<section id="objectivesWizard" class="objectives-wizard"><span class="objectives-mode">Árbol de objetivos</span><h3>Definir qué queremos cambiar</h3><p>Revisaremos una situación por vez. La herramienta te explica qué tipo de cambio debes redactar y te propone opciones que puedes editar.</p><div id="objectivesBody"></div></section>';render()}
const obs=new MutationObserver(mount);obs.observe(document.body,{subtree:true,childList:true});mount();
})();