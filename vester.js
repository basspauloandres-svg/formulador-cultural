(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const VESTER_KEY='formulador-cultural-vester-v1';
let mounted=false;

function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return 'p'+(h>>>0).toString(36)}
function normalizeProblem(line){return line.trim().replace(/^([\-•*]|\d+[.)]|[A-Za-z][.)])\s*/,'').trim()}
function problemsFromS05(){
  if(typeof window.fcGetVesterPreparedProblems==='function'){
    const prepared=window.fcGetVesterPreparedProblems();
    if(Array.isArray(prepared))return prepared.map(p=>({id:p.id||hashText(p.text),text:p.text}));
  }
  return [];
}
function defaultState(){return {selected:[],relations:{},cursor:0,view:'select',updatedAt:null}}
function loadState(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(VESTER_KEY)||'{}')}}catch{return defaultState()}}
let state=loadState();
function saveState(){state.updatedAt=new Date().toISOString();localStorage.setItem(VESTER_KEY,JSON.stringify(state));if(typeof draft!=='undefined'){draft.S06=draft.S06||{};draft.S06.vester_state=state;localStorage.setItem(storeKey,JSON.stringify(draft))}}
function syncFromDraft(){if(typeof draft!=='undefined'&&draft.S06?.vester_state){state={...defaultState(),...draft.S06.vester_state};localStorage.setItem(VESTER_KEY,JSON.stringify(state))}}
function selectedProblems(){return state.selected||[]}
function comparisons(){const p=selectedProblems(),out=[];for(let i=0;i<p.length;i++){for(let j=i+1;j<p.length;j++){out.push({source:p[i],target:p[j]});out.push({source:p[j],target:p[i]})}}return out}
function relationKey(a,b){return `${a.id}>${b.id}`}
function currentComparison(){return comparisons()[Math.max(0,Math.min(state.cursor,comparisons().length-1))]||null}
function answeredCount(){return comparisons().filter(c=>Number.isInteger(state.relations[relationKey(c.source,c.target)]?.score)).length}
function allAnswered(){const c=comparisons();return c.length>0&&answeredCount()===c.length}
function scoreLabel(n){return ['No influye','Influye poco','Influencia importante','Influencia fuerte o directa'][n]||''}
function quadrantLabel(q){return {critical:'Crítico',active:'Activo',passive:'Pasivo',indifferent:'Indiferente'}[q]}
function simpleQuadrant(q){return {
  critical:'presenta influencia alta y dependencia alta dentro de este conjunto; conviene revisarlo con atención porque participa en varias relaciones registradas.',
  active:'presenta influencia alta y dependencia baja dentro de este conjunto; parece tener mayor capacidad de incidir sobre otros problemas según tus valoraciones.',
  passive:'presenta influencia baja y dependencia alta dentro de este conjunto; parece recibir más influencia de otros problemas que la que ejerce.',
  indifferent:'presenta influencia y dependencia bajas dentro de este conjunto; su papel relativo en esta matriz es menor y conviene revisar si sigue siendo central para el análisis.'
}[q]}
function calculate(){
  const ps=selectedProblems();
  const totals=Object.fromEntries(ps.map(p=>[p.id,{id:p.id,text:p.text,influence:0,dependence:0}]));
  for(const c of comparisons()){
    const r=state.relations[relationKey(c.source,c.target)];
    if(!Number.isInteger(r?.score))continue;
    totals[c.source.id].influence+=r.score;totals[c.target.id].dependence+=r.score;
  }
  const rows=Object.values(totals);
  const meanInfluence=rows.length?rows.reduce((a,r)=>a+r.influence,0)/rows.length:0;
  const meanDependence=rows.length?rows.reduce((a,r)=>a+r.dependence,0)/rows.length:0;
  rows.forEach(r=>{const hi=r.influence>=meanInfluence,hd=r.dependence>=meanDependence;r.quadrant=hi&&hd?'critical':hi&&!hd?'active':!hi&&hd?'passive':'indifferent'});
  return {rows,meanInfluence,meanDependence};
}
function shell(){return `<section id="vesterWizard" class="vester-wizard"><div class="vester-top"><div><span class="vester-mode">Vester paso a paso</span><h3>Organizar influencias entre problemas</h3><p>La matriz organiza tus juicios de influencia. Solo recibe variables previamente depuradas y confirmadas en S05. No demuestra causalidad científica. La puntuación 0–3 siempre la decides tú.</p></div><div class="vester-progress" id="vesterProgress"></div></div><div class="vester-actions"><button type="button" data-help="easy">Explícame fácil</button><button type="button" data-help="guide">Guíame</button><button type="button" data-help="why">¿Por qué esta relación?</button><button type="button" data-help="review">Revisar mi justificación</button><button type="button" id="showMatrix">Ver matriz</button><button type="button" id="calcVester" class="primary">Calcular resultados</button></div><div id="vesterAssist" class="vester-assist hidden"></div><div id="vesterBody"></div></section>`}
function selectView(){
  const candidates=problemsFromS05();
  const selectedIds=new Set(state.selected.map(p=>p.id));
  return `<div class="vester-intro"><strong>1. Elige las variables problemáticas que llevarás a la matriz</strong><p>Solo aparecen formulaciones confirmadas como <b>Lista para Vester</b> en S05. Para comparar necesitas al menos dos.</p></div>${candidates.length?`<div class="problem-list">${candidates.map(p=>`<label class="problem-choice"><input type="checkbox" data-problem="${p.id}" ${selectedIds.has(p.id)?'checked':''}><span>${esc(p.text)}</span></label>`).join('')}</div>`:`<div class="vester-warning"><strong>No hay suficientes variables aprobadas para Vester.</strong><p>Vuelve a S05 y usa “Preparar variables para Vester”. Reformula, verifica o excluye las entradas problemáticas y confirma al menos dos como “Lista para Vester”.</p></div>`}<button type="button" id="startVester" class="primary" ${candidates.length<2?'disabled':''}>Iniciar comparaciones</button>`;
}
function stepView(){
  const comps=comparisons(),c=currentComparison();if(!c)return selectView();
  const key=relationKey(c.source,c.target),r=state.relations[key]||{};
  return `<div class="vester-step"><div class="step-kicker">Comparación ${state.cursor+1} de ${comps.length}</div><div class="vester-question">¿Cuánto influye <strong>${esc(c.source.text)}</strong> sobre <strong>${esc(c.target.text)}</strong>?</div><div class="vester-core-question">Si cambia el primer problema, ¿provoca directamente un cambio en el segundo?</div><div class="score-grid">${[0,1,2,3].map(n=>`<button type="button" class="score-btn ${r.score===n?'selected':''}" data-score="${n}"><strong>${n}</strong><span>${scoreLabel(n)}</span></button>`).join('')}</div><label class="vester-just">Justificación <span>· opcional</span><textarea id="vesterJustification" placeholder="Explica brevemente por qué consideras que existe —o no existe— esa influencia.">${esc(r.justification||'')}</textarea></label><div class="contrast-box"><strong>Preguntas para contrastar</strong><ul><li>Si el primer problema desapareciera, ¿el segundo cambiaría de manera perceptible?</li><li>¿Existe una relación directa o solo ocurren al mismo tiempo?</li><li>¿La relación depende de otro factor intermedio?</li></ul></div><div class="step-nav"><button type="button" id="vesterPrev" ${state.cursor===0?'disabled':''}>← Comparación anterior</button><button type="button" id="vesterNext" ${state.cursor===comps.length-1?'disabled':''}>Siguiente comparación →</button></div></div>`;
}
function matrixView(){
  const ps=selectedProblems();if(!ps.length)return selectView();
  return `<div class="matrix-head"><strong>Matriz de valoraciones registradas</strong><p>Fila = problema que influye. Columna = problema que recibe la influencia. El guion corresponde a la diagonal.</p></div><div class="matrix-scroll"><table class="vester-matrix"><thead><tr><th>Influye ↓ / recibe →</th>${ps.map((p,i)=>`<th title="${esc(p.text)}">P${i+1}</th>`).join('')}</tr></thead><tbody>${ps.map((a,i)=>`<tr><th><span>P${i+1}</span> ${esc(a.text)}</th>${ps.map(b=>a.id===b.id?'<td>—</td>':`<td>${state.relations[relationKey(a,b)]?.score??'·'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button type="button" id="backToSteps">Volver al paso a paso</button>`;
}
function resultsView(){
  if(!allAnswered()){const missing=comparisons().length-answeredCount();return `<div class="vester-warning"><strong>Faltan ${missing} comparaciones.</strong><p>El cálculo final requiere que cada dirección tenga una valoración 0–3. Las justificaciones pueden quedar vacías.</p><button type="button" id="goMissing" class="primary">Ir a la primera pendiente</button></div>`}
  const res=calculate();
  return `<div class="result-note"><strong>Lectura orientativa</strong><p>El sistema suma los valores registrados. Para dividir las zonas, esta versión usa como corte el promedio de influencia y dependencia del conjunto. Es una regla operativa de visualización, no una prueba de causalidad.</p></div><div class="vester-results">${res.rows.map(r=>`<article><div><strong>${esc(r.text)}</strong><span class="quadrant ${r.quadrant}">${quadrantLabel(r.quadrant)}</span></div><p>Influencia: <b>${r.influence}</b> · Dependencia: <b>${r.dependence}</b></p><p>${simpleQuadrant(r.quadrant)}</p></article>`).join('')}</div><div class="quadrant-help"><strong>¿Qué significan las categorías?</strong><p><b>Crítico:</b> combina influencia y dependencia altas. <b>Activo:</b> influye relativamente más de lo que depende. <b>Pasivo:</b> depende relativamente más de lo que influye. <b>Indiferente:</b> registra valores bajos en ambas dimensiones dentro de este conjunto.</p></div><div class="to-s07"><strong>Puente hacia S07</strong><p>Según las valoraciones realizadas, estos problemas podrían revisarse como posibles causas, efectos o elementos centrales. Confirma su ubicación antes de incorporarlos al árbol. Una relación Vester no equivale a causalidad demostrada.</p></div><button type="button" id="backToSteps">Revisar comparaciones</button>`;
}
function renderBody(){
  const body=$('#vesterBody');if(!body)return;
  $('#vesterProgress').textContent=state.selected.length?`${answeredCount()} de ${comparisons().length} comparaciones respondidas`:'Selecciona los problemas';
  body.innerHTML=state.view==='matrix'?matrixView():state.view==='results'?resultsView():state.view==='step'?stepView():selectView();
  bindBody();
}
function saveCurrentJustification(){const c=currentComparison(),ta=$('#vesterJustification');if(!c||!ta)return;const k=relationKey(c.source,c.target);state.relations[k]=state.relations[k]||{};state.relations[k].justification=ta.value.trim();saveState()}
function firstMissing(){const comps=comparisons();const i=comps.findIndex(c=>!Number.isInteger(state.relations[relationKey(c.source,c.target)]?.score));return i<0?0:i}
function selectProblemsFromUI(){const candidates=problemsFromS05();const map=new Map(candidates.map(p=>[p.id,p]));state.selected=[...document.querySelectorAll('[data-problem]:checked')].map(x=>map.get(x.dataset.problem)).filter(Boolean);const valid=new Set(state.selected.map(p=>p.id));Object.keys(state.relations).forEach(k=>{const [a,b]=k.split('>');if(!valid.has(a)||!valid.has(b))delete state.relations[k]});saveState()}
function reviewJustification(){const c=currentComparison();if(!c){assist('Primero abre una comparación.');return}saveCurrentJustification();const r=state.relations[relationKey(c.source,c.target)]||{},t=(r.justification||'').trim();if(!t){assist('La justificación es opcional. Si quieres documentar el juicio, explica el mecanismo por el que A podría producir un cambio en B. Si falta respaldo, marca la información como [POR VERIFICAR].');return}const notes=[];if(t.length<35)notes.push('La justificación es muy breve; puede ser difícil auditar el razonamiento después.');if(/al mismo tiempo|coincid|simult|se relacionan|están relacionados/i.test(t))notes.push('Revisa si estás describiendo simultaneidad o asociación. Eso por sí solo no demuestra influencia directa.');if(/siempre|demuestra|comprobado|sin duda|definitivamente/i.test(t))notes.push('La redacción parece más concluyente que la matriz permite sostener. Considera expresar el juicio como una valoración de influencia.');if(/según estudios|la evidencia demuestra|está comprobado/i.test(t)&&!/https?:|fuente|documento|registro|entrevista/i.test(t))notes.push('Se menciona respaldo sin identificarlo. Añade la fuente o conserva ese punto como [POR VERIFICAR].');if(!notes.length)notes.push('La justificación describe un razonamiento de influencia de forma suficientemente concreta. Aun así, la puntuación sigue siendo una decisión metodológica del usuario.');assist(notes.join(' '))}
function assist(text){const box=$('#vesterAssist');box.classList.remove('hidden');box.innerHTML=`<strong>Ayuda para razonar</strong><p>${esc(text)}</p><small>Esta ayuda no modifica tu puntuación ni añade evidencia.</small>`}
function bindBody(){
  document.querySelectorAll('[data-problem]').forEach(x=>x.onchange=selectProblemsFromUI);
  $('#startVester')&&($('#startVester').onclick=()=>{selectProblemsFromUI();if(state.selected.length<2){assist('Selecciona al menos dos problemas previamente aprobados en S05.');return}state.view='step';state.cursor=Math.min(state.cursor,comparisons().length-1);saveState();renderBody()});
  document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{const c=currentComparison();if(!c)return;saveCurrentJustification();const k=relationKey(c.source,c.target);state.relations[k]=state.relations[k]||{};state.relations[k].score=Number(b.dataset.score);saveState();renderBody()});
  $('#vesterJustification')&&($('#vesterJustification').onblur=saveCurrentJustification);
  $('#vesterPrev')&&($('#vesterPrev').onclick=()=>{saveCurrentJustification();state.cursor=Math.max(0,state.cursor-1);saveState();renderBody()});
  $('#vesterNext')&&($('#vesterNext').onclick=()=>{saveCurrentJustification();state.cursor=Math.min(comparisons().length-1,state.cursor+1);saveState();renderBody()});
  $('#backToSteps')&&($('#backToSteps').onclick=()=>{state.view='step';saveState();renderBody()});
  $('#goMissing')&&($('#goMissing').onclick=()=>{state.cursor=firstMissing();state.view='step';saveState();renderBody()});
}
function bindTop(){
  document.querySelectorAll('[data-help]').forEach(b=>b.onclick=()=>{const type=b.dataset.help,c=currentComparison();if(type==='easy')assist('Compara dos problemas previamente depurados en una sola dirección. Pregunta: si cambia el primero, ¿provoca directamente un cambio en el segundo? Elige 0, 1, 2 o 3 según tu juicio.');if(type==='guide')assist('Piensa en un mecanismo concreto: ¿qué tendría que ocurrir entre el primer problema y el segundo? Si necesitas varios supuestos o factores intermedios, la influencia directa puede ser menor o incierta.');if(type==='why')assist(c?`Ahora estás evaluando únicamente la dirección desde “${c.source.text}” hacia “${c.target.text}”. La dirección contraria es otra decisión y se registra aparte.`:'Primero confirma al menos dos variables en S05.');if(type==='review')reviewJustification()});
  $('#showMatrix').onclick=()=>{saveCurrentJustification();state.view='matrix';saveState();renderBody()};
  $('#calcVester').onclick=()=>{saveCurrentJustification();state.view='results';saveState();renderBody()};
}
function hideLegacyFields(){const fields=$('#fields');if(!fields)return;[...fields.children].forEach(el=>{if(!el.id||el.id!=='vesterWizard'){if(el.classList?.contains('field'))el.classList.add('vester-legacy-hidden')}})}
function inject(){
  const counter=$('#counter'),fields=$('#fields');if(!counter||!fields||!counter.textContent.startsWith('S06')){mounted=false;return}
  if($('#vesterWizard'))return;
  syncFromDraft();
  const candidates=problemsFromS05();const valid=new Set(candidates.map(p=>p.id));
  state.selected=(state.selected||[]).filter(p=>valid.has(p.id));Object.keys(state.relations).forEach(k=>{const [a,b]=k.split('>');if(!valid.has(a)||!valid.has(b))delete state.relations[k]});saveState();
  fields.insertAdjacentHTML('afterbegin',shell());hideLegacyFields();mounted=true;bindTop();renderBody();
}
function init(){new MutationObserver(()=>inject()).observe(document.body,{subtree:true,childList:true,characterData:true});inject();}
init();
})();