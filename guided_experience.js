(()=>{
const $=s=>document.querySelector(s);
const stages=[
{n:1,title:'Entender la situación',items:[['S01','Identificación general'],['S02','Contexto'],['S03','Población'],['S04','Evidencia'],['S05','Situaciones']]},
{n:2,title:'Encontrar el problema principal',items:[['S06','Comparar situaciones'],['S07','Árbol de problemas'],['S08','Síntesis del problema']]},
{n:3,title:'Definir qué queremos cambiar',items:[['S09','Árbol y objetivos']]},
{n:4,title:'Diseñar qué vamos a hacer',items:[['S10','Alternativas'],['S11','Resultados y actividades'],['S12','Indicadores y metas'],['S13','Cronograma'],['S14','Recursos y presupuesto'],['S15','Riesgos']]},
{n:5,title:'Revisar y entregar',items:[['S16','Resultados, gráficas y documentos']]}
];
let renderKey='',guideKey='',scheduled=false;
function code(){try{return typeof active!=='undefined'?active:(($('#counter')?.textContent||'').match(/^S\d{2}/)?.[0]||'S01')}catch{return 'S01'}}
function data(c){try{return typeof draft!=='undefined'?(draft[c]||{}):{}}catch{return {}}}
function has(v){if(v===null||v===undefined)return false;if(typeof v==='string')return !!v.trim();if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;return true}
function fieldsStatus(c){
 const s=typeof sections!=='undefined'?sections[c]:null,d=data(c);if(!s)return 'missing';
 const req=(s.fields||[]).filter(x=>x[2]).map(x=>x[0]),all=(s.fields||[]).map(x=>x[0]);
 const some=all.some(k=>has(d[k])),done=req.length?req.every(k=>has(d[k])):some;
 return done?'complete':some?'progress':'missing'
}
function state(c){
 const d=data(c);
 try{
  if(c==='S05'){const p=d.vester_preparation_v2||d.vester_preparation||{};const xs=p.items||[];if(xs.filter(x=>x.confirmed&&(x.status==='ready'||x.status==='confirmed')).length>=2)return 'complete';return has(d.situaciones_observables)?'progress':'missing'}
  if(c==='S06'){const v=d.vester_state||{},ps=v.selected||[],rel=v.relations||{};let need=ps.length*(ps.length-1),answered=Object.values(rel).filter(r=>Number.isInteger(r?.score)).length;const cv=d.causal_validation||{},pairs=cv.pairs||[];const reviewed=pairs.filter(p=>p.decision&&p.decision!=='pending').length;if(ps.length>=2&&answered>=need&&(!pairs.length||reviewed===pairs.length))return 'complete';return ps.length||answered||pairs.length?'progress':'missing'}
  if(c==='S07'){const t=d.tree_state||{},ns=t.nodes||[],cent=ns.some(n=>n.zone==='central'),linked=ns.filter(n=>n.zone&&n.zone!=='outside'&&n.zone!=='central').length;if(cent&&linked)return 'complete';return cent||ns.length?'progress':'missing'}
  if(c==='S08')return has(d.enunciado)?'complete':fieldsStatus(c);
  if(c==='S09'){const o=d.objectives_state||{},xs=o.items||[];if(xs.length&&xs.every(x=>x.confirmed))return 'complete';return xs.length?'progress':'missing'}
  if(c==='S10'){const xs=d.completion_state?.items||[];if(xs.some(x=>x.selected&&x.confirmed))return 'complete';return xs.length?'progress':'missing'}
  if(c==='S11'){const rs=d.results_state?.items||[],as=d.completion_state?.items||[];const r=rs.filter(x=>x.confirmed),a=as.filter(x=>x.confirmed);if(r.length&&a.length&&a.every(x=>x.resultId||x.objectiveId))return 'complete';return rs.length||as.length?'progress':'missing'}
  if(c==='S12'){const xs=d.completion_state?.items||[];if(xs.length&&xs.every(x=>x.confirmed))return 'complete';return xs.length?'progress':'missing'}
  if(c==='S13'){const xs=d.schedule_state?.items||[],acts=(data('S11').completion_state?.items||[]).filter(x=>x.confirmed);if(acts.length&&xs.filter(x=>x.confirmed).length>=acts.length)return 'complete';return xs.length?'progress':'missing'}
  if(c==='S14'){const b=d.budget_state||{},ass=b.activityStatus||{},items=b.items||[],acts=(data('S11').completion_state?.items||[]).filter(x=>x.confirmed);const ok=acts.filter(a=>{const st=ass[a.id];if(st==='nocost')return true;if(st==='cost'||st==='inkind'){const xs=items.filter(x=>x.activityId===a.id);return xs.length>0&&xs.every(x=>x.confirmed)}return false}).length;if(acts.length&&ok===acts.length)return 'complete';return items.length||Object.keys(ass).length?'progress':'missing'}
  if(c==='S15'){const r=d.risk_state||{},ass=r.assessments||{},targets=(r.targets||[]),items=r.items||[];const complete=targets.length&&targets.every(t=>{const a=ass[t.id];if(a==='no')return true;if(a==='yes')return !!items.find(x=>x.targetId===t.id&&x.confirmed);return false});if(complete)return 'complete';return items.length||Object.keys(ass).length?'progress':'missing'}
  if(c==='S16'){const rv=d.review_state||{};return rv.confirmed?'complete':has(rv)?'progress':'missing'}
 }catch{}
 return fieldsStatus(c)
}
function stLabel(s){return s==='complete'?'Completa':s==='progress'?'En curso':'Falta'}
function stageFor(c){return stages.find(s=>s.items.some(i=>i[0]===c))||stages[0]}
function stageState(stage){const ss=stage.items.map(x=>state(x[0]));return ss.every(x=>x==='complete')?'complete':ss.some(x=>x!=='missing')?'progress':'missing'}
async function go(c){if(typeof window.fcNavigate==='function')await window.fcNavigate(c);else{try{active=c;render()}catch{}}}
function renderJourney(){
 document.body.classList.add('guided-mode');
 const current=code();const statuses=stages.flatMap(s=>s.items.map(([c])=>c+':'+state(c))).join('|');
 const key=current+'|'+statuses;if(key===renderKey)return;renderKey=key;
 let wrap=$('#guidedJourney');if(!wrap){wrap=document.createElement('section');wrap.id='guidedJourney';wrap.className='guided-journey';$('.nav-wrap')?.insertAdjacentElement('beforebegin',wrap)}
 wrap.className='guided-journey';
 wrap.innerHTML='<div class="guided-journey-head"><div><strong>Tu recorrido</strong><p>Ubica dónde vas, qué ya terminaste y qué falta. Puedes entrar directamente a cualquier sección.</p></div><button class="guided-review-btn" type="button">Revisar lo que llevo</button></div><div class="guided-stage-grid">'+stages.map(s=>{const ss=stageState(s),cur=s.items.some(i=>i[0]===current);return '<section class="guided-stage '+(cur?'current ':'')+ss+'"><header><span class="stage-number">'+s.n+'</span><div><strong>'+s.title+'</strong><span class="stage-status '+ss+'">'+stLabel(ss)+'</span></div></header><div class="guided-subsections">'+s.items.map(([c,t])=>{const cs=state(c);return '<button type="button" data-code="'+c+'" class="guided-subsection '+(c===current?'current ':'')+cs+'"><span class="status-dot"></span><span><small>'+c+'</small>'+t+'</span></button>'}).join('')+'</div></section>'}).join('')+'</div>';
 wrap.querySelectorAll('[data-code]').forEach(b=>b.onclick=()=>go(b.dataset.code));
 wrap.querySelector('.guided-review-btn').onclick=()=>go('S16')
}
function renderGuide(){
 const c=code(),fields=$('#fields');if(!fields)return;const s=stageFor(c),item=s.items.find(x=>x[0]===c),k=c+':'+s.n;if(k===guideKey&&fields.querySelector('.guided-section-note'))return;fields.querySelector('.guided-section-note')?.remove();const note=document.createElement('div');note.className='guided-section-note';note.innerHTML='<span>Paso '+s.n+' · '+s.title+'</span><strong>'+c+' · '+(item?.[1]||'Sección actual')+'</strong>';fields.prepend(note);guideKey=k
}
function simplifyVester(){const root=$('#vesterWizard');if(!root)return;const top=root.querySelector('.vester-top h3');if(top)top.textContent='Comparar situaciones';const p=root.querySelector('.vester-top p');if(p)p.textContent='Te mostramos dos situaciones cada vez. Responde si una puede provocar cambios en la otra.'}
function mount(){scheduled=false;renderJourney();renderGuide();simplifyVester()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(mount)}
window.fcSectionStatus=state;window.fcRenderJourney=()=>{renderKey='';schedule()};
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});schedule();
})();