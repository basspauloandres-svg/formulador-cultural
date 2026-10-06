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
function render(){const host=$('#objectivesBody');if(!host)return;const c=counts();host.innerHTML=`${changed()?'<div class="objectives-warning"><strong>S07 cambió después de iniciar S09.</strong><p>Puedes conservar tus formulaciones o reconstruir las propuestas desde el árbol actualizado.</p><button type="button" id="refreshObjectives">Actualizar desde S07</button></div>':''}<div class="objectives-note"><strong>Regla metodológica</strong><p>El problema central se transforma en objetivo general. Las causas directas pueden convertirse en objetivos específicos. Las causas indirectas permanecen como medios que explican cómo alcanzar esos objetivos. Los efectos se convierten en fines esperados.</p></div><div class="objectives-summary"><div><span>Objetivo central</span><strong>${c.central}</strong></div><div><span>Medios</span><strong>${c.means}</strong></div><div><span>Fines</span><strong>${c.ends}</strong></div><div><span>Por revisar</span><strong>${c.pending}</strong></div></div><div class="objectives-toolbar"><button type="button" id="showObjectiveList" class="primary">Revisar formulaciones</button><button type="button" id="showObjectiveDiagram">Ver árbol de objetivos</button><button type="button" id="saveObjectives">Guardar S09</button><button type="button" id="exportObjectivesWorkbook">Generar Excel completo</button></div><div class="objectives-note"><strong>Excel completo</strong><p>La exportación reúne S01–S09, evidencia, preparación y matriz Vester, resultados, árbol de problemas, árbol de objetivos, relaciones y trazabilidad. Se genera localmente en tu navegador.</p></div><div id="objectivesContent">${listHtml()}</div>`;
$('#refreshObjectives')?.addEventListener('click',()=>{if(confirm('Se reconstruirán las propuestas desde S07. Las formulaciones confirmadas solo se conservarán cuando el texto fuente no haya cambiado. ¿Continuar?')){refreshFromTree(true);render()}});
$('#showObjectiveList').onclick=()=>{$('#objectivesContent').innerHTML=listHtml();bindItems()};
$('#showObjectiveDiagram').onclick=()=>{$('#objectivesContent').innerHTML=diagramHtml()};
$('#saveObjectives').onclick=async()=>{save();if(typeof session!=='undefined'&&session&&typeof syncSection==='function'){try{await syncSection('S09');if(typeof setStatus==='function')setStatus('S09 guardada y sincronizada en la nube.',true)}catch(e){if(typeof setStatus==='function')setStatus(`S09 guardada localmente. Error de sincronización: ${e.message||'desconocido'}`)}}else if(typeof setStatus==='function')setStatus('S09 guardada localmente. Inicia sesión para sincronizar.')};
$('#exportObjectivesWorkbook').onclick=async()=>{const btn=$('#exportObjectivesWorkbook');const old=btn.textContent;btn.disabled=true;btn.textContent='Generando Excel…';try{save();if(typeof window.fcExportCompleteWorkbook!=='function')throw new Error('El módulo de exportación no está disponible.');await window.fcExportCompleteWorkbook()}catch(e){console.error(e);alert(`No fue posible generar el Excel: ${e.message||'error desconocido'}`)}finally{btn.disabled=false;btn.textContent=old}};
bindItems()}
function bindItems(){document.querySelectorAll('[data-use-objective]').forEach(b=>b.onclick=()=>{const [id,idx]=b.dataset.useObjective.split(':');const item=state.items.find(x=>x.id===id);if(!item)return;item.text=objectiveProposals(item.sourceText,item.zone)[Number(idx)]||item.text;item.confirmed=false;save();render()});document.querySelectorAll('[data-suggest]').forEach(b=>b.onclick=()=>{const item=state.items.find(x=>x.id===b.dataset.suggest);if(!item)return;item.text=suggest(item.sourceText,item.zone);item.confirmed=false;save();render()});document.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>{const item=state.items.find(x=>x.id===b.dataset.confirm),ta=document.querySelector(`[data-obj-text="${b.dataset.confirm}"]`);if(!item||!ta)return;item.text=ta.value.trim();if(!item.text||/\[POR REVISAR\]/i.test(item.text)){item.confirmed=false;alert('Antes de confirmar, elige o escribe una formulación limpia, sin [POR REVISAR].');save();render();return}item.confirmed=true;save();render()});document.querySelectorAll('[data-obj-text]').forEach(ta=>ta.oninput=()=>{const item=state.items.find(x=>x.id===ta.dataset.objText);if(item){item.confirmed=false;item.text=ta.value}})}
function mount(){const counter=$('#counter'),fields=$('#fields');if(!counter||!fields||!counter.textContent.startsWith('S09'))return;if($('#objectivesWizard'))return;load();refreshFromTree(false);fields.innerHTML='<section id="objectivesWizard" class="objectives-wizard"><span class="objectives-mode">Árbol de objetivos</span><h3>Transformar el árbol de problemas en estados positivos deseados</h3><p>El sistema recupera S07 y propone reformulaciones. Ninguna se confirma automáticamente.</p><div id="objectivesBody"></div></section>';render()}
const obs=new MutationObserver(mount);obs.observe(document.body,{subtree:true,childList:true});mount();
})();