/* H01: staging-only, local project storage. The document reload is the isolation boundary. */
(()=>{
'use strict';
if(!window.FC_LOCAL_PROJECTS)return;
const storage=localStorage, proto=Storage.prototype;
const get=proto.getItem,set=proto.setItem,remove=proto.removeItem,key=proto.key;
// Device-local segregation, not a substitute for server-side authorization.
const ownerKey='vt:h01:owner:v1';
const owner=get.call(storage,ownerKey)||'guest';
const suffix=owner==='guest'?'':':account:'+encodeURIComponent(owner);
const registryKey='vt:h01:registry:v1'+suffix,activeKey='vt:h01:active:v1'+suffix,prefix=owner==='guest'?'vt:h01:project:':'vt:h01:account:'+encodeURIComponent(owner)+':project:';

const draftKey='formulador-cultural-prototipo-v1';
const managed=k=>typeof k==='string'&&(k.startsWith('formulador-cultural-')||k.startsWith('fc_')||k==='vt-staging-evidence-v1');
const rawGet=k=>get.call(storage,k),rawSet=(k,v)=>set.call(storage,k,v);
const parse=(v,f)=>{try{return JSON.parse(v)||f}catch{return f}};
let registry=parse(rawGet(registryKey),[]);
// The URL anchors each document to its project even when another tab changes selection.
const requested=new URL(location.href).searchParams.get('project');
let id=registry.some(p=>p.id===requested)?requested:rawGet(activeKey);
const uuid=()=>crypto.randomUUID();
const ns=(p,k)=>prefix+p+':'+k;
if(!registry.some(p=>p.id===id)){
 const oldKeys=[];for(let i=0;i<storage.length;i++){const k=key.call(storage,i);if(owner==='guest'&&managed(k))oldKeys.push(k)}
 id=uuid();
 // Copy, never delete historical keys. Publish registry only after successful copy.
 for(const k of oldKeys)rawSet(ns(id,k),rawGet(k));
 const old=parse(rawGet(ns(id,draftKey)),{});
 registry=[...registry,{id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),title:old.S01?.nombre_del_proyecto||'Proyecto inicial'}];
 rawSet(registryKey,JSON.stringify(registry));rawSet(activeKey,id);
}
const current=id;
const currentUrl=new URL(location.href);
if(currentUrl.searchParams.get('project')!==current){currentUrl.searchParams.set('project',current);history.replaceState(history.state,'',currentUrl)}
const navigateTo=target=>{const url=new URL(location.href);url.searchParams.set('project',target);location.assign(url)};
const keys=()=>{const result=[];for(let i=0;i<storage.length;i++){const k=key.call(storage,i);if(k?.startsWith(prefix+current+':'))result.push(k.slice((prefix+current+':').length))}return result};
const refreshMeta=()=>{
 const list=parse(rawGet(registryKey),[]),d=parse(rawGet(ns(current,draftKey)),{});
 const item=list.find(x=>x.id===current);if(!item)return;
 item.title=String(d.S01?.nombre_del_proyecto||'Proyecto sin nombre').trim()||'Proyecto sin nombre';
 item.updatedAt=new Date().toISOString();item.sections=Object.keys(d).filter(k=>/^S(?:0[1-9]|1[0-6])$/.test(k)&&Object.values(d[k]||{}).some(v=>typeof v==='string'?v.trim():v!=null)).length;
 rawSet(registryKey,JSON.stringify(list));
};
proto.getItem=function(k){return get.call(this,this===storage&&managed(String(k))?ns(current,k):k)};
proto.setItem=function(k,v){const scoped=this===storage&&managed(String(k));set.call(this,scoped?ns(current,k):k,v);if(scoped&&k===draftKey)refreshMeta()};
proto.removeItem=function(k){return remove.call(this,this===storage&&managed(String(k))?ns(current,k):k)};
// Keep the originating document alive while a review is in flight.
// Other projects may be opened in another tab; do not abandon a live request.
const pendingReviews=new Map();
window.fcH01BeginReview=(section,field)=>{const token=uuid();pendingReviews.set(token,{section,field});return token};
window.fcH01EndReview=token=>pendingReviews.delete(token);
window.fcH01PendingReviewCount=()=>pendingReviews.size;
const reviewKey='formulador-cultural-h01-review-inbox-v1';
window.fcH01StoreReview=(entry)=>{
 if(entry.projectId!==current||!entry.section||!entry.field||!entry.requestId)return false;
 const inbox=parse(localStorage.getItem(reviewKey),{});
 inbox[entry.section+':'+entry.field]=entry;
 localStorage.setItem(reviewKey,JSON.stringify(inbox));return true;
};
window.fcH01GetReview=(section,field)=>parse(localStorage.getItem(reviewKey),{})[section+':'+field]||null;
window.fcH01ClearReview=(section,field)=>{const inbox=parse(localStorage.getItem(reviewKey),{});delete inbox[section+':'+field];localStorage.setItem(reviewKey,JSON.stringify(inbox))};
const openProject=target=>{
 if(!pendingReviews.size){navigateTo(target);return}
 const url=new URL(location.href);url.searchParams.set('project',target);
 const other=window.open(url.href,'_blank');
 if(!other){alert('Permite abrir otra pestaña para continuar mientras termina la consulta del proyecto actual.');return}
 other.opener=null;
};
const flush=()=>{if(typeof saveLocal==='function')saveLocal();refreshMeta()};
const switchTo=target=>{
 if(!parse(rawGet(registryKey),[]).some(p=>p.id===target))throw Error('Proyecto no disponible');
 if(target===current)return;
 flush();rawSet(activeKey,target);openProject(target);
};
const create=()=>{
 flush();const next=uuid(),now=new Date().toISOString();
 rawSet(ns(next,draftKey),'{}');rawSet(ns(next,'fc_active'),'S01');
 const list=parse(rawGet(registryKey),[]);list.push({id:next,title:'Proyecto sin nombre',createdAt:now,updatedAt:now,sections:0});
 rawSet(registryKey,JSON.stringify(list));rawSet(activeKey,next);openProject(next);
};
window.fcLocalProjectId=()=>current;
window.fcH01LocalOwner=()=>owner;
let ownerChanging=false;
window.fcH01SetAuthenticatedOwner=userId=>{
 const next=typeof userId==='string'&&userId.trim()?userId:'guest';
 if(next===owner||ownerChanging)return;
 // Save to the old immutable namespace before selecting the new one.
 ownerChanging=true;
 try{
   flush();rawSet(ownerKey,next);
   const url=new URL(location.href);url.searchParams.delete('project');
   location.replace(url.href);
 }catch(e){ownerChanging=false;throw e}
};
window.addEventListener('storage',event=>{
 if(event.key===ownerKey&&(event.newValue||'guest')!==owner&&!ownerChanging){
   // Do not allow an old tab to continue exposing an account's workspace.
   ownerChanging=true;
   try{flush()}finally{document.body?.replaceChildren();location.reload()}
 }
});

window.fcLocalProjects=()=>parse(rawGet(registryKey),[]).map(p=>({...p}));
window.fcCreateLocalProject=create;
window.fcSwitchLocalProject=switchTo;
window.fcLocalProjectStorageKeys=keys;
function territoryWarning(){
 const fields=document.querySelector('#fields');
 if(!fields||typeof active==='undefined'||active!=='S01')return;
 const city=fields.querySelector('[data-field="municipio"]'),title=fields.querySelector('[data-field="nombre_del_proyecto"]'),idea=fields.querySelector('[data-field="idea_inicial_usuario"]'),dept=fields.querySelector('[data-field="departamento"]');
 if(!city||!title||!idea)return;
 let box=fields.querySelector('#h01TerritoryWarning');
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 // Explicit place mentions only: conservative Caldas pilot, not a national gazetteer.
 const names=['Aguadas','Anserma','Aranzazu','Belalcázar','Chinchiná','Filadelfia','La Dorada','La Merced','Manizales','Manzanares','Marmato','Marquetalia','Marulanda','Neira','Norcasia','Pácora','Palestina','Pensilvania','Riosucio','Risaralda','Salamina','Samaná','San José','Supía','Victoria','Villamaría','Viterbo'];
 const declared=normalize(city.value),department=normalize(dept?.value);
 const mentioned=names.filter(n=>new RegExp('(?:^|[^a-z])'+normalize(n)+'(?:$|[^a-z])').test(normalize(title.value+' '+idea.value+' '+(draft.S02?.territorio_o_lugar_de_intervencion||''))));
 const conflicts=mentioned.filter(n=>normalize(n)!==declared);
 const applicable=names.some(n=>normalize(n)===declared)&&(!department||department==='caldas')&&conflicts.length>0;
 if(!applicable){if(box)box.hidden=true;return}
 const signature=JSON.stringify([city.value,dept?.value,title.value,idea.value,draft.S02?.territorio_o_lugar_de_intervencion||'']);
 if(!box){box=document.createElement('div');box.id='h01TerritoryWarning';box.className='vt-territory-check';box.setAttribute('role','status');city.closest('.field')?.append(box)}
 if(box.dataset.signature===signature){box.hidden=false;return}
 box.dataset.signature=signature;box.hidden=false;box.replaceChildren();
 const message=document.createElement('p');message.textContent='Posible discrepancia territorial: municipio declarado '+city.value+'; otros lugares mencionados: '+conflicts.join(', ')+'. Revisa la idea, el nombre y el contexto. Puede tratarse de un proyecto intermunicipal. Los datos se conservan.';
 const accept=document.createElement('button');accept.type='button';accept.textContent='Conservar con justificación';
 const note=document.createElement('span');
 const previous=draft.S01?.h01_territory_decision;
 if(previous?.signature===signature)note.textContent=' Decisión registrada: '+previous.reason;
 accept.onclick=()=>{const reason=prompt('Justifica por qué deben conservarse los lugares indicados:');if(!reason?.trim())return;draft.S01.h01_territory_decision={signature,reason:reason.trim(),at:new Date().toISOString()};saveLocal();note.textContent=' Decisión registrada: '+reason.trim()};
 box.append(message,accept,note);
}
function mount(){
 const host=document.querySelector('#authCard');if(!host)return;
 const box=document.createElement('section');box.className='guided-journey';box.id='h01Projects';box.style.cssText='position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px;margin:12px 0';
 const info=document.createElement('div');info.style.flex='1 1 180px';
 const heading=document.createElement('strong');heading.textContent='Mis proyectos';
 const detail=document.createElement('div');detail.className='auth-help';detail.id='h01ActiveProject';info.append(heading,detail);
 const select=document.createElement('select');select.id='h01ProjectSelect';select.setAttribute('aria-label','Mis proyectos');select.style.cssText='max-width:100%;min-width:0;flex:1 1 160px';
 const open=document.createElement('button');open.type='button';open.id='h01Continue';open.textContent='Continuar proyecto';
 const add=document.createElement('button');add.type='button';add.id='h01New';add.textContent='Nuevo proyecto';add.className='primary';
 const status=document.createElement('span');status.className='auth-help';status.setAttribute('role','status');status.textContent='Guardado en este navegador';
 const update=()=>{const list=window.fcLocalProjects(),item=list.find(p=>p.id===current),selected=select.value||current;const signature=JSON.stringify(list.map(p=>[p.id,p.title]));if(select.dataset.signature!==signature){select.replaceChildren(...list.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title;return o}));select.value=list.some(p=>p.id===selected)?selected:current;select.dataset.signature=signature}detail.textContent=(item?.title||'Proyecto sin nombre')+' · '+(item?.sections||0)+'/16 secciones con registro · '+(item?.updatedAt?new Date(item.updatedAt).toLocaleString('es-CO'):'');};
 const safe=fn=>()=>{try{fn()}catch(e){status.textContent='No se pudo guardar o cambiar de proyecto. Conserva esta página y revisa el almacenamiento.';console.error(e)}};
 open.onclick=safe(()=>switchTo(select.value));add.onclick=safe(create);
 box.append(info,select,open,add,status);document.querySelector('#guidedJourney').before(box);update();
 document.addEventListener('input',e=>{if(e.target.matches?.('[data-field]')){status.textContent='Cambios pendientes de guardar';clearTimeout(window.__h01SaveTimer);window.__h01SaveTimer=setTimeout(safe(()=>{flush();status.textContent='Guardado local';update()}),450)}});
 document.addEventListener('focusout',e=>{if(e.target.matches?.('[data-field]'))safe(()=>{flush();status.textContent='Guardado local';update()})()});
 const observer=new MutationObserver(()=>{update();territoryWarning()});observer.observe(document.querySelector('#fields'),{childList:true});document.addEventListener('input',e=>{if(e.target.matches?.('[data-field]'))territoryWarning()});territoryWarning();
 window.addEventListener('pagehide',()=>{try{if(typeof dirty!=='undefined'&&dirty)flush()}catch{}});
}
document.addEventListener('DOMContentLoaded',mount,{once:true});
})();