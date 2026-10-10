const sections={
S01:{title:'Identificación general',question:'¿Qué proyecto quieres construir y dónde se desarrollará?',meaning:'Ubica el proyecto: nombre, territorio, entidad, responsables y duración preliminar.',fields:[['nombre_del_proyecto','Nombre del proyecto',1],['entidad_u_organizacion','Entidad u organización'],['pais','País'],['departamento','Departamento'],['municipio','Municipio'],['institucion_o_sede','Institución o sede'],['responsable','Responsable'],['sector_o_campo_cultural','Sector o campo cultural'],['duracion_preliminar','Duración preliminar']]},
S02:{title:'Contexto territorial, cultural y social',question:'¿Qué características del territorio y de la comunidad ayudan a comprender el proyecto?',meaning:'Describe el territorio y el proceso cultural antes de explicar el problema.',fields:[['territorio_o_lugar_de_intervencion','Territorio o lugar de intervención',1],['caracteristicas_culturales','Características culturales'],['principales_dinamicas_sociales','Principales dinámicas sociales'],['antecedentes','Antecedentes']]},
S03:{title:'Población',question:'¿Quiénes participan o son atendidos por el proyecto?',meaning:'Diferencia población atendida, participantes y otros grupos pertinentes sin inventar cifras.',fields:[['poblacion_afectada','Población atendida',1],['poblacion_participante','Población participante'],['caracterizacion','Caracterización'],['cantidad_estimada','Cantidad estimada']]},
S04:{title:'Evidencia',question:'¿Qué datos, hechos o fuentes respaldan la necesidad identificada?',meaning:'Separa evidencia disponible, origen de la información y vacíos por verificar.',fields:[['evidencia_disponible','Evidencia disponible',1],['fuentes','Fuentes'],['datos_por_verificar','Datos por verificar'],['observaciones','Observaciones']]},
S05:{title:'Situaciones problemáticas',question:'¿Qué situaciones observables expresan el problema en el territorio o población?',meaning:'Registra situaciones concretas y diferenciadas antes de ordenar sus relaciones.',fields:[['situaciones_observables','Situaciones observables',1],['descripcion','Descripción'],['evidencia_asociada','Evidencia asociada'],['prioridad_preliminar','Prioridad preliminar']]},
S06:{title:'Matriz Vester',question:'¿Qué situaciones influyen directamente sobre otras y con qué intensidad?',meaning:'Vester organiza juicios de influencia. La valoración 0–3 corresponde a decisión humana y requiere justificación.',fields:[['variables_vester','Variables Vester',1],['relaciones_causales','Relaciones causales'],['valoracion_0_3','Valoración 0–3'],['justificacion','Justificación']]},
S07:{title:'Árbol de problemas',question:'¿Cuáles son las causas, el problema central y sus efectos?',meaning:'Organiza causas, problema y efectos manteniendo la lógica causal identificada y la revisión humana.',fields:[['causas_indirectas','Causas indirectas',1],['causas_directas','Causas directas'],['problema_central','Problema central'],['efectos_directos','Efectos directos'],['efectos_indirectos','Efectos indirectos']]},
S08:{title:'Problema central',question:'¿Cómo expresarías el problema principal de manera concreta y verificable?',meaning:'Describe una condición negativa existente sin anticipar la solución.',fields:[['enunciado','Enunciado del problema',1],['poblacion_afectada','Población atendida'],['evidencia_soporte','Evidencia soporte'],['alcance','Alcance']]}
};

const SUPABASE_URL='https://rmaevwlxcuqimxdzxdmq.supabase.co';
const SUPABASE_KEY='sb_publishable_YYXIMlsNUfi5RhZfhevMJw_6DovU9RK';
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
const order=Object.keys(sections);
let active=localStorage.getItem('fc_active')||'S01';
const storeKey='formulador-cultural-prototipo-v1';
const syncMetaKey='formulador-cultural-sync-meta-v1';
const cloudProjectKey='formulador-cultural-cloud-project-v1';
const draft=JSON.parse(localStorage.getItem(storeKey)||'{}');
const syncMeta=JSON.parse(localStorage.getItem(syncMetaKey)||'{}');
let dirty=false,session=null,cloudProject=null,loginCooldownTimer=null;const sectionSyncQueues={};
const q=s=>document.querySelector(s);

function guide(label){return [`¿Qué información concreta corresponde a «${label}»?`,`¿Qué datos están confirmados?`,`¿Qué falta por verificar?`]}
function shortTitle(t){return t.replace('Identificación general','Identificación').replace('Contexto territorial, cultural y social','Contexto').replace('Situaciones problemáticas','Situaciones').replace('Matriz Vester','Vester').replace('Árbol de problemas','Árbol').replace('Problema central','Problema')}
function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function collect(){draft[active]=draft[active]||{};document.querySelectorAll('[data-field]').forEach(el=>draft[active][el.dataset.field]=el.value)}
function saveSyncMeta(){localStorage.setItem(syncMetaKey,JSON.stringify(syncMeta))}
function metaFor(code){syncMeta[code]=syncMeta[code]||{};return syncMeta[code]}
function markLocalUpdate(code=active,at=new Date().toISOString()){metaFor(code).localUpdatedAt=at;saveSyncMeta()}
function nestedUpdatedAt(code){const d=draft[code]||{};const values=[d.vester_state?.updatedAt,d.tree_state?.updatedAt,d.objectives_state?.updatedAt,d.causal_validation?.updatedAt,d.vester_preparation?.updatedAt,d.vester_preparation_v2?.updatedAt,d.completion_state?.updatedAt,d.results_state?.updatedAt,d.schedule_state?.updatedAt,d.budget_state?.updatedAt,d.risk_state?.updatedAt,d.review_state?.updatedAt].filter(Boolean).map(Date.parse).filter(Number.isFinite);return values.length?new Date(Math.max(...values)).toISOString():null}
function effectiveLocalUpdatedAt(code){const m=metaFor(code),nested=nestedUpdatedAt(code);const times=[m.localUpdatedAt,nested].filter(Boolean).map(Date.parse).filter(Number.isFinite);return times.length?new Date(Math.max(...times)).toISOString():null}
function meaningful(v){if(v===null||v===undefined)return false;if(typeof v==='string')return v.trim()!=='';if(Array.isArray(v))return v.some(meaningful);if(typeof v==='object')return Object.values(v).some(meaningful);return true}
function mergeLegacy(remote,local){const out={...(remote||{})};for(const [k,v] of Object.entries(local||{})){if(meaningful(v))out[k]=v}return out}
function setSaved(ok,cloud=false){const dot=q('#savedDot');if(dot){dot.classList.toggle('ok',ok&&!cloud);dot.classList.toggle('cloud',ok&&cloud)}}
function setStatus(text,cloud=false){q('#status').innerHTML=`<span class="saved-dot ${cloud?'cloud':'ok'}" id="savedDot"></span>${text}`}
function saveLocal(){collect();if(dirty)markLocalUpdate(active);localStorage.setItem(storeKey,JSON.stringify(draft));dirty=false;setSaved(true,false);setStatus(`Borrador de ${active} guardado en este navegador.`)}
function authValues(){return {email:q('#email')?.value.trim()||'',password:q('#password')?.value||''}}
function validateCredentials(){const {email,password}=authValues();if(!email){q('#authHelp').textContent='Escribe un correo válido.';return null}if(password.length<8){q('#authHelp').textContent='La contraseña debe tener al menos 8 caracteres.';return null}return {email,password}}
function startLoginCooldown(seconds=60){const btn=q('#loginBtn');if(loginCooldownTimer)clearInterval(loginCooldownTimer);let remaining=seconds;btn.disabled=true;btn.textContent=`Espera ${remaining} s`;loginCooldownTimer=setInterval(()=>{remaining-=1;if(remaining<=0){clearInterval(loginCooldownTimer);loginCooldownTimer=null;btn.disabled=false;btn.textContent='Enviar enlace de acceso';return}btn.textContent=`Espera ${remaining} s`},1000)}

async function ensureProject(){
  if(!session||!sb)return null;
  if(cloudProject)return cloudProject;
  const remembered=localStorage.getItem(cloudProjectKey);
  if(remembered){
    const found=await sb.from('projects').select('*').eq('id',remembered).maybeSingle();
    if(!found.error&&found.data){cloudProject=found.data;return cloudProject}
  }
  const recentSection=await sb.from('sections').select('project_id,updated_at').order('updated_at',{ascending:false}).limit(1);
  if(!recentSection.error&&recentSection.data?.length){
    const pid=recentSection.data[0].project_id;
    const found=await sb.from('projects').select('*').eq('id',pid).single();
    if(!found.error&&found.data){cloudProject=found.data;localStorage.setItem(cloudProjectKey,pid);return cloudProject}
  }
  const {data,error}=await sb.from('projects').select('*').order('updated_at',{ascending:false}).limit(1);
  if(error)throw error;
  if(data?.length){cloudProject=data[0];localStorage.setItem(cloudProjectKey,cloudProject.id);return cloudProject}
  const title=draft.S01?.nombre_del_proyecto?.trim()||'Proyecto cultural';
  const created=await sb.from('projects').insert({title}).select().single();
  if(created.error)throw created.error;
  cloudProject=created.data;localStorage.setItem(cloudProjectKey,cloudProject.id);return cloudProject
}
function queueSectionSync(code=active){
  const prior=sectionSyncQueues[code]||Promise.resolve();
  const next=prior.catch(()=>{}).then(()=>syncSection(code));
  sectionSyncQueues[code]=next.finally(()=>{if(sectionSyncQueues[code]===next)sectionSyncQueues[code]=null});
  return next
}
window.fcQueueSectionSync=queueSectionSync;
async function syncSection(code=active){if(!session||!sb)return false;if(code===active)collect();const project=await ensureProject();const candidate=draft[code]||{};const canonical=v=>{if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'};const existing=await sb.from('sections').select('data').eq('project_id',project.id).eq('code',code).maybeSingle();if(existing.error)throw existing.error;if(existing.data&&canonical(existing.data.data||{})===canonical(candidate))return true;const now=new Date().toISOString();const payload={project_id:project.id,code,data:candidate,updated_at:now};const {error}=await sb.from('sections').upsert(payload,{onConflict:'project_id,code'});if(error)throw error;const m=metaFor(code);m.lastSyncedAt=now;m.cloudUpdatedAt=now;if(!m.localUpdatedAt)m.localUpdatedAt=nestedUpdatedAt(code)||now;saveSyncMeta();const title=draft.S01?.nombre_del_proyecto?.trim();if(title&&title!==project.title){await sb.from('projects').update({title,updated_at:now}).eq('id',project.id);project.title=title}return true}
async function save(){saveLocal();if(!session){setStatus(`Borrador de ${active} guardado localmente. Inicia sesión para sincronizar.`);return}try{await syncSection(active);setStatus(`${active} guardada y sincronizada en la nube.`,true)}catch(e){console.error(e);setStatus(`Guardado local correcto. La sincronización falló: ${e.message||'error desconocido'}`)}}
async function loadCloud(){if(!session||!sb)return;try{const project=await ensureProject();renderAuth();const {data,error}=await sb.from('sections').select('code,data,updated_at').eq('project_id',project.id);if(error)throw error;let keptLocal=0,loadedCloud=0,legacyProtected=0;for(const row of data||[]){const code=row.code,local=draft[code]||{},remote=row.data||{},m=metaFor(code),remoteTs=Date.parse(row.updated_at||0)||0,localIso=effectiveLocalUpdatedAt(code),localTs=Date.parse(localIso||0)||0,lastSyncTs=Date.parse(m.lastSyncedAt||0)||0;const localHas=meaningful(local);const remoteHas=meaningful(remote);const hasHistory=!!(m.localUpdatedAt||m.lastSyncedAt||m.cloudUpdatedAt);if(!localHas&&remoteHas){draft[code]=remote;m.localUpdatedAt=row.updated_at||new Date().toISOString();m.lastSyncedAt=row.updated_at||null;m.cloudUpdatedAt=row.updated_at||null;loadedCloud+=1;continue}if(localHas&&!hasHistory){draft[code]=mergeLegacy(remote,local);const now=new Date().toISOString();m.localUpdatedAt=now;m.cloudUpdatedAt=row.updated_at||null;legacyProtected+=1;continue}const localChanged=localTs>lastSyncTs;const remoteKnownTs=Date.parse(m.cloudUpdatedAt||0)||0;const cloudChanged=remoteTs>remoteKnownTs;if(localChanged&&cloudChanged){if(localTs>=remoteTs){keptLocal+=1}else{draft[code]={...local,...remote};m.localUpdatedAt=row.updated_at||new Date().toISOString();m.lastSyncedAt=row.updated_at||null;loadedCloud+=1}}else if(localChanged){keptLocal+=1}else{draft[code]={...local,...remote};m.localUpdatedAt=row.updated_at||m.localUpdatedAt||new Date().toISOString();m.lastSyncedAt=row.updated_at||m.lastSyncedAt||null;loadedCloud+=1}m.cloudUpdatedAt=row.updated_at||m.cloudUpdatedAt||null}localStorage.setItem(storeKey,JSON.stringify(draft));saveSyncMeta();render();const notes=[];if(loadedCloud)notes.push(`${loadedCloud} sección(es) actualizadas desde la nube`);if(keptLocal)notes.push(`${keptLocal} sección(es) locales más recientes conservadas`);if(legacyProtected)notes.push(`${legacyProtected} sección(es) de pruebas anteriores protegidas`);setStatus(`Proyecto «${project.title}» reconciliado. ${notes.join(' · ')||'Sin cambios.'}`,true)}catch(e){console.error(e);setStatus(`No fue posible cargar la nube: ${e.message||'error desconocido'}`)}}

function renderAuth(){const out=q('#authSignedOut'),inside=q('#authSignedIn');if(session){out.classList.add('hidden');inside.classList.remove('hidden');q('#userLabel').textContent=session.user.email||'Sesión activa';q('#authHelp').textContent=cloudProject?`Proyecto activo: ${cloudProject.title}`:'Sesión activa. Recuperando tu proyecto…';queueMicrotask(()=>renderProjectControls())}else{inside.classList.add('hidden');out.classList.remove('hidden');q('#projectManager')?.remove();if(!/límite|contraseña|correo|cuenta|credenciales|registrado/i.test(q('#authHelp').textContent))q('#authHelp').textContent='Puedes entrar con correo y contraseña. El enlace por correo queda como alternativa.'}}


async function listCloudProjects(){
  if(!session||!sb)return [];
  const {data,error}=await sb.from('projects').select('id,title,created_at,updated_at').order('updated_at',{ascending:false});
  if(error)throw error;
  return data||[];
}
function clearLocalProjectState(){
  for(const key of Object.keys(draft))delete draft[key];
  for(const key of Object.keys(syncMeta))delete syncMeta[key];
  localStorage.setItem(storeKey,JSON.stringify(draft));
  localStorage.setItem(syncMetaKey,JSON.stringify(syncMeta));
  for(let i=localStorage.length-1;i>=0;i--){
    const k=localStorage.key(i);
    if(k&&k.startsWith('formulador-cultural-')&&![storeKey,syncMetaKey,cloudProjectKey].includes(k))localStorage.removeItem(k);
  }
  active='S01';localStorage.setItem('fc_active',active);
}
async function switchCloudProject(projectId){
  if(!session||!sb||!projectId)return;
  const found=await sb.from('projects').select('*').eq('id',projectId).single();
  if(found.error)throw found.error;
  clearLocalProjectState();
  window.fcResetProjectModules?.();
  cloudProject=found.data;
  localStorage.setItem(cloudProjectKey,cloudProject.id);
  renderAuth();
  await loadCloud();
}
async function createCloudProject(){
  if(!session||!sb)return;
  const title=prompt('Nombre del nuevo proyecto:','Nuevo proyecto cultural');
  if(title===null)return;
  const name=title.trim();
  if(!name){q('#authHelp').textContent='Escribe un nombre para crear el proyecto.';return}
  const created=await sb.from('projects').insert({title:name}).select().single();
  if(created.error)throw created.error;
  clearLocalProjectState();
  cloudProject=created.data;
  localStorage.setItem(cloudProjectKey,cloudProject.id);
  draft.S01={nombre_del_proyecto:name};
  markLocalUpdate('S01');
  localStorage.setItem(storeKey,JSON.stringify(draft));
  await syncSection('S01');
  renderAuth();render();
  setStatus('Proyecto nuevo creado y separado del proyecto anterior.',true);
}
async function renderProjectControls(){
  const inside=q('#authSignedIn');if(!inside||!session)return;
  let host=q('#projectManager');
  if(!host){host=document.createElement('div');host.id='projectManager';host.className='project-manager';inside.appendChild(host)}
  host.innerHTML='<button id="newProjectBtn" type="button">Nuevo proyecto</button><button id="reloadCloudProjectBtn" type="button">Recargar desde nube</button><label class="project-switch-label">Mis proyectos <select id="projectSelect" aria-label="Seleccionar proyecto"><option>Cargando…</option></select></label>';
  q('#newProjectBtn').onclick=async()=>{try{await createCloudProject();await renderProjectControls()}catch(e){console.error(e);q('#authHelp').textContent='No fue posible crear el proyecto: '+(e.message||'error desconocido')}};
  q('#reloadCloudProjectBtn').onclick=async()=>{if(!cloudProject)return;const ok=confirm('Recargar desde nube reemplazará el estado local de este proyecto por la última versión sincronizada. Úsalo para recuperar el estado guardado en la nube. ¿Continuar?');if(!ok)return;try{await switchCloudProject(cloudProject.id);await renderProjectControls();q('#authHelp').textContent='Proyecto recargado desde la última versión sincronizada en la nube.'}catch(e){console.error(e);q('#authHelp').textContent='No fue posible recargar desde nube: '+(e.message||'error desconocido')}};
  try{
    const projects=await listCloudProjects(),select=q('#projectSelect');
    select.innerHTML=projects.map(p=>'<option value="'+esc(p.id)+'" '+(cloudProject?.id===p.id?'selected':'')+'>'+esc(p.title)+'</option>').join('');
    if(!projects.length)select.innerHTML='<option value="">Sin proyectos</option>';
    select.onchange=async()=>{if(!select.value||select.value===cloudProject?.id)return;try{await switchCloudProject(select.value);await renderProjectControls()}catch(e){console.error(e);q('#authHelp').textContent='No fue posible cambiar de proyecto: '+(e.message||'error desconocido')}};
  }catch(e){console.error(e);host.insertAdjacentHTML('beforeend','<span>No fue posible cargar la lista de proyectos.</span>')}
}
window.fcListCloudProjects=listCloudProjects;
window.fcCreateCloudProject=createCloudProject;
window.fcSwitchCloudProject=switchCloudProject;

async function passwordLogin(){const creds=validateCredentials();if(!creds)return;q('#passwordLoginBtn').disabled=true;q('#authHelp').textContent='Iniciando sesión…';const {error}=await sb.auth.signInWithPassword(creds);q('#passwordLoginBtn').disabled=false;if(error){q('#authHelp').textContent=`No fue posible iniciar sesión: ${error.message}`;return}q('#authHelp').textContent='Sesión iniciada correctamente.'}
async function signupWithPassword(){const creds=validateCredentials();if(!creds)return;q('#signupBtn').disabled=true;q('#authHelp').textContent='Creando cuenta…';const redirectTo=location.origin+location.pathname;const {data,error}=await sb.auth.signUp({...creds,options:{emailRedirectTo:redirectTo}});q('#signupBtn').disabled=false;if(error){const msg=error.message||'';if(/rate limit|too many/i.test(msg)){q('#authHelp').textContent='Supabase alcanzó temporalmente el límite de correos de confirmación. La cuenta no puede completarse hasta que se libere el envío de email.'}else if(/already registered|already exists|user.*exists/i.test(msg)){q('#authHelp').textContent='Ese correo ya está registrado. Usa “Entrar con contraseña” si ya definiste una; si tu cuenta se creó con enlace de acceso, no debes crearla otra vez.'}else{q('#authHelp').textContent=`No fue posible crear la cuenta: ${msg}`}return}if(data?.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){q('#authHelp').textContent='Ese correo ya está registrado. “Crear cuenta” es únicamente para correos nuevos. Usa el método de acceso de la cuenta existente.';return}q('#authHelp').textContent=data?.session?'Cuenta creada y sesión iniciada.':'Cuenta nueva creada. Revisa el correo de confirmación antes del primer ingreso.'}
async function setPassword(){const next=prompt('Escribe una nueva contraseña de al menos 8 caracteres:');if(next===null)return;if(next.length<8){q('#authHelp').textContent='La contraseña debe tener al menos 8 caracteres.';return}const {error}=await sb.auth.updateUser({password:next});q('#authHelp').textContent=error?`No fue posible actualizar la contraseña: ${error.message}`:'Contraseña actualizada. En adelante puedes entrar sin solicitar un enlace por correo.'}
async function sendMagicLink(){const email=q('#email').value.trim();if(!email){q('#authHelp').textContent='Escribe un correo válido.';return}q('#loginBtn').disabled=true;q('#authHelp').textContent='Enviando enlace de acceso…';const redirectTo=location.origin+location.pathname;const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});if(error){const rateLimited=/rate limit|too many/i.test(error.message||'');if(rateLimited){q('#authHelp').textContent='Se alcanzó temporalmente el límite de correos. Usa contraseña si ya la definiste o espera antes de solicitar otro enlace.';startLoginCooldown(60)}else{q('#loginBtn').disabled=false;q('#authHelp').textContent=`No se pudo enviar: ${error.message}`}return}q('#authHelp').textContent='Enlace enviado. Revisa tu correo y evita solicitar otro mientras llega este mensaje.';startLoginCooldown(60)}

async function initAuth(){if(!sb){q('#authHelp').textContent='Conexión de nube no disponible.';return}const {data}=await sb.auth.getSession();session=data.session;renderAuth();if(session)await loadCloud();sb.auth.onAuthStateChange(async(_event,newSession)=>{session=newSession;cloudProject=null;renderAuth();if(session)await loadCloud()})}
function render(){document.body.classList.add('guided-mode');const s=sections[active],idx=order.indexOf(active);localStorage.setItem('fc_active',active);q('#counter').textContent=`${active} · ${idx+1} de ${order.length}`;q('#title').textContent=s.title;q('#question').textContent=s.question;q('#meaning').textContent=s.meaning;q('#progressBar').style.width=`${((idx+1)/order.length)*100}%`;q('#nav').innerHTML=order.map(k=>`<button data-k="${k}" class="${k===active?'active':''}">${k} · ${shortTitle(sections[k].title)}</button>`).join('');q('#nav .active')?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{collect();active=b.dataset.k;render();q('#panel').scrollIntoView({behavior:'smooth',block:'start'})});const d=draft[active]||{};q('#fields').innerHTML=s.fields.map(([id,label,req])=>`<div class="field"><label for="${id}">${label} ${req?'<span class="required">· requerido</span>':''}</label><div class="help">Registre información pertinente y mantenga explícitos los vacíos.</div><details class="guide"><summary>Preguntas orientadoras</summary><ul class="questions">${guide(label).map(x=>`<li>${x}</li>`).join('')}</ul></details><textarea id="${id}" data-field="${id}" placeholder="Escriba aquí o use [POR VERIFICAR] cuando corresponda.">${esc(d[id]||'')}</textarea></div>`).join('');document.querySelectorAll('[data-field]').forEach(el=>{el.addEventListener('input',()=>{dirty=true;setSaved(false)});el.addEventListener('blur',()=>{if(dirty)saveLocal()})});['#prev','#mPrev'].forEach(sel=>q(sel).disabled=idx===0);['#next','#mNext'].forEach(sel=>q(sel).disabled=idx===order.length-1);setSaved(true,false)}
function move(delta){collect();const idx=Math.max(0,Math.min(order.length-1,order.indexOf(active)+delta));active=order[idx];render();q('#panel').scrollIntoView({behavior:'smooth',block:'start'})}

q('#save').onclick=save;q('#mSave').onclick=save;q('#next').onclick=()=>move(1);q('#mNext').onclick=()=>move(1);q('#prev').onclick=()=>move(-1);q('#mPrev').onclick=()=>move(-1);q('#clear').onclick=()=>{if(confirm(`¿Limpiar los campos de ${active}?`)){draft[active]={};markLocalUpdate(active);localStorage.setItem(storeKey,JSON.stringify(draft));render()}};q('#loginBtn').onclick=sendMagicLink;q('#passwordLoginBtn').onclick=passwordLogin;q('#signupBtn').onclick=signupWithPassword;q('#setPasswordBtn').onclick=setPassword;q('#logoutBtn').onclick=async()=>{await sb.auth.signOut();session=null;cloudProject=null;renderAuth();setStatus('Sesión cerrada. El borrador local permanece en este navegador.')};q('#syncBtn').onclick=async()=>{try{saveLocal();for(const code of order){if(draft[code])await syncSection(code)}setStatus('Proyecto completo sincronizado en la nube.',true)}catch(e){setStatus(`Sincronización incompleta: ${e.message||'error desconocido'}`)}};window.addEventListener('beforeunload',()=>{if(dirty)saveLocal()});render();initAuth();