"""Strict, staging-only frontend transformations; fail closed on candidate drift."""
import re

def replace_once(source, old, new):
    if source.count(old) != 1:
        raise RuntimeError("Staging transform anchor missing or ambiguous")
    return source.replace(old, new, 1)

def auth_only_app(source):
    source = replace_once(source,
        "const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);",
        """const stageAuthClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{
 auth:{storageKey:'vt-staging-auth-v1',detectSessionInUrl:false},
 global:{fetch:(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url||String(input));
  const method=String(init?.method||input?.method||'GET').toUpperCase();
  const grant=url.searchParams.get('grant_type');
  const allowed=(url.pathname==='/auth/v1/token'&&method==='POST'&&['password','refresh_token'].includes(grant))
   ||(url.pathname==='/auth/v1/user'&&method==='GET')
   ||(url.pathname==='/auth/v1/logout'&&method==='POST'&&url.searchParams.get('scope')==='local');
  if(url.origin!==SUPABASE_URL||!allowed)return Promise.reject(new Error('Operación de nube no permitida en el ensayo.'));
  return fetch(input,{...init,redirect:'error'});
 }}
});
const sb=stageAuthClient?Object.freeze({auth:stageAuthClient.auth}):null;
let stagingSession=null;""")
    # Keep the candidate's session variable null so every original cloud
    # persistence path remains disabled. Its assistants use sb.auth directly.
    start=source.index("function renderAuth(){")
    end=source.index("async function listCloudProjects()",start)
    source=source[:start]+"""function renderAuth(){
 const out=q('#authSignedOut'),inside=q('#authSignedIn');
 out.classList.toggle('hidden',!!stagingSession);inside.classList.toggle('hidden',!stagingSession);
 q('#userLabel').textContent=stagingSession?'Cuenta autenticada para IA':'';
 q('#authHelp').textContent=stagingSession?'IA autenticada. El proyecto se guarda exclusivamente en este navegador.':'Puedes formular sin cuenta; entra con tu cuenta existente para consultar la IA.';
}
"""+source[end:]
    start=source.index("async function initAuth(){")
    end=source.index("function render(){",start)
    source=source[:start]+"""async function initAuth(){
 if(!sb){q('#authHelp').textContent='Acceso a IA no disponible. Puedes formular localmente.';return}
 const {data}=await sb.auth.getSession();stagingSession=data?.session||null;renderAuth();
 sb.auth.onAuthStateChange((_event,newSession)=>{stagingSession=newSession;renderAuth()});
}
"""+source[end:]
    start=source.index("async function save(){")
    end=source.index("async function loadCloud(){",start)
    source=source[:start]+"async function save(){saveLocal();}\n"+source[end:]
    source=replace_once(source,"await sb.auth.signOut();session=null;cloudProject=null;renderAuth();","await sb.auth.signOut({scope:'local'});stagingSession=null;session=null;cloudProject=null;renderAuth();")
    source=replace_once(source,"q('#loginBtn').onclick=sendMagicLink;q('#passwordLoginBtn').onclick=passwordLogin;q('#signupBtn').onclick=signupWithPassword;q('#setPasswordBtn').onclick=setPassword;",
        "q('#loginBtn').disabled=true;q('#passwordLoginBtn').onclick=passwordLogin;q('#signupBtn').disabled=true;q('#setPasswordBtn').disabled=true;")
    start=source.index("q('#syncBtn').onclick=")
    end=source.index("window.addEventListener('beforeunload'",start)
    source=source[:start]+"q('#syncBtn').disabled=true;"+source[end:]
    return source

def local_evidence(source):
    source=replace_once(source,"const client=typeof sb!=='undefined'?sb:null;","const client=null;")
    source=replace_once(source,"let evidenceSession=null,evidenceProject=null,rendering=false,evidenceCache=[];",
        """const localEvidenceKey='vt-staging-evidence-v1';
let evidenceSession=true,evidenceProject=null,rendering=false,evidenceCache=JSON.parse(localStorage.getItem(localEvidenceKey)||'[]');
function persistEvidence(){localStorage.setItem(localEvidenceKey,JSON.stringify(evidenceCache))}""")
    start=source.index("async function fetchEvidenceRecords(){")
    end=source.index("async function loadEvidence(){",start)
    source=source[:start]+"async function fetchEvidenceRecords(){return evidenceCache.slice()}\n"+source[end:]
    source=replace_once(source,"note.textContent='La evidencia se guarda en la nube y queda asociada al proyecto autenticado.';try{const p=await currentProject();if(!p){list.innerHTML='<p class=\"evidence-empty\">Primero guarda o sincroniza el proyecto.</p>';return;}const data=await fetchEvidenceRecords();",
        "note.textContent='Registro de evidencia del ensayo, guardado exclusivamente en este navegador.';try{const data=await fetchEvidenceRecords();")
    source=replace_once(source,"const p=await currentProject();if(!p)throw new Error('Guarda o sincroniza primero el proyecto.');const status=",
        "const p={id:window.fcLocalProjectId?.()||'local-staging'};const status=")
    source=replace_once(source,"const {error}=await client.from('evidence').insert(payload);if(error)throw error;",
        """if(payload.source_url&&!/^https?:\\/\\//i.test(payload.source_url))throw new Error('Usa una URL HTTP o HTTPS.');
payload.id=crypto.randomUUID();payload.created_at=new Date().toISOString();evidenceCache.unshift(payload);persistEvidence();""")
    source=replace_once(source,"const {error}=await client.from('evidence').delete().eq('id',id);if(error){$('#evidenceAuthNote').textContent=`No fue posible eliminar: ${error.message}`;return;}",
        "evidenceCache=evidenceCache.filter(r=>r.id!==id);persistEvidence();")
    start=source.index("async function init(){")
    end=source.index("window.fcGetEvidenceRecords=",start)
    source=source[:start]+"""async function init(){new MutationObserver(()=>inject()).observe(document.body,{subtree:true,childList:true,characterData:true});inject();}
"""+source[end:]
    return source
