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
function cardFor(textarea){
 const fieldId=textarea.dataset.field;
 if(!TEXTS[fieldId]||textarea.closest('.field')?.querySelector('.vt-assist'))return;
 const host=textarea.closest('.field');if(!host)return;
 const card=document.createElement('section');
 card.className='vt-assist';card.dataset.assistField=fieldId;
 const heading=createText('strong','vt-assist-heading','Asistente de formulación · S02 (evaluación)');
 const explanation=createText('p','vt-assist-note','El texto original permanece intacto hasta que apruebes. VÉRTICE investiga y orienta automáticamente según el municipio. Los datos documentales y las propuestas se muestran para revisión.');
 const actions=createText('div','vt-assist-actions','');
 const localBtn=createText('button','','Ayúdame a redactar');localBtn.type='button';localBtn.dataset.assistAction='local';
 const questionsBtn=createText('button','','Oriéntame');questionsBtn.type='button';questionsBtn.dataset.assistAction='questions';
 const aiBtn=createText('button','','Consultar IA (experimental)');aiBtn.type='button';aiBtn.dataset.assistAction='ai';
 const researchBtn=createText('button','','Investigar y orientar');researchBtn.type='button';researchBtn.dataset.assistAction='research';
 [localBtn,questionsBtn,aiBtn,researchBtn].forEach(b=>actions.appendChild(b));
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
 let sourceValue='',actionToken=0;
 function showReferences(data){
   references.replaceChildren();
   references.appendChild(createText('strong','','Orientación para diligenciar este campo'));
   const guidance=document.createElement('ul');
   (Array.isArray(data.guidance)?data.guidance:[]).forEach(note=>{
     const li=createText('li','',String(note));guidance.appendChild(li);
   });
   references.appendChild(guidance);
   references.appendChild(createText('strong','','Información documental recuperada'));
   const docs=Array.isArray(data.sources)?data.sources:[];
   if(!docs.length)references.appendChild(createText('p','vt-assist-source','Todavía no se recuperaron pasajes primarios utilizables para este campo. INSUFFICIENT_EVIDENCE.'));
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
   references.appendChild(createText('p','vt-assist-source',data.note||'La información requiere revisión.'));
   (data.errors||[]).forEach(error=>references.appendChild(createText('p','vt-assist-source',String(error))));
   references.hidden=false;
 }
 researchBtn.onclick=async()=>{
   const input=textarea.value.trim();
   if(input.length<10){status.textContent='Primero escribe al menos diez caracteres para orientar la investigación.';return}
   references.hidden=true;references.replaceChildren();
   researchBtn.disabled=true;status.textContent='Consultando información y preparando orientación...';
   try{
     const {data}=await sb.auth.getSession();
     if(!data?.session?.access_token){status.textContent='Inicia sesión para consultar fuentes.';return}
     const response=await fetch(API+'/assistant/s02/guide',{
       method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},
       body:JSON.stringify({section:'S02',field:fieldId,text:input,context:String(draft?.S01?.municipio||'').slice(0,200),include_web:true,generate:true})
     });
     if(!response.ok){let detail='No fue posible consultar fuentes.';try{const error=await response.json();if(typeof error.detail==='string')detail=error.detail}catch{}status.textContent=detail;return}
     const result=await response.json();
     if(active!=='S02'||textarea.value.trim()!==input){status.textContent='El campo cambió durante la consulta. Repite la asistencia.';return}
     showReferences(result);
     if(result.blocked_for_evidence){
       proposal.hidden=true;
       status.textContent='La propuesta generativa fue retenida por afirmaciones que requieren evidencia. Consulta las orientaciones y fuentes anteriores.';
     }else if(typeof result.suggestion==='string'&&result.suggestion.trim()){
       present(result.suggestion.slice(0,1600),'Propuesta asistida por extractos documentales recuperados. Requiere verificar que cada afirmación esté respaldada y aprobarla.');
     }else{
       proposal.hidden=true;
       status.textContent='Orientación disponible. Faltan documentos suficientes para redactar con evidencia externa, por eso se conserva tu texto.';
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
 localBtn.onclick=()=>{
   const input=textarea.value.trim();
   if(input.length<10){status.textContent='Primero escribe al menos diez caracteres con tus propias ideas.';return}
   present(formatLocal(input),'Revisión local de claridad; basada exclusivamente en tu texto. No utiliza IA generativa.');
 };
 questionsBtn.onclick=()=>{
   const questions=TEXTS[fieldId];
   status.textContent=questions.join(' ');
   proposal.hidden=true;
 };
 aiBtn.onclick=async()=>{
   const input=textarea.value.trim();
   if(input.length<10){status.textContent='Primero escribe al menos diez caracteres.';return}
   aiBtn.disabled=true;status.textContent='Comprobando disponibilidad de IA...';const requestId=++actionToken;
   try{
     const {data}=await sb.auth.getSession();
     if(!data?.session?.access_token){status.textContent='Para consultar IA externa inicia sesión. La orientación local está disponible sin cuenta.';return}
     const response=await fetch(API+'/assistant/s02',{
       method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},
       body:JSON.stringify({section:'S02',field:fieldId,text:input,context:String(draft?.S01?.municipio||'').slice(0,200),action:'redactar'})
     });
     if(!response.ok){let detail='No fue posible consultar la IA. Utiliza la orientación local.';try{const payload=await response.json();if(typeof payload.detail==='string'&&payload.detail.length<250)detail=payload.detail}catch{}status.textContent=detail;return}
     const result=await response.json();
     if(active!=='S02'||textarea.value.trim()!==input||requestId!==actionToken){status.textContent='El texto cambió. La sugerencia anterior no se aplicará.';return}
     if(result.blocked_for_evidence){
       proposal.hidden=true;
       const flags=Array.isArray(result.review_flags)?result.review_flags:[];
       status.textContent='La IA formuló posibles relaciones causales sin evidencia. Propuesta retenida. '+flags.map(item=>item.fragment||'').slice(0,2).join(' · ')+' Revisa fuentes y formula las relaciones como hipótesis.';
       return;
     }
     if(typeof result.suggestion!=='string'||!result.suggestion.trim()){
       proposal.hidden=true;status.textContent='La IA no generó una propuesta válida. Conserva el texto original.';return;
     }
     present(result.suggestion.slice(0,1600),'Propuesta de un modelo generativo; no constituye evidencia primaria. Requiere revisión.');
   }catch{status.textContent='No se pudo conectar el modelo. La orientación local sigue disponible.'}
   finally{aiBtn.disabled=false}
 };
 approve.onclick=()=>{
   if(!draftText.value.trim()){status.textContent='La propuesta está vacía.';return}
   if(textarea.value!==sourceValue){status.textContent='El texto original cambió. Vuelve a generar la propuesta antes de aplicarla.';return}
   textarea.value=draftText.value.trim();
   textarea.dispatchEvent(new Event('input',{bubbles:true}));
   proposal.hidden=true;
   status.textContent='Propuesta incorporada al campo. Revisa y guarda normalmente el proyecto.';
 };
 discard.onclick=()=>{proposal.hidden=true;status.textContent='Propuesta descartada. Se conserva tu texto original.'};
}
function mount(){
 if(typeof active==='undefined'||active!=='S02')return;
 document.querySelectorAll('#fields textarea[data-field]').forEach(cardFor);
}
const css=document.createElement('style');css.textContent='.vt-assist{border:1px solid #b5c8c0;background:#f5faf7;border-radius:11px;margin:9px 0 17px;padding:12px}.vt-assist-heading{display:block;font-size:.9rem}.vt-assist-note,.vt-assist-status,.vt-assist-source{font-size:.84rem;color:#425950;margin:7px 0}.vt-assist-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.vt-assist button{border:1px solid #789a8c;border-radius:8px;background:white;color:#17392c;padding:8px 11px;font:inherit;font-size:.82rem;cursor:pointer}.vt-assist button:disabled{opacity:.5}.vt-assist-proposal{border-top:1px solid #c9d8d0;margin-top:10px;padding-top:10px}.vt-assist-proposal[hidden],.vt-assist-references[hidden]{display:none}.vt-assist-references{border-top:1px solid #c9d8d0;margin-top:10px;padding-top:10px;font-size:.84rem}.vt-assist-references ul{padding-left:20px}.vt-assist-references li{margin:8px 0}.vt-assist-references a{color:#0b5347;text-decoration:underline}.vt-assist-proposal textarea{box-sizing:border-box;width:100%;border:1px solid #b0c5ba;border-radius:8px;min-height:90px;padding:9px;font:inherit}.vt-assist .vt-assist-approve{background:#123e2f;color:white}@media(max-width:600px){.vt-assist-actions button{flex:1 1 auto}}';
document.head.appendChild(css);
new MutationObserver(mount).observe(document.getElementById('fields')||document.body,{childList:true,subtree:true});
mount();
window.fcAssistantS02LocalRewrite=formatLocal;
})();
