(()=>{
const q=s=>document.querySelector(s);
let navigating=false;
// Las consultas y la navegación simple no deben ejecutar upserts a Supabase.
// Capturar interacciones del usuario; los módulos que editan mediante código
// pueden señalar explícitamente cambios mediante fcMarkSectionDirty().
const dirtySections=new Set();
window.fcMarkSectionDirty=code=>dirtySections.add(code||active);
document.addEventListener('input',e=>{
  if(e.target?.closest?.('#panel'))dirtySections.add(active);
},true);
document.addEventListener('change',e=>{
  if(e.target?.closest?.('#panel'))dirtySections.add(active);
},true);
document.addEventListener('click',e=>{
  const b=e.target?.closest?.('#panel button');
  if(b&&!b.matches('[data-k], #prev, #next, #mPrev, #mNext'))dirtySections.add(active);
},true);

async function persistCurrent(){
  // No capturar ni persistir el DOM si el usuario no cambió esta sección.
  if(!dirtySections.has(active))return true;
  try{
    if(typeof saveLocal==='function')saveLocal();
    if(typeof session!=='undefined'&&session&&typeof syncSection==='function'){
      await syncSection(active);
      if(typeof setStatus==='function')setStatus(`${active} guardada y sincronizada antes de continuar.`,true);
    }
    dirtySections.delete(active);
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
function safeFilename(v){return safeText(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'proyecto-cultural'}
function valueState(v){const t=String(v??'');return /\[POR VERIFICAR\]/i.test(t)?'[POR VERIFICAR]':t.trim()?'Registrado':'Vacío'}
function sectionRows(code){
  if(typeof sections==='undefined'||typeof draft==='undefined')return [];
  const section=sections[code];if(!section)return [];
  const data=draft[code]||{};
  return section.fields.map(([key,label])=>({Campo:label,Clave:key,Valor:data[key]??'',Estado:valueState(data[key])}));
}
function allProjectRows(){
  const rows=[];
  if(typeof sections==='undefined'||typeof draft==='undefined')return rows;
  Object.entries(sections).forEach(([code,section])=>{
    const data=draft[code]||{};
    section.fields.forEach(([key,label])=>rows.push({Sección:code,Nombre_sección:section.title,Campo:label,Clave:key,Valor:data[key]??'',Estado:valueState(data[key])}));
  });
  return rows;
}
function treeState(){try{return draft?.S07?.tree_state||JSON.parse(localStorage.getItem('formulador-cultural-problem-tree-v1')||'{}')}catch{return {}}}
function objectivesState(){try{return draft?.S09?.objectives_state||JSON.parse(localStorage.getItem('formulador-cultural-objectives-v1')||'{}')}catch{return {}}}
function vesterState(){try{return draft?.S06?.vester_state||JSON.parse(localStorage.getItem('formulador-cultural-vester-v1')||'{}')}catch{return {}}}
function prepState(){try{return draft?.S05?.vester_preparation||JSON.parse(localStorage.getItem('formulador-cultural-vester-prep-v1')||'{}')}catch{return {}}}
function zoneLabel(z){return {central:'Problema central',direct_cause:'Causa directa',indirect_cause:'Causa indirecta',direct_effect:'Efecto directo',indirect_effect:'Efecto indirecto',outside:'Fuera del árbol'}[z]||z}
function objectiveLabel(z){return {central:'Objetivo central',direct_cause:'Medio directo',indirect_cause:'Medio indirecto',direct_effect:'Fin directo',indirect_effect:'Fin indirecto'}[z]||z}

function problemTreeRows(){
  const s=treeState(),nodes=s.nodes||[],byId=new Map(nodes.map(n=>[n.id,n]));
  return nodes.map(n=>({
    ID:n.id,
    Nivel:zoneLabel(n.zone),
    Formulación:n.text||'',
    Conecta_con_ID:n.parentId||'',
    Conecta_con:n.parentId?(byId.get(n.parentId)?.text||n.parentId):'',
    Justificación:n.justification||'',
    Revisado:n.reviewed?'Sí':'No',
    Origen:n.origin||'',
    Estado_fuente:n.stale?'Revisar cambio en S05':'Vigente'
  }));
}
function problemRelationRows(){
  return problemTreeRows().filter(r=>r.Nivel!=='Problema central'&&r.Nivel!=='Fuera del árbol').map(r=>({
    Elemento_ID:r.ID,
    Elemento:r.Formulación,
    Nivel:r.Nivel,
    Relación_con_ID:r.Conecta_con_ID||'[POR VERIFICAR]',
    Relación_con:r.Conecta_con||'[POR VERIFICAR]',
    Justificación:r.Justificación||'[POR VERIFICAR]',
    Estado:r.Revisado==='Sí'?'Revisada':'Por revisar'
  }));
}
function objectiveRows(){
  const s=objectivesState(),items=s.items||[],byId=new Map(items.map(x=>[x.id,x]));
  return items.map(x=>({
    ID:x.id,
    Nivel:objectiveLabel(x.zone),
    Formulación:x.text||'',
    Fuente_S07:x.sourceText||'',
    Conecta_con_ID:x.parentId||'',
    Conecta_con:x.parentId?(byId.get(x.parentId)?.text||x.parentId):'',
    Confirmado:x.confirmed?'Sí':'No',
    Estado:x.confirmed?'Confirmado':'[POR REVISAR]'
  }));
}
function objectiveRelationRows(){
  return objectiveRows().filter(r=>r.Nivel!=='Objetivo central').map(r=>({
    Elemento_ID:r.ID,
    Elemento:r.Formulación,
    Nivel:r.Nivel,
    Relación_con_ID:r.Conecta_con_ID||'[POR VERIFICAR]',
    Relación_con:r.Conecta_con||'[POR VERIFICAR]',
    Estado:r.Confirmado==='Sí'?'Confirmada':'Por revisar'
  }));
}
function prepRows(){
  const s=prepState();return (s.items||[]).map((x,i)=>({
    ID:x.id||`P${i+1}`,
    Entrada_S05:x.sourceText||'',
    Formulación_Vester:x.text||'',
    Clasificación:{ready:'Lista para Vester',reformulate:'Reformular',verify:'[POR VERIFICAR]',exclude:'Excluir'}[x.status]||x.status||'',
    Confirmada:x.confirmed?'Sí':'No',
    Razón:x.reason||''
  }));
}
function vesterSelected(){return vesterState().selected||[]}
function vesterTotals(){
  const s=vesterState(),ps=s.selected||[],rel=s.relations||{},totals=new Map(ps.map(p=>[p.id,{id:p.id,text:p.text,influence:0,dependence:0}]));
  Object.entries(rel).forEach(([k,r])=>{if(!Number.isInteger(r?.score))return;const [a,b]=k.split('>');if(totals.has(a))totals.get(a).influence+=r.score;if(totals.has(b))totals.get(b).dependence+=r.score});
  const values=[...totals.values()];
  const meanI=values.length?values.reduce((a,b)=>a+b.influence,0)/values.length:0;
  const meanD=values.length?values.reduce((a,b)=>a+b.dependence,0)/values.length:0;
  return values.map(v=>({
    ID:v.id,
    Problema:v.text,
    Influencia:v.influence,
    Dependencia:v.dependence,
    Clasificación:v.influence>=meanI?(v.dependence>=meanD?'Crítico':'Activo'):(v.dependence>=meanD?'Pasivo':'Indiferente'),
    Corte_influencia:Number(meanI.toFixed(2)),
    Corte_dependencia:Number(meanD.toFixed(2))
  }));
}
function vesterMatrixAoa(){
  const s=vesterState(),ps=s.selected||[],rel=s.relations||{};
  if(!ps.length)return [['Matriz Vester'],['Sin variables seleccionadas']];
  const ids=ps.map((p,i)=>`P${i+1}`),byId=new Map(ps.map((p,i)=>[p.id,{...p,label:ids[i]}]));
  const aoa=[['MATRIZ VESTER',...ids,'Influencia total']];
  ps.forEach((p,i)=>{
    let total=0;const row=[ids[i]];
    ps.forEach(q=>{if(p.id===q.id){row.push('—');return}const score=rel[`${p.id}>${q.id}`]?.score;const v=Number.isInteger(score)?score:'';if(Number.isInteger(score))total+=score;row.push(v)});
    row.push(total);aoa.push(row);
  });
  const dep=['Dependencia total'];
  ps.forEach(q=>{let total=0;ps.forEach(p=>{const score=rel[`${p.id}>${q.id}`]?.score;if(Number.isInteger(score))total+=score});dep.push(total)});dep.push('');aoa.push(dep);
  aoa.push([]);aoa.push(['LEYENDA']);
  ps.forEach((p,i)=>aoa.push([ids[i],safeText(p.text)]));
  aoa.push([]);aoa.push(['Escala','0 = sin influencia directa; 1 = débil; 2 = importante; 3 = fuerte y directa.']);
  aoa.push(['Regla','La puntuación corresponde a la decisión del usuario. El sistema calcula totales y cuadrantes.']);
  return aoa;
}

async function evidenceRows(){
  if(typeof session!=='undefined'&&session&&typeof sb!=='undefined'&&sb&&typeof ensureProject==='function'){
    try{
      const project=await ensureProject();
      const {data,error}=await sb.from('evidence').select('title,text,source_kind,source_ref,source_url,source_date,verification_status,notes').eq('project_id',project.id).eq('section_code','S04').order('created_at',{ascending:true});
      if(error)throw error;
      return (data||[]).map((e,i)=>({ID:`E${i+1}`,Título:e.title||'',Descripción:e.text||'',Tipo:e.source_kind||'',Referencia:e.source_ref||'',URL:e.source_url||'',Fecha:e.source_date||'',Estado:e.verification_status||'',Notas:e.notes||''}));
    }catch(e){console.warn('No fue posible leer evidencia estructurada para Excel',e)}
  }
  const d=draft?.S04||{};
  return [{ID:'E1',Título:'Evidencia S04',Descripción:d.evidencia_disponible||'[POR VERIFICAR]',Tipo:'registro de sección',Referencia:d.fuentes||'',URL:'',Fecha:'',Estado:d.datos_por_verificar?'por_verificar':'',Notas:d.observaciones||''}];
}

function setCols(ws,widths){ws['!cols']=widths.map(w=>({wch:w}))}
function addJsonSheet(wb,name,rows,widths){
  const safeRows=rows.length?rows:[{Estado:'Sin registros'}];
  const ws=XLSX.utils.json_to_sheet(safeRows);
  const keys=Object.keys(safeRows[0]||{Estado:''});
  setCols(ws,widths||keys.map(k=>Math.min(55,Math.max(14,k.length+4))));
  ws['!autofilter']={ref:ws['!ref']||'A1:A1'};
  XLSX.utils.book_append_sheet(wb,ws,name);
  return ws;
}
function addAoaSheet(wb,name,aoa,width=34){
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  const max=Math.max(1,...aoa.map(r=>r.length));setCols(ws,Array.from({length:max},()=>width));
  XLSX.utils.book_append_sheet(wb,ws,name);return ws;
}
function treeVisualAoa(kind='problem'){
  const problem=kind==='problem';
  const items=problem?(treeState().nodes||[]).filter(n=>n.zone!=='outside'):(objectivesState().items||[]);
  const orderZones=['indirect_effect','direct_effect','central','direct_cause','indirect_cause'];
  const labels=problem?{indirect_effect:'EFECTOS INDIRECTOS',direct_effect:'EFECTOS DIRECTOS',central:'PROBLEMA CENTRAL',direct_cause:'CAUSAS DIRECTAS',indirect_cause:'CAUSAS INDIRECTAS'}:{indirect_effect:'FINES INDIRECTOS',direct_effect:'FINES DIRECTOS',central:'OBJETIVO CENTRAL',direct_cause:'MEDIOS DIRECTOS',indirect_cause:'MEDIOS INDIRECTOS'};
  const aoa=[[problem?'ÁRBOL DE PROBLEMAS':'ÁRBOL DE OBJETIVOS']];
  orderZones.forEach((z,i)=>{
    const list=items.filter(n=>n.zone===z);
    aoa.push([labels[z]]);
    if(list.length)aoa.push(list.map(n=>safeText(n.text)||'[POR REVISAR]'));else aoa.push(['Sin elementos']);
    if(i<orderZones.length-1)aoa.push(['↑']);
  });
  aoa.push([]);
  aoa.push(['Nota metodológica',problem?'Las relaciones reflejan la organización confirmada por el usuario y no constituyen por sí mismas prueba científica de causalidad.':'Las formulaciones positivas provienen de S07 y requieren confirmación expresa del usuario.']);
  return aoa;
}
function summaryRows(evidence){
  const t=problemTreeRows(),o=objectiveRows(),v=vesterSelected(),prep=prepRows();
  return [
    {Indicador:'Proyecto',Valor:draft?.S01?.nombre_del_proyecto||'[POR VERIFICAR]'},
    {Indicador:'Municipio / territorio',Valor:draft?.S01?.municipio||draft?.S02?.territorio_o_lugar_de_intervencion||'[POR VERIFICAR]'},
    {Indicador:'Variables preparadas para Vester',Valor:prep.filter(x=>x.Confirmada==='Sí').length},
    {Indicador:'Variables seleccionadas en Vester',Valor:v.length},
    {Indicador:'Nodos del árbol de problemas',Valor:t.filter(x=>x.Nivel!=='Fuera del árbol').length},
    {Indicador:'Problemas centrales',Valor:t.filter(x=>x.Nivel==='Problema central').length},
    {Indicador:'Causas',Valor:t.filter(x=>/Causa/.test(x.Nivel)).length},
    {Indicador:'Efectos',Valor:t.filter(x=>/Efecto/.test(x.Nivel)).length},
    {Indicador:'Nodos del árbol de objetivos',Valor:o.length},
    {Indicador:'Objetivos confirmados',Valor:o.filter(x=>x.Confirmado==='Sí').length},
    {Indicador:'Evidencias estructuradas',Valor:evidence.length},
    {Indicador:'Evidencias verificadas',Valor:evidence.filter(x=>String(x.Estado).toLowerCase()==='verificada').length},
    {Indicador:'Generado',Valor:new Date().toLocaleString('es-CO')}
  ];
}
function traceRows(){
  return [
    {Componente:'S05 → Vester',Regla:'Solo variables confirmadas como Lista para Vester deben alimentar la matriz.',Responsable:'Usuario + reglas',Estado:'Aplicada'},
    {Componente:'Vester',Regla:'Los valores 0–3 son asignados por el usuario; el cálculo de influencia y dependencia es determinístico.',Responsable:'Usuario / sistema',Estado:'Aplicada'},
    {Componente:'Vester',Regla:'Los cuadrantes orientan la lectura y no demuestran causalidad científica.',Responsable:'Sistema',Estado:'Aplicada'},
    {Componente:'Árbol de problemas',Regla:'Vester orienta; el problema central, causas, efectos y relaciones son confirmados por el usuario.',Responsable:'Usuario',Estado:'Aplicada'},
    {Componente:'Árbol de objetivos',Regla:'La transformación a formulaciones positivas es una propuesta asistida y requiere confirmación.',Responsable:'Usuario + sistema',Estado:'Aplicada'},
    {Componente:'Evidencia',Regla:'Los vacíos y datos sin soporte permanecen [POR VERIFICAR].',Responsable:'Usuario / fuentes',Estado:'Aplicada'},
    {Componente:'Excel',Regla:'El archivo se genera localmente en el navegador a partir del estado estructurado ya registrado.',Responsable:'Sistema',Estado:'Aplicada'}
  ];
}

async function exportWorkbook(){
  if(typeof XLSX==='undefined'){alert('El generador de Excel todavía no está disponible. Recarga la página e inténtalo nuevamente.');return}
  await persistCurrent();
  const evidence=await evidenceRows();
  const wb=XLSX.utils.book_new();
  wb.Props={Title:`Formulación cultural · ${safeText(draft?.S01?.nombre_del_proyecto||'Proyecto')}`,Subject:'Levantamiento metodológico S01–S09',Author:'Formulador Cultural',CreatedDate:new Date()};

  addJsonSheet(wb,'00_Resumen',summaryRows(evidence),[30,70]);
  addJsonSheet(wb,'01_Identificacion',sectionRows('S01'),[30,28,70,18]);
  addJsonSheet(wb,'02_Contexto',sectionRows('S02'),[30,28,70,18]);
  addJsonSheet(wb,'03_Poblacion',sectionRows('S03'),[30,28,70,18]);
  addJsonSheet(wb,'04_Evidencia',evidence,[10,28,55,20,38,42,16,18,50]);
  addJsonSheet(wb,'05_Situaciones',sectionRows('S05'),[30,28,75,18]);
  addJsonSheet(wb,'06_Prepara_Vester',prepRows(),[14,55,55,22,14,60]);
  addAoaSheet(wb,'07_Matriz_Vester',vesterMatrixAoa(),24);
  addJsonSheet(wb,'08_Result_Vester',vesterTotals(),[14,60,14,14,18,18,18]);
  addAoaSheet(wb,'09_Arbol_Problemas',treeVisualAoa('problem'),42);
  addJsonSheet(wb,'10_Nodos_Problema',problemTreeRows(),[14,20,65,18,55,55,14,18,20]);
  addJsonSheet(wb,'11_Relac_Problema',problemRelationRows(),[14,60,20,18,55,55,18]);
  addAoaSheet(wb,'12_Arbol_Objetivos',treeVisualAoa('objective'),42);
  addJsonSheet(wb,'13_Nodos_Objetivo',objectiveRows(),[14,20,65,60,18,55,14,18]);
  addJsonSheet(wb,'14_Relac_Objetivo',objectiveRelationRows(),[14,60,20,18,55,18]);
  addJsonSheet(wb,'15_Proyecto_Completo',allProjectRows(),[14,28,30,26,70,18]);
  addJsonSheet(wb,'16_Trazabilidad',traceRows(),[24,78,24,18]);

  const base=safeFilename(draft?.S01?.nombre_del_proyecto||'proyecto-cultural');
  XLSX.writeFile(wb,`${base}-formulacion-completa.xlsx`,{compression:true});
}
window.fcExportProjectWorkbook=exportWorkbook;
window.fcExportCompleteWorkbook=exportWorkbook;

interceptNav();
new MutationObserver(interceptNav).observe(document.body,{subtree:true,childList:true});
})();