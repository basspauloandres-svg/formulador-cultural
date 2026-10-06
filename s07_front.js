(()=>{
const TREE_KEY='formulador-cultural-problem-tree-v1';
const $=s=>document.querySelector(s);
function readTree(){try{return JSON.parse(localStorage.getItem(TREE_KEY)||'{}')}catch{return {}}}
function counts(){const s=readTree(),nodes=s.nodes||[];const inside=nodes.filter(n=>n.zone&&n.zone!=='outside');const causes=inside.filter(n=>n.zone==='direct_cause'||n.zone==='indirect_cause');const effects=inside.filter(n=>n.zone==='direct_effect'||n.zone==='indirect_effect');const pending=nodes.filter(n=>n.zone!=='central'&&(((n.zone==='indirect_cause'||n.zone==='indirect_effect')&&!n.parentId)||!n.reviewed||n.zone==='outside'));const withoutJust=inside.filter(n=>n.zone!=='central'&&!String(n.justification||'').trim());return {total:inside.length,central:inside.filter(n=>n.zone==='central').length,causes:causes.length,effects:effects.length,pending:pending.length,withoutJust:withoutJust.length,pendingIds:pending.map(n=>n.id),withoutJustIds:withoutJust.map(n=>n.id)}}
function card(label,value,action,help){return `<button type="button" class="s07-stat s07-stat-link" data-s07-focus="${action}"><span>${label}</span><strong>${value}</strong><small>${help||'Abrir revisión'}</small></button>`}
function enhance(){const wizard=$('#treeWizard');if(!wizard||wizard.dataset.frontEnhanced==='1')return;wizard.dataset.frontEnhanced='1';
  const oldActions=wizard.querySelector('.tree-actions');
  if(oldActions){oldActions.classList.add('s07-context-actions');[...oldActions.querySelectorAll('button')].forEach(btn=>{const keep=btn.matches('[data-tree-help="easy"]')||btn.matches('[data-tree-phase="direct_cause"]')||btn.matches('[data-tree-phase="direct_effect"]')||btn.matches('[data-tree-help="where"]');if(!keep)btn.classList.add('s07-secondary-hidden')})}
  const body=wizard.querySelector('#treeBody'); if(!body)return;
  const summary=document.createElement('section');summary.id='s07AnalysisSummary';summary.className='s07-summary';
  summary.innerHTML=`<div class="s07-section-head"><div><strong>Vista del análisis</strong><p>Representación visual de lo ya confirmado en el árbol.</p></div><button type="button" id="s07OpenDiagram">Ver árbol completo</button></div><div id="s07DiagramSlot"></div><section class="s07-state"><strong>Estado del árbol</strong><div id="s07Stats" class="s07-stats"></div><button type="button" id="s07Review">Revisar coherencia</button></section><section class="s07-output"><strong>Salida del análisis</strong><p>El Excel completo reúne las secciones del proyecto, evidencia, Vester, árbol de problemas, árbol de objetivos y trazabilidad. Se genera desde la información ya registrada.</p><div id="s07ExportReview" class="s07-export-review"></div><div class="s07-output-actions"><button type="button" id="s07PreExport">Revisar antes de exportar</button><button type="button" id="s07Excel" class="primary">Generar Excel completo</button><button type="button" id="s07Objectives">Continuar a S09 · árbol de objetivos</button></div><small>La exportación conserva los elementos [POR VERIFICAR] y la trazabilidad metodológica.</small></section>`;
  wizard.appendChild(summary);
function openGuidedFocus(type){
  const flow=document.querySelector('#simpleTreeFlow');
  if(!flow)return;
  const ok=window.fcTreeFocus?.(type);
  if(ok===false){flow.scrollIntoView({behavior:'smooth',block:'start'});return}
  flow.scrollIntoView({behavior:'smooth',block:'start'})
}
function openJustification(){
  const c=counts(),id=c.withoutJustIds?.[0];if(!id)return;
  const technical=document.querySelector('.st-technical');if(technical)technical.open=true;
  if(window.fcTreeOpenTechnicalNode?.(id)!==false)return;
}
function bindCorrectionLinks(){
  wizard.querySelectorAll('[data-s07-focus]').forEach(b=>{b.onclick=()=>openGuidedFocus(b.dataset.s07Focus)});
  wizard.querySelectorAll('[data-s07-justification]').forEach(b=>{b.onclick=openJustification})
}

  function update(){const c=counts();const stats=wizard.querySelector('#s07Stats');if(stats)stats.innerHTML=[card('Problema central',c.central,'central','Revisar problema'),card('Causas',c.causes,'causes','Revisar causas'),card('Efectos',c.effects,'effects','Revisar efectos'),card('Por revisar',c.pending,'pending',c.pending?'Corregir pendientes':'Sin pendientes')].join('');const review=wizard.querySelector('#s07ExportReview');if(review)review.innerHTML=`<strong>Antes de exportar</strong><button type="button" data-s07-focus="central">${c.central===1?'✓':'⚠'} ${c.central} problema central</button><button type="button" data-s07-focus="causes">✓ ${c.causes} causas registradas</button><button type="button" data-s07-focus="effects">✓ ${c.effects} efectos registrados</button><button type="button" data-s07-focus="pending" ${c.pending?'':'disabled'}>${c.pending?'⚠':'✓'} ${c.pending} elementos por revisar</button><button type="button" data-s07-justification ${c.withoutJust?'':'disabled'}>${c.withoutJust?'⚠':'✓'} ${c.withoutJust} relaciones sin justificación</button>`}
  update();bindCorrectionLinks();
  wizard.querySelector('#s07OpenDiagram')?.addEventListener('click',()=>{const existing=wizard.querySelector('#showTreeDiagram');if(existing){existing.click();setTimeout(()=>wizard.querySelector('#treeDiagramPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return}const full=wizard.querySelector('[data-tree-phase="full"]');if(full)full.click()});
  wizard.querySelector('#s07Review')?.addEventListener('click',()=>wizard.querySelector('[data-tree-phase="review"]')?.click());
  wizard.querySelector('#s07PreExport')?.addEventListener('click',()=>{update();wizard.querySelector('#s07ExportReview')?.scrollIntoView({behavior:'smooth',block:'center'})});
  wizard.querySelector('#s07Excel')?.addEventListener('click',async()=>{const btn=wizard.querySelector('#s07Excel');btn.disabled=true;const old=btn.textContent;btn.textContent='Generando Excel…';try{if(typeof window.fcExportCompleteWorkbook!=='function'&&typeof window.fcExportProjectWorkbook!=='function')throw new Error('El módulo de exportación no está disponible.');await (window.fcExportCompleteWorkbook||window.fcExportProjectWorkbook)()}catch(e){console.error(e);alert(`No fue posible generar el Excel: ${e.message||'error desconocido'}`)}finally{btn.disabled=false;btn.textContent=old}});
  wizard.querySelector('#s07Objectives')?.addEventListener('click',async()=>{if(typeof window.fcNavigate==='function')await window.fcNavigate('S09');else{const nav=document.querySelector('#nav button[data-k="S09"]');nav?.click()}});
  const obs=new MutationObserver(()=>{update();bindCorrectionLinks()});obs.observe(body,{subtree:true,childList:true,characterData:true});
}
const observer=new MutationObserver(enhance);observer.observe(document.body,{subtree:true,childList:true});enhance();
})();