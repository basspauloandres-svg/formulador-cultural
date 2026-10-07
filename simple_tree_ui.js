(()=>{
const TREE_KEY='formulador-cultural-problem-tree-v1';
const CV_KEY='formulador-cultural-causal-validation-v1';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let step='central',cursor=0,pendingRole=null;

function readTree(){try{return (typeof draft!=='undefined'&&draft?.S07?.tree_state)||JSON.parse(localStorage.getItem(TREE_KEY)||'{}')}catch{return {nodes:[]}}}
function readCv(){try{return (typeof draft!=='undefined'&&draft?.S06?.causal_validation)||JSON.parse(localStorage.getItem(CV_KEY)||'{}')}catch{return {pairs:[]}}}
function saveTree(s){s.updatedAt=new Date().toISOString();localStorage.setItem(TREE_KEY,JSON.stringify(s));try{if(typeof draft!=='undefined'){draft.S07=draft.S07||{};draft.S07.tree_state=s;localStorage.setItem(storeKey,JSON.stringify(draft))}}catch{}}
function central(s){return (s.nodes||[]).find(n=>n.zone==='central')||null}
function candidates(s){return (s.nodes||[]).filter(n=>!n.stale)}
function others(s){const c=central(s);return candidates(s).filter(n=>n.id!==c?.id)}
function cvRole(id){const v=(readCv().variables||[]).find(x=>x.id===id);return v?.role||''}
function pairHint(id,centralId){
  const p=(readCv().pairs||[]).find(x=>(x.aId===id&&x.bId===centralId)||(x.bId===id&&x.aId===centralId));
  if(!p||!p.decision||p.decision==='pending')return null;
  if(p.decision==='none')return {title:'Puede ir separada',text:'En la revisión anterior no apareció una relación clara con el problema principal.'};
  if(p.decision==='association'||p.decision==='indirect')return {title:'La relación existe, pero el orden no está claro',text:'Conviene decidir con cuidado si ocurre antes o después del problema principal.'};
  const nodeIsA=p.aId===id;
  if((p.decision==='a_to_b'&&nodeIsA)||(p.decision==='b_to_a'&&!nodeIsA))return {title:'Podría ir antes',text:'Tus respuestas anteriores sugieren que esta situación puede ayudar a explicar el problema principal.'};
  return {title:'Podría ir después',text:'Tus respuestas anteriores sugieren que esta situación puede aparecer como consecuencia del problema principal.'};
}
function centralSuggestion(n){
  const role=cvRole(n.id);
  if(role==='possible_central')return 'Esta situación apareció como buena candidata a problema principal.';
  if(role==='possible_effect')return 'Esta situación parecía más una consecuencia que el centro del problema.';
  if(role==='possible_cause')return 'Esta situación parecía más una causa que el centro del problema.';
  return 'Revisa si esta situación resume mejor que las demás lo que realmente quieres cambiar.';
}
function chooseCentral(id){
  const s=readTree();(s.nodes||[]).forEach(n=>{if(n.zone==='central')n.zone='outside'});
  const n=(s.nodes||[]).find(x=>x.id===id);if(!n)return;n.zone='central';n.parentId=null;n.reviewed=true;saveTree(s);step='roles';cursor=0;pendingRole=null;render();
}
function setRole(id,role){
  const s=readTree(),n=(s.nodes||[]).find(x=>x.id===id);if(!n)return;
  if(role==='outside'){n.zone='outside';n.parentId=null;n.reviewed=true;saveTree(s);cursor++;pendingRole=null;render();return}
  pendingRole=role;render();
}
function setDepth(id,direct){
  const s=readTree(),n=(s.nodes||[]).find(x=>x.id===id);if(!n)return;
  if(pendingRole==='cause')n.zone=direct?'direct_cause':'indirect_cause';
  if(pendingRole==='effect')n.zone=direct?'direct_effect':'indirect_effect';
  n.parentId=null;n.reviewed=true;saveTree(s);cursor++;pendingRole=null;render();
}
function summaryTree(s){
  const groups={
    causes:(s.nodes||[]).filter(n=>n.zone==='direct_cause'||n.zone==='indirect_cause'),
    central:(s.nodes||[]).filter(n=>n.zone==='central'),
    effects:(s.nodes||[]).filter(n=>n.zone==='direct_effect'||n.zone==='indirect_effect')
  };
  const block=(title,list)=>'<section class="st-summary-col"><h4>'+title+'</h4>'+(list.length?list.map(n=>'<article><strong>'+esc(n.text)+'</strong><small>'+({direct_cause:'Causa cercana',indirect_cause:'Causa anterior',direct_effect:'Efecto cercano',indirect_effect:'Efecto posterior',central:'Problema principal'}[n.zone]||'')+'</small></article>').join(''):'<p>Aún no hay elementos aquí.</p>')+'</section>';
  return '<div class="st-summary">'+block('Lo que ocurre antes',groups.causes)+block('Problema principal',groups.central)+block('Lo que ocurre después',groups.effects)+'</div>';
}
function renderCentral(root,s){
  const nodes=candidates(s);
  root.innerHTML='<div class="st-head"><strong>Primero: elige el problema principal</strong><p>Pregunta sencilla: ¿cuál situación resume mejor el problema que quieres cambiar?</p></div>'+
    '<div class="st-central-list">'+nodes.map(n=>'<article><strong>'+esc(n.text)+'</strong><p>'+esc(centralSuggestion(n))+'</p><button type="button" data-central="'+esc(n.id)+'">Elegir esta situación</button></article>').join('')+'</div>'+
    '<details class="st-help"><summary>¿Cómo elegir?</summary><p>Busca una situación concreta, negativa y observable. Evita elegir una solución que falta o una causa demasiado específica.</p></details>';
  root.querySelectorAll('[data-central]').forEach(b=>b.onclick=()=>chooseCentral(b.dataset.central));
}
function renderRole(root,s){
  const c=central(s),list=others(s);
  if(!c){step='central';render();return}
  if(cursor>=list.length){step='summary';render();return}
  const n=list[cursor],hint=pairHint(n.id,c.id);
  root.innerHTML='<div class="st-progress"><strong>Situación '+(cursor+1)+' de '+list.length+'</strong><span>Problema principal ya elegido</span></div>'+
    '<div class="st-central-ref"><small>Problema principal</small><strong>'+esc(c.text)+'</strong></div>'+
    '<div class="st-current"><small>Ahora revisa esta situación</small><strong>'+esc(n.text)+'</strong></div>'+
    (hint?'<div class="st-suggestion"><small>Sugerencia</small><strong>'+esc(hint.title)+'</strong><p>'+esc(hint.text)+'</p></div>':'')+
    (!pendingRole?
      '<div class="st-question">¿Esta situación ocurre antes o después del problema principal?</div>'+
      '<div class="st-options"><button type="button" data-role="cause">Ocurre antes y puede ayudar a explicarlo</button><button type="button" data-role="effect">Ocurre después como consecuencia</button><button type="button" data-role="outside">No está claro / dejar por revisar</button></div>'
      :
      '<div class="st-question">'+(pendingRole==='cause'?'¿Esta situación llega directamente al problema?':'¿Esta consecuencia aparece directamente después del problema?')+'</div>'+
      '<div class="st-options"><button type="button" data-depth="direct">Sí, de forma cercana</button><button type="button" data-depth="indirect">No, pasa por otra situación</button><button type="button" data-back-role="1">← Cambiar respuesta anterior</button></div>'
    )+
    '<div class="st-nav"><button type="button" id="stBack" '+(cursor===0?'disabled':'')+'>← Anterior</button><button type="button" id="stSkip">Dejar por revisar y seguir</button></div>';
  root.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>setRole(n.id,b.dataset.role));
  root.querySelectorAll('[data-depth]').forEach(b=>b.onclick=()=>setDepth(n.id,b.dataset.depth==='direct'));
  root.querySelector('[data-back-role]')?.addEventListener('click',()=>{pendingRole=null;render()});
  $('#stBack')&&($('#stBack').onclick=()=>{cursor=Math.max(0,cursor-1);pendingRole=null;render()});
  $('#stSkip')&&($('#stSkip').onclick=()=>setRole(n.id,'outside'));
}
function renderSummary(root,s){
  const nodes=s.nodes||[],hasCentral=nodes.some(n=>n.zone==='central'),causes=nodes.filter(n=>n.zone==='direct_cause'||n.zone==='indirect_cause').length,effects=nodes.filter(n=>n.zone==='direct_effect'||n.zone==='indirect_effect').length;
  const pendingMsg=!effects?'<div class="st-pending-note"><strong>Puedes continuar.</strong><p>Todavía no registraste efectos. El sistema los conservará como un punto por revisar; no inventará consecuencias para completar el árbol.</p></div>':'';
  root.innerHTML='<div class="st-head"><strong>Así quedó organizado tu árbol</strong><p>Revisa la lógica general. Puedes volver a cambiar cualquier decisión antes de continuar.</p></div>'+
    summaryTree(s)+pendingMsg+
    '<div class="st-summary-actions"><button type="button" id="stReviewAgain">Revisar de nuevo</button><button type="button" id="stContinue" class="primary" '+(hasCentral?'':'disabled')+'>Continuar al problema central</button></div>'+
    '<details class="st-help"><summary>¿Qué debería comprobar?</summary><p>Que las causas ocurran antes del problema y que los efectos aparezcan después. Si una relación no está clara, es mejor dejarla por revisar que inventarla.</p><p><strong>Estado:</strong> '+causes+' causa(s), '+effects+' efecto(s) y '+(hasCentral?'1 problema principal.':'ningún problema principal confirmado.')+'</p></details>';
  $('#stReviewAgain')&&($('#stReviewAgain').onclick=()=>{step='central';cursor=0;pendingRole=null;render()});
  $('#stContinue')&&($('#stContinue').onclick=async()=>{if(!hasCentral)return;saveTree(s);if(typeof window.fcNavigate==='function')await window.fcNavigate('S08');else{const nav=document.querySelector('#nav button[data-k="S08"]');nav?.click()}});
}
function render(){
  const root=$('#simpleTreeFlow');if(!root)return;
  const s=readTree();
  if(step==='central')renderCentral(root,s);
  else if(step==='roles')renderRole(root,s);
  else renderSummary(root,s);
}
function mount(){
  const counter=$('#counter');if(!counter?.textContent.startsWith('S07')){document.body.classList.remove('simple-tree-active');return}
  const wizard=$('#treeWizard');if(!wizard||$('#simpleTreeFlow'))return;
  document.body.classList.add('simple-tree-active');
  const technical=document.createElement('details');technical.className='st-technical';const sm=document.createElement('summary');sm.textContent='Ver detalle técnico';technical.appendChild(sm);
  wizard.parentNode.insertBefore(technical,wizard);technical.appendChild(wizard);
  const flow=document.createElement('section');flow.id='simpleTreeFlow';flow.className='simple-tree-flow';technical.parentNode.insertBefore(flow,technical);
  const s=readTree();step=central(s)?'roles':'central';cursor=0;pendingRole=null;render();
}
const style=document.createElement('style');
style.textContent='.simple-tree-flow{margin-top:8px;padding-top:8px}.st-head{padding:4px 2px 2px}.st-head strong{font-size:1.08rem;color:#10213a}.st-head p{font-size:.92rem}.st-pending-note{border:1px solid #eadc9b;background:#fff8df;border-radius:14px;padding:12px;margin:12px 0}.st-pending-note p{margin:4px 0;color:#655f4a;font-size:.86rem}.st-head p{margin:5px 0;color:var(--muted)}.st-central-list{display:grid;gap:9px;margin:12px 0}.st-central-list article,.st-current,.st-central-ref,.st-suggestion,.st-summary-col{border:1px solid #dbe6df;border-radius:16px;padding:14px;background:#fff;box-shadow:0 4px 14px rgba(16,33,58,.035)}.st-central-list article p,.st-suggestion p{margin:5px 0;color:#586470;font-size:.88rem}.st-central-list button,.st-options button,.st-nav button,.st-summary-actions button{border:1px solid #c9d8d0;background:#fff;border-radius:12px;padding:10px 12px;font:inherit;color:#245a43}.st-central-list button:hover,.st-options button:hover{background:#f4fbf7}.st-summary-actions .primary{background:linear-gradient(180deg,#23845b,#176b49)!important;color:#fff!important;border-color:#176b49!important;box-shadow:0 5px 14px rgba(23,107,73,.16)}.st-progress{display:flex;justify-content:space-between;gap:10px;color:#586470;font-size:.86rem;margin-bottom:10px}.st-central-ref{background:#f3faf6;margin-bottom:8px;border-color:#d3e7da}.st-current{margin-bottom:8px}.st-central-ref small,.st-current small,.st-suggestion small,.st-summary-col article small{display:block;color:var(--muted);margin-bottom:5px}.st-central-ref strong,.st-current strong{display:block;line-height:1.35}.st-suggestion{background:#f4fbf7;border-color:#cfe4d8;margin-bottom:10px}.st-question{font-size:1.05rem;font-weight:750;margin:15px 0 10px}.st-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.st-options button{text-align:left}.st-options button:last-child:nth-child(odd){grid-column:1/-1}.st-nav{display:flex;justify-content:space-between;gap:8px;margin:14px 0}.st-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:12px 0}.st-summary-col h4{margin:0 0 8px;color:#10213a;font-size:1rem}.st-summary-col article{border-top:1px solid var(--line);padding:8px 0}.st-summary-col article:first-of-type{border-top:0}.st-summary-col p{color:var(--muted);font-size:.86rem}.st-summary-actions{display:flex;justify-content:flex-end;gap:8px}.st-summary-actions .primary{background:linear-gradient(180deg,#23845b,#176b49);color:#fff;border-color:#176b49}.st-help,.st-technical{margin-top:12px}.st-help summary,.st-technical summary{cursor:pointer;color:#356a55;font-size:.88rem}.st-technical #treeWizard{margin-top:10px}@media(max-width:720px){.st-options,.st-summary{grid-template-columns:1fr}.st-options button:last-child:nth-child(odd){grid-column:auto}.st-progress,.st-nav,.st-summary-actions{display:grid}.st-nav button,.st-summary-actions button{width:100%}}';
document.head.appendChild(style);
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true,characterData:true});
mount();
})();