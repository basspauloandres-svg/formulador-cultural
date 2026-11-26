/* S01: valida el lugar declarado contra DIVIPOLA; nunca altera lo escrito. */
(()=>{
'use strict';
const API='https://formulador-cultural-api.onrender.com/territory/resolve';
const styles=document.createElement('style');
styles.textContent='.vt-territory-check{margin-top:8px;padding:10px;border-left:3px solid #86a899;background:#f6faf8;color:#34584b;font-size:.87rem;line-height:1.4;border-radius:5px}.vt-territory-check a{color:#145c45;text-decoration:underline}.vt-territory-check[hidden]{display:none}';
document.head.appendChild(styles);
let lastContext='',latestResult=null,serial=0,debounce,catalogPromise=null;
function loadCatalog(){
 if(!catalogPromise)catalogPromise=fetch(API.replace('/territory/resolve','/territory/catalog'),{method:'POST'}).then(async r=>{if(!r.ok)throw Error('catalog');const data=await r.json();if(!Array.isArray(data.territorios)||data.territorios.length!==data.count||!data.territorios.length||data.territorios.some(t=>!/^\d{5}$/.test(t.codigo)))throw Error('invalid catalog');return data;}).catch(e=>{catalogPromise=null;throw e});
 return catalogPromise;
}
function renderResult(area,data){
 area.replaceChildren();
 const line=document.createElement('div');
 const source=document.createElement('a');
 source.href='https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w';
 source.target='_blank';source.rel='noopener noreferrer';source.textContent='Fuente: DIVIPOLA/DANE';
 if(data.status==='FOUND' && data.identity){
   const item=data.identity;
   line.textContent='Identificación administrativa: '+item.municipality+', '+item.department+
     ' · Código '+item.divipola+' · Tipo: '+item.territory_type+'. ';
   area.append(line,source);
 }else if(data.status==='AMBIGUOUS_MUNICIPALITY'){
   line.textContent='Este nombre corresponde a varios territorios. Indica el departamento en S01: '+
     (data.candidates||[]).slice(0,5).map(x=>x.municipality+' ('+x.department+')').join('; ')+'.';
   area.append(line,source);
 }else if(data.status==='NOT_FOUND'){
   line.textContent='No se halló una coincidencia exacta. Comprueba municipio y departamento. La información ingresada se conserva.';
   area.append(line,source);
 }else if(data.status==='REGISTRY_UNAVAILABLE'){
   line.textContent='El catálogo DIVIPOLA no respondió. La identificación permanece pendiente; tu texto se conserva.';
   area.append(line);
 }else{
   line.textContent='Completa el municipio para contrastarlo con DIVIPOLA.';
   area.append(line);
 }
 area.hidden=false;
}
function mount(){
 if(typeof active==='undefined'||active!=='S01')return;
 const city=document.querySelector('#fields textarea[data-field="municipio"]');
 const dept=document.querySelector('#fields textarea[data-field="departamento"]');
 if(!city||!dept)return;
 let area=document.querySelector('#fields .vt-territory-check');
 if(!area){
   area=document.createElement('div');area.className='vt-territory-check';area.hidden=true;
   area.setAttribute('role','status');
   city.closest('.field')?.appendChild(area);
 }
 if(city.dataset.divipolaBound)return;
 city.dataset.divipolaBound='true';
 const picker=document.createElement('div');picker.className='vt-territory-picker';
 const load=document.createElement('button');load.type='button';load.textContent='Seleccionar en catálogo nacional';
 const select=document.createElement('select');select.hidden=true;select.setAttribute('aria-label','Municipio o distrito y departamento');
 const meta=document.createElement('p');meta.setAttribute('role','status');
 picker.append(load,select,meta);city.closest('.field')?.appendChild(picker);
 let catalog=null;
 load.onclick=async()=>{
  load.disabled=true;meta.textContent='Cargando catálogo oficial DIVIPOLA…';
  try{
   catalog=await loadCatalog();
   if(!city.isConnected)return;
   select.replaceChildren(new Option('Selecciona municipio y departamento',''));
   for(const t of [...catalog.territorios].sort((a,b)=>(a.departamento+' '+a.nombre).localeCompare(b.departamento+' '+b.nombre,'es'))){
    select.append(new Option(t.nombre+' · '+t.departamento+' ('+t.codigo+')',t.codigo));
   }
   const chosen=draft.S01?.territory_selection;
   if(chosen?.context===city.value.trim()+(dept.value.trim()?', '+dept.value.trim():''))select.value=chosen.codigo;
   select.hidden=false;meta.textContent=catalog.count+' territorios · '+catalog.dataset+' · corte '+catalog.cutoff+' · actualización '+catalog.data_updated;
  }catch{if(city.isConnected)meta.textContent='Catálogo no disponible. Puedes conservar o escribir el municipio manualmente.';}
  finally{load.disabled=false;}
 };
 select.onchange=()=>{
  const t=catalog?.territorios.find(x=>x.codigo===select.value);if(!t||!city.isConnected)return;
  city.value=t.nombre;dept.value=t.departamento;
  for(const el of [city,dept]){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  draft.S01=draft.S01||{};
  draft.S01.territory_selection={codigo:t.codigo,context:t.nombre+', '+t.departamento,dataset:catalog.dataset,cutoff:catalog.cutoff,data_updated:catalog.data_updated,snapshot_sha256:catalog.snapshot_sha256};
  renderResult(area,{status:'FOUND',identity:{municipality:t.nombre,department:t.departamento,divipola:t.codigo,territory_type:t.tipo}});
  document.getElementById('save')?.click();
 };
 const schedule=()=>{
   clearTimeout(debounce);
   const input=city.value.trim();
   const department=dept.value.trim();
   const context=input+(department?', '+department:'');
   if(!input){area.hidden=true;lastContext='';latestResult=null;return}
   if(context===lastContext&&latestResult){renderResult(area,latestResult);return}
   const current=++serial;
   debounce=setTimeout(async()=>{
     try{
       const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({context})});
       if(!response.ok)throw Error('remote registry unavailable');
       const data=await response.json();
       if(current!==serial||typeof active==='undefined'||active!=='S01'||
          city.value.trim()!==input||dept.value.trim()!==department)return;
       lastContext=context;latestResult=data;
       renderResult(area,data);
     }catch{
       if(current!==serial)return;
       renderResult(area,{status:'REGISTRY_UNAVAILABLE'});
     }
   },550);
 };
 city.addEventListener('change',schedule);
 dept.addEventListener('change',schedule);
 city.addEventListener('blur',schedule);
 dept.addEventListener('blur',schedule);
 if(city.value.trim())schedule();
}
new MutationObserver(mount).observe(document.getElementById('fields')||document.body,
  {childList:true,subtree:true});
mount();
})();