/* H01: staging-only, local project storage. The document reload is the isolation boundary. */
(()=>{
'use strict';
if(!window.FC_LOCAL_PROJECTS)return;
const storage=localStorage, proto=Storage.prototype;
const get=proto.getItem,set=proto.setItem,remove=proto.removeItem,key=proto.key;
const registryKey='vt:h01:registry:v1',activeKey='vt:h01:active:v1',prefix='vt:h01:project:';
const draftKey='formulador-cultural-prototipo-v1';
const managed=k=>typeof k==='string'&&(k.startsWith('formulador-cultural-')||k.startsWith('fc_')||k==='vt-staging-evidence-v1');
const rawGet=k=>get.call(storage,k),rawSet=(k,v)=>set.call(storage,k,v);
const parse=(v,f)=>{try{return JSON.parse(v)||f}catch{return f}};
let registry=parse(rawGet(registryKey),[]);
let id=rawGet(activeKey);
const uuid=()=>crypto.randomUUID();
const ns=(p,k)=>prefix+p+':'+k;
if(!registry.some(p=>p.id===id)){
 const oldKeys=[];for(let i=0;i<storage.length;i++){const k=key.call(storage,i);if(managed(k))oldKeys.push(k)}
 id=uuid();
 // Copy, never delete historical keys. Publish registry only after successful copy.
 for(const k of oldKeys)rawSet(ns(id,k),rawGet(k));
 const old=parse(rawGet(ns(id,draftKey)),{});
 registry=[...registry,{id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),title:old.S01?.nombre_del_proyecto||'Proyecto inicial'}];
 rawSet(registryKey,JSON.stringify(registry));rawSet(activeKey,id);
}
const current=id;
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
const flush=()=>{if(typeof saveLocal==='function')saveLocal();refreshMeta()};
const switchTo=target=>{
 if(!parse(rawGet(registryKey),[]).some(p=>p.id===target))throw Error('Proyecto no disponible');
 if(target===current)return;
 flush();rawSet(activeKey,target);location.reload();
};
const create=()=>{
 flush();const next=uuid(),now=new Date().toISOString();
 rawSet(ns(next,draftKey),'{}');rawSet(ns(next,'fc_active'),'S01');
 const list=parse(rawGet(registryKey),[]);list.push({id:next,title:'Proyecto sin nombre',createdAt:now,updatedAt:now,sections:0});
 rawSet(registryKey,JSON.stringify(list));rawSet(activeKey,next);location.reload();
};
window.fcLocalProjectId=()=>current;
window.fcLocalProjects=()=>parse(rawGet(registryKey),[]).map(p=>({...p}));
window.fcCreateLocalProject=create;
window.fcSwitchLocalProject=switchTo;
window.fcLocalProjectStorageKeys=keys;
function mount(){
 const host=document.querySelector('#authCard');if(!host)return;
 const box=document.createElement('section');box.className='auth-card';box.id='h01Projects';box.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px';
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
 box.append(info,select,open,add,status);host.before(box);update();
 document.addEventListener('input',e=>{if(e.target.matches?.('[data-field]')){status.textContent='Cambios pendientes de guardar';clearTimeout(window.__h01SaveTimer);window.__h01SaveTimer=setTimeout(safe(()=>{flush();status.textContent='Guardado local';update()}),450)}});
 document.addEventListener('focusout',e=>{if(e.target.matches?.('[data-field]'))safe(()=>{flush();status.textContent='Guardado local';update()})()});
 const observer=new MutationObserver(update);observer.observe(document.querySelector('#fields'),{childList:true});
 window.addEventListener('pagehide',()=>{try{if(typeof dirty!=='undefined'&&dirty)flush()}catch{}});
}
document.addEventListener('DOMContentLoaded',mount,{once:true});
})();