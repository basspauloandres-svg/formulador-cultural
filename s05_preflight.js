(()=>{
const PREP_KEY='formulador-cultural-vester-prep-v2';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function norm(v){return String(v||'').trim().replace(/^([\-•*]|\d+[.)]|[A-Za-z][.)])\s*/,'').trim()}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return 'p'+(h>>>0).toString(36)}
function rawProblems(){
  const raw=typeof draft!=='undefined'?draft.S05?.situaciones_observables||'':'';
  const lines=String(raw).split(/\n+/).map(norm).filter(Boolean);
  return [...new Map(lines.map(t=>[t.toLowerCase(),t])).values()];
}
function signature(){return rawProblems().join('|')}
function classify(text){
  const t=text.toLowerCase();
  if(/\[por verificar\]/i.test(text))return {status:'verify',reason:'La formulación indica que falta verificación.'};
  if(/^(reforzar|fortalecer|mejorar|implementar|crear|realizar|desarrollar|capacitar|formar|acompañar|dotar|adecuar|contratar)\b/i.test(t)||/\b(talleres?|capacitaci[oó]n|estrategia|programa|soluci[oó]n)\b/i.test(t))return {status:'reformulate',reason:'Parece describir una acción, intervención o solución.'};
  if(/\b(disminuci[oó]n|aumento|reducci[oó]n|incremento|descenso|crecimiento|deterioro)\b/i.test(t))return {status:'verify',reason:'Expresa una variación o tendencia que requiere respaldo.'};
  if(text.length<18)return {status:'reformulate',reason:'La formulación es demasiado breve para compararla con precisión.'};
  return {status:'ready',reason:'Parece expresar una condición problemática comparable. Confirma esta clasificación.'};
}
function load(){
  try{return (typeof draft!=='undefined'&&draft.S05?.vester_preparation_v2)||JSON.parse(localStorage.getItem(PREP_KEY)||'{}')}catch{return {}}
}
function save(s){
  localStorage.setItem(PREP_KEY,JSON.stringify(s));
  if(typeof draft!=='undefined'){
    draft.S05=draft.S05||{};
    draft.S05.vester_preparation_v2=s;
    localStorage.setItem(storeKey,JSON.stringify(draft));
  }
}
function build(force=false){
  const sig=signature(),old=load();
  if(!force&&old?.sourceSignature===sig&&Array.isArray(old.items))return old;
  const prior=new Map((old?.items||[]).map(x=>[x.sourceText,x]));
  const items=rawProblems().map((text,i)=>{
    const p=prior.get(text);if(p)return {...p,index:i+1};
    const c=classify(text);
    return {id:hash(text),index:i+1,sourceText:text,text,status:c.status,reason:c.reason,confirmed:false};
  });
  const s={sourceSignature:sig,items,updatedAt:new Date().toISOString()};save(s);return s;
}
function counts(s){const o={ready:0,reformulate:0,verify:0,exclude:0,confirmed:0};(s.items||[]).forEach(x=>{o[x.status]=(o[x.status]||0)+1;if(x.status==='ready'&&x.confirmed)o.confirmed++});return o}
function persistAndRender(mutator){const s=build();mutator(s);s.updatedAt=new Date().toISOString();save(s);render(true)}
function render(force=false){
  const counter=$('#counter'),fields=$('#fields');
  if(!counter||!fields||!counter.textContent.startsWith('S05'))return;
  const sig=signature();
  let host=$('#vesterPrepV2');
  if(host&&!force&&host.dataset.signature===sig)return;
  if(!host){host=document.createElement('section');host.id='vesterPrepV2';host.className='vester-prep';fields.appendChild(host)}
  host.dataset.signature=sig;
  const s=build(),c=counts(s),n=s.items.length;
  const canContinue=c.confirmed>=2;
  host.innerHTML=`<div class="vester-prep-head"><div><strong>Preparar variables para Vester</strong><p>Este paso convierte las situaciones de S05 en variables comparables. Vester necesita al menos <b>dos</b> variables confirmadas.</p></div><button type="button" id="prepRefreshV2">Revisar de nuevo</button></div>
  <div class="prep-summary"><span>${n} situación(es) detectada(s)</span><span>${c.confirmed} confirmada(s)</span><span>${c.reformulate} por reformular</span><span>${c.verify} por verificar</span><span>${c.exclude} excluida(s)</span></div>
  ${n<2?`<div class="vester-warning"><strong>Falta al menos una situación problemática adicional.</strong><p>En “Situaciones observables” se detectó ${n}. Escribe cada problema como una entrada independiente, preferiblemente una por línea. No conviene fabricar nuevas variables únicamente para completar Vester.</p></div>`:''}
  <div class="prep-list">${s.items.map(x=>`<article class="prep-item"><div class="prep-index">P${x.index}</div><div class="prep-main"><div class="prep-original"><small>Entrada de S05</small><div>${esc(x.sourceText)}</div></div><label>Formulación que entrará a Vester<textarea data-prep-text-v2="${x.id}">${esc(x.text)}</textarea></label><div class="prep-reason">${esc(x.reason||'')}</div><div class="prep-actions"><select data-prep-status-v2="${x.id}"><option value="ready" ${x.status==='ready'?'selected':''}>Lista para Vester</option><option value="reformulate" ${x.status==='reformulate'?'selected':''}>Reformular</option><option value="verify" ${x.status==='verify'?'selected':''}>[POR VERIFICAR]</option><option value="exclude" ${x.status==='exclude'?'selected':''}>Excluir</option></select><button type="button" data-confirm-prep-v2="${x.id}" ${x.status!=='ready'?'disabled':''}>${x.confirmed?'Confirmada ✓':'Confirmar variable'}</button></div></div></article>`).join('')}</div>
  <div class="prep-rule"><strong>Cómo avanzar</strong><p>1. Separa en S05 las situaciones problemáticas. 2. Revisa su redacción aquí. 3. Confirma al menos dos como “Lista para Vester”. 4. Pulsa “Continuar a Vester”.</p></div>
  <button type="button" id="prepGoVester" class="primary" ${canContinue?'':'disabled'}>Continuar a Vester →</button>`;
  $('#prepRefreshV2').onclick=()=>{build(true);render(true)};
  host.querySelectorAll('[data-prep-text-v2]').forEach(el=>el.onchange=()=>persistAndRender(st=>{const item=st.items.find(x=>x.id===el.dataset.prepTextV2);if(!item)return;item.text=el.value.trim();item.confirmed=false;const c2=classify(item.text);item.status=c2.status;item.reason=c2.reason}));
  host.querySelectorAll('[data-prep-status-v2]').forEach(el=>el.onchange=()=>persistAndRender(st=>{const item=st.items.find(x=>x.id===el.dataset.prepStatusV2);if(!item)return;item.status=el.value;item.confirmed=false;item.reason=el.value==='ready'?'Clasificada por el usuario como variable problemática comparable.':item.reason}));
  host.querySelectorAll('[data-confirm-prep-v2]').forEach(btn=>btn.onclick=()=>persistAndRender(st=>{const item=st.items.find(x=>x.id===btn.dataset.confirmPrepV2);if(!item||item.status!=='ready')return;if(!item.text.trim())return;item.confirmed=true;item.reason='Confirmada por el usuario como variable problemática comparable.'}));
  $('#prepGoVester').onclick=()=>{if(!canContinue)return;if(typeof window.fcNavigate==='function')window.fcNavigate('S06');else document.querySelector('#nav button[data-k="S06"]')?.click()};
}
window.fcGetVesterPreparedProblems=()=>{const s=build();return (s.items||[]).filter(x=>x.status==='ready'&&x.confirmed&&x.text.trim()).map(x=>({id:hash(x.text.trim()),text:x.text.trim(),sourceText:x.sourceText,status:x.status}))};
window.fcVesterPreparationStatus=()=>{const s=build();return counts(s)};
const observer=new MutationObserver(()=>render(false));
observer.observe(document.body,{subtree:true,childList:true});
render(true);
})();
