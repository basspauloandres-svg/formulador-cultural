/* Auditoría de afirmaciones por campo: los candidatos NO son evidencia corroborada. */
(()=>{
'use strict';
const API='https://formulador-cultural-api.onrender.com';
const FIELDS={
 S03:['poblacion_afectada','poblacion_participante','caracterizacion','cantidad_estimada'],
 S04:['evidencia_disponible','fuentes','datos_por_verificar','observaciones'],
 S05:['situaciones_observables','descripcion','evidencia_asociada','prioridad_preliminar'],
 S07:['causas_indirectas','causas_directas','problema_central','efectos_directos','efectos_indirectos'],
 S08:['enunciado','poblacion_afectada','evidencia_soporte','alcance'],
 S09:['objetivo_central','medios_directos','medios_indirectos','fines_directos','fines_indirectos'],
 S10:['alternativa_seleccionada','criterios','justificacion_seleccion'],
 S11:['resultados_productos','actividades_confirmadas','observaciones_actividades'],
 S12:['indicadores_confirmados','metas_confirmadas','medios_verificacion'],
 S14:['presupuesto_resumen'],
 S15:['riesgos_resumen']
};
const S02=['territorio_o_lugar_de_intervencion','caracteristicas_culturales','principales_dinamicas_sociales','antecedentes'];
function node(tag,txt='',className=''){const el=document.createElement(tag);el.textContent=txt;el.className=className;return el}
function territory(){
 const city=String(draft?.S01?.municipio||'').trim();
 const dept=String(draft?.S01?.departamento||'').trim();
 return city+(dept?', '+dept:'');
}
function mount(){
 if(typeof active==='undefined')return;
 const allowed=active==='S02'?S02:FIELDS[active];
 if(!allowed)return;
 document.querySelectorAll('#fields textarea[data-field]').forEach(field=>{
   if(!allowed.includes(field.dataset.field))return;
   const host=field.closest('.field');
   if(!host||host.querySelector('.vt-evidence-audit'))return;
   const panel=node('div','','vt-evidence-audit');
   panel.dataset.reviewField=field.dataset.field;
   const button=node('button',active==='S02'?'Investigar y generar propuesta':'Investigar y preparar redacción');
   button.type='button';button.dataset.reviewAction='verify';
   const status=node('p','','vt-evidence-audit-status');status.setAttribute('role','status');
   const results=node('div','','vt-evidence-audit-results');results.hidden=true;
   const proposal=node('div','','vt-evidence-draft');proposal.hidden=true;
   const proposalTitle=node('strong','Redacción propuesta · pendiente de aprobación');
   const proposalText=node('textarea');proposalText.rows=5;
   proposalText.setAttribute('aria-label','Redacción propuesta para este campo');
   const approve=node('button','Incorporar y guardar redacción');approve.type='button';
   approve.dataset.reviewAction='approve';
   const discard=node('button','Descartar redacción');discard.type='button';
   discard.dataset.reviewAction='discard';
   proposal.append(proposalTitle,proposalText,approve,discard);
   const savedReview=node('p','','vt-evidence-detail');savedReview.hidden=true;
   const savedSources=node('details','','vt-saved-evidence');savedSources.hidden=true;
   let renderedManifest='';
   panel.append(button,status,savedReview,savedSources,results,proposal);
   host.appendChild(panel);
   let seq=0,lastContext=territory(),sourceValue='',sourceContext='',sourceSection='',sourceDraft='',needsReview=false,pendingAudit=null;
   function showSavedReview(){
     const record=draft?.S02?.evidence_review_state?.fields?.[field.dataset.field];
     if(active!=='S02'||!record){savedReview.hidden=true;savedSources.hidden=true;return;}
     savedReview.hidden=false;
     const message=record.context!==territory()?'Cotejo anterior de otro territorio. Investiga de nuevo.':record.accepted_text!==field.value?'Texto modificado después de la revisión. Requiere nuevo cotejo.':'Borrador incorporado el '+String(record.accepted_at||'').slice(0,10)+'; '+(record.status==='EDITED_UNREVIEWED'?'edición posterior a la auditoría.':'afirmaciones pendientes de cotejo.')+' Fuentes registradas: '+String(record.manifest?.length||0)+'.';
     if(savedReview.textContent!==message)savedReview.textContent=message;
     const evidence=Array.isArray(record.manifest)?record.manifest:[];
     savedSources.hidden=!evidence.length;
     const signature=JSON.stringify(evidence);
     if(signature!==renderedManifest){
       renderedManifest=signature;
       savedSources.replaceChildren(node('summary','Fuentes del borrador anteriormente incorporado'));
       evidence.forEach(item=>{
         const wrapper=node('div','','vt-evidence-passages');
         wrapper.appendChild(node('strong','['+String(item.citation||'')+'] · DIVIPOLA '+String(item.divipola||'')));
         if(typeof item.url==='string'&&item.url.startsWith('https://')){
           const link=node('a','Consultar fuente original');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';wrapper.appendChild(link);
         }
         wrapper.appendChild(node('p',String(item.prompt_excerpt||''),'vt-evidence-detail'));
         wrapper.appendChild(node('p','SHA-256 del documento: '+String(item.sha256||'')+' · SHA-256 del extracto: '+String(item.excerpt_sha256||''),'vt-evidence-detail'));
         savedSources.appendChild(wrapper);
       });
     }
   }
   field.addEventListener('input',showSavedReview);
   showSavedReview();
   function clearIfChanged(){
     const now=territory();
     showSavedReview();
     if(now===lastContext)return false;
     lastContext=now;seq+=1;results.hidden=true;results.replaceChildren();proposal.hidden=true;proposalText.value='';sourceValue='';sourceContext='';sourceDraft='';needsReview=false;pendingAudit=null;
     status.textContent='Cambió el municipio. Se descartó la revisión anterior.';
     return true;
   }
   panel.vtReviewInvalidate=clearIfChanged;
   button.onclick=async()=>{
     clearIfChanged();
     const context=territory(),input=field.value.trim(),request=++seq,requestedSection=active;
     results.hidden=true;results.replaceChildren();proposal.hidden=true;
     if(!context){status.textContent='Completa el municipio en S01 para contextualizar la revisión.';return}
     if(!input&&active!=='S02'){status.textContent='Escribe una observación o afirmación en este campo para contrastarla.';return}
     button.disabled=true;status.textContent='Contrastando afirmaciones y preparando un borrador editable...';
     try{
       const sessionResult=await sb.auth.getSession();
       const token=sessionResult?.data?.session?.access_token;
       if(!token){status.textContent='Inicia sesión para revisar fuentes.';return}
       const isS02=requestedSection==='S02';
       const response=await fetch(API+(isS02?'/assistant/s02/guide':'/assistant/section/review'),{
         method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
         body:JSON.stringify({section:requestedSection,field:field.dataset.field,text:input,context,include_web:true,compose:true,generate:true})
       });
       const data=await response.json();
       if(request!==seq||active!==requestedSection||!field.isConnected||field.value.trim()!==input||territory()!==context)return;
       if(!response.ok){status.textContent=String(data.detail||'No se pudo completar la revisión.').slice(0,220);return}
       if(data.section!==requestedSection||(isS02&&(data.territory_context!==context||data.field!==field.dataset.field))){status.textContent='La respuesta no corresponde al campo o territorio solicitado. Repite la consulta.';return;}
       const claims=Array.isArray(data.claims)?data.claims:[];
       results.appendChild(node('strong','Afirmaciones detectadas · evaluación preliminar'));
       if(!claims.length&&!isS02)results.appendChild(node('p','No se identificaron oraciones completas; amplía la descripción.'));
       const list=node('ul');
       claims.slice(0,10).forEach(claim=>{
         const li=node('li');
         li.appendChild(node('strong',String(claim.statement||'')));
         li.appendChild(node('p',String(claim.note||'')+' Estado: evidencia insuficiente.','vt-evidence-detail'));
         list.appendChild(li);
       });
       results.appendChild(list);
       if(data.conflicting_municipalities?.length){
         results.appendChild(node('p','El texto menciona otro municipio: '+data.conflicting_municipalities.join(', ')+'. Comprueba si es una comparación o un dato heredado.','vt-evidence-detail'));
       }
       const primary=isS02?[...(data.municipal_references||[]),...(data.sources||[]).flatMap(doc=>(doc.passages||[]).map(pass=>({...doc,...pass,locator:'Página '+pass.page,passage_status:'EXCERPT_FOUND_CLAIM_UNVERIFIED'})))]:Array.isArray(data.primary_passages)?data.primary_passages:[];
       if(primary.length){
         results.appendChild(node('strong','Referencias institucionales localizadas'));
         primary.slice(0,4).forEach(source=>{
           const wrapper=node('div','','vt-evidence-passages');
           const a=node('a',String(source.title||'Fuente institucional')+' · '+String(source.locator||''));
           if(typeof source.url==='string'&&source.url.startsWith('https://')){
             a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
             wrapper.appendChild(a);
           }
           const indexed=source.passage_status!=='EXCERPT_FOUND_CLAIM_UNVERIFIED';
           wrapper.appendChild(node('p',String(source.excerpt||''),'vt-evidence-detail'));
           wrapper.appendChild(node('p',
             indexed
               ?'Referencia institucional indexada el '+String(source.indexed_on||'')+
                '. Descripción de contenido, no cita textual. Acceso al documento no confirmado en esta consulta.'
               :'Extracto recuperado durante esta consulta con localizador y huella del documento.',
             'vt-evidence-detail'));
           wrapper.appendChild(node('p',String(source.scope_warning||'')+
             ' La afirmación sigue pendiente de cotejo.','vt-evidence-detail'));
           results.appendChild(wrapper);
         });
       }
       const manifest=Array.isArray(data.evidence_manifest)?data.evidence_manifest:[];
       if(isS02&&manifest.length){
         const evidenceDetails=node('details');
         evidenceDetails.appendChild(node('summary','Evidencia exacta entregada al modelo ('+manifest.length+')'));
         manifest.forEach(item=>{
           const wrapper=node('div','','vt-evidence-passages');
           const title=node('strong','['+String(item.citation||'')+'] · DIVIPOLA '+String(item.divipola||''));
           wrapper.appendChild(title);
           if(typeof item.url==='string'&&item.url.startsWith('https://')){
             const link=node('a','Consultar fuente original');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';wrapper.appendChild(link);
           }
           wrapper.appendChild(node('p',String(item.prompt_excerpt||''),'vt-evidence-detail'));
           wrapper.appendChild(node('p','Localizador: '+String(item.locator||'')+' · Huella SHA-256: '+String(item.sha256||'no disponible'),'vt-evidence-detail'));
           if(item.scope==='RECORD_EXISTENCE_ONLY')wrapper.appendChild(node('p','El registro acredita la existencia de filas asociadas al territorio. No acredita actividad actual, necesidades ni cantidad total.','vt-evidence-detail'));
           evidenceDetails.appendChild(wrapper);
         });
         results.appendChild(evidenceDetails);
       }
       const audited=Array.isArray(data.claim_audit)?data.claim_audit:[];
       if(isS02&&audited.length){
         results.appendChild(node('strong','Revisión de las afirmaciones propuestas'));
         const labels={LITERAL_MATCH_REVIEW_REQUIRED:'Correspondencia textual; requiere cotejo',REGISTRY_FACT_REVIEW_REQUIRED:'Registro administrativo de alcance limitado; requiere revisión',INSUFFICIENT_EVIDENCE:'Respaldo insuficiente',INVALID_PROVENANCE:'Procedencia inválida'};
         const semanticLabels={MODEL_ENTAILMENT_REVIEW_REQUIRED:'Evaluación del modelo: posible apoyo textual',MODEL_CONTRADICTION_REVIEW_REQUIRED:'Evaluación del modelo: posible contradicción',INSUFFICIENT_EVIDENCE:'Evaluación semántica insuficiente'};
         audited.forEach(item=>{
           const p=node('div','','vt-evidence-passages');
           p.appendChild(node('p',String(item.fragment||'')));
           p.appendChild(node('p',labels[item.status]||'Pendiente de evaluación','vt-evidence-detail'));
           const judgment=item.semantic_review;
           if(judgment){
             p.appendChild(node('p',(semanticLabels[judgment.status]||'Evaluación no disponible')+'. Requiere cotejo humano; no valida el hecho.','vt-evidence-detail'));
             if(judgment.quote)p.appendChild(node('blockquote',String(judgment.quote),'vt-evidence-detail'));
           }
           results.appendChild(p);
         });
       }
       const candidates=Array.isArray(data.candidate_sources)?data.candidate_sources:[];
       const details=node('details');
       details.appendChild(node('summary','Otros documentos candidatos ('+candidates.length+') · sin comprobación de contenido'));
       const links=node('ul');
       candidates.slice(0,6).forEach(source=>{
         if(typeof source.url!=='string'||!source.url.startsWith('https://'))return;
         const li=node('li');const a=node('a',String(source.title||'Documento candidato'));
         a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';li.appendChild(a);links.appendChild(li);
       });
       details.appendChild(links);
       if(candidates.length)results.appendChild(details);
       else if(!primary.length&&!manifest.length)results.appendChild(node('p','No se localizaron fuentes institucionales pertinentes en esta consulta. La afirmación continúa sin respaldo documental.','vt-evidence-detail'));
       results.appendChild(node('p','Los pasajes institucionales identifican fragmentos consultables, pero su coincidencia temática no equivale a corroboración. Las afirmaciones y las observaciones siguen diferenciadas.','vt-evidence-detail'));
       results.hidden=false;
       const suggestion=!data.blocked_for_evidence&&typeof data.suggestion==='string'?data.suggestion.trim():'';
       if(suggestion){
         pendingAudit=isS02?{context,divipola:data.territory?.divipola||null,
           origin:data.suggestion_origin||'UNKNOWN',manifest,claim_audit:audited,semantic_support_status:data.semantic_support_status||'NOT_ASSESSED',
           reviewed_text:suggestion}:null;
         sourceValue=field.value;sourceContext=context;sourceSection=requestedSection;sourceDraft=suggestion;needsReview=isS02;
         proposalText.value=suggestion;
         proposal.hidden=false;
         status.textContent=data.suggestion_origin==='DETERMINISTIC_REGISTRY_FACT'?'Propuesta construida directamente a partir del registro administrativo; no corresponde a una redacción del modelo. Revisa su alcance antes de incorporar.':data.suggestion_origin==='USER_TEXT_FALLBACK'?'Se conserva el aporte original porque el modelo añadió contenido sin respaldo.':'Redacción preparada. Verifica los datos y aprueba para incorporarla al campo y guardarla.';
         if(Array.isArray(data.review_flags)&&data.review_flags.length){
           data.review_flags.slice(0,10).forEach(flag=>results.appendChild(node('p',String(flag.instruction||'Requiere revisión.'),'vt-evidence-detail')));
           results.appendChild(node('p','El borrador contiene '+data.review_flags.length+
             ' advertencia(s) sobre contenido generado o inferencias. Revisa antes de aprobar.','vt-evidence-detail'));
         }
       }else{
         status.textContent=data.blocked_for_evidence?'Evidencia insuficiente para formular una propuesta sustentada. Revisa las fuentes disponibles.':'La consulta no produjo un borrador utilizable. El campo permanece intacto.';
       }
     }catch{status.textContent='La consulta no respondió. El texto original sigue intacto.'}
     finally{button.disabled=false}
   };
   approve.onclick=()=>{
     if(clearIfChanged())return;
     if(proposal.hidden||!field.isConnected||active!==sourceSection||territory()!==sourceContext||field.value!==sourceValue ){
       status.textContent='Cambió el campo o el municipio. Repite la investigación antes de incorporar la redacción.';return;
     }
     const edited=proposalText.value.trim();
     if(!edited){status.textContent='La propuesta está vacía. Conservamos tu texto.';return}
     if(needsReview&&!window.confirm(edited!==sourceDraft?'Editaste la propuesta después de la auditoría. Las nuevas afirmaciones no se han evaluado. ¿Incorporar como borrador pendiente de cotejo?':'La propuesta contiene afirmaciones pendientes de cotejo. ¿Incorporar como borrador sin declarar los hechos verificados?'))return;
     if(needsReview&&pendingAudit){
       const acceptedAt=new Date().toISOString();
       draft.S02=draft.S02||{};
       const previous=draft.S02.evidence_review_state||{};
       draft.S02.evidence_review_state={updatedAt:acceptedAt,fields:{...previous.fields,
         [field.dataset.field]:{...pendingAudit,accepted_text:edited,accepted_at:acceptedAt,
           status:edited===sourceDraft?'ACCEPTED_UNVERIFIED':'EDITED_UNREVIEWED'}}};
     }
     field.value=edited;
     field.dispatchEvent(new Event('input',{bubbles:true}));
     field.dispatchEvent(new Event('change',{bubbles:true}));
     proposal.hidden=true;
     status.textContent='Redacción incorporada al campo. Se solicitó guardar el proyecto.';
     const save=document.getElementById('save');if(save)save.click();
   };
   discard.onclick=()=>{
     proposal.hidden=true;pendingAudit=null;
     status.textContent='Propuesta descartada. El texto original continúa intacto.';
   };
 });
 document.querySelectorAll('#fields .vt-evidence-audit').forEach(el=>el.vtReviewInvalidate?.());
}
const style=node('style');
style.textContent='.vt-evidence-audit{margin:9px 0 14px;padding:10px;border:1px solid #c9d8d0;background:#f6faf8;border-radius:9px;font-size:.83rem;color:#234838}.vt-evidence-audit button{border:1px solid #8ba99a;border-radius:7px;background:#fff;color:#234838;padding:8px;font:inherit;cursor:pointer}.vt-evidence-audit button:disabled{opacity:.5}.vt-evidence-audit-status,.vt-evidence-detail{font-size:.82rem;color:#4c6057;margin:6px 0}.vt-evidence-audit-results ul{padding-left:19px}.vt-evidence-audit-results li{margin:9px 0}.vt-evidence-audit-results details{margin:10px 0}.vt-evidence-passages{border-left:2px solid #b7cfc2;padding-left:9px;margin:8px 0}.vt-evidence-audit-results a{color:#14614d;text-decoration:underline}.vt-evidence-audit-results[hidden],.vt-evidence-draft[hidden]{display:none}.vt-evidence-draft{margin-top:12px;padding-top:10px;border-top:1px solid #c9d8d0}.vt-evidence-draft textarea{width:100%;min-height:115px;box-sizing:border-box;padding:10px;border:1px solid #9bb7a8;border-radius:8px;font:inherit;margin:9px 0}.vt-evidence-draft button{margin:4px 7px 3px 0}.vt-evidence-draft [data-review-action="approve"]{background:#155b43;color:white}';
document.head.appendChild(style);
new MutationObserver(mount).observe(document.getElementById('fields')||document.body,{childList:true,subtree:true});
mount();
})();


/* VKE: no automatic submission of project data, no project mutations. */
(()=>{
'use strict';
const root=document.getElementById('vtKnowledge');
if(!root)return;
const question=document.getElementById('vtKnowledgeQuestion'),ask=document.getElementById('vtKnowledgeAsk'),out=document.getElementById('vtKnowledgeResult');
const API='https://formulador-cultural-api.onrender.com';
let seq=0,activeRequest=null,retryUntil=0,retryTimer=null;
const askLabel=ask.textContent;
function updateAsk(){const remaining=Math.max(0,Math.ceil((retryUntil-Date.now())/1000));ask.disabled=!!activeRequest||remaining>0;ask.textContent=remaining>0?'Consultar en '+remaining+' s':askLabel;clearTimeout(retryTimer);if(remaining>0)retryTimer=setTimeout(updateAsk,Math.min(1000,Math.max(1,retryUntil-Date.now())));}
function setRetry(response){const raw=response.headers.get('Retry-After')||'';const seconds=/^[0-9]{1,6}$/.test(raw)?Math.max(5,Math.min(300,Number(raw))):10;retryUntil=Date.now()+seconds*1000;updateAsk();return seconds;}
function section(){return String(document.getElementById('counter')?.textContent||'').match(/S(?:0[1-9]|1[0-6])/)?.[0]||null;}
function add(tag,value,parent=out){const el=document.createElement(tag);el.textContent=String(value||'');parent.appendChild(el);return el;}
function clear(){seq++;activeRequest?.abort();activeRequest=null;out.replaceChildren();updateAsk();}
question.addEventListener('input',clear);
root.addEventListener('toggle',()=>{if(!root.open)clear()});
ask.addEventListener('click',async()=>{
 if(activeRequest||Date.now()<retryUntil)return;
 const value=question.value.trim(),current=section(),id=++seq;
 activeRequest?.abort();activeRequest=null;
 out.replaceChildren();
 if(value.length<2){add('p','Escribe una pregunta metodológica.');return}
 if(!current){add('p','Abre una sección de formulación.');return}
 ask.disabled=true;add('p','Consultando orientación y documentos…');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 activeRequest=controller;
 const stale=()=>id!==seq||question.value.trim()!==value||section()!==current||!root.open;
 try{
  const token=(await sb?.auth?.getSession())?.data?.session?.access_token;
  if(stale())return;
  if(!token){out.replaceChildren();add('p','Inicia sesión para consultar la biblioteca metodológica. Puedes seguir usando las ayudas locales.');return}
  const response=await fetch(API+'/assistant/knowledge',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({section:current,question:value})});
  if(stale())return;
  if(!response.ok){out.replaceChildren();if(response.status===429){const seconds=setRetry(response);add('p','Capacidad temporalmente ocupada. Conserva tu trabajo y vuelve a consultar después de '+seconds+' segundos. No se realizará un reintento automático.');}else if(response.status===401){add('p','No se pudo validar tu sesión. Inicia sesión nuevamente si es necesario; conserva tu borrador.');}else{add('p','Consulta documental no disponible. Utiliza la orientación local.');}return}
  const data=await response.json();if(stale())return;
  if(data.section!==current||!['DETERMINISTIC_GUIDANCE','DOCUMENT_RETRIEVAL','ABSTAIN'].includes(data.route)||data.generation_used!==false){out.replaceChildren();add('p','La respuesta no corresponde a una consulta documental válida. Repite la consulta.');return;}
  out.replaceChildren();
  add('strong',data.route==='DETERMINISTIC_GUIDANCE'?'Orientación operativa':data.route==='DOCUMENT_RETRIEVAL'?'Documentos recuperados · cotejo pendiente':'Evidencia insuficiente');
  add('p',data.answer);
  if(data.source)add('small',data.source);
  for(const p of (Array.isArray(data.passages)?data.passages.slice(0,5):[])){
   const card=add('article','');add('strong',p.title,card);add('p',p.publisher+' · '+p.edition+' · '+p.locator,card);add('p',p.excerpt,card);
   try{const url=new URL(p.url);if(url.protocol==='https:'&&!url.username&&!url.password){const a=add('a','Consultar documento original',card);a.href=url.href;a.target='_blank';a.rel='noopener noreferrer'}}catch{}
   add('small','Fragmento SHA-256: '+String(p.excerpt_sha256||''),card);
  }
 }catch{if(!stale()){out.replaceChildren();add('p','Consulta documental no disponible. Utiliza la orientación local.')}}finally{clearTimeout(timeout);if(id===seq){activeRequest=null;updateAsk()}}
});
const counter=document.getElementById('counter');
let lastSection=section();
if(counter)new MutationObserver(()=>{const current=section();if(current===lastSection)return;lastSection=current;clear();question.value='';root.open=false}).observe(counter,{childList:true,characterData:true,subtree:true});
})();
