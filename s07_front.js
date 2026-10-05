(()=>{
const TREE_KEY='formulador-cultural-problem-tree-v1';
const $=s=>document.querySelector(s);
function readTree(){try{return JSON.parse(localStorage.getItem(TREE_KEY)||'{}')}catch{return {}}}
function counts(){const s=readTree(),nodes=s.nodes||[];const inside=nodes.filter(n=>n.zone&&n.zone!=='outside');const causes=inside.filter(n=>n.zone==='direct_cause'||n.zone==='indirect_cause');const effects=inside.filter(n=>n.zone==='direct_effect'||n.zone==='indirect_effect');const pending=inside.filter(n=>(n.zone==='indirect_cause'||n.zone==='indirect_effect')&&!n.parentId||!n.reviewed);const withoutJust=inside.filter(n=>n.zone!=='central'&&!String(n.justification||'').trim());return {total:inside.length,central:inside.filter(n=>n.zone==='central').length,causes:causes.length,effects:effects.length,pending:pending.length,withoutJust:withoutJust.length}}
function card(label,value){return `<div class="s07-stat"><span>${label}</span><strong>${value}</strong></div>`}
function enhance(){const wizard=$('#treeWizard');if(!wizard||wizard.dataset.frontEnhanced==='1')return;wizard.dataset.frontEnhanced='1';
  const oldActions=wizard.querySelector('.tree-actions');
  if(oldActions){
    oldActions.classList.add('s07-context-actions');
    [...oldActions.querySelectorAll('button')].forEach(btn=>{
      const keep=btn.matches('[data-tree-help="easy"]')||btn.matches('[data-tree-phase="direct_cause"]')||btn.matches('[data-tree-phase="direct_effect"]')||btn.matches('[data-tree-help="where"]');
      if(!keep)btn.classList.add('s07-secondary-hidden');
    });
  }
  const body=wizard.querySelector('#treeBody'); if(!body)return;
  const summary=document.createElement('section');summary.id='s07AnalysisSummary';summary.className='s07-summary';
  summary.innerHTML=`<div class="s07-section-head"><div><strong>Vista del análisis</strong><p>Representación visual de lo ya confirmado en el árbol.</p></div><button type="button" id="s07OpenDiagram">Ver árbol completo</button></div><div id="s07DiagramSlot"></div><section class="s07-state"><strong>Estado del árbol</strong><div id="s07Stats" class="s07-stats"></div><button type="button" id="s07Review">Revisar coherencia</button></section><section class="s07-output"><strong>Salida del análisis</strong><p>El Excel se generará desde la información estructurada del árbol. No tendrás que volver a diligenciarla.</p><div id="s07ExportReview" class="s07-export-review"></div><div class="s07-output-actions"><button type="button" id="s07PreExport">Revisar antes de exportar</button><button type="button" id="s07Excel" class="primary" disabled title="La generación del archivo se conectará en el siguiente bloque.">Generar Excel del análisis</button><button type="button" id="s07Objectives" disabled title="Se conectará cuando diseñemos el árbol de objetivos.">Continuar a árbol de objetivos</button></div><small>Generar Excel y árbol de objetivos quedan visibles como próximos pasos, pero todavía no ejecutan acciones.</small></section>`;
  wizard.appendChild(summary);
  function update(){const c=counts();const stats=wizard.querySelector('#s07Stats');if(stats)stats.innerHTML=[card('Problema central',c.central),card('Causas',c.causes),card('Efectos',c.effects),card('Por revisar',c.pending)].join('');const review=wizard.querySelector('#s07ExportReview');if(review)review.innerHTML=`<strong>Antes de exportar</strong><span>${c.central===1?'✓':'⚠'} ${c.central} problema central</span><span>✓ ${c.causes} causas registradas</span><span>✓ ${c.effects} efectos registrados</span><span>${c.pending?'⚠':'✓'} ${c.pending} elementos por revisar</span><span>${c.withoutJust?'⚠':'✓'} ${c.withoutJust} relaciones sin justificación</span>`}
  update();
  wizard.querySelector('#s07OpenDiagram')?.addEventListener('click',()=>{const existing=wizard.querySelector('#showTreeDiagram');if(existing){existing.click();setTimeout(()=>wizard.querySelector('#treeDiagramPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return}const full=wizard.querySelector('[data-tree-phase="full"]');if(full)full.click()});
  wizard.querySelector('#s07Review')?.addEventListener('click',()=>wizard.querySelector('[data-tree-phase="review"]')?.click());
  wizard.querySelector('#s07PreExport')?.addEventListener('click',()=>{update();wizard.querySelector('#s07ExportReview')?.scrollIntoView({behavior:'smooth',block:'center'})});
  const obs=new MutationObserver(update);obs.observe(body,{subtree:true,childList:true,characterData:true});
}
const observer=new MutationObserver(enhance);observer.observe(document.body,{subtree:true,childList:true});enhance();
})();
