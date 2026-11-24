/* Piloto S02: orientación local + IA opcional. Ningún texto se reemplaza sin aprobación. */
(()=>{
'use strict';
const API='https://formulador-cultural-api.onrender.com';
const TEXTS={
 territorio_o_lugar_de_intervencion:['¿Cuál es el lugar específico y qué delimitación tiene?','¿Qué información verificable describe este territorio?'],
 caracteristicas_culturales:['¿Qué prácticas y expresiones culturales identificas?','¿Qué fuente o experiencia respalda la descripción?'],
 principales_dinamicas_sociales:['¿Qué relaciones o condiciones sociales son pertinentes para el proyecto?','¿Cuáles son observaciones y cuáles interpretaciones?'],
 antecedentes:['¿Qué acciones se realizaron previamente y quién las documentó?','¿Qué resultados pueden corroborarse y cuáles están [POR VERIFICAR]?']
};
function formatLocal(input){
 const value=String(input||'').trim().replace(/\s+/g,' ');
 if(!value)return '';
 const first=value.charAt(0).toLocaleUpperCase('es')+value.slice(1);
 return /[.!?]$/.test(first)?first:first+'.';
}
function createText(tag,cls,txt){
 const node=document.createElement(tag);node.className=cls;node.textContent=txt;return node
}
function territorialContext(){
 const city=String(draft?.S01?.municipio||'').trim();
 const department=String(draft?.S01?.departamento||'').trim();
 return city+(department?', '+department:'');
}

function cardFor(textarea){
 const fieldId=textarea.dataset.field;
 if(!TEXTS[fieldId]||textarea.closest('.field')?.querySelector('.vt-assist'))return;
 const host=textarea.closest('.field');if(!host)return;
 const card=document.createElement('section');
 card.className='vt-assist';card.dataset.assistField=fieldId;
 const heading=createText('strong','vt-assist-heading','Asistente de formulación · S02 (evaluación)');
 const explanation=createText('p','vt-assist-note','VÉRTICE utiliza IA generativa para ayudarte a formular; también puede investigar y complementar con fuentes. Toda propuesta es editable y requiere tu aprobación.');
 const actions=createText('div','vt-assist-actions','');
 const localBtn=createText('button','','Ayúdame a formular');localBtn.type='button';localBtn.dataset.assistAction='local';
 const questionsBtn=createText('button','','Oriéntame');questionsBtn.type='button';questionsBtn.dataset.assistAction='questions';
 const aiBtn=createText('button','','Redacción con IA');aiBtn.type='button';aiBtn.dataset.assistAction='ai';
 const researchBtn=createText('button','','Investigar y complementar');researchBtn.type='button';researchBtn.dataset.assistAction='research';
 [localBtn,questionsBtn,researchBtn].forEach(b=>actions.appendChild(b));
 const status=createText('p','vt-assist-status','');status.setAttribute('role','status');
 const references=createText('section','vt-assist-references','');references.hidden=true;
 const proposal=createText('div','vt-assist-proposal','');proposal.hidden=true;
 const mode=createText('p','vt-assist-source','');
 const draftText=document.createElement('textarea');draftText.rows=4;draftText.setAttribute('aria-label','Propuesta editable del asistente');
 const approve=createText('button','vt-assist-approve','Usar esta propuesta');approve.type='button';
 const discard=createText('button','','Descartar');discard.type='button';
 const footer=createText('div','vt-assist-actions','');footer.append(approve,discard);
 proposal.append(mode,draftText,footer);card.append(heading,explanation,actions,status,references,proposal);
 host.appendChild(card);
 let sourceValue='',actionToken=0,contextAtMount=territorialContext();
 function invalidateIfTerritoryChanged(){
   const now=territorialContext();
   if(now===contextAtMount)return false;
   contextAtMount=now;
   ++actionToken;references.hidden=true;references.replaceChildren();proposal.hidden=true;
   status.textContent='El territorio cambió a '+(now||'sin municipio')+'. Los resultados previos se descartaron. Revisa si tus textos corresponden al nuevo lugar.';
   return true;
 }
 card.vtValidateTerritory=invalidateIfTerritoryChanged;
 function showWarnings(flags){
   if(!Array.isArray(flags)||!flags.length)return;
   const unique=flags.slice(0,3).map(flag=>String(flag.instruction||'Revisa la relación causal y su evidencia.'));
   status.textContent='Propuesta editable. Atención: '+unique.join(' ');
 }
 function showReferences(data){
   references.replaceChildren();
   references.appendChild(createText('strong','','Orientación para diligenciar este campo'));
   const guidance=document.createElement('ul');
   (Array.isArray(data.guidance)?data.guidance:[]).forEach(note=>{
     const li=createText('li','',String(note));guidance.appendChild(li);
   });
   references.appendChild(guidance);
   const identity=data.territory;
   if(identity&&identity.divipola&&identity.url){
     const p=createText('p','vt-assist-source','Municipio identificado: '+identity.municipality+', '+identity.department+' · Código DIVIPOLA '+identity.divipola+' (identificación territorial, no dato demográfico). ');
     const a=document.createElement('a');a.href=identity.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Fuente institucional';
     p.appendChild(a);references.appendChild(p);
   }
   references.appendChild(createText('strong','','Información documental recuperada'));
   const docs=Array.isArray(data.sources)?data.sources:[];
   if(!docs.length)references.appendChild(createText('p','vt-assist-source','Sin documentos primarios pertinentes recuperados en esta consulta. Los datos externos permanecen por verificar.'));
   docs.forEach(doc=>{
     const wrapper=document.createElement('div');
     const title=document.createElement('a');
     title.href=doc.url;title.target='_blank';title.rel='noopener noreferrer';
     title.textContent=String(doc.title||'Documento institucional');
     wrapper.appendChild(title);
     (Array.isArray(doc.passages)?doc.passages:[]).forEach(pass=>{
       wrapper.appendChild(createText('p','vt-assist-source','Página '+pass.page+': '+String(pass.excerpt||'')));
     });
     wrapper.appendChild(createText('p','vt-assist-source','Año '+doc.year+' · Extracto localizado. La afirmación e interpretación siguen pendientes de revisión.'));
     references.appendChild(wrapper);
   });
   const municipal=Array.isArray(data.municipal_references)?data.municipal_references:[];
   if(municipal.length){
     references.appendChild(createText('strong','','Referencias institucionales vinculadas al municipio'));
     municipal.slice(0,6).forEach(item=>{
       const div=createText('div','vt-assist-source','');
       const link=document.createElement('a');
       if(typeof item.url==='string'&&item.url.startsWith('https://')){
         link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
         link.textContent=String(item.title||'Referencia municipal');
         div.appendChild(link);
       }
       const downloaded=item.passage_status==='EXCERPT_FOUND_CLAIM_UNVERIFIED';
       div.appendChild(createText('p','',''+String(item.locator||'')+' · '+
         (downloaded?'Extracto descargado, afirmación no corroborada.':
         'Referencia previamente identificada; documento no cotejado en esta consulta.')));
       div.appendChild(createText('p','',String(item.excerpt||'')+
         ' '+String(item.scope_warning||'')));
       references.appendChild(div);
     });
   }
   const candidates=Array.isArray(data.candidate_sources)?data.candidate_sources:[];
   if(candidates.length){
     const details=document.createElement('details');
     details.appendChild(createText('summary','','Otras fuentes candidatas ('+candidates.length+')'));
     const list=document.createElement('ul');
     candidates.slice(0,6).forEach(item=>{
       if(typeof item.url!=='string'||!item.url.startsWith('https://'))return;
       const li=document.createElement('li'),link=document.createElement('a');
       link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
       link.textContent=item.title||'Consultar fuente';li.appendChild(link);list.appendChild(li);
     });
     details.appendChild(list);references.appendChild(details);
   }
   if(docs.length)references.appendChild(createText('p','vt-assist-source',data.note||'Los pasajes requieren revisión.'));
   if(Array.isArray(data.errors)&&data.errors.length){
     const details=document.createElement('details');
     details.appendChild(createText('summary','','Detalles de servicios externos ('+data.errors.length+')'));
     data.errors.forEach(error=>details.appendChild(createText('p','vt-assist-source',String(error))));
     references.appendChild(details);
   }
   showWarnings(data.review_flags);
   references.hidden=false;
 }
 researchBtn.onclick=async()=>{
   invalidateIfTerritoryChanged();
   const input=textarea.value.trim(),context=territorialContext();
   if(!context){status.textContent='Indica el municipio en S01 para investigar automáticamente.';return}
   const requestId=++actionToken;
   references.hidden=true;references.replaceChildren();proposal.hidden=true;
   researchBtn.disabled=true;status.textContent='Consultando información de '+context+' y preparando orientación...';
   try{
     const {data}=await sb.auth.getSession();
     if(!data?.session?.access_token){status.textContent='Inicia sesión para consultar fuentes.';return}
     const response=await fetch(API+'/assistant/s02/guide',{
       method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},
       body:JSON.stringify({section:'S02',field:fieldId,text:input,context:context.slice(0,200),include_web:true,generate:input.length>=10})
     });
     if(!response.ok){let detail='No fue posible consultar fuentes.';try{const error=await response.json();if(typeof error.detail==='string')detail=error.detail}catch{}status.textContent=detail;return}
     const result=await response.json();
     if(active!=='S02'||textarea.value.trim()!==input||territorialContext()!==context||requestId!==actionToken){
       invalidateIfTerritoryChanged();
       status.textContent='El texto o municipio cambió durante la consulta. Los resultados anteriores se descartaron.';return;
     }
     if(typeof result.territory_context==='string'&&result.territory_context!==context){
       status.textContent='La consulta respondió para otro territorio. Repite la investigación.';return;
     }
     showReferences(result);
     if(result.blocked_for_evidence){
       proposal.hidden=true;
       status.textContent='Se detectó una referencia documental que no corresponde al documento recuperado. Conserva tu texto y utiliza la asistencia de redacción.';
     }else if(typeof result.suggestion==='string'&&result.suggestion.trim()){
       present(result.suggestion.slice(0,1600),result.sources?.length
         ?'Borrador generativo de revisión; las citas localizadas requieren evaluar su soporte semántico.'
         :'Borrador generativo a partir de tu texto; sin respaldo documental adicional. Revisa las afirmaciones.');
       showWarnings(result.review_flags);
     }else{
       proposal.hidden=true;
       status.textContent='Orientación disponible. No se generó texto complementario; puedes usar Ayúdame a formular.';
     }
   }catch{status.textContent='No se pudo completar la búsqueda documental.'}
   finally{researchBtn.disabled=false}
 };
 function present(value,label){
   sourceValue=textarea.value;
   draftText.value=value;
   mode.textContent=label;
   proposal.hidden=false;
   status.textContent='Propuesta pendiente de aprobación. Puedes editarla antes de incorporarla.';
 }
 localBtn.onclick=()=>aiBtn.click();
 questionsBtn.onclick=()=>{
   const questions=TEXTS[fieldId];
   status.textContent=questions.join(' ');
   proposal.hidden=true;
 };
 aiBtn.onclick=async()=>{
   invalidateIfTerritoryChanged();
   const input=textarea.value.trim(),context=territorialContext();
   if(input.length<10){status.textContent='Primero escribe al menos diez caracteres.';return}
   aiBtn.disabled=true;status.textContent='Comprobando disponibilidad de IA...';const requestId=++actionToken;
   try{
     const {data}=await sb.auth.getSession();
     if(!data?.session?.access_token){status.textContent='Para consultar IA externa inicia sesión. La orientación local está disponible sin cuenta.';return}
     const response=await fetch(API+'/assistant/s02',{
       method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},
       body:JSON.stringify({section:'S02',field:fieldId,text:input,context:context.slice(0,200),action:'redactar'})
     });
     if(!response.ok){let detail='No fue posible consultar la IA. Utiliza la orientación local.';try{const payload=await response.json();if(typeof payload.detail==='string'&&payload.detail.length<250)detail=payload.detail}catch{}status.textContent=detail;return}
     const result=await response.json();
     if(active!=='S02'||textarea.value.trim()!==input||territorialContext()!==context||requestId!==actionToken){invalidateIfTerritoryChanged();status.textContent='El texto o municipio cambió. La sugerencia anterior se descartó.';return}
     if(result.blocked_for_evidence){
       proposal.hidden=true;
       status.textContent='La IA no devolvió una propuesta adecuada. Conserva el original.';
       return;
     }
     if(typeof result.suggestion!=='string'||!result.suggestion.trim()){
       proposal.hidden=true;status.textContent='La IA no generó una propuesta válida. Conserva el texto original.';return;
     }
     present(result.suggestion.slice(0,1600),'Propuesta generativa editable basada en tu texto. Las afirmaciones externas requieren evidencia.');
     showWarnings(result.review_flags);
   }catch{status.textContent='No se pudo conectar el modelo. La orientación local sigue disponible.'}
   finally{aiBtn.disabled=false}
 };
 approve.onclick=()=>{
   if(!draftText.value.trim()){status.textContent='La propuesta está vacía.';return}
   if(invalidateIfTerritoryChanged())return;
   if(textarea.value!==sourceValue){status.textContent='El texto original cambió. Vuelve a generar la propuesta antes de aplicarla.';return}
   textarea.value=draftText.value.trim();
   textarea.dispatchEvent(new Event('input',{bubbles:true}));
   proposal.hidden=true;
   status.textContent='Propuesta incorporada al campo. Revisa y guarda normalmente el proyecto.';
 };
 discard.onclick=()=>{proposal.hidden=true;status.textContent='Propuesta descartada. Se conserva tu texto original.'};
}
function mount(){
 // La investigación y redacción S02 se ejecutan exclusivamente en section_review_ui.js.
 // Se conserva este módulo únicamente para su detector de versión y compatibilidad.
 // El panel anterior duplicaba propuestas y admitía rutas sin auditoría por afirmación.
 return;
 document.querySelectorAll('#fields textarea[data-field]').forEach(cardFor);
 document.querySelectorAll('#fields .vt-assist').forEach(card=>card.vtValidateTerritory?.());
}
const css=document.createElement('style');css.textContent='.vt-assist{border:1px solid #b5c8c0;background:#f5faf7;border-radius:11px;margin:9px 0 17px;padding:12px}.vt-assist-heading{display:block;font-size:.9rem}.vt-assist-note,.vt-assist-status,.vt-assist-source{font-size:.84rem;color:#425950;margin:7px 0}.vt-assist-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.vt-assist button{border:1px solid #789a8c;border-radius:8px;background:white;color:#17392c;padding:8px 11px;font:inherit;font-size:.82rem;cursor:pointer}.vt-assist button:disabled{opacity:.5}.vt-assist-proposal{border-top:1px solid #c9d8d0;margin-top:10px;padding-top:10px}.vt-assist-proposal[hidden],.vt-assist-references[hidden]{display:none}.vt-assist-references{border-top:1px solid #c9d8d0;margin-top:10px;padding-top:10px;font-size:.84rem}.vt-assist-references ul{padding-left:20px}.vt-assist-references li{margin:8px 0}.vt-assist-references a{color:#0b5347;text-decoration:underline}.vt-assist-proposal textarea{box-sizing:border-box;width:100%;border:1px solid #b0c5ba;border-radius:8px;min-height:90px;padding:9px;font:inherit}.vt-assist .vt-assist-approve,.vt-assist [data-assist-action="local"]{background:#123e2f;color:white}@media(max-width:600px){.vt-assist-actions button{flex:1 1 auto}}';
document.head.appendChild(css);
new MutationObserver(mount).observe(document.getElementById('fields')||document.body,{childList:true,subtree:true});
mount();
const VERTICE_BUILD='20261124-research-first';
let lastVersionCheck=0;
async function checkVersionOnReturn(){
  const now=Date.now();
  if(now-lastVersionCheck<90000||document.visibilityState==='hidden')return;
  lastVersionCheck=now;
  try{
    const url=location.pathname+(location.search?'&':'?')+'vt_build_check='+now;
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)return;
    const html=await response.text();
    const latest=html.match(/<meta name="vt-build" content="([^"]+)"/);
    if(!latest||latest[1]===VERTICE_BUILD||document.getElementById('vt-version-notice'))return;
    const notice=createText('div','vt-version-notice','Hay una actualización disponible. Guarda tus cambios antes de cargarla. ');
    notice.id='vt-version-notice';
    notice.setAttribute('role','status');
    notice.style.cssText='position:fixed;top:8px;left:8px;right:8px;z-index:9999;background:#fff;border:2px solid #197052;border-radius:10px;padding:12px;color:#123e2f;box-shadow:0 2px 16px #0002';
    const button=createText('button','','Actualizar página');
    button.type='button';button.onclick=()=>location.reload();
    notice.appendChild(button);document.body.prepend(notice);
  }catch{/* Sin red se conserva el formulario actual. */}
}
window.addEventListener('focus',checkVersionOnReturn);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkVersionOnReturn()});
window.fcAssistantS02LocalRewrite=formatLocal;
})();
