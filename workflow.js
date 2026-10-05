(()=>{
const q=s=>document.querySelector(s);
let navigating=false;

async function persistCurrent(){
  try{
    if(typeof saveLocal==='function')saveLocal();
    if(typeof session!=='undefined'&&session&&typeof syncSection==='function'){
      await syncSection(active);
      if(typeof setStatus==='function')setStatus(`${active} guardada y sincronizada antes de continuar.`,true);
    }
    return true;
  }catch(e){
    console.error('Persistencia antes de navegar',e);
    if(typeof setStatus==='function')setStatus(`El borrador quedó local. La sincronización falló: ${e.message||'error desconocido'}`);
    return false;
  }
}

async function navigateTo(code,{scroll=true}={}){
  if(navigating||typeof order==='undefined'||!order.includes(code))return false;
  if(code===active)return true;
  navigating=true;
  try{
    await persistCurrent();
    active=code;
    if(typeof render==='function')render();
    if(scroll)q('#panel')?.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  }finally{navigating=false}
}
window.fcNavigate=navigateTo;
window.fcPersistCurrent=persistCurrent;

function interceptNav(){
  const nav=q('#nav');
  if(nav&&!nav.dataset.workflowLinked){
    nav.dataset.workflowLinked='1';
    nav.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-k]');if(!btn)return;
      e.preventDefault();e.stopImmediatePropagation();
      navigateTo(btn.dataset.k);
    },true);
  }
  const map=[['#prev',-1],['#mPrev',-1],['#next',1],['#mNext',1]];
  map.forEach(([sel,delta])=>{
    const b=q(sel);if(!b||b.dataset.workflowLinked)return;b.dataset.workflowLinked='1';
    b.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const idx=Math.max(0,Math.min(order.length-1,order.indexOf(active)+delta));
      navigateTo(order[idx]);
    },true);
  });
}

function safeText(v){return String(v??'').replace(/\s+/g,' ').trim()}
function sheetRowsFromDraft(){
  const rows=[];
  if(typeof sections==='undefined'||typeof draft==='undefined')return rows;
  Object.entries(sections).forEach(([code,section])=>{
    const data=draft[code]||{};
    section.fields.forEach(([key,label])=>rows.push({Sección:code,Nombre_sección:section.title,Campo:label,Clave:key,Valor:data[key]??''}));
  });
  return rows;
}
function treeState(){try{return draft?.S07?.tree_state||JSON.parse(localStorage.getItem('formulador-cultural-problem-tree-v1')||'{}')}catch{return {}}}
function vesterState(){try{return draft?.S06?.vester_state||JSON.parse(localStorage.getItem('formulador-cultural-vester-v1')||'{}')}catch{return {}}}
function zoneLabel(z){return {central:'Problema central',direct_cause:'Causa directa',indirect_cause:'Causa indirecta',direct_effect:'Efecto directo',indirect_effect:'Efecto indirecto',outside:'Fuera del árbol'}[z]||z}
function treeRows(){
  const s=treeState(),nodes=s.nodes||[],byId=new Map(nodes.map(n=>[n.id,n]));
  return nodes.map(n=>({ID:n.id,Nivel:zoneLabel(n.zone),Formulación:n.text||'',Conecta_con:n.parentId?(byId.get(n.parentId)?.text||n.parentId):'',Justificación:n.justification||'',Revisado:n.reviewed?'Sí':'No',Origen:n.origin||'',Estado_fuente:n.stale?'Revisar cambio en S05':''}));
}
function relationRows(){
  const rows=treeRows();return rows.filter(r=>r.Nivel!=='Problema central'&&r.Nivel!=='Fuera del árbol').map(r=>({Elemento:r.Formulación,Nivel:r.Nivel,Relación_con:r.Conecta_con||'[POR VERIFICAR]',Justificación:r.Justificación||'[POR VERIFICAR]',Estado:r.Revisado==='Sí'?'Revisada':'Por revisar'}));
}
function vesterRows(){
  const s=vesterState(),ps=s.selected||[],rel=s.relations||{},totals=new Map(ps.map(p=>[p.id,{text:p.text,influence:0,dependence:0}]));
  Object.entries(rel).forEach(([k,r])=>{if(!Number.isInteger(r?.score))return;const [a,b]=k.split('>');if(totals.has(a))totals.get(a).influence+=r.score;if(totals.has(b))totals.get(b).dependence+=r.score});
  return [...totals.entries()].map(([id,v])=>({ID:id,Problema:v.text,Influencia:v.influence,Dependencia:v.dependence}));
}
async function evidenceRows(){
  if(typeof session!=='undefined'&&session&&typeof sb!=='undefined'&&sb&&typeof ensureProject==='function'){
    try{
      const project=await ensureProject();
      const {data,error}=await sb.from('evidence').select('title,text,source_kind,source_ref,source_url,source_date,verification_status,notes').eq('project_id',project.id).eq('section_code','S04').order('created_at',{ascending:true});
      if(error)throw error;
      return (data||[]).map(e=>({Título:e.title||'',Descripción:e.text||'',Tipo:e.source_kind||'',Referencia:e.source_ref||'',URL:e.source_url||'',Fecha:e.source_date||'',Estado:e.verification_status||'',Notas:e.notes||''}));
    }catch(e){console.warn('No fue posible leer evidencia estructurada para Excel',e)}
  }
  const d=draft?.S04||{};
  return [{Título:'Evidencia S04',Descripción:d.evidencia_disponible||'[POR VERIFICAR]',Tipo:'registro de sección',Referencia:d.fuentes||'',URL:'',Fecha:'',Estado:d.datos_por_verificar?'por_verificar':'',Notas:d.observaciones||''}];
}
function addJsonSheet(wb,name,rows){const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{Estado:'Sin registros'}]);ws['!cols']=Object.keys(rows[0]||{Estado:''}).map(k=>({wch:Math.min(60,Math.max(14,k.length+4))}));XLSX.utils.book_append_sheet(wb,ws,name)}
function treeVisualSheet(){
  const nodes=(treeState().nodes||[]).filter(n=>n.zone!=='outside');
  const orderZones=['indirect_effect','direct_effect','central','direct_cause','indirect_cause'];
  const aoa=[];
  orderZones.forEach(z=>{
    const list=nodes.filter(n=>n.zone===z);
    aoa.push([zoneLabel(z)]);
    aoa.push(list.length?list.map(n=>safeText(n.text)):['Sin elementos']);
    aoa.push(['']);
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=Array.from({length:Math.max(1,...aoa.map(r=>r.length))},()=>({wch:42}));return ws;
}

async function exportWorkbook(){
  if(typeof XLSX==='undefined'){alert('El generador de Excel todavía no está disponible. Recarga la página e inténtalo nuevamente.');return}
  await persistCurrent();
  const wb=XLSX.utils.book_new();
  addJsonSheet(wb,'00_Proyecto',sheetRowsFromDraft());
  addJsonSheet(wb,'01_Levantamiento',treeRows());
  addJsonSheet(wb,'02_Relaciones',relationRows());
  XLSX.utils.book_append_sheet(wb,treeVisualSheet(),'03_Arbol_visual');
  addJsonSheet(wb,'04_Vester',vesterRows());
  addJsonSheet(wb,'05_Evidencia',await evidenceRows());
  const trace=[{Regla:'Cálculo Vester',Responsable:'Sistema',Nota:'Determinístico a partir de valores 0–3 registrados por el usuario.'},{Regla:'Puntuación Vester',Responsable:'Usuario',Nota:'La IA no asigna el valor final.'},{Regla:'Ubicación en árbol',Responsable:'Usuario',Nota:'Las sugerencias no mueven nodos automáticamente.'},{Regla:'Evidencia',Responsable:'Fuentes / usuario',Nota:'Los vacíos permanecen [POR VERIFICAR].'},{Regla:'Interpretación',Responsable:'IA + reglas',Nota:'Orientativa; no demuestra causalidad científica.'}];
  addJsonSheet(wb,'06_Trazabilidad',trace);
  const base=safeText(draft?.S01?.nombre_del_proyecto||'proyecto-cultural').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'proyecto-cultural';
  XLSX.writeFile(wb,`${base}-analisis.xlsx`);
}
window.fcExportProjectWorkbook=exportWorkbook;

interceptNav();
new MutationObserver(interceptNav).observe(document.body,{subtree:true,childList:true});
})();