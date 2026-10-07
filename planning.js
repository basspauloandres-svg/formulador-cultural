(()=>{
const $=s=>document.querySelector(s), esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEYS={S13:'formulador-cultural-schedule-v1',S14:'formulador-cultural-budget-v1',S15:'formulador-cultural-risks-v1'};
let cursors={S13:0,S14:0,S15:0};
function read(code,key){try{return draft?.[code]?.[key]||JSON.parse(localStorage.getItem(KEYS[code])||'{}')}catch{return {}}}
function write(code,key,state){state.updatedAt=new Date().toISOString();localStorage.setItem(KEYS[code],JSON.stringify(state));try{draft[code]=draft[code]||{};draft[code][key]=state;localStorage.setItem(storeKey,JSON.stringify(draft))}catch{};window.fcRenderJourney?.()}
function sync(code){try{if(session&&typeof syncSection==='function')syncSection(code).catch(()=>{})}catch{}}
function activities(){try{return (window.fcGetActivities?.()||draft?.S11?.completion_state?.items||[]).filter(x=>x.confirmed)}catch{return []}}
function results(){try{return (window.fcGetResults?.()||draft?.S11?.results_state?.items||[]).filter(x=>x.confirmed)}catch{return []}}
function objectives(){try{return (draft?.S09?.objectives_state?.items||[]).filter(x=>x.confirmed)}catch{return []}}
function causes(){try{return (draft?.S07?.tree_state?.nodes||[]).filter(x=>x.zone==='direct_cause'||x.zone==='indirect_cause')}catch{return []}}
function days(n,u){const x=Math.max(1,Number(n)||1);return u==='weeks'?x*7:u==='months'?x*30:x}
function endDate(start,n,u){if(!start)return '';const d=new Date(start+'T12:00:00');if(Number.isNaN(+d))return '';d.setDate(d.getDate()+days(n,u)-1);return d.toISOString().slice(0,10)}
function money(n){return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0)}
function compactLabel(v,maxWords=28){return window.fcWriting?.compactPresentationText?window.fcWriting.compactPresentationText(v,maxWords):String(v||'').trim()}
function riskWritingIssues(r){
 const limits={event:30,effect:30,preventiveResponse:36,contingencyResponse:36},issues=[];
 for(const [k,max] of Object.entries(limits)){const t=String(r?.[k]||'').trim();if(!t||/POR VERIFICAR/.test(t))continue;const words=t.split(/\s+/).filter(Boolean);if(words.length>max)issues.push(k+' supera '+max+' palabras');if((t.match(/[.!?]+/g)||[]).length>2)issues.push(k+' debe expresarse de forma más directa')}
 return issues
}
function scheduleState(){
 let s=read('S13','schedule_state'),src=activities(),old=new Map((s.items||[]).map(x=>[x.activityId,x])),sig=src.map(x=>x.id+':'+x.text).join('|');
 if(!s.items||s.sourceSignature!==sig){s={sourceSignature:sig,items:src.map((a,i)=>{const prev=old.get(a.id);return prev?{...prev,activityId:a.id,activityText:a.text,activityContext:a.context||prev.activityContext||{}}:{id:'SCH'+(i+1),activityId:a.id,activityText:a.text,activityContext:a.context||{},startDate:'',duration:1,durationUnit:'days',endDate:'',dependencyIds:[],responsible:'[POR VERIFICAR]',frequency:'Una vez',confirmed:false}}),updatedAt:null};write('S13','schedule_state',s)}return s
}
function scheduleIssues(s){
 const map=new Map((s.items||[]).map(x=>[x.activityId,x])),out=[];
 for(const x of s.items||[]){if(!x.startDate)out.push(x.activityId+': falta fecha de inicio');if(!x.responsible||/POR VERIFICAR/.test(x.responsible))out.push(x.activityId+': falta responsable');for(const dep of x.dependencyIds||[]){const d=map.get(dep);if(d?.endDate&&x.startDate&&x.startDate<d.endDate)out.push(x.activityId+': inicia antes de terminar '+dep)}}
 return out
}
function ganttHtml(xs){
 const valid=(xs||[]).filter(x=>x.startDate&&x.endDate);if(!valid.length)return '<p class="muted">Completa fechas para ver el cronograma gráfico.</p>';
 const start=Math.min(...valid.map(x=>Date.parse(x.startDate))),end=Math.max(...valid.map(x=>Date.parse(x.endDate))),span=Math.max(86400000,end-start+86400000);
 return '<div class="gantt">'+valid.map(x=>{const l=(Date.parse(x.startDate)-start)/span*100,w=Math.max(2,(Date.parse(x.endDate)-Date.parse(x.startDate)+86400000)/span*100);return '<div class="gantt-row"><span>'+esc(x.activityId)+'</span><div><i style="left:'+l+'%;width:'+w+'%"></i></div><small>'+esc(x.startDate)+' → '+esc(x.endDate)+'</small></div>'}).join('')+'</div>'
}
function renderS13(){
 const host=$('#fields');if(!host)return;const s=scheduleState(),xs=s.items||[];cursors.S13=Math.min(cursors.S13,Math.max(0,xs.length-1));const x=xs[cursors.S13],issues=scheduleIssues(s);
 host.innerHTML='<section class="plan-wrap"><div class="plan-note"><strong>Ubicar cada actividad en el tiempo</strong><p>Trabajaremos una actividad por vez. Primero decide cuándo empieza, cuánto dura y quién se encarga.</p></div>'+
 (x?'<div class="plan-progress">Actividad '+(cursors.S13+1)+' de '+xs.length+'</div><article class="plan-card"><small>'+esc(x.activityId)+'</small><h3>'+esc(x.activityText)+'</h3><div class="plan-grid">'+
 '<label>¿Cuándo puede comenzar?<input type="date" data-sch="startDate" value="'+esc(x.startDate)+'"></label>'+
 '<label>¿Cuánto dura?<div class="inline"><input type="number" min="1" data-sch="duration" value="'+esc(x.duration)+'"><select data-sch="durationUnit"><option value="days" '+(x.durationUnit==='days'?'selected':'')+'>días</option><option value="weeks" '+(x.durationUnit==='weeks'?'selected':'')+'>semanas</option><option value="months" '+(x.durationUnit==='months'?'selected':'')+'>meses</option></select></div></label>'+
 '<label>¿Quién será responsable?<input data-sch="responsible" value="'+esc(x.responsible||'')+'" placeholder="[POR VERIFICAR]"></label>'+
 '<details class="didactic-detail"><summary>¿Se repite o depende de otra actividad?</summary><label>¿Se repite?<select data-sch="frequency"><option>Una vez</option><option '+(x.frequency==='Semanal'?'selected':'')+'>Semanal</option><option '+(x.frequency==='Mensual'?'selected':'')+'>Mensual</option><option '+(x.frequency==='Periódica'?'selected':'')+'>Periódica</option></select></label></div>'+
 '<details><summary>¿Necesita que otra actividad termine antes?</summary><div class="dep-list">'+xs.filter(y=>y.activityId!==x.activityId).map(y=>'<label><input type="checkbox" data-dep="'+esc(y.activityId)+'" '+((x.dependencyIds||[]).includes(y.activityId)?'checked':'')+'> '+esc(y.activityId)+' · '+esc(compactLabel(y.activityText))+'</label>').join('')+'</div></details>'+
 '<div class="plan-result">Final estimado: <b>'+(esc(x.endDate||'[POR VERIFICAR]'))+'</b></div>'+(x.confirmed?'<div class="schedule-indicator-note"><b>Datos disponibles para indicadores</b><span>Responsable y plazo confirmados en este cronograma quedarán disponibles como propuestas en S12. No se aplican sin tu confirmación.</span></div>':'')+'<button id="confirmSchedule" class="primary">'+(x.confirmed?'Actualizar':'Confirmar esta actividad')+'</button></article>':'<div class="plan-note">Primero confirma actividades en S11.</div>')+
 '<div class="plan-nav"><button id="schPrev">← Anterior</button><button id="schNext">Siguiente →</button></div>'+
 '<details class="plan-summary" open><summary>Ver cronograma completo</summary>'+ganttHtml(xs)+'<div class="table-scroll"><table><thead><tr><th>Actividad</th><th>Inicio</th><th>Fin</th><th>Responsable</th><th>Estado</th></tr></thead><tbody>'+xs.map(y=>'<tr><td>'+esc(y.activityId)+' · '+esc(compactLabel(y.activityText))+'</td><td>'+esc(y.startDate||'—')+'</td><td>'+esc(y.endDate||'—')+'</td><td>'+esc(y.responsible||'—')+'</td><td>'+(y.confirmed?'Completa':'Falta')+'</td></tr>').join('')+'</tbody></table></div></details>'+
 (issues.length?'<div class="plan-alert"><strong>Revisar</strong><ul>'+issues.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></div>':'')+'</section>';
 if(!x)return;
 host.querySelectorAll('[data-sch]').forEach(el=>el.onchange=()=>{const k=el.dataset.sch;x[k]=k==='duration'?Math.max(1,Number(el.value)||1):el.value;x.endDate=endDate(x.startDate,x.duration,x.durationUnit);x.confirmed=false;write('S13','schedule_state',s);renderS13()});
 host.querySelectorAll('[data-dep]').forEach(el=>el.onchange=()=>{x.dependencyIds=[...host.querySelectorAll('[data-dep]:checked')].map(z=>z.dataset.dep);x.confirmed=false;write('S13','schedule_state',s)});
 $('#confirmSchedule').onclick=()=>{x.endDate=endDate(x.startDate,x.duration,x.durationUnit);x.confirmed=!!x.startDate&&!!x.endDate&&!!x.responsible&&!/POR VERIFICAR/.test(x.responsible);write('S13','schedule_state',s);sync('S13');if(x.confirmed)window.fcReconcileIndicatorsFromSchedule?.();renderS13()};
 $('#schPrev').onclick=()=>{cursors.S13=Math.max(0,cursors.S13-1);renderS13()};$('#schNext').onclick=()=>{cursors.S13=Math.min(xs.length-1,cursors.S13+1);renderS13()}
}
function budgetState(){
 let s=read('S14','budget_state'),src=activities(),sig=src.map(x=>x.id+':'+x.text).join('|');s.items=s.items||[];s.activityStatus=s.activityStatus||{};
 if(s.sourceSignature!==sig){const ids=new Set(src.map(x=>x.id));s.items=s.items.filter(x=>ids.has(x.activityId));for(const a of src)if(!s.activityStatus[a.id])s.activityStatus[a.id]='pending';s.sourceSignature=sig;write('S14','budget_state',s)}return s
}
function addBudgetItem(s,a){
 const n=(s.items||[]).filter(x=>x.activityId===a.id).length+1;s.items.push({id:'B-'+a.id+'-'+n,activityId:a.id,activityText:a.text,resourceType:'Materiales',description:'',unit:'unidad',quantity:1,frequency:1,unitCost:'',totalCost:0,fundingSource:'[POR VERIFICAR]',costType:'Monetario',confirmed:false})
}
function recalc(i){const q=Number(i.quantity)||0,f=Number(i.frequency)||0,c=Number(i.unitCost)||0;i.totalCost=q*f*c}
function budgetSummary(s){const items=s.items||[],sum=t=>items.filter(x=>!t||x.costType===t).reduce((a,b)=>a+(Number(b.totalCost)||0),0);return {total:sum(),monetary:sum('Monetario'),inKind:sum('Aporte en especie'),count:items.length}}
function budgetBreakdown(s){
 const byCat={},byAct={};for(const x of s.items||[]){byCat[x.resourceType||'Otros']=(byCat[x.resourceType||'Otros']||0)+(Number(x.totalCost)||0);byAct[x.activityId]=(byAct[x.activityId]||0)+(Number(x.totalCost)||0)}
 return {byCat,byAct}
}
function renderS14(){
 const host=$('#fields');if(!host)return;const s=budgetState(),acts=activities();cursors.S14=Math.min(cursors.S14,Math.max(0,acts.length-1));const a=acts[cursors.S14],items=a?(s.items||[]).filter(x=>x.activityId===a.id):[],sum=budgetSummary(s),breakdown=budgetBreakdown(s);
 host.innerHTML='<section class="plan-wrap"><div class="plan-note"><strong>Definir qué necesita cada actividad</strong><p>Revisa una actividad por vez. Primero indica si necesita dinero, un aporte en especie o si no genera costo adicional.</p></div>'+
 (a?'<div class="plan-progress">Actividad '+(cursors.S14+1)+' de '+acts.length+'</div><article class="plan-card"><small>'+esc(a.id)+'</small><h3>'+esc(a.text)+'</h3><div class="plan-question">¿Cómo se cubren los recursos de esta actividad?</div><div class="choice-row">'+[['cost','Tiene costos'],['inkind','Aporte en especie'],['nocost','Sin costo adicional'],['pending','Dejar por revisar']].map(([v,l])=>'<button data-budget-status="'+v+'" class="'+(s.activityStatus[a.id]===v?'selected':'')+'">'+l+'</button>').join('')+'</div>'+
 ((s.activityStatus[a.id]==='cost'||s.activityStatus[a.id]==='inkind')?'<div id="budgetItems">'+items.map(i=>'<article class="resource-row" data-item="'+esc(i.id)+'"><div class="plan-grid"><label>Tipo<select data-bi="resourceType"><option>Honorarios</option><option '+(i.resourceType==='Materiales'?'selected':'')+'>Materiales</option><option>Transporte</option><option>Alimentación</option><option>Alquileres</option><option>Equipos</option><option>Comunicaciones</option><option>Producción</option><option>Servicios</option><option>Otros</option></select></label><label>Recurso<input data-bi="description" value="'+esc(i.description)+'"></label><label>Unidad<input data-bi="unit" value="'+esc(i.unit)+'"></label><label>Cantidad<input type="number" min="0" step="0.01" data-bi="quantity" value="'+esc(i.quantity)+'"></label><label>Veces<input type="number" min="0" step="0.01" data-bi="frequency" value="'+esc(i.frequency)+'"></label><label>Costo unitario<input type="number" min="0" step="1" data-bi="unitCost" value="'+esc(i.unitCost)+'"></label><label>Fuente<input data-bi="fundingSource" value="'+esc(i.fundingSource||'')+'"></label></div><div class="plan-result">Total: <b>'+money(i.totalCost)+'</b></div><button data-remove-bi="'+esc(i.id)+'">Eliminar</button></article>').join('')+'<button id="addBudgetItem">+ Añadir recurso</button></div>':'')+
 '<button id="confirmBudgetActivity" class="primary">Confirmar esta actividad</button></article>':'<div class="plan-note">Primero confirma actividades en S11.</div>')+
 '<div class="plan-nav"><button id="budPrev">← Anterior</button><button id="budNext">Siguiente →</button></div><div class="budget-totals"><div><small>Presupuesto monetario</small><strong>'+money(sum.monetary)+'</strong></div><div><small>Aporte en especie</small><strong>'+money(sum.inKind)+'</strong></div><div><small>Total valorizado</small><strong>'+money(sum.total)+'</strong></div></div><details class="plan-summary"><summary>Ver subtotales</summary><div class="table-scroll"><table><thead><tr><th>Categoría</th><th>Subtotal</th></tr></thead><tbody>'+Object.entries(breakdown.byCat).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+money(v)+'</td></tr>').join('')+'</tbody></table></div></details></section>';
 if(!a)return;
 host.querySelectorAll('[data-budget-status]').forEach(b=>b.onclick=()=>{s.activityStatus[a.id]=b.dataset.budgetStatus;if(b.dataset.budgetStatus==='inkind'&&!items.length)addBudgetItem(s,a);if(b.dataset.budgetStatus==='cost'&&!items.length)addBudgetItem(s,a);write('S14','budget_state',s);renderS14()});
 host.querySelectorAll('[data-item]').forEach(row=>{const i=s.items.find(x=>x.id===row.dataset.item);row.querySelectorAll('[data-bi]').forEach(el=>el.onchange=()=>{i[el.dataset.bi]=['quantity','frequency','unitCost'].includes(el.dataset.bi)?el.value:el.value;if(s.activityStatus[a.id]==='inkind')i.costType='Aporte en especie';else i.costType='Monetario';recalc(i);i.confirmed=!!i.description&&!!i.unit&&Number(i.quantity)>0&&Number(i.frequency)>0&&i.unitCost!=='';write('S14','budget_state',s);renderS14()})});
 host.querySelectorAll('[data-remove-bi]').forEach(b=>b.onclick=()=>{s.items=s.items.filter(x=>x.id!==b.dataset.removeBi);write('S14','budget_state',s);renderS14()});
 $('#addBudgetItem')&&($('#addBudgetItem').onclick=()=>{addBudgetItem(s,a);write('S14','budget_state',s);renderS14()});
 $('#confirmBudgetActivity').onclick=()=>{const st=s.activityStatus[a.id],its=(s.items||[]).filter(x=>x.activityId===a.id);if((st==='cost'||st==='inkind')&&!its.length){alert('Añade al menos un recurso o elige “Sin costo adicional”.');return}if((st==='cost'||st==='inkind')&&its.some(x=>!x.confirmed)){alert('Completa los recursos antes de confirmar.');return}write('S14','budget_state',s);sync('S14');renderS14()};
 $('#budPrev').onclick=()=>{cursors.S14=Math.max(0,cursors.S14-1);renderS14()};$('#budNext').onclick=()=>{cursors.S14=Math.min(acts.length-1,cursors.S14+1);renderS14()}
}
function riskTargets(){
 const out=[];for(const c of causes())out.push({id:'cause:'+c.id,type:'Causa del problema',sourceId:c.id,text:c.text});for(const r of results())out.push({id:'result:'+r.id,type:'Resultado',sourceId:r.id,text:r.text});for(const a of activities())out.push({id:'activity:'+a.id,type:'Actividad',sourceId:a.id,text:a.text});return out
}
function riskState(){
 let s=read('S15','risk_state'),targets=riskTargets(),sig=targets.map(x=>x.id+':'+x.text).join('|');s.items=s.items||[];s.assessments=s.assessments||{};
 if(s.sourceSignature!==sig){const ids=new Set(targets.map(x=>x.id));s.items=s.items.filter(x=>ids.has(x.targetId));for(const t of targets){if(!s.assessments[t.id])s.assessments[t.id]='pending';const existing=s.items.find(x=>x.targetId===t.id);if(existing){existing.linkedObjectType=t.type;existing.linkedObjectId=t.sourceId;existing.sourceText=t.text}}s.targets=targets;s.sourceSignature=sig;write('S15','risk_state',s)}return s
}
function score(v){return {Baja:1,Media:2,Alta:3,Bajo:1,Medio:2,Alto:3}[v]||0}
function level(r){const n=score(r.probability)*score(r.impact);return n>=7?'Alto':n>=4?'Medio':n?'Bajo':'[POR VERIFICAR]'}
function ensureRisk(s,t){let r=s.items.find(x=>x.targetId===t.id);if(!r){r={id:'RISK'+(s.items.length+1),targetId:t.id,linkedObjectType:t.type,linkedObjectId:t.sourceId,sourceText:t.text,cause:t.type==='Causa del problema'?t.text:'[POR VERIFICAR]',event:'[POR VERIFICAR]',effect:'[POR VERIFICAR]',probability:'Media',impact:'Medio',riskLevel:'Medio',preventiveResponse:'[POR VERIFICAR]',contingencyResponse:'[POR VERIFICAR]',owner:'[POR VERIFICAR]',trigger:'[POR VERIFICAR]',confirmed:false};s.items.push(r)}return r}
function preventiveLink(r){
 if(r.linkedObjectType==='Actividad'){const a=activities().find(x=>x.id===r.linkedObjectId);return a?{objectiveId:a.objectiveId||'',resultId:a.resultId||'',objectiveText:a.objectiveText||'',resultText:a.resultText||''}:null}
 if(r.linkedObjectType==='Resultado'){const rr=results().find(x=>x.id===r.linkedObjectId);return rr?{objectiveId:rr.objectiveId||'',resultId:rr.id,objectiveText:rr.objectiveText||'',resultText:rr.text||''}:null}
 if(r.linkedObjectType==='Causa del problema'){const rr=results().find(x=>x.objectiveId===r.linkedObjectId);return rr?{objectiveId:rr.objectiveId||'',resultId:rr.id,objectiveText:rr.objectiveText||'',resultText:rr.text||''}:null}
 return null
}
function createPreventiveActivity(r){
 const link=preventiveLink(r);if(!link||!r.preventiveResponse||/POR VERIFICAR/.test(r.preventiveResponse))return false;
 const s=draft?.S11?.completion_state||{};s.items=s.items||[];if(s.items.some(x=>x.riskId===r.id))return true;
 s.items.push({id:'ACT-R-'+Date.now().toString().slice(-6),objectiveId:link.objectiveId,resultId:link.resultId,objectiveText:link.objectiveText,resultText:link.resultText,text:r.preventiveResponse,confirmed:true,status:'risk_response',note:'Actividad preventiva aprobada desde '+r.id,riskId:r.id});
 s.updatedAt=new Date().toISOString();draft.S11=draft.S11||{};draft.S11.completion_state=s;localStorage.setItem('formulador-cultural-activities-v1',JSON.stringify(s));localStorage.setItem(storeKey,JSON.stringify(draft));try{if(session)syncSection('S11')}catch{};return true
}
function renderS15(){
 const host=$('#fields');if(!host)return;const s=riskState(),targets=s.targets||[];cursors.S15=Math.min(cursors.S15,Math.max(0,targets.length-1));const t=targets[cursors.S15],assessment=t?s.assessments[t.id]:'pending',r=t?s.items.find(x=>x.targetId===t.id):null;
 const resolved=targets.filter(tt=>{const a=s.assessments[tt.id];if(a==='no')return true;if(a==='yes')return !!s.items.find(x=>x.targetId===tt.id&&x.confirmed);return false}).length;
 const pendingCount=Math.max(0,targets.length-resolved);
 host.innerHTML='<section class="plan-wrap"><div class="plan-note"><strong>Revisar qué podría salir diferente a lo esperado</strong><p><b>Un problema ya existe. Un riesgo todavía podría ocurrir.</b> Revisa un elemento por vez y decide si vale la pena registrarlo como riesgo.</p></div>'+
 (t?'<div class="plan-progress">Revisión '+(cursors.S15+1)+' de '+targets.length+'</div><article class="plan-card"><small>'+esc(t.type)+'</small><h3>'+esc(t.text)+'</h3><div class="plan-question">¿Hay algo que podría ocurrir y dificultar este elemento?</div><div class="choice-row"><button data-risk-assess="yes" class="'+(assessment==='yes'?'selected':'')+'">Sí, hay un riesgo</button><button data-risk-assess="no" class="'+(assessment==='no'?'selected':'')+'">No veo un riesgo aquí</button><button data-risk-assess="pending" class="'+(assessment==='pending'?'selected':'')+'">Dejar por revisar</button></div>'+
 (assessment==='yes'&&r?'<div class="plan-grid"><label>¿Qué podría ocurrir?<textarea data-risk="event">'+esc(r.event)+'</textarea></label><label>¿Qué podría afectar?<textarea data-risk="effect">'+esc(r.effect)+'</textarea></label><label>Probabilidad<select data-risk="probability"><option '+(r.probability==='Baja'?'selected':'')+'>Baja</option><option '+(r.probability==='Media'?'selected':'')+'>Media</option><option '+(r.probability==='Alta'?'selected':'')+'>Alta</option></select></label><label>Impacto<select data-risk="impact"><option '+(r.impact==='Bajo'?'selected':'')+'>Bajo</option><option '+(r.impact==='Medio'?'selected':'')+'>Medio</option><option '+(r.impact==='Alto'?'selected':'')+'>Alto</option></select></label><label>¿Qué podemos hacer antes?<textarea data-risk="preventiveResponse">'+esc(r.preventiveResponse)+'</textarea></label><label>¿Qué haremos si ocurre?<textarea data-risk="contingencyResponse">'+esc(r.contingencyResponse)+'</textarea></label><label>Responsable<input data-risk="owner" value="'+esc(r.owner)+'"></label><label>Señal de alerta<input data-risk="trigger" value="'+esc(r.trigger)+'"></label></div><div class="risk-level">Nivel orientativo: <b>'+esc(r.riskLevel)+'</b></div><button id="confirmRisk" class="primary">Confirmar riesgo</button>':'')+'</article>':'<div class="plan-note">No hay elementos para revisar.</div>')+
 '<div class="plan-nav"><button id="riskPrev">← Anterior</button><button id="riskNext">'+(cursors.S15>=targets.length-1?'Continuar a S16 →':'Siguiente →')+'</button></div><details class="plan-summary"><summary>Ver matriz de riesgos</summary><div class="table-scroll"><table><thead><tr><th>Origen</th><th>Riesgo</th><th>Prob.</th><th>Impacto</th><th>Nivel</th><th>Responsable</th></tr></thead><tbody>'+(s.items||[]).map(x=>'<tr><td>'+esc(x.linkedObjectType)+'</td><td>'+esc(x.event)+'</td><td>'+esc(x.probability)+'</td><td>'+esc(x.impact)+'</td><td>'+esc(x.riskLevel)+'</td><td>'+esc(x.owner)+'</td></tr>').join('')+'</tbody></table></div></details><div class="risk-finish-box '+(pendingCount?'pending':'ready')+'"><strong>'+resolved+' de '+targets.length+' elementos revisados</strong><p>'+(pendingCount?'Faltan '+pendingCount+' elemento(s). Usa “Siguiente” para revisarlos uno por uno.':'La revisión de riesgos está completa. Ya puedes pasar a la revisión final del proyecto.')+'</p><button id="riskFinish" class="primary">'+(pendingCount?'Ir al siguiente pendiente':'Continuar a S16 · revisión final')+'</button></div></section>';
 if(!t)return;
 host.querySelectorAll('[data-risk-assess]').forEach(b=>b.onclick=()=>{s.assessments[t.id]=b.dataset.riskAssess;if(b.dataset.riskAssess==='yes')ensureRisk(s,t);write('S15','risk_state',s);renderS15()});
 if(r){
   host.querySelectorAll('[data-risk]').forEach(el=>{
     const saveField=()=>{r[el.dataset.risk]=el.value.trim()||'[POR VERIFICAR]';r.riskLevel=level(r);r.confirmed=false;write('S15','risk_state',s);const lvl=host.querySelector('.risk-level b');if(lvl)lvl.textContent=r.riskLevel};
     if(el.tagName==='SELECT')el.onchange=saveField;else el.oninput=saveField;
   });
   $('#confirmRisk')&&($('#confirmRisk').onclick=()=>{
     r.riskLevel=level(r);
     const labels={event:'qué podría ocurrir',effect:'qué podría afectar',preventiveResponse:'qué podemos hacer antes',contingencyResponse:'qué haremos si ocurre',owner:'responsable'};
     const missing=['event','effect','preventiveResponse','contingencyResponse','owner'].filter(k=>!r[k]||/POR VERIFICAR/.test(r[k]));
     if(missing.length){r.confirmed=false;write('S15','risk_state',s);alert('Falta completar: '+missing.map(k=>labels[k]).join(', ')+'.');return}
     const writingIssues=riskWritingIssues(r);if(writingIssues.length){r.confirmed=false;write('S15','risk_state',s);alert('Haz más directa la redacción del riesgo: '+writingIssues.join(' · ')+'.');return}
     r.confirmed=true;write('S15','risk_state',s);sync('S15');renderS15()
   });
   $('#riskToActivity')&&($('#riskToActivity').onclick=()=>{if(createPreventiveActivity(r)){alert('La respuesta preventiva quedó creada como actividad y entrará al cronograma y presupuesto.');window.fcRenderJourney?.()}})
 }
 const advanceRiskReview=async()=>{
   const currentAssessment=s.assessments[t.id]||'pending';
   const currentRisk=s.items.find(x=>x.targetId===t.id);
   if(currentAssessment==='yes'&&(!currentRisk||!currentRisk.confirmed)){alert('Confirma este riesgo antes de continuar.');return}
   if(currentAssessment==='pending'){
     const idx=targets.findIndex((tt,ii)=>ii>cursors.S15&&(!s.assessments[tt.id]||s.assessments[tt.id]==='pending'));
     if(idx>=0){cursors.S15=idx;renderS15();return}
     alert('Decide si hay riesgo o selecciona “No veo un riesgo aquí” antes de terminar la revisión.');return
   }
   const nextPending=targets.findIndex((tt,ii)=>ii>cursors.S15&&(!s.assessments[tt.id]||s.assessments[tt.id]==='pending'||(s.assessments[tt.id]==='yes'&&!s.items.find(x=>x.targetId===tt.id&&x.confirmed))));
   if(nextPending>=0){cursors.S15=nextPending;renderS15();return}
   const unresolved=targets.findIndex(tt=>{const a=s.assessments[tt.id];return !a||a==='pending'||(a==='yes'&&!s.items.find(x=>x.targetId===tt.id&&x.confirmed))});
   if(unresolved>=0){cursors.S15=unresolved;renderS15();return}
   write('S15','risk_state',s);sync('S15');window.fcRenderJourney?.();if(typeof window.fcNavigate==='function')await window.fcNavigate('S16')
 };
 $('#riskPrev').onclick=()=>{cursors.S15=Math.max(0,cursors.S15-1);renderS15()};
 $('#riskNext').onclick=advanceRiskReview;
 $('#riskFinish')&&($('#riskFinish').onclick=advanceRiskReview)
}
function mount(){const c=($('#counter')?.textContent||'').slice(0,3);if(c==='S13'&&!$('#fields .plan-wrap'))renderS13();else if(c==='S14'&&!$('#fields .plan-wrap'))renderS14();else if(c==='S15'&&!$('#fields .plan-wrap'))renderS15()}
window.fcGetSchedule=()=>scheduleState().items||[];window.fcGetScheduleIssues=()=>scheduleIssues(scheduleState());window.fcGetBudget=()=>budgetState().items||[];window.fcGetBudgetState=()=>budgetState();window.fcGetBudgetSummary=()=>budgetSummary(budgetState());window.fcGetRisks=()=>riskState().items||[];window.fcGetRiskState=()=>riskState();
const style=document.createElement('style');style.textContent='.plan-wrap{display:grid;gap:12px}.plan-note,.plan-card,.plan-alert,.plan-summary{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}.plan-note{background:#f8fafb}.plan-note p,.plan-alert p{margin:5px 0;color:var(--muted)}.plan-progress{font-size:.82rem;color:var(--muted)}.plan-card h3{margin:4px 0 12px;font-size:1.05rem}.plan-card small{color:var(--muted)}.plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.plan-grid label{display:grid;gap:5px;font-size:.84rem;font-weight:650}.plan-grid input,.plan-grid select,.plan-grid textarea{width:100%;border:1px solid #b8c2cc;border-radius:9px;padding:9px;font:inherit;background:#fff}.plan-grid textarea{min-height:70px}.inline{display:grid;grid-template-columns:1fr 1fr;gap:6px}.dep-list{display:grid;gap:6px;margin-top:8px}.plan-result,.risk-level{margin:10px 0;padding:9px;background:#f8fafb;border-radius:9px}.plan-card button,.plan-nav button,.choice-row button,.resource-row button{border:1px solid #aeb8c2;background:#fff;border-radius:9px;padding:9px 11px;font:inherit}.plan-card button.primary{background:var(--ink);color:#fff;border-color:var(--ink)}.risk-finish-box{border:1px solid #dbe6df;border-radius:12px;padding:12px;background:#f7fbf8;display:grid;gap:7px}.risk-finish-box.pending{background:#fff8df;border-color:#eadc9b}.risk-finish-box p{margin:0;color:var(--muted)}.risk-finish-box button{justify-self:start;border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:9px;padding:10px 13px;font:inherit;font-weight:750}.plan-nav{display:flex;justify-content:space-between;gap:8px}.choice-row{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px}.choice-row button.selected{background:#eef5ff;border-color:#52606d;font-weight:750}.resource-row{border-top:1px solid var(--line);padding:12px 0}.budget-totals{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.budget-totals div{border:1px solid var(--line);border-radius:10px;padding:10px}.budget-totals small{display:block;color:var(--muted)}.budget-totals strong{display:block;margin-top:4px}.table-scroll{overflow:auto}.table-scroll table{width:100%;border-collapse:collapse}.table-scroll th,.table-scroll td{border:1px solid var(--line);padding:7px;text-align:left;font-size:.8rem}.gantt{display:grid;gap:7px;margin:12px 0}.gantt-row{display:grid;grid-template-columns:70px 1fr 180px;gap:8px;align-items:center}.gantt-row>div{height:18px;background:#edf0f3;border-radius:999px;position:relative;overflow:hidden}.gantt-row i{position:absolute;top:0;height:100%;background:#52606d;border-radius:999px}.gantt-row small{color:var(--muted)}.muted{color:var(--muted)}.plan-alert{background:#fff8df;border-color:#eadc9b}@media(max-width:700px){.plan-grid,.budget-totals{grid-template-columns:1fr}.plan-nav,.choice-row{display:grid}.plan-nav button,.choice-row button{width:100%}}';document.head.appendChild(style);
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});mount();
})();