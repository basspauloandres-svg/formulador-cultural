(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEY='formulador-cultural-synthesis-v1';
let structuredEvidence=[];
let mounted=false;

function localState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
let state=localState();

function syncFromDraft(){
  const cloudState=typeof draft!=='undefined'?draft?.S08?.synthesis_state:null;
  if(!cloudState)return;
  const localTime=Date.parse(state.updatedAt||0)||0;
  const cloudTime=Date.parse(cloudState.updatedAt||0)||0;
  if(!Object.keys(state).length||cloudTime>=localTime)state={...cloudState};
  localStorage.setItem(KEY,JSON.stringify(state));
}
function persistState(){
  state.updatedAt=new Date().toISOString();
  localStorage.setItem(KEY,JSON.stringify(state));
  if(typeof draft!=='undefined'){
    draft.S08=draft.S08||{};
    draft.S08.synthesis_state=state;
    localStorage.setItem(storeKey,JSON.stringify(draft));
  }
}
function treeState(){try{return draft?.S07?.tree_state||JSON.parse(localStorage.getItem('formulador-cultural-problem-tree-v1')||'{}')}catch{return {}}}
function vesterState(){try{return draft?.S06?.vester_state||JSON.parse(localStorage.getItem('formulador-cultural-vester-v1')||'{}')}catch{return {}}}
function central(){return treeState()?.nodes?.find(n=>n.zone==='central')?.text?.trim()||draft?.S07?.problema_central?.trim()||''}
function population(){return draft?.S03?.poblacion_afectada?.trim()||draft?.S03?.poblacion_participante?.trim()||''}
function territory(){return draft?.S02?.territorio_o_lugar_de_intervencion?.trim()||draft?.S01?.municipio?.trim()||''}
function causes(){return (treeState()?.nodes||[]).filter(n=>n.zone==='direct_cause').map(n=>n.text)}
function effects(){return (treeState()?.nodes||[]).filter(n=>n.zone==='direct_effect').map(n=>n.text)}
function verifiedEvidence(){return structuredEvidence.filter(e=>e.verification_status==='verificada')}
function pendingEvidence(){return structuredEvidence.filter(e=>e.verification_status==='por_verificar')}
function evidenceText(){const rows=verifiedEvidence();return rows.map(e=>e.title||e.text).filter(Boolean)}
function evidenceDisplay(){
  const verified=verifiedEvidence();
  const pending=pendingEvidence();
  if(!verified.length)return `[POR VERIFICAR]${pending.length?` · ${pending.length} registro(s) pendiente(s)`:''}`;
  const names=verified.slice(0,3).map(e=>e.title||e.text).join(' · ');
  return `${verified.length} verificada(s): ${names}${verified.length>3?' …':''}${pending.length?` · ${pending.length} pendiente(s)`:''}`;
}
function vesterHint(){
  const vs=vesterState(); if(!vs?.selected?.length)return '';
  const map=new Map(vs.selected.map(p=>[p.id,{...p,i:0,d:0}]));
  for(const [k,r] of Object.entries(vs.relations||{})){
    if(!Number.isInteger(r?.score))continue;
    const [a,b]=k.split('>'); if(map.has(a))map.get(a).i+=r.score; if(map.has(b))map.get(b).d+=r.score;
  }
  const c=(treeState()?.nodes||[]).find(n=>n.zone==='central');
  if(!c||!map.has(c.id))return '';
  const v=map.get(c.id); return `Vester: influencia ${v.i}, dependencia ${v.d}. Lectura orientativa, no evidencia causal.`;
}
function src(label,val,source){return `<div class="synthesis-source"><strong>${label}</strong><div class="${val&& !String(val).startsWith('[POR VERIFICAR]')?'':'missing'}">${esc(val||'[POR VERIFICAR]')}</div><small>${source}</small></div>`}
function buildProposal(){
  const c=central()||'[POR VERIFICAR]'; const p=population(); const t=territory(); let text=c;
  if(p&&!text.toLowerCase().includes(p.toLowerCase()))text+=` en ${p}`;
  if(t&&!text.toLowerCase().includes(t.toLowerCase()))text+=` en ${t}`;
  return text.replace(/\s+/g,' ').trim();
}
function longDescription(){
  const c=central()||'[POR VERIFICAR]'; const p=population()||'[POR VERIFICAR]'; const t=territory()||'[POR VERIFICAR]';
  const ev=evidenceText(); const cs=causes(); const es=effects();
  return `El problema central identificado es: ${c}. La población relacionada es ${p} y el alcance territorial registrado corresponde a ${t}. ${ev.length?`La evidencia verificada asociada en S04 incluye: ${ev.join('; ')}.`:'La evidencia estructurada verificada permanece [POR VERIFICAR].'} ${cs.length?`Entre las causas directas confirmadas por el usuario se encuentran: ${cs.join('; ')}.`:'Las causas directas permanecen [POR VERIFICAR].'} ${es.length?`Entre los efectos directos confirmados por el usuario se encuentran: ${es.join('; ')}.`:'Los efectos directos permanecen [POR VERIFICAR].'}`;
}
function checks(text){
  const out=[]; if(!text)out.push(['warn','Falta una formulación para revisar.']);
  if(/^falta de |^ausencia de |^carencia de /i.test(text))out.push(['warn','La formulación podría estar expresando ausencia de una solución. Revisa la condición observable.']);
  if(text.length>220)out.push(['warn','La formulación es extensa; considera concentrarla en una sola situación principal.']);
  if(!population())out.push(['warn','La población está [POR VERIFICAR].']);
  if(!territory())out.push(['warn','El territorio está [POR VERIFICAR].']);
  if(!verifiedEvidence().length)out.push(['warn','S04 no contiene evidencia estructurada con estado “Verificada”.']);
  if(!out.length)out.push(['ok','La formulación supera las reglas básicas. La suficiencia metodológica y de evidencia requiere revisión humana.']);
  return out;
}
async function loadStructuredEvidence(){
  structuredEvidence=[];
  if(typeof sb==='undefined'||!sb||typeof session==='undefined'||!session)return;
  try{
    const project=typeof ensureProject==='function'?await ensureProject():null;
    if(!project)return;
    const {data,error}=await sb.from('evidence').select('id,title,text,source_kind,source_ref,source_url,source_date,verification_status,notes').eq('project_id',project.id).eq('section_code','S04').neq('verification_status','descartada').order('created_at',{ascending:false});
    if(error)throw error;
    structuredEvidence=data||[];
  }catch(e){console.error('S08 evidence load',e)}
}
function render(){
  const host=$('#synthesisBody'); if(!host)return;
  const proposal=state.proposal||buildProposal(); const desc=state.description||longDescription(); const ch=checks(proposal);
  host.innerHTML=`<div class="synthesis-note"><strong>Síntesis asistida</strong><p>S08 integra decisiones previas. El sistema recupera datos y evidencia; la propuesta de redacción es asistida; la formulación final la confirma el usuario.</p></div><div class="synthesis-source-grid">${src('Problema central',central(),'S07 · decisión del usuario')}${src('Población',population(),'S03 · dato del proyecto')}${src('Territorio',territory(),'S02/S01 · dato del proyecto')}${src('Evidencia',evidenceDisplay(),'S04 · registros estructurados')}</div>${vesterHint()?`<div class="synthesis-note"><strong>Apoyo Vester</strong><p>${esc(vesterHint())}</p></div>`:''}<div class="synthesis-actions"><button id="genProposal" class="primary">Generar propuesta</button><button id="reviewProposal">Revisar formulación</button><button id="compareProposal">Comparar con S07</button><button id="markPV">Marcar vacíos [POR VERIFICAR]</button></div><div class="synthesis-card selected"><strong>Propuesta de enunciado breve</strong><blockquote>${esc(proposal)}</blockquote><div class="synthesis-trace"><span>Situación principal: S07</span><span>Población: S03</span><span>Territorio: S02/S01</span><span>Evidencia: S04 verificada</span><span>Vester: apoyo interpretativo</span></div></div><div class="synthesis-checks">${ch.map(([c,t])=>`<div class="${c}">${esc(t)}</div>`).join('')}</div><div class="synthesis-final"><strong>Formulación final editable</strong><p>Edítala libremente. Confirmar guarda el estado local y, con sesión activa, sincroniza S08 en la nube.</p><textarea id="finalProblem">${esc(state.final||proposal)}</textarea><button id="confirmFinal" class="primary">Confirmar formulación</button></div><div class="synthesis-long"><strong>Descripción sustentada del problema</strong><textarea id="longProblem">${esc(desc)}</textarea></div>`;
  $('#genProposal').onclick=()=>{state.proposal=buildProposal();state.description=longDescription();persistState();render()};
  $('#reviewProposal').onclick=()=>{state.proposal=$('#finalProblem').value.trim();state.description=$('#longProblem').value.trim();persistState();render()};
  $('#compareProposal').onclick=()=>{const c=central();alert(c?`Problema central confirmado en S07:\n\n${c}\n\nS08 puede precisarlo con población, territorio y evidencia, pero no reemplazarlo sin tu confirmación.`:'S07 todavía no contiene un problema central confirmado.')};
  $('#markPV').onclick=()=>{let t=$('#finalProblem').value.trim();if(!population())t+=' · población [POR VERIFICAR]';if(!territory())t+=' · territorio [POR VERIFICAR]';if(!verifiedEvidence().length)t+=' · evidencia [POR VERIFICAR]';state.final=t;persistState();render()};
  $('#confirmFinal').onclick=async()=>{
    state.final=$('#finalProblem').value.trim(); state.description=$('#longProblem').value.trim(); state.confirmed=true; persistState();
    draft.S08=draft.S08||{}; draft.S08.enunciado=state.final; draft.S08.evidencia_soporte=evidenceText().join(' · ')||'[POR VERIFICAR]'; draft.S08.alcance=[territory(),population()].filter(Boolean).join(' · ')||'[POR VERIFICAR]'; draft.S08.synthesis_state=state; localStorage.setItem(storeKey,JSON.stringify(draft));
    if(typeof session!=='undefined'&&session&&typeof syncSection==='function'){
      try{await syncSection('S08'); if(typeof setStatus==='function')setStatus('S08 confirmada y sincronizada en la nube.',true); alert('Formulación confirmada y sincronizada en S08.');}
      catch(e){if(typeof setStatus==='function')setStatus(`S08 confirmada localmente. La sincronización falló: ${e.message||'error desconocido'}`);alert('La formulación quedó confirmada localmente, pero la sincronización con la nube falló.');}
    }else alert('Formulación confirmada localmente. Inicia sesión para sincronizarla entre dispositivos.');
  };
}
async function mount(){
  const counter=$('#counter'),fields=$('#fields'); if(!counter||!fields||!counter.textContent.startsWith('S08'))return; if($('#synthesisWizard'))return;
  syncFromDraft(); fields.innerHTML=''; fields.insertAdjacentHTML('beforeend','<section id="synthesisWizard" class="synthesis-wizard"><span class="synthesis-mode">Síntesis asistida del problema central</span><h3>Construir la formulación final a partir de S01–S07</h3><p>La asistencia puede proponer redacción. Los datos confirmados, la evidencia y la decisión metodológica final siguen siendo tuyos.</p><div id="synthesisBody"></div></section>');
  render(); mounted=true; await loadStructuredEvidence(); if($('#synthesisWizard'))render();
}
new MutationObserver(()=>mount()).observe(document.body,{subtree:true,childList:true,characterData:true});
mount();
})();
