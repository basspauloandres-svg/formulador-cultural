(()=>{
const VESTER_KEY='formulador-cultural-vester-v1';
const TREE_KEY='formulador-cultural-problem-tree-v1';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}

function vesterData(){
  const s=read(VESTER_KEY), ps=s.selected||[], rel=s.relations||{};
  const rows=ps.map(p=>({id:p.id,text:p.text,influence:0,dependence:0}));
  const byId=new Map(rows.map(r=>[r.id,r]));
  let answered=0,total=0;
  for(let i=0;i<ps.length;i++)for(let j=0;j<ps.length;j++){
    if(i===j)continue; total++;
    const r=rel[`${ps[i].id}>${ps[j].id}`];
    if(Number.isInteger(r?.score)){
      answered++;
      byId.get(ps[i].id).influence+=r.score;
      byId.get(ps[j].id).dependence+=r.score;
    }
  }
  const meanI=rows.length?rows.reduce((a,r)=>a+r.influence,0)/rows.length:0;
  const meanD=rows.length?rows.reduce((a,r)=>a+r.dependence,0)/rows.length:0;
  rows.forEach(r=>{const hi=r.influence>=meanI,hd=r.dependence>=meanD;r.quadrant=hi&&hd?'critical':hi&&!hd?'active':!hi&&hd?'passive':'indifferent'});
  return {rows,meanI,meanD,answered,total,max:Math.max(3,3*Math.max(1,ps.length-1))};
}

function quadrantName(q){return {critical:'Crítico',active:'Activo',passive:'Pasivo',indifferent:'Indiferente'}[q]||''}

function vesterChartHtml(){
  const d=vesterData();
  if(d.rows.length<2)return `<div class="viz-empty"><strong>Aún no hay suficientes problemas seleccionados.</strong><p>Selecciona al menos dos problemas en Vester para construir el gráfico.</p></div>`;
  if(!d.answered)return `<div class="viz-empty"><strong>Aún no hay valoraciones.</strong><p>Cuando registres valores 0–3, el gráfico mostrará la posición relativa de cada problema.</p></div>`;
  const W=1000,H=650,L=110,R=50,T=55,B=100,pw=W-L-R,ph=H-T-B;
  const x=v=>L+(Math.max(0,Math.min(d.max,v))/d.max)*pw;
  const y=v=>T+ph-(Math.max(0,Math.min(d.max,v))/d.max)*ph;
  const mx=x(d.meanD),my=y(d.meanI);
  const ticks=[]; for(let n=0;n<=d.max;n+=Math.max(1,Math.ceil(d.max/6)))ticks.push(n); if(ticks[ticks.length-1]!==d.max)ticks.push(d.max);
  const points=d.rows.map((r,i)=>`<g class="viz-point ${r.quadrant}"><circle cx="${x(r.dependence)}" cy="${y(r.influence)}" r="18"></circle><text x="${x(r.dependence)}" y="${y(r.influence)+6}" text-anchor="middle">P${i+1}</text></g>`).join('');
  return `<div class="viz-explain"><strong>Gráfico influencia–dependencia</strong><p>${d.answered===d.total?'Resultados calculados con todas las comparaciones.':'Vista provisional: faltan '+(d.total-d.answered)+' comparaciones.'} El eje horizontal representa dependencia y el vertical influencia. Las líneas discontinuas corresponden a los promedios del conjunto.</p></div><div class="vester-plot-wrap"><svg class="vester-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de influencia y dependencia de la matriz Vester"><rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="plot-bg"></rect><line x1="${mx}" y1="${T}" x2="${mx}" y2="${T+ph}" class="mean-line"></line><line x1="${L}" y1="${my}" x2="${L+pw}" y2="${my}" class="mean-line"></line><text x="${L+18}" y="${T+28}" class="quad-label">Activo</text><text x="${L+pw-18}" y="${T+28}" text-anchor="end" class="quad-label">Crítico</text><text x="${L+18}" y="${T+ph-18}" class="quad-label">Indiferente</text><text x="${L+pw-18}" y="${T+ph-18}" text-anchor="end" class="quad-label">Pasivo</text>${ticks.map(n=>`<line x1="${x(n)}" y1="${T+ph}" x2="${x(n)}" y2="${T+ph+8}" class="axis"></line><text x="${x(n)}" y="${T+ph+30}" text-anchor="middle" class="tick">${n}</text><line x1="${L-8}" y1="${y(n)}" x2="${L}" y2="${y(n)}" class="axis"></line><text x="${L-18}" y="${y(n)+6}" text-anchor="end" class="tick">${n}</text>`).join('')}<line x1="${L}" y1="${T+ph}" x2="${L+pw}" y2="${T+ph}" class="axis"></line><line x1="${L}" y1="${T}" x2="${L}" y2="${T+ph}" class="axis"></line><text x="${L+pw/2}" y="${H-25}" text-anchor="middle" class="axis-title">Dependencia →</text><text x="28" y="${T+ph/2}" text-anchor="middle" transform="rotate(-90 28 ${T+ph/2})" class="axis-title">Influencia →</text>${points}</svg></div><div class="viz-legend">${d.rows.map((r,i)=>`<div><span class="legend-id">P${i+1}</span><span class="legend-text">${esc(r.text)}</span><span class="legend-values">I ${r.influence} · D ${r.dependence} · ${quadrantName(r.quadrant)}</span></div>`).join('')}</div><div class="viz-method"><strong>Cómo leerlo</strong><p>Un punto situado más arriba acumula mayor influencia según tus valoraciones; un punto más a la derecha acumula mayor dependencia. Esta posición organiza juicios registrados en la matriz y no demuestra causalidad.</p></div>`;
}

function treeState(){return read(TREE_KEY)}
const zoneLabels={indirect_effect:'Efectos indirectos',direct_effect:'Efectos directos',central:'Problema central',direct_cause:'Causas directas',indirect_cause:'Causas indirectas'};
function treeDiagramHtml(){
  const s=treeState(),nodes=s.nodes||[];
  if(!nodes.length)return `<div class="viz-empty"><strong>El árbol todavía no tiene elementos.</strong><p>Ubica problemas en S07 y vuelve a abrir el diagrama.</p></div>`;
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const zones=['indirect_effect','direct_effect','central','direct_cause','indirect_cause'];
  const level=(z)=>{
    const list=nodes.filter(n=>n.zone===z);
    return `<section class="tree-diagram-level ${z}"><div class="tree-level-label">${zoneLabels[z]}</div><div class="tree-diagram-nodes">${list.length?list.map(n=>{const parent=n.parentId?byId.get(n.parentId):null;return `<article class="tree-diagram-node"><strong>${esc(n.text)}</strong>${n.justification?`<p>${esc(n.justification)}</p>`:''}${parent?`<small>Conecta con: ${esc(parent.text)}</small>`:''}${(z==='indirect_cause'||z==='indirect_effect')&&!parent?'<small class="missing-link">Conexión [POR VERIFICAR]</small>':''}</article>`}).join(''):`<div class="tree-diagram-empty">Sin elementos</div>`}</div></section>`;
  };
  return `<div class="viz-explain"><strong>Diagrama del árbol de problemas</strong><p>La lectura va desde las causas en la parte inferior hacia el problema central y luego hacia los efectos. La ubicación representa una organización metodológica confirmada por el usuario, no una causalidad demostrada.</p></div><div class="tree-diagram">${zones.map((z,i)=>`${level(z)}${i<zones.length-1?'<div class="tree-flow-arrow" aria-hidden="true">↑</div>':''}`).join('')}</div><div class="viz-method"><strong>Qué revisar visualmente</strong><p>Busca cadenas comprensibles: causas indirectas conectadas con causas directas, un problema central específico y efectos que se desprendan de él. Los vacíos o saltos lógicos pueden volver a editarse en el modo paso a paso.</p></div>`;
}

function ensureVester(){
  const wizard=$('#vesterWizard'); if(!wizard)return;
  const actions=wizard.querySelector('.vester-actions'); if(!actions)return;
  if(!wizard.querySelector('#showVesterGraph')){
    const b=document.createElement('button'); b.type='button'; b.id='showVesterGraph'; b.textContent='Ver gráfico';
    actions.appendChild(b);
    b.onclick=()=>{let panel=wizard.querySelector('#vesterGraphPanel');if(!panel){panel=document.createElement('section');panel.id='vesterGraphPanel';panel.className='viz-panel';wizard.querySelector('#vesterAssist')?.insertAdjacentElement('afterend',panel)}panel.innerHTML=vesterChartHtml();panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'start'})};
  }
}

function ensureTree(){
  const wizard=$('#treeWizard'); if(!wizard)return;
  const actions=wizard.querySelector('.tree-actions'); if(!actions)return;
  if(!wizard.querySelector('#showTreeDiagram')){
    const b=document.createElement('button'); b.type='button'; b.id='showTreeDiagram'; b.textContent='Ver diagrama';
    actions.appendChild(b);
    b.onclick=()=>{let panel=wizard.querySelector('#treeDiagramPanel');if(!panel){panel=document.createElement('section');panel.id='treeDiagramPanel';panel.className='viz-panel';wizard.querySelector('#treeAssist')?.insertAdjacentElement('afterend',panel)}panel.innerHTML=treeDiagramHtml();panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'start'})};
  }
}

const obs=new MutationObserver(()=>{ensureVester();ensureTree()});
obs.observe(document.body,{subtree:true,childList:true,characterData:true});
ensureVester();ensureTree();
})();
