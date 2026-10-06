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
function scoreLabel(n){return ['No cambia','Cambia poco','Cambia bastante','Cambia mucho'][n]||''}
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
function shell(){return `<section id="vesterWizard" class="vester-wizard"><div class="vester-top"><div><h3>Comparar situaciones</h3><p>Te mostraremos dos situaciones cada vez. Solo responde si la primera puede hacer que la segunda cambie.</p></div><div class="vester-progress" id="vesterProgress"></div></div><div class="vester-actions"><button type="button" data-help="easy">Necesito ayuda</button><button type="button" id="showMatrix">Detalle técnico</button><button type="button" id="calcVester" class="primary">Ver qué encontramos</button></div><div id="vesterAssist" class="vester-assist hidden"></div><div id="vesterBody"></div></section>`}
function selectView(){
  const candidates=problemsFromS05();
  const selectedIds=new Set(state.selected.map(p=>p.id));
  return `<div class="vester-intro"><strong>Elige las situaciones que quieres comparar</strong><p>Usaremos únicamente las situaciones que ya revisaste. Necesitas al menos dos para continuar.</p></div>${candidates.length?`<div class="problem-list">${candidates.map(p=>`<label class="problem-choice"><input type="checkbox" data-problem="${p.id}" ${selectedIds.has(p.id)?'checked':''}><span>${esc(p.text)}</span></label>`).join('')}</div>`:`<div class="vester-warning"><strong>Todavía faltan situaciones para comparar.</strong><p>Vuelve al paso anterior y confirma al menos dos situaciones diferentes.</p></div>`}<button type="button" id="startVester" class="primary" ${candidates.length<2?'disabled':''}>Empezar</button>`;
}
function stepView(){
  const comps=comparisons(),c=currentComparison();if(!c)return selectView();
  const key=relationKey(c.source,c.target),r=state.relations[key]||{};
  return `<div class="vester-step"><div class="step-kicker">Comparación ${state.cursor+1} de ${comps.length}</div><div class="comparison-cards"><article><small>Situación A</small><strong>${esc(c.source.text)}</strong></article><article><small>Situación B</small><strong>${esc(c.target.text)}</strong></article></div><div class="vester-core-question">¿La situación A puede hacer que la situación B cambie?</div><div class="score-grid">${[0,1,2,3].map(n=>`<button type="button" class="score-btn ${r.score===n?'selected':''}" data-score="${n}"><span>${scoreLabel(n)}</span></button>`).join('')}</div><label class="vester-just">Si quieres, explica por qué <span>· opcional</span><textarea id="vesterJustification" placeholder="Una frase corta es suficiente.">${esc(r.justification||'')}</textarea></label><div class="step-nav"><button type="button" id="vesterPrev" ${state.cursor===0?'disabled':''}>← Anterior</button><button type="button" id="vesterNext" ${state.cursor===comps.length-1?'disabled':''}>Siguiente →</button></div></div>`;
}
function matrixView(){
  const ps=selectedProblems();if(!ps.length)return selectView();
  return `<div class="matrix-head"><strong>Detalle técnico</strong><p>Esta tabla conserva las puntuaciones que usa el sistema para hacer el cálculo. No necesitas interpretarla para continuar.</p></div><div class="matrix-scroll"><table class="vester-matrix"><thead><tr><th>Situación</th>${ps.map((p,i)=>`<th title="${esc(p.text)}">P${i+1}</th>`).join('')}</tr></thead><tbody>${ps.map((a,i)=>`<tr><th><span>P${i+1}</span> ${esc(a.text)}</th>${ps.map(b=>a.id===b.id?'<td>—</td>':`<td>${state.relations[relationKey(a,b)]?.score??'·'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button type="button" id="backToSteps">Volver</button>`;
}
function resultsView(){
  if(!allAnswered()){const missing=comparisons().length-answeredCount();return `<div class="vester-warning"><strong>Faltan ${missing} comparaciones.</strong><p>El cálculo final requiere que cada dirección tenga una valoración 0–3. Las justificaciones pueden quedar vacías.</p><button type="button" id="goMissing" class="primary">Ir a la primera pendiente</button></div>`}
  const res=calculate();
  return `<div class="result-note"><strong>¿Qué encontramos?</strong><p>El sistema ordenó tus respuestas para ayudarte a reconocer qué situaciones parecen explicar a otras y cuáles parecen ser consecuencia. Es una orientación para el siguiente paso.</p></div><div class="vester-results">${res.rows.map(r=>`<article><div><strong>${esc(r.text)}</strong><span class="quadrant ${r.quadrant}">${quadrantLabel(r.quadrant)}</span></div><p>Influencia: <b>${r.influence}</b> · Dependencia: <b>${r.dependence}</b></p><p>${simpleQuadrant(r.quadrant)}</p></article>`).join('')}</div><details class="guided-tech"><summary>Ver cómo hizo el cálculo</summary><p>El sistema compara cuánto cambia cada situación a otras y cuánto cambia por efecto de otras. Con esas sumas organiza los resultados. Esta lectura orienta, pero no decide por ti.</p></details><div class="to-s07"><strong>Siguiente paso</strong><p>Ahora revisaremos cuáles situaciones podrían ir antes, cuáles podrían venir después y cuál podría estar en el centro del problema. Tú confirmarás cada decisión.</p></div><button type="button" id="backToSteps">Revisar mis respuestas</button>`;
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
  document.querySelectorAll('[data-help]').forEach(b=>b.onclick=()=>{const type=b.dataset.help,c=currentComparison();if(type==='easy')assist('Mira únicamente estas dos situaciones. Pregúntate: si la situación A cambia, ¿es razonable pensar que la situación B también cambie? Elige la respuesta que mejor se acerque a tu criterio.');if(type==='guide')assist('Piensa en algo sencillo: ¿qué tendría que pasar para que A produzca un cambio en B? Si necesitas explicar muchos pasos intermedios, probablemente la relación sea débil o todavía no esté clara.');if(type==='why')assist(c?`Ahora estás evaluando únicamente la dirección desde “${c.source.text}” hacia “${c.target.text}”. La dirección contraria es otra decisión y se registra aparte.`:'Primero confirma al menos dos variables en S05.');if(type==='review')reviewJustification()});
  $('#showMatrix').onclick=()=>{saveCurrentJustification();state.view='matrix';saveState();renderBody()};
  $('#calcVester').onclick=()=>{saveCurrentJustification();state.view='results';saveState();renderBody()};
}
function hideLegacyFields(){const fields=$('#fields');if(!fields)return;[...fields.children].forEach(el=>{if(!el.id||el.id!=='vesterWizard'){if(el.classList?.contains('field'))el.classList.add('vester-legacy-hidden')}})}
function inject(){
  const counter=$('#counter'),fields=$('#fields');if(!counter||!fields||!counter.textContent.startsWith('S06')){mounted=false;return}
  if($('#vesterWizard'))return;
  syncFromDraft();if(state.view==='matrix')state.view='step';
  const candidates=problemsFromS05();const valid=new Set(candidates.map(p=>p.id));
  state.selected=(state.selected||[]).filter(p=>valid.has(p.id));Object.keys(state.relations).forEach(k=>{const [a,b]=k.split('>');if(!valid.has(a)||!valid.has(b))delete state.relations[k]});saveState();
  fields.insertAdjacentHTML('afterbegin',shell());hideLegacyFields();mounted=true;bindTop();renderBody();
}
function init(){new MutationObserver(()=>inject()).observe(document.body,{subtree:true,childList:true,characterData:true});inject();}
init();
})();