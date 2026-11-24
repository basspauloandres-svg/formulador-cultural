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
   panel.append(button,status,results,proposal);
   host.appendChild(panel);
   let seq=0,lastContext=territory(),sourceValue='',sourceContext='';
   function clearIfChanged(){
     const now=territory();
     if(now===lastContext)return false;
     lastContext=now;seq+=1;results.hidden=true;results.replaceChildren();proposal.hidden=true;
     status.textContent='Cambió el municipio. Se descartó la revisión anterior.';
     return true;
   }
   panel.vtReviewInvalidate=clearIfChanged;
   button.onclick=async()=>{
     clearIfChanged();
     const context=territory(),input=field.value.trim(),request=++seq;
     results.hidden=true;results.replaceChildren();proposal.hidden=true;
     if(!context){status.textContent='Completa el municipio en S01 para contextualizar la revisión.';return}
     if(!input&&active!=='S02'){status.textContent='Escribe una observación o afirmación en este campo para contrastarla.';return}
     button.disabled=true;status.textContent='Contrastando afirmaciones y preparando un borrador editable...';
     try{
       const sessionResult=await sb.auth.getSession();
       const token=sessionResult?.data?.session?.access_token;
       if(!token){status.textContent='Inicia sesión para revisar fuentes.';return}
       const isS02=active==='S02';
       const response=await fetch(API+(isS02?'/assistant/s02/guide':'/assistant/section/review'),{
         method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
         body:JSON.stringify({section:active,field:field.dataset.field,text:input,context,include_web:true,compose:true,generate:true})
       });
       const data=await response.json();
       if(!response.ok){status.textContent=String(data.detail||'No se pudo completar la revisión.').slice(0,220);return}
       if(request!==seq||active!==data.section||field.value.trim()!==input||territory()!==context)return;
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
       else if(!primary.length)results.appendChild(node('p','No se localizaron fuentes institucionales pertinentes en esta consulta. La afirmación continúa sin respaldo documental.','vt-evidence-detail'));
       results.appendChild(node('p','Los pasajes institucionales identifican fragmentos consultables, pero su coincidencia temática no equivale a corroboración. Las afirmaciones y las observaciones siguen diferenciadas.','vt-evidence-detail'));
       results.hidden=false;
       const suggestion=!data.blocked_for_evidence&&typeof data.suggestion==='string'?data.suggestion.trim():'';
       if(suggestion){
         sourceValue=field.value;sourceContext=context;
         proposalText.value=suggestion;
         proposal.hidden=false;
         status.textContent='Redacción preparada. Verifica los datos y aprueba para incorporarla al campo y guardarla.';
         if(Array.isArray(data.review_flags)&&data.review_flags.length){
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
     if(territory()!==sourceContext||field.value!==sourceValue ){
       status.textContent='Cambió el campo o el municipio. Repite la investigación antes de incorporar la redacción.';return;
     }
     const edited=proposalText.value.trim();
     if(!edited){status.textContent='La propuesta está vacía. Conservamos tu texto.';return}
     field.value=edited;
     field.dispatchEvent(new Event('input',{bubbles:true}));
     field.dispatchEvent(new Event('change',{bubbles:true}));
     proposal.hidden=true;
     status.textContent='Redacción incorporada al campo. Se solicitó guardar el proyecto.';
     const save=document.getElementById('save');if(save)save.click();
   };
   discard.onclick=()=>{
     proposal.hidden=true;
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
