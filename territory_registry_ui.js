/* S01: valida el lugar declarado contra DIVIPOLA; nunca altera lo escrito. */
(()=>{
'use strict';
const API='https://formulador-cultural-api.onrender.com/territory/resolve';
const styles=document.createElement('style');
styles.textContent='.vt-territory-check{margin-top:8px;padding:10px;border-left:3px solid #86a899;background:#f6faf8;color:#34584b;font-size:.87rem;line-height:1.4;border-radius:5px}.vt-territory-check a{color:#145c45;text-decoration:underline}.vt-territory-check[hidden]{display:none}';
document.head.appendChild(styles);
let lastContext='',latestResult=null,serial=0,debounce;
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
 let area=document.querySelector('#fields #vtDivipolaStatus');
 if(!area){
   area=document.createElement('div');area.id='vtDivipolaStatus';area.className='vt-territory-check';area.hidden=true;
   area.setAttribute('role','status');
   city.closest('.field')?.appendChild(area);
 }
 if(city.dataset.divipolaBound)return;
 city.dataset.divipolaBound='true';
 const schedule=()=>{
   clearTimeout(debounce);
   const current=++serial;
   const input=city.value.trim();
   const department=dept.value.trim();
   const context=input+(department?', '+department:'');
   if(!input){area.hidden=true;lastContext='';latestResult=null;return}
   if(context===lastContext&&latestResult){renderResult(area,latestResult);return}
   area.hidden=true;
   const isCurrent=()=>current===serial&&city.isConnected&&active==='S01'&&
     city.value.trim()===input&&dept.value.trim()===department;
   debounce=setTimeout(async()=>{
     try{
       const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({context})});
       if(!response.ok)throw Error('remote registry unavailable');
       const data=await response.json();
       if(!isCurrent())return;
       lastContext=context;latestResult=data;
       renderResult(area,data);
     }catch{
       if(!isCurrent())return;
       renderResult(area,{status:'REGISTRY_UNAVAILABLE'});
     }
   },550);
 };
 city.addEventListener('change',schedule);
 dept.addEventListener('change',schedule);
 city.addEventListener('input',schedule);
 dept.addEventListener('input',schedule);
 city.addEventListener('blur',schedule);
 dept.addEventListener('blur',schedule);
 if(city.value.trim())schedule();
}
new MutationObserver(mount).observe(document.getElementById('fields')||document.body,
  {childList:true,subtree:true});
mount();
})();
