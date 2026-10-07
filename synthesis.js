(()=>{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEY='formulador-cultural-synthesis-v1';
let structuredEvidence=[];

function localState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
let state=localState();
function syncFromDraft(){const cloudState=typeof draft!=='undefined'?draft?.S08?.synthesis_state:null;if(!cloudState)return;const localTime=Date.parse(state.updatedAt||0)||0;const cloudTime=Date.parse(cloudState.updatedAt||0)||0;if(!Object.keys(state).length||cloudTime>=localTime)state={...cloudState};localStorage.setItem(KEY,JSON.stringify(state))}
function persistState(){state.updatedAt=new Date().toISOString();state.sourceSignature=treeSignature();localStorage.setItem(KEY,JSON.stringify(state));if(typeof draft!=='undefined'){draft.S08=draft.S08||{};draft.S08.synthesis_state=state;localStorage.setItem(storeKey,JSON.stringify(draft))}}
function persistEditors({confirm=false}={}){
 const finalEl=$('#finalProblem'),longEl=$('#longProblem');
 if(finalEl)state.final=finalEl.value.trim();
 if(longEl)state.description=longEl.value.trim();
 state.confirmed=!!confirm;state.stale=false;
 if(typeof draft!=='undefined'){draft.S08=draft.S08||{};draft.S08.enunciado_borrador=state.final||'';draft.S08.descripcion_borrador=state.description||''}
 persistState();return !!state.final
}
async function confirmAndContinue(){
 if(!persistEditors({confirm:true})){alert('Escribe o selecciona una formulación antes de continuar.');return false}
 draft.S08=draft.S08||{};draft.S08.enunciado=state.final;draft.S08.evidencia_soporte=evidenceText().join(' · ')||'[POR VERIFICAR]';draft.S08.alcance=[territory(),population()].filter(Boolean).join(' · ')||'[POR VERIFICAR]';draft.S08.synthesis_state=state;localStorage.setItem(storeKey,JSON.stringify(draft));
 if(typeof session!=='undefined'&&session&&typeof syncSection==='function'){try{await syncSection('S08');if(typeof setStatus==='function')setStatus('S08 guardada y sincronizada.',true)}catch(e){if(typeof setStatus==='function')setStatus('S08 guardada localmente. La sincronización falló: '+(e.message||'error desconocido'))}}
 else if(typeof setStatus==='function')setStatus('S08 guardada en este navegador.',true);
 if(typeof window.fcRenderJourney==='function')window.fcRenderJourney();
 if(typeof window.fcNavigate==='function')await window.fcNavigate('S09');
 return true
}
function bindS08GlobalSave(){
 ['#save','#mSave'].forEach(sel=>{const b=$(sel);if(!b||b.dataset.s08DraftBound)return;b.dataset.s08DraftBound='1';b.addEventListener('click',()=>{if(typeof active!=='undefined'&&active==='S08'){persistEditors({confirm:false});if(typeof setStatus==='function')setStatus('Borrador de S08 guardado en este navegador.',true)}},true)})
}
window.fcSaveS08Draft=()=>persistEditors({confirm:false});
window.fcConfirmS08AndContinue=confirmAndContinue;
function treeState(){try{return draft?.S07?.tree_state||JSON.parse(localStorage.getItem('formulador-cultural-problem-tree-v1')||'{}')}catch{return {}}}
function cleanNodeText(v){return String(v||'').replace(/^\s*(?:P)?\d+[.)-]?\s*/i,'').replace(/^\s*\[POR (?:REVISAR|VERIFICAR|DEFINIR)\]\s*/i,'').replace(/\s+/g,' ').trim()}
function treeSignature(){const ns=(treeState()?.nodes||[]).filter(n=>['central','direct_cause','indirect_cause','direct_effect','indirect_effect'].includes(n.zone)).map(n=>({id:n.id,zone:n.zone,text:cleanNodeText(n.text),parentId:n.parentId||null,reviewed:n.reviewed!==false}));return JSON.stringify(ns)}
function vesterState(){try{return draft?.S06?.vester_state||JSON.parse(localStorage.getItem('formulador-cultural-vester-v1')||'{}')}catch{return {}}}
function central(){const n=treeState()?.nodes?.find(n=>n.zone==='central');return n?cleanNodeText(n.text):''}
function population(){return draft?.S03?.poblacion_afectada?.trim()||draft?.S03?.poblacion_participante?.trim()||''}
function territory(){return draft?.S02?.territorio_o_lugar_de_intervencion?.trim()||draft?.S01?.municipio?.trim()||''}
function causes(){return (treeState()?.nodes||[]).filter(n=>n.zone==='direct_cause'&&n.reviewed!==false).map(n=>cleanNodeText(n.text)).filter(Boolean)}
function effects(){return (treeState()?.nodes||[]).filter(n=>n.zone==='direct_effect'&&n.reviewed!==false).map(n=>cleanNodeText(n.text)).filter(Boolean)}
function verifiedEvidence(){return structuredEvidence.filter(e=>e.verification_status==='verificada')}
function pendingEvidence(){return structuredEvidence.filter(e=>e.verification_status==='por_verificar')}
function evidenceText(){return verifiedEvidence().map(e=>e.title||e.text).filter(Boolean)}
function evidenceDisplay(){const verified=verifiedEvidence(),pending=pendingEvidence();if(!verified.length)return `[POR VERIFICAR]${pending.length?` · ${pending.length} registro(s) pendiente(s)`:''}`;const names=verified.slice(0,3).map(e=>e.title||e.text).join(' · ');return `${verified.length} verificada(s): ${names}${verified.length>3?' …':''}${pending.length?` · ${pending.length} pendiente(s)`:''}`}
function looksLikeSolution(text){const clean=String(text||'').trim().toLowerCase();if(/^(falta de |ausencia de |carencia de )/.test(clean))return true;return /\b(requiere|necesita|debe|debería|implementar|crear|ofrecer|realizar|desarrollar|fortalecer|capacitar|taller(?:es)?|programa|proyecto|estrategia)\b/i.test(clean)}
function sentence(v){const t=String(v||'').trim().replace(/[.]+$/,'');return t?t.charAt(0).toUpperCase()+t.slice(1):t}
function delimit(text){let out=sentence(text);const p=population(),t=territory();if(p&&!out.toLowerCase().includes(p.toLowerCase()))out+=` en ${p}`;if(t&&!out.toLowerCase().includes(t.toLowerCase()))out+=` en ${t}`;return out}
function reformulationCandidates(){
  const raw=central().trim(); if(!raw)return [];
  if(!looksLikeSolution(raw)){
    return [
      {label:'Conservar el núcleo',text:delimit(raw),note:'Mantiene el problema central confirmado en S07 y añade únicamente la delimitación disponible.'},
      {label:'Versión sintética',text:sentence(raw),note:'Conserva la formulación de S07 sin añadir información nueva.'}
    ];
  }
  let subject='';let core='';
  const modal=raw.match(/^(.+?)\s+(?:requiere|necesita|debe|debería)\s+(.+)$/i);
  if(modal){subject=modal[1].trim();core=modal[2].trim()}else core=raw.replace(/^(falta de|ausencia de|carencia de)\s+/i,'').trim();
  const split=core.split(/\s+para\s+/i); const purpose=(split.length>1?split.slice(1).join(' para '):'').trim(); const intervention=split[0].trim();
  const focus=purpose||intervention;
  const who=subject||population()||'la situación analizada';
  const base1=`Dificultades observables de ${who} relacionadas con ${focus}`;
  const base2=`Limitaciones identificadas en ${who} vinculadas con ${focus}`;
  const base3=`Situación problemática de ${who} asociada con ${focus}`;
  return [
    {label:'Más descriptiva',text:delimit(base1),note:'Retira la solución explícita y conserva el contenido disponible. La condición concreta debe confirmarse.'},
    {label:'Más específica',text:delimit(base2),note:'Convierte la necesidad de intervención en una condición negativa provisional. Requiere revisar evidencia y precisión.'},
    {label:'Más sintética',text:delimit(base3),note:'Ofrece una redacción breve para editar. La relación propuesta permanece [POR VERIFICAR] hasta que la confirmes.'}
  ];
}
function vesterHint(){const vs=vesterState();if(!vs?.selected?.length)return '';const map=new Map(vs.selected.map(p=>[p.id,{...p,i:0,d:0}]));for(const [k,r] of Object.entries(vs.relations||{})){if(!Number.isInteger(r?.score))continue;const [a,b]=k.split('>');if(map.has(a))map.get(a).i+=r.score;if(map.has(b))map.get(b).d+=r.score}const c=(treeState()?.nodes||[]).find(n=>n.zone==='central');if(!c||!map.has(c.id))return '';const v=map.get(c.id);return `Vester: influencia ${v.i}, dependencia ${v.d}. Lectura orientativa, no evidencia causal.`}
function src(label,val,source){return `<div class="synthesis-source"><strong>${label}</strong><div class="${val&&!String(val).startsWith('[POR VERIFICAR]')?'':'missing'}">${esc(val||'[POR VERIFICAR]')}</div><small>${source}</small></div>`}
function buildProposal(){const c=central().trim();if(!c)return '[POR VERIFICAR] Define primero una situación negativa observable como problema central.';if(looksLikeSolution(c))return `[POR VERIFICAR] La formulación de S07 parece expresar una necesidad o solución («${c}»). Usa “Ayúdame a reformular” para revisar alternativas.`;return delimit(c)}
function longDescription(){
 const c=central().trim(),p=population()||'[POR VERIFICAR]',t=territory()||'[POR VERIFICAR]',ev=evidenceText(),cs=causes(),es=effects();
 if(!c)return 'El problema central permanece [POR VERIFICAR].';
 const parts=[];
 parts.push(looksLikeSolution(c)?`La formulación actual del problema central («${c}») todavía parece expresar una solución o necesidad y requiere revisión antes de continuar.`:`El problema central definido es: ${c}.`);
 parts.push(`La población relacionada es ${p} y el territorio registrado corresponde a ${t}.`);
 parts.push(ev.length?`La evidencia verificada disponible incluye: ${ev.join('; ')}.`:'La evidencia que respalda esta formulación permanece [POR VERIFICAR].');
 parts.push(cs.length?`Las causas directas identificadas son: ${cs.join('; ')}.`:'Las causas directas permanecen [POR VERIFICAR].');
 parts.push(es.length?`Los efectos directos identificados son: ${es.join('; ')}.`:'Los efectos directos permanecen [POR VERIFICAR].');
 return parts.join(' ')
}
function checks(text){const out=[];if(!text)out.push(['warn','Falta una formulación para revisar.']);if(text&&looksLikeSolution(text)&&!String(text).startsWith('[POR VERIFICAR]'))out.push(['warn','La formulación parece expresar una necesidad, acción o solución. Revisa cuál es la situación negativa observable que existe antes de esa respuesta.']);if(text.length>220)out.push(['warn','La formulación es extensa; considera concentrarla en una sola situación principal.']);if(!population())out.push(['warn','La población está [POR VERIFICAR].']);if(!territory())out.push(['warn','El territorio está [POR VERIFICAR].']);if(!verifiedEvidence().length)out.push(['warn','S04 no contiene evidencia estructurada con estado “Verificada”.']);if(!out.length)out.push(['ok','La formulación supera las reglas básicas. La suficiencia metodológica y de evidencia requiere revisión humana.']);return out}
async function loadStructuredEvidence(){structuredEvidence=[];if(typeof sb==='undefined'||!sb||typeof session==='undefined'||!session)return;try{const project=typeof ensureProject==='function'?await ensureProject():null;if(!project)return;const {data,error}=await sb.from('evidence').select('id,title,text,source_kind,source_ref,source_url,source_date,verification_status,notes').eq('project_id',project.id).eq('section_code','S04').neq('verification_status','descartada').order('created_at',{ascending:false});if(error)throw error;structuredEvidence=data||[]}catch(e){console.error('S08 evidence load',e)}}
function alternativesHtml(){if(!state.alternativesVisible)return '';const items=reformulationCandidates();if(!items.length)return '<div class="synthesis-note"><strong>Faltan insumos</strong><p>Define primero un problema central en S07 para poder proponer reformulaciones.</p></div>';return `<section class="synthesis-alternatives"><div class="alternatives-head"><div><strong>Propuestas de reformulación</strong><p>Son borradores asistidos. No sustituyen tu decisión ni constituyen evidencia.</p></div><button id="hideAlternatives">Ocultar</button></div>${items.map((x,i)=>`<article class="synthesis-alt"><span class="proposal-tag">Propuesta asistida · no confirmada</span><h4>${esc(x.label)}</h4><blockquote>${esc(x.text)}</blockquote><p>${esc(x.note)}</p><button data-use-alt="${i}" class="primary">Usar esta propuesta</button></article>`).join('')}</section>`}
function render(){
  const host=$('#synthesisBody');if(!host)return;
  const currentSig=treeSignature(),legacy=!!state.description&&!state.sourceSignature,stale=legacy||(!!state.sourceSignature&&state.sourceSignature!==currentSig);
  if(stale){state.description=longDescription();state.confirmed=false;state.stale=true;state.sourceSignature=currentSig;localStorage.setItem(KEY,JSON.stringify(state));if(typeof draft!=='undefined'){draft.S08=draft.S08||{};draft.S08.synthesis_state=state;localStorage.setItem(storeKey,JSON.stringify(draft))}}
  const proposal=state.proposal||buildProposal(),desc=state.description||longDescription(),ch=checks(proposal),evidenceTrace=verifiedEvidence().length?'Evidencia: S04 verificada':'Evidencia: [POR VERIFICAR]';
  host.innerHTML=`${state.stale?'<div class="synthesis-note"><strong>S07 cambió desde la última síntesis</strong><p>La descripción se actualizó con el árbol vigente. Revisa y confirma nuevamente la formulación final antes de continuar.</p></div>':''}<div class="synthesis-note"><strong>Síntesis asistida</strong><p>S08 integra decisiones previas. Puede revisar y proponer redacciones; la formulación final siempre la confirma el usuario.</p></div><div class="synthesis-source-grid">${src('Problema central',central(),'S07 · decisión del usuario')}${src('Población',population(),'S03 · dato del proyecto')}${src('Territorio',territory(),'S02/S01 · dato del proyecto')}${src('Evidencia',evidenceDisplay(),'S04 · registros estructurados')}</div>${vesterHint()?`<div class="synthesis-note"><strong>Apoyo Vester</strong><p>${esc(vesterHint())}</p></div>`:''}<div class="synthesis-actions"><button id="genProposal" class="primary">Generar propuesta</button><button id="reformulateBtn">Ayúdame a reformular</button><button id="reviewProposal">Revisar formulación</button><button id="compareProposal">Comparar con S07</button><button id="markPV">Marcar vacíos [POR VERIFICAR]</button></div>${alternativesHtml()}<div class="synthesis-card selected"><strong>Propuesta de enunciado breve</strong><blockquote>${esc(proposal)}</blockquote><div class="synthesis-trace"><span>Situación principal: S07</span><span>Población: S03</span><span>Territorio: S02/S01</span><span>${esc(evidenceTrace)}</span><span>Vester: apoyo interpretativo</span></div></div><div class="synthesis-checks">${ch.map(([c,t])=>`<div class="${c}">${esc(t)}</div>`).join('')}</div><div class="synthesis-final"><strong>Formulación final editable</strong><p>Selecciona una propuesta o edita libremente. Confirmar guarda tu decisión.</p><textarea id="finalProblem">${esc(state.final||proposal)}</textarea><button id="confirmFinal" class="primary">Guardar y continuar a S09</button><small class="s08-autosave-note">Tu borrador se guarda mientras escribes.</small></div><div class="synthesis-long"><strong>Descripción sustentada del problema</strong><textarea id="longProblem">${esc(desc)}</textarea></div>`;
  $('#genProposal').onclick=()=>{state.proposal=buildProposal();state.description=longDescription();state.stale=false;persistState();render()};
  $('#reformulateBtn').onclick=()=>{state.alternativesVisible=true;persistState();render()};
  $('#hideAlternatives')?.addEventListener('click',()=>{state.alternativesVisible=false;persistState();render()});
  document.querySelectorAll('[data-use-alt]').forEach(btn=>btn.onclick=()=>{const item=reformulationCandidates()[Number(btn.dataset.useAlt)];if(!item)return;state.proposal=item.text;state.final=item.text;state.alternativesVisible=false;state.confirmed=false;persistState();render()});
  $('#reviewProposal').onclick=()=>{state.proposal=$('#finalProblem').value.trim();state.description=$('#longProblem').value.trim();persistState();render()};
  $('#compareProposal').onclick=()=>{const c=central();alert(c?`Problema central registrado en S07:\n\n${c}\n\nS08 puede revisarlo y proponer alternativas, pero cualquier cambio requiere tu confirmación.`:'S07 todavía no contiene un problema central confirmado.')};
  $('#markPV').onclick=()=>{let t=$('#finalProblem').value.trim();if(!population())t+=' · población [POR VERIFICAR]';if(!territory())t+=' · territorio [POR VERIFICAR]';if(!verifiedEvidence().length)t+=' · evidencia [POR VERIFICAR]';state.final=t;persistEditors({confirm:false});render()};
  $('#finalProblem').oninput=()=>persistEditors({confirm:false});
  $('#longProblem').oninput=()=>persistEditors({confirm:false});
  $('#confirmFinal').onclick=confirmAndContinue;
}
async function mount(){const counter=$('#counter'),fields=$('#fields');if(!counter||!fields||!counter.textContent.startsWith('S08'))return;bindS08GlobalSave();if($('#synthesisWizard'))return;syncFromDraft();fields.innerHTML='';fields.insertAdjacentHTML('beforeend','<section id="synthesisWizard" class="synthesis-wizard"><span class="synthesis-mode">Síntesis asistida del problema central</span><h3>Construir la formulación final a partir de S01–S07</h3><p>La asistencia puede revisar y proponer redacción. Los datos confirmados, la evidencia y la decisión metodológica final siguen siendo tuyos.</p><div id="synthesisBody"></div></section>');render();await loadStructuredEvidence();if($('#synthesisWizard'))render()}
new MutationObserver(()=>mount()).observe(document.body,{subtree:true,childList:true,characterData:true});mount();
})();