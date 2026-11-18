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
   const button=node('button','Revisar afirmaciones y fuentes');
   button.type='button';button.dataset.reviewAction='verify';
   const status=node('p','','vt-evidence-audit-status');status.setAttribute('role','status');
   const results=node('div','','vt-evidence-audit-results');results.hidden=true;
   panel.append(button,status,results);
   host.appendChild(panel);
   let seq=0,lastContext=territory();
   function clearIfChanged(){
     const now=territory();
     if(now===lastContext)return false;
     lastContext=now;seq+=1;results.hidden=true;results.replaceChildren();
     status.textContent='Cambió el municipio. Se descartó la revisión anterior.';
     return true;
   }
   panel.vtReviewInvalidate=clearIfChanged;
   button.onclick=async()=>{
     clearIfChanged();
     const context=territory(),input=field.value.trim(),request=++seq;
     results.hidden=true;results.replaceChildren();
     if(!context){status.textContent='Completa el municipio en S01 para contextualizar la revisión.';return}
     if(!input){status.textContent='Escribe una observación o afirmación en este campo para contrastarla.';return}
     button.disabled=true;status.textContent='Identificando afirmaciones y consultando posibles fuentes...';
     try{
       const sessionResult=await sb.auth.getSession();
       const token=sessionResult?.data?.session?.access_token;
       if(!token){status.textContent='Inicia sesión para revisar fuentes.';return}
       const response=await fetch(API+'/assistant/section/review',{
         method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
         body:JSON.stringify({section:active,field:field.dataset.field,text:input,context,include_web:true})
       });
       const data=await response.json();
       if(!response.ok){status.textContent=String(data.detail||'No se pudo completar la revisión.').slice(0,220);return}
       if(request!==seq||active!==data.section||field.value.trim()!==input||territory()!==context)return;
       const claims=Array.isArray(data.claims)?data.claims:[];
       results.appendChild(node('strong','Afirmaciones detectadas · evaluación preliminar'));
       if(!claims.length)results.appendChild(node('p','No se identificaron oraciones completas; amplía la descripción.'));
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
       const primary=Array.isArray(data.primary_passages)?data.primary_passages:[];
       if(primary.length){
         results.appendChild(node('strong','Pasajes recuperados de fuentes institucionales'));
         primary.slice(0,4).forEach(source=>{
           const wrapper=node('div','','vt-evidence-passages');
           const a=node('a',String(source.title||'Fuente institucional')+' · '+String(source.locator||''));
           if(typeof source.url==='string'&&source.url.startsWith('https://')){
             a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
             wrapper.appendChild(a);
           }
           wrapper.appendChild(node('p',String(source.excerpt||''),'vt-evidence-detail'));
           wrapper.appendChild(node('p',String(source.scope_warning||'')+' Pasaje localizado: la afirmación del formador sigue sin corroborarse.','vt-evidence-detail'));
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
       else if(!primary.length)results.appendChild(node('p','No se localizaron documentos pertinentes para el municipio y el tema. La afirmación continúa sin respaldo documental.','vt-evidence-detail'));
       results.appendChild(node('p','Los pasajes institucionales identifican fragmentos consultables, pero su coincidencia temática no equivale a corroboración. Las afirmaciones y las observaciones siguen diferenciadas.','vt-evidence-detail'));
       results.hidden=false;status.textContent='Revisión preliminar realizada. Ningún dato externo ha sido confirmado automáticamente.';
     }catch{status.textContent='La consulta no respondió. El texto original sigue intacto.'}
     finally{button.disabled=false}
   };
 });
 document.querySelectorAll('#fields .vt-evidence-audit').forEach(el=>el.vtReviewInvalidate?.());
}
const style=node('style');
style.textContent='.vt-evidence-audit{margin:9px 0 14px;padding:10px;border:1px solid #c9d8d0;background:#f6faf8;border-radius:9px;font-size:.83rem;color:#234838}.vt-evidence-audit button{border:1px solid #8ba99a;border-radius:7px;background:#fff;color:#234838;padding:8px;font:inherit;cursor:pointer}.vt-evidence-audit button:disabled{opacity:.5}.vt-evidence-audit-status,.vt-evidence-detail{font-size:.82rem;color:#4c6057;margin:6px 0}.vt-evidence-audit-results ul{padding-left:19px}.vt-evidence-audit-results li{margin:9px 0}.vt-evidence-audit-results details{margin:10px 0}.vt-evidence-passages{border-left:2px solid #b7cfc2;padding-left:9px;margin:8px 0}.vt-evidence-audit-results a{color:#14614d;text-decoration:underline}.vt-evidence-audit-results[hidden]{display:none}';
document.head.appendChild(style);
new MutationObserver(mount).observe(document.getElementById('fields')||document.body,{childList:true,subtree:true});
mount();
})();
