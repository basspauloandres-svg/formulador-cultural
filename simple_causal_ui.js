(()=>{
const KEY='formulador-cultural-causal-validation-v1';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let cursor=0;
function read(){
  let local={variables:[],pairs:[]};try{local=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
  const cloud=(typeof draft!=='undefined'&&draft?.S06?.causal_validation)||null;
  if(!cloud)return local;
  const lt=Date.parse(local.updatedAt||0)||0,ct=Date.parse(cloud.updatedAt||0)||0;
  const chosen=ct>=lt?JSON.parse(JSON.stringify(cloud)):local;
  if(ct>=lt)localStorage.setItem(KEY,JSON.stringify(chosen));
  return chosen
}
function write(s){
  s.updatedAt=new Date().toISOString();
  localStorage.setItem(KEY,JSON.stringify(s));
  try{
    if(typeof draft!=='undefined'){
      draft.S06=draft.S06||{};
      draft.S06.causal_validation=s;
      localStorage.setItem(storeKey,JSON.stringify(draft));
    }
  }catch{}
}
function normalize(s){
  s.variables=(s.variables||[]).map(v=>({...v,status:v.status==='excluded'?'excluded':'confirmed'}));
  s.pairs=s.pairs||[];
  cursor=Math.max(0,Math.min(cursor,Math.max(0,s.pairs.length-1)));
  write(s);
  return s;
}
function suggest(p){
  if(!Number.isInteger(p?.ab)||!Number.isInteger(p?.ba))return {decision:'pending',title:'Todavía falta información',text:'Termina primero las comparaciones del paso anterior.'};
  const d=p.ab-p.ba;
  if(p.ab===0&&p.ba===0)return {decision:'none',title:'Parece que pueden ir separadas',text:'Tus respuestas no muestran una relación clara entre estas dos situaciones.'};
  if(d>=2&&p.ab>=2)return {decision:'a_to_b',title:'A podría ayudar a explicar B',text:'Tus respuestas sugieren que A puede ocurrir antes o provocar cambios en B.'};
  if(d<=-2&&p.ba>=2)return {decision:'b_to_a',title:'B podría ayudar a explicar A',text:'Tus respuestas sugieren que B puede ocurrir antes o provocar cambios en A.'};
  if(p.ab>=2&&p.ba>=2)return {decision:'association',title:'Están muy relacionadas, pero el orden no es claro',text:'Conviene no forzar todavía cuál va primero.'};
  if(Math.abs(d)<=1)return {decision:'association',title:'Todavía no está claro cuál va primero',text:'Las respuestas son parecidas en ambas direcciones.'};
  return {decision:'association',title:'Puede haber relación, pero conviene revisarla',text:'La diferencia no es suficiente para decidir con seguridad cuál va primero.'};
}
function label(v){
  return {
    a_to_b:'A ayuda a explicar B',
    b_to_a:'B ayuda a explicar A',
    association:'Se relacionan, pero no sé cuál va primero',
    indirect:'Se relacionan, pero no sé cuál va primero',
    none:'No veo una relación clara',
    pending:'Dejar por revisar'
  }[v]||'Dejar por revisar';
}
function saveDecision(key,value){
  const s=normalize(read());
  const p=(s.pairs||[]).find(x=>x.key===key);
  if(!p)return;
  p.decision=value;
  write(s);
  render();
}
function saveNote(key,value){
  const s=normalize(read());
  const p=(s.pairs||[]).find(x=>x.key===key);
  if(!p)return;
  p.note=String(value||'').trim();
  write(s);
}
function render(){
  const root=$('#simpleCausalFlow');if(!root)return;
  const s=normalize(read()),pairs=s.pairs||[];
  if(!pairs.length){root.innerHTML='<div class="sc-empty">Primero termina las comparaciones anteriores.</div>';return}
  const p=pairs[cursor],sg=suggest(p),current=p.decision==='indirect'?'association':(p.decision||'pending');
  const answered=pairs.filter(x=>x.decision&&x.decision!=='pending').length;
  const options=['a_to_b','b_to_a','association','none','pending'];
  root.innerHTML=
    '<div class="sc-progress"><strong>'+answered+' de '+pairs.length+' relaciones revisadas</strong><span>Relación '+(cursor+1)+' de '+pairs.length+'</span></div>'+
    '<div class="sc-pair">'+
      '<article><small>Situación A</small><strong>'+esc(p.aText)+'</strong></article>'+
      '<article><small>Situación B</small><strong>'+esc(p.bText)+'</strong></article>'+
    '</div>'+
    '<div class="sc-question">¿Cuál opción describe mejor lo que ves?</div>'+
    '<div class="sc-suggestion"><small>Sugerencia</small><strong>'+esc(sg.title)+'</strong><p>'+esc(sg.text)+'</p>'+
      (sg.decision!=='pending'?'<button type="button" data-suggest="'+esc(p.key)+'" data-value="'+sg.decision+'">Usar esta sugerencia</button>':'')+
    '</div>'+
    '<div class="sc-options">'+options.map(v=>'<button type="button" class="'+(current===v?'selected':'')+'" data-answer="'+esc(p.key)+'" data-value="'+v+'">'+esc(label(v))+'</button>').join('')+'</div>'+
    '<details class="sc-note"><summary>Quiero explicar mi respuesta</summary><textarea data-note="'+esc(p.key)+'" placeholder="Una frase corta es suficiente.">'+esc(p.note||'')+'</textarea></details>'+
    '<div class="sc-nav"><button type="button" id="scPrev" '+(cursor===0?'disabled':'')+'>← Anterior</button><button type="button" id="scNext" '+(cursor===pairs.length-1?'disabled':'')+'>Siguiente →</button></div>'+
    '<button type="button" id="scContinue" class="sc-continue">Continuar al árbol</button>';
  root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>saveDecision(b.dataset.answer,b.dataset.value));
  root.querySelectorAll('[data-suggest]').forEach(b=>b.onclick=()=>saveDecision(b.dataset.suggest,b.dataset.value));
  root.querySelectorAll('[data-note]').forEach(t=>t.onchange=()=>saveNote(t.dataset.note,t.value));
  $('#scPrev')&&($('#scPrev').onclick=()=>{cursor=Math.max(0,cursor-1);render()});
  $('#scNext')&&($('#scNext').onclick=()=>{cursor=Math.min(pairs.length-1,cursor+1);render()});
  $('#scContinue')&&($('#scContinue').onclick=()=>{write(normalize(read()));if(typeof window.fcNavigate==='function')window.fcNavigate('S07')});
}
function mount(){
  const root=$('#causalValidation');
  if(!root||$('#simpleCausalFlow'))return;
  document.body.classList.add('causal-simple-active');
  const h=root.querySelector('h3');if(h)h.textContent='Revisar relaciones';
  const p=h?.nextElementSibling;if(p&&p.tagName==='P')p.textContent='Ya hiciste las comparaciones. Ahora revisa una relación a la vez. La herramienta te da una sugerencia y tú decides.';
  root.querySelectorAll('.dg-overall,.dg-readiness,.dg-advice').forEach(x=>x.style.display='none');
  const body=$('#causalValidationBody');
  if(!body)return;
  const flow=document.createElement('div');flow.id='simpleCausalFlow';root.insertBefore(flow,body);
  const prior=document.createElement('details');prior.className='sc-prior';const priorSummary=document.createElement('summary');priorSummary.textContent='Ver respuestas anteriores';prior.appendChild(priorSummary);const vw=document.querySelector('#vesterWizard');if(vw){root.parentNode.insertBefore(prior,root);prior.appendChild(vw)}
  const details=document.createElement('details');details.className='sc-technical';const summary=document.createElement('summary');summary.textContent='Ver detalle técnico';details.appendChild(summary);root.insertBefore(details,body);details.appendChild(body);details.addEventListener('toggle',()=>{body.style.display=details.open?'block':'none'});body.style.display='none';
  normalize(read());render();
}
const style=document.createElement('style');
style.textContent=
'body.causal-simple-active #causalValidationBody{display:none!important}body.causal-simple-active .sc-technical[open] #causalValidationBody{display:block!important}body.causal-simple-active .dg-overall,body.causal-simple-active .dg-readiness,body.causal-simple-active .dg-advice{display:none!important}.sc-prior{margin:10px 0 14px}.sc-prior summary{cursor:pointer;color:#596673;font-size:.86rem}.sc-prior #vesterWizard{margin-top:10px}.sc-progress{display:flex;justify-content:space-between;gap:10px;margin:12px 0;color:#586470;font-size:.86rem}.sc-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sc-pair article{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}.sc-pair small,.sc-suggestion small{display:block;color:var(--muted);margin-bottom:5px}.sc-pair strong{display:block;line-height:1.35}.sc-question{font-size:1.05rem;font-weight:750;margin:16px 0 10px}.sc-suggestion{border:1px solid #bfd0df;background:#f7fbff;border-radius:12px;padding:11px 12px;margin-bottom:10px}.sc-suggestion p{margin:5px 0;color:#586470;font-size:.88rem}.sc-suggestion button{margin-top:5px;border:1px solid #9fb0bf;background:#fff;border-radius:9px;padding:8px 10px;font:inherit}.sc-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sc-options button{border:1px solid #aeb8c2;background:#fff;border-radius:10px;padding:10px;font:inherit;text-align:left}.sc-options button.selected{border-color:#1f2933;background:#f0f3f6;font-weight:750}.sc-note,.sc-technical{margin-top:12px}.sc-note summary,.sc-technical summary{cursor:pointer;color:#596673;font-size:.86rem}.sc-note textarea{width:100%;min-height:64px;margin-top:8px;border:1px solid #b8c2cc;border-radius:9px;padding:9px;font:inherit}.sc-nav{display:flex;justify-content:space-between;gap:8px;margin:14px 0}.sc-nav button,.sc-continue{border:1px solid #aeb8c2;background:#fff;border-radius:9px;padding:9px 11px;font:inherit}.sc-continue{background:var(--ink);color:#fff;border-color:var(--ink);float:right}.sc-technical{clear:both;padding-top:12px}.sc-empty{padding:12px;border:1px solid var(--line);border-radius:10px}@media(max-width:700px){.sc-pair,.sc-options{grid-template-columns:1fr}.sc-progress,.sc-nav{display:grid}.sc-nav button,.sc-continue{width:100%;float:none}}';
document.head.appendChild(style);
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});
mount();
})();