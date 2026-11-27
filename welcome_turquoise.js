/* Progressive welcome. No model calls, automatic interpretation or cloud writes. */
(()=>{
 const welcome=document.getElementById('vtWelcome');
 if(!welcome)return;
 const $=id=>document.getElementById(id);
 const idea=$('vtIdea'),start=$('vtStart'),status=$('vtWelcomeStatus');
 const sessionKey='vt-welcome-entered-v1';
 const ownData=()=>{
  try {
   const evidence=JSON.parse(localStorage.getItem('vt-staging-evidence-v1')||'[]');
   if(evidence.length>0)return true;
   const projectId=window.fcLocalProjectId?.();
   const project=projectId&&window.fcLocalProjects?.().find(item=>item.id===projectId);
   if(project)return project.sections>0;
   const stored=JSON.parse(localStorage.getItem('formulador-cultural-prototipo-v1')||'{}');
   const hasContent=v=>typeof v==='string'?!!v.trim():Array.isArray(v)?v.some(hasContent):v&&typeof v==='object'?Object.entries(v).some(([k,x])=>!['updatedAt','createdAt','version','status','confirmed'].includes(k)&&hasContent(x)):typeof v==='number'&&v!==0;
   return Object.entries(stored).some(([key,value])=>/^S(?:0[1-9]|1[0-6])$/.test(key)&&hasContent(value));
  } catch {return true}
 };
 const setMode=()=>{const existing=ownData();$('vtNewIdea').hidden=existing;$('vtExistingDraft').hidden=!existing;return existing};
 const refresh=()=>{$('vtIdeaCount').textContent=idea.value.length+'/1800';start.disabled=!idea.value.trim()};
 function open(){
  // Preserve current fields without creating or clearing any project.
  try{if(typeof dirty!=='undefined'&&dirty&&typeof saveLocal==='function')saveLocal()}catch{status.textContent='No fue posible guardar los cambios. Regresa al proyecto para revisarlos.';return}
  status.textContent='';setMode();welcome.hidden=false;document.body.classList.add('vt-welcome-open');
  window.scrollTo(0,0);$('vtWelcomeTitle').focus({preventScroll:true});
 }
 function enter(){
  welcome.hidden=true;document.body.classList.remove('vt-welcome-open');
  try{sessionStorage.setItem(sessionKey,'1')}catch{}
  window.scrollTo(0,0);
 }
 function resume(){enter();$('title')?.setAttribute('tabindex','-1');$('title')?.focus({preventScroll:true})}
 idea.addEventListener('input',refresh);
 welcome.querySelectorAll('[data-vt-example]').forEach(button=>button.addEventListener('click',()=>{
  idea.value=button.dataset.vtExample;refresh();idea.focus();
 }));
 $('vtContinueTop').addEventListener('click',resume);
 $('vtResume').addEventListener('click',resume);
 start.addEventListener('click',async()=>{
  const text=idea.value.trim();if(!text)return;
  if(ownData()){setMode();status.textContent='Ya existe un borrador. Continúa el proyecto para conservar tus respuestas.';return}
  start.disabled=true;
  try{
   enter();
   if(typeof window.fcNavigate==='function')await window.fcNavigate('S01');
   const field=document.querySelector('#fields [data-field="idea_inicial_usuario"]');
   if(!field||field.value.trim())throw Error('No se pudo incorporar la idea de manera segura.');
   field.value=text;
   field.dispatchEvent(new Event('input',{bubbles:true}));
   saveLocal();
   $('title')?.setAttribute('tabindex','-1');$('title')?.focus({preventScroll:true});
  }catch{welcome.hidden=false;document.body.classList.add('vt-welcome-open');status.textContent='No fue posible incorporar la idea. Tu texto sigue aquí; puedes abrir el espacio y revisar el borrador.';setMode()}
  finally{refresh()}
 });
 const brand=document.querySelector('.hero.app-brand');
 if(brand){const home=document.createElement('button');home.type='button';home.className='vt-home-button';home.textContent='← Inicio de VÉRTICE';home.addEventListener('click',open);brand.append(home)}
 refresh();
 let entered=false;try{entered=sessionStorage.getItem(sessionKey)==='1'}catch{}
 if(!entered)open();
})();
