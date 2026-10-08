(()=>{
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
function filename(){return (clean(draft?.S01?.nombre_del_proyecto)||'proyecto-cultural').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'proyecto-cultural'}
function problemNodes(){try{return (draft?.S07?.tree_state?.nodes||[]).filter(n=>n.zone!=='outside')}catch{return []}}
function objectiveNodes(){try{return window.fcGetObjectives?.()||draft?.S09?.objectives_state?.items||[]}catch{return []}}
function rows(fn){try{return fn?.()||[]}catch{return []}}
function svgFor(kind='problem'){
 const problem=kind==='problem',nodes=problem?problemNodes():objectiveNodes(),W=1400,cardW=270,cardH=74,gapY=125;
 const levels=problem?
 [['indirect_effect','Efectos indirectos','#fff0f0','#e35d5d'],['direct_effect','Efectos directos','#fff5f5','#e35d5d'],['central','Problema principal','#fff7d6','#d89a00'],['direct_cause','Causas directas','#eef9f1','#37a85b'],['indirect_cause','Causas indirectas','#f5fcf6','#37a85b']]:
 [['indirect_effect','Fines indirectos','#eef5ff','#4285f4'],['direct_effect','Fines directos','#f4f8ff','#4285f4'],['central','Objetivo central','#fff7d6','#d89a00'],['direct_cause','Medios directos','#eef9f1','#37a85b'],['indirect_cause','Medios indirectos','#f5fcf6','#37a85b']];
 const pos=new Map(),items=[];
 levels.forEach(([zone,label,bg,border],li)=>{const xs=nodes.filter(n=>n.zone===zone),count=Math.max(1,xs.length),total=count*cardW+(count-1)*26,start=(W-total)/2;xs.forEach((n,i)=>{const x=start+i*(cardW+26),y=35+li*gapY;pos.set(n.id,{x,y,zone});items.push({n,x,y,label,bg,border})})});
 const central=nodes.find(n=>n.zone==='central');let paths='';
 function anchor(n){if(n.zone==='direct_cause'||n.zone==='direct_effect')return central?.id||null;if(n.parentId)return n.parentId;if(n.zone==='indirect_cause')return nodes.find(x=>x.zone==='direct_cause')?.id||central?.id||null;if(n.zone==='indirect_effect')return nodes.find(x=>x.zone==='direct_effect')?.id||central?.id||null;return null}
 for(const n of nodes){if(n.zone==='central')continue;const a=pos.get(n.id),b=pos.get(anchor(n));if(!a||!b)continue;const above=['direct_effect','indirect_effect'].includes(n.zone),y1=above?a.y+cardH:a.y,y2=above?b.y:b.y+cardH,x1=a.x+cardW/2,x2=b.x+cardW/2,mid=(y1+y2)/2;paths+=`<path d="M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}" fill="none" stroke="#34495e" stroke-width="2"/>`}
 const cards=items.map(({n,x,y,label,bg,border})=>{const words=clean(n.text).split(' '),ls=[];let cur='';for(const w of words){if((cur+' '+w).trim().length>34){ls.push(cur);cur=w}else cur=(cur+' '+w).trim()}if(cur)ls.push(cur);return `<g><rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="${bg}" stroke="${border}" stroke-width="${n.zone==='central'?3:2}"/><text x="${x+cardW/2}" y="${y+19}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="${border}">${esc(label)}</text>${ls.slice(0,3).map((t,i)=>`<text x="${x+cardW/2}" y="${y+40+i*15}" text-anchor="middle" font-family="Arial" font-size="13" fill="#1f2933">${esc(t)}</text>`).join('')}</g>`}).join('');
 const H=35+levels.length*gapY;return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="white"/>${paths}${cards}</svg>`
}
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function exportSvg(kind){download(filename()+'-'+(kind==='problem'?'arbol-problemas':'arbol-objetivos')+'.svg',new Blob([svgFor(kind)],{type:'image/svg+xml;charset=utf-8'}))}
function openSvg(kind){const w=window.open();if(w){w.document.write('<title>Diagrama</title><style>body{margin:0;background:#f4f6f8;display:grid;place-items:center;min-height:100vh}svg{max-width:98vw;height:auto;background:#fff}</style>'+svgFor(kind));w.document.close()}}
async function loadScript(src,test){if(test())return;await new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=fail;document.head.appendChild(s)})}
const DOC_FOOTER='Formulador Cultural · Desarrollo por Paulo Olarte';
function p(v){const t=clean(v);return t||'[POR VERIFICAR]'}
function compact(v,max=30){const t=clean(v);return window.fcWriting?.compactPresentationText?window.fcWriting.compactPresentationText(t,max):t}
function moneyRaw(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n):'[POR VERIFICAR]'}
function table(headers,body){return '<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
function vesterSnapshot(){
 const s=draft?.S06?.vester_state||{},ps=Array.isArray(s.selected)?s.selected:[],relations=s.relations||{};
 if(ps.length<2)return {ready:false,problems:ps,rows:[],meanInfluence:0,meanDependence:0,relations};
 const totals=Object.fromEntries(ps.map(p=>[p.id,{id:p.id,text:p.text,influence:0,dependence:0}]));
 for(const a of ps)for(const b of ps){if(a.id===b.id)continue;const score=relations[a.id+'>'+b.id]?.score;if(Number.isInteger(score)){totals[a.id].influence+=score;totals[b.id].dependence+=score}}
 const rows=Object.values(totals),meanInfluence=rows.reduce((a,r)=>a+r.influence,0)/rows.length,meanDependence=rows.reduce((a,r)=>a+r.dependence,0)/rows.length;
 rows.forEach(r=>{const hi=r.influence>=meanInfluence,hd=r.dependence>=meanDependence;r.quadrant=hi&&hd?'Crítico':hi?'Activo':hd?'Pasivo':'Indiferente'});
 return {ready:rows.length>0,problems:ps,rows,meanInfluence,meanDependence,relations}
}
function vesterMatrixHtml(v){
 if(!v.ready)return '<p>[POR VERIFICAR] La matriz Vester aún no está completa.</p>';
 const ids=v.problems.map(p=>p.id);
 return '<div class="table-wrap"><table class="vester-table"><thead><tr><th>Situación</th>'+v.problems.map((p,i)=>'<th title="'+esc(p.text)+'">P'+(i+1)+'</th>').join('')+'<th>Influencia</th><th>Dependencia</th><th>Clasificación</th></tr></thead><tbody>'+v.problems.map((p,i)=>{const r=v.rows.find(x=>x.id===p.id)||{};return '<tr><th>P'+(i+1)+' · '+esc(p.text)+'</th>'+ids.map(id=>id===p.id?'<td>—</td>':'<td>'+(v.relations[p.id+'>'+id]?.score??'·')+'</td>').join('')+'<td>'+r.influence+'</td><td>'+r.dependence+'</td><td>'+esc(r.quadrant)+'</td></tr>'}).join('')+'</tbody></table></div>'
}
function vesterScatterSvg(v){
 if(!v.ready)return '';
 const W=760,H=430,m=55,maxX=Math.max(1,...v.rows.map(r=>r.influence),v.meanInfluence)*1.15,maxY=Math.max(1,...v.rows.map(r=>r.dependence),v.meanDependence)*1.15;
 const x=n=>m+(n/maxX)*(W-m*2),y=n=>H-m-(n/maxY)*(H-m*2),mx=x(v.meanInfluence),my=y(v.meanDependence);
 const q='<rect x="'+m+'" y="'+m+'" width="'+(mx-m)+'" height="'+(my-m)+'" fill="#f7f9fb"/><rect x="'+mx+'" y="'+m+'" width="'+(W-m-mx)+'" height="'+(my-m)+'" fill="#fff4e8"/><rect x="'+m+'" y="'+my+'" width="'+(mx-m)+'" height="'+(H-m-my)+'" fill="#f4f8ff"/><rect x="'+mx+'" y="'+my+'" width="'+(W-m-mx)+'" height="'+(H-m-my)+'" fill="#eef9f1"/>';
 const labels='<text x="'+(m+8)+'" y="'+(m+18)+'" font-size="12" fill="#68737d">Pasivos</text><text x="'+(mx+8)+'" y="'+(m+18)+'" font-size="12" fill="#9b5d18">Críticos</text><text x="'+(m+8)+'" y="'+(H-m-8)+'" font-size="12" fill="#496b9a">Indiferentes</text><text x="'+(mx+8)+'" y="'+(H-m-8)+'" font-size="12" fill="#347a55">Activos</text>';
 const points=v.rows.map((r,i)=>'<g><circle cx="'+x(r.influence)+'" cy="'+y(r.dependence)+'" r="8" fill="#176b49"/><text x="'+(x(r.influence)+11)+'" y="'+(y(r.dependence)+4)+'" font-size="12" fill="#1f2933">P'+(i+1)+'</text></g>').join('');
 return '<svg class="report-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Plano de influencia y dependencia de la matriz Vester"><rect width="100%" height="100%" fill="white"/>'+q+'<line x1="'+m+'" y1="'+my+'" x2="'+(W-m)+'" y2="'+my+'" stroke="#9aa5ae" stroke-dasharray="6 5"/><line x1="'+mx+'" y1="'+m+'" x2="'+mx+'" y2="'+(H-m)+'" stroke="#9aa5ae" stroke-dasharray="6 5"/><line x1="'+m+'" y1="'+(H-m)+'" x2="'+(W-m)+'" y2="'+(H-m)+'" stroke="#52606d"/><line x1="'+m+'" y1="'+m+'" x2="'+m+'" y2="'+(H-m)+'" stroke="#52606d"/>'+labels+points+'<text x="'+(W/2)+'" y="'+(H-12)+'" text-anchor="middle" font-size="12" fill="#52606d">Influencia</text><text x="16" y="'+(H/2)+'" transform="rotate(-90 16 '+(H/2)+')" text-anchor="middle" font-size="12" fill="#52606d">Dependencia</text></svg>'
}
function ganttSvg(schedule){
 const valid=(schedule||[]).filter(x=>x.startDate&&x.endDate&&!/^\[POR/.test(x.startDate)&&!/^\[POR/.test(x.endDate));
 if(!valid.length)return '';
 const dates=valid.flatMap(x=>[new Date(x.startDate+'T00:00:00'),new Date(x.endDate+'T00:00:00')]).filter(d=>!Number.isNaN(d.getTime()));
 if(!dates.length)return '';
 const min=new Date(Math.min(...dates)),max=new Date(Math.max(...dates)),span=Math.max(86400000,max-min),W=980,left=310,rowH=42,H=70+valid.length*rowH,chartW=W-left-30;
 const x=d=>left+((d-min)/span)*chartW;
 const rowsSvg=valid.map((r,i)=>{const y=48+i*rowH,s=new Date(r.startDate+'T00:00:00'),e=new Date(r.endDate+'T00:00:00'),x1=x(s),x2=Math.max(x1+8,x(e));return '<text x="12" y="'+(y+17)+'" font-size="12" fill="#263238">'+esc(compact(r.activityText,22))+'</text><rect x="'+x1+'" y="'+(y+4)+'" width="'+(x2-x1)+'" height="20" rx="6" fill="#2d8a61"/><text x="'+(x1+6)+'" y="'+(y+18)+'" font-size="10" fill="white">'+esc(r.startDate)+' → '+esc(r.endDate)+'</text>'}).join('');
 return '<svg class="report-chart gantt" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Cronograma gráfico tipo Gantt"><rect width="100%" height="100%" fill="white"/><text x="'+left+'" y="24" font-size="12" fill="#52606d">'+esc(min.toISOString().slice(0,10))+'</text><text x="'+(W-30)+'" y="24" text-anchor="end" font-size="12" fill="#52606d">'+esc(max.toISOString().slice(0,10))+'</text><line x1="'+left+'" y1="32" x2="'+(W-30)+'" y2="32" stroke="#d9e1e6"/>'+rowsSvg+'</svg>'
}
function budgetChartsSvg(budget){
 const byActivity=new Map(),byType=new Map();
 for(const r of budget||[]){const n=Number(r.totalCost)||0;if(n<=0)continue;const a=compact(r.activityText||'Actividad',18),t=clean(r.costType)||'Sin clasificar';byActivity.set(a,(byActivity.get(a)||0)+n);byType.set(t,(byType.get(t)||0)+n)}
 const entries=[...byActivity.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);if(!entries.length)return '';
 const W=900,rowH=42,H=60+entries.length*rowH,max=Math.max(...entries.map(x=>x[1])),bars=entries.map(([name,val],i)=>{const y=42+i*rowH,w=(val/max)*470;return '<text x="10" y="'+(y+15)+'" font-size="12" fill="#263238">'+esc(name)+'</text><rect x="300" y="'+(y+2)+'" width="'+w+'" height="20" rx="6" fill="#2d8a61"/><text x="'+(308+w)+'" y="'+(y+17)+'" font-size="11" fill="#52606d">'+esc(moneyRaw(val))+'</text>'}).join('');
 const total=[...byType.values()].reduce((a,b)=>a+b,0),typeText=[...byType.entries()].map(([k,v])=>k+': '+Math.round(v/total*100)+'%').join(' · ');
 return '<svg class="report-chart budget-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Distribución del presupuesto por actividad"><rect width="100%" height="100%" fill="white"/><text x="10" y="22" font-size="13" font-weight="700" fill="#173d2c">Distribución por actividad</text>'+bars+'<text x="10" y="'+(H-8)+'" font-size="11" fill="#66717c">'+esc(typeText)+'</text></svg>'
}
function indicatorSummaryTable(inds){
 return table(['Nivel','Elemento','Indicador','Línea base','Meta','Medio de verificación'],inds.map(x=>[x.linkedType||'Actividad',compact(x.linkedText||x.activityText||'',26),x.indicator,x.lineaBase,x.meta,x.medioVerificacion]))
}
function indicatorTechnicalTable(inds){
 return table(['Nivel','Indicador','Fórmula / criterio','Unidad','Línea base','Meta','Periodicidad','Medio de verificación','Responsable','Plazo'],inds.map(x=>[x.linkedType||'Actividad',x.indicator,x.formula||'[POR VERIFICAR]',x.unidad,x.lineaBase,x.meta,x.periodicidad,x.medioVerificacion,x.responsable,x.plazo]))
}
function reportHtml(){
 const acts=rows(window.fcGetActivities).filter(x=>x.confirmed),res=rows(window.fcGetResults).filter(x=>x.confirmed),inds=rows(window.fcGetIndicators).filter(x=>x.confirmed),sch=rows(window.fcGetSchedule),bud=rows(window.fcGetBudget),risks=rows(window.fcGetRisks),bs=window.fcGetBudgetSummary?.()||{},vester=vesterSnapshot();
 const obj=objectiveNodes().filter(x=>x.confirmed),central=obj.find(x=>x.zone==='central'),spec=obj.filter(x=>x.zone==='direct_cause'),meansIndirect=obj.filter(x=>x.zone==='indirect_cause'),ends=obj.filter(x=>x.zone==='direct_effect'||x.zone==='indirect_effect'),alt=rows(window.fcGetAlternatives).find(x=>x.selected&&x.confirmed),coherence=window.fcGetCoherenceReport?.()||{score:0,checks:[]};
 const project=esc(p(draft?.S01?.nombre_del_proyecto)),entity=esc(p(draft?.S01?.entidad_u_organizacion)),territory=esc(p(draft?.S02?.territorio_o_lugar_de_intervencion||draft?.S01?.municipio)),responsible=esc(p(draft?.S01?.responsable));
 return `<!doctype html><html><head><meta charset="utf-8"><title>${project}</title><style>
 @page{size:A4;margin:20mm 16mm 18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#23312b;line-height:1.5;max-width:1000px;margin:auto;padding:24px;background:#fff}
 .cover{min-height:86vh;display:flex;flex-direction:column;justify-content:center;border-top:10px solid #176b49;padding:42px 12px}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#4f6b5d;font-weight:700}.cover h1{font-size:34px;line-height:1.12;margin:12px 0 20px;color:#173d2c}.cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}.cover-card{border:1px solid #d9e5de;border-radius:10px;padding:12px;background:#f8fbf9}.cover-card small{display:block;color:#6b7b73}.section{margin-top:32px}.section-title{display:flex;gap:10px;align-items:center;border-bottom:2px solid #dfe9e3;padding-bottom:7px;margin-bottom:12px}.section-no{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#176b49;color:white;font-size:12px;font-weight:700}.section h2{margin:0;font-size:20px;color:#173d2c}.lead{font-size:14px;color:#53665c}.callout{background:#f5fbf7;border-left:4px solid #2d8a61;border-radius:8px;padding:10px 12px}.note{background:#fff8df;border:1px solid #eadc9b;border-radius:8px;padding:10px}.table-wrap{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #dfe6e2;padding:7px;text-align:left;vertical-align:top;font-size:10.5px}th{background:#eef5f1;color:#244a37;font-weight:700}tbody tr:nth-child(even){background:#fbfcfb}.diagram,.chart-box{border:1px solid #e0e8e3;border-radius:12px;padding:12px;background:white;margin:12px 0}.diagram svg,.report-chart{width:100%;height:auto}.matrix-caption{font-size:11px;color:#65756d;margin-top:-6px}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric-card{border:1px solid #dfe6e2;border-radius:10px;padding:12px;background:#f8fbf9}.metric-card b{display:block;font-size:18px;color:#173d2c}.page-break{break-before:page;page-break-before:always}.avoid-break{break-inside:avoid;page-break-inside:avoid}.doc-footer{margin-top:28px;padding-top:10px;border-top:1px solid #dfe4e8;text-align:center;font-size:10px;color:#66717c;letter-spacing:.02em}small{color:#66717c}@media(max-width:720px){.cover-grid,.summary-grid{grid-template-columns:1fr}}@media print{body{padding:0}.doc-footer{position:fixed;left:0;right:0;bottom:4mm;background:#fff;padding-top:4px}.table-wrap{overflow:visible}}
 </style></head><body>
 <section class="cover"><div class="eyebrow">Formato estándar de proyecto cultural</div><h1>${project}</h1><p class="lead">Documento técnico generado a partir del proceso de formulación, análisis causal, planeación, seguimiento y gestión de riesgos.</p><div class="cover-grid"><div class="cover-card"><small>Entidad / organización</small><b>${entity}</b></div><div class="cover-card"><small>Territorio</small><b>${territory}</b></div><div class="cover-card"><small>Responsable</small><b>${responsible}</b></div><div class="cover-card"><small>Estado del documento</small><b>${coherence.score}% de coherencia orientativa</b></div></div></section>
 <section class="section page-break"><div class="section-title"><span class="section-no">1</span><h2>Resumen ejecutivo</h2></div><p>${esc(p(draft?.S08?.enunciado))}</p></section>
 <section class="section"><div class="section-title"><span class="section-no">2</span><h2>Contexto territorial, cultural y social</h2></div><p>${esc(p(draft?.S02?.territorio_o_lugar_de_intervencion))}</p><p>${esc(p(draft?.S02?.caracteristicas_culturales))}</p><p>${esc(p(draft?.S02?.principales_dinamicas_sociales))}</p></section>
 <section class="section"><div class="section-title"><span class="section-no">3</span><h2>Población</h2></div><p><b>Población atendida:</b> ${esc(p(draft?.S03?.poblacion_afectada))}</p><p><b>Participantes:</b> ${esc(p(draft?.S03?.poblacion_participante))}</p><p>${esc(p(draft?.S03?.caracterizacion))}</p></section>
 <section class="section"><div class="section-title"><span class="section-no">4</span><h2>Evidencia y antecedentes</h2></div><p>${esc(p(draft?.S04?.evidencia_disponible))}</p><p><b>Fuentes:</b> ${esc(p(draft?.S04?.fuentes))}</p>${draft?.S04?.datos_por_verificar?'<div class="note"><b>Datos por verificar:</b> '+esc(draft.S04.datos_por_verificar)+'</div>':''}</section>
 <section class="section page-break"><div class="section-title"><span class="section-no">5</span><h2>Priorización de situaciones · Matriz Vester</h2></div><p class="lead">La matriz documenta las valoraciones de influencia y dependencia utilizadas como soporte del análisis previo al árbol de problemas.</p>${vester.ready?'<div class="chart-box">'+vesterScatterSvg(vester)+'</div>'+vesterMatrixHtml(vester)+'<p class="matrix-caption">La clasificación orienta la priorización metodológica; la decisión final permanece en la persona formuladora.</p>':'<div class="note">[POR VERIFICAR] La matriz Vester aún no está disponible como soporte completo.</div>'}</section>
 <section class="section page-break"><div class="section-title"><span class="section-no">6</span><h2>Planteamiento del problema</h2></div><p>${esc(p(draft?.S08?.enunciado))}</p><div class="diagram">${svgFor('problem')}</div></section>
 <section class="section page-break"><div class="section-title"><span class="section-no">7</span><h2>Objetivos</h2></div><p><b>Objetivo general:</b> ${esc(p(central?.text))}</p><h3>Objetivos específicos</h3>${spec.length?'<ul>'+spec.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ul>':'<p>[POR VERIFICAR] No hay objetivos específicos confirmados.</p>'}${meansIndirect.length?'<h3>Medios del árbol de objetivos</h3><ul>'+meansIndirect.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ul>':''}${ends.length?'<h3>Fines esperados</h3><ul>'+ends.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ul>':''}<div class="diagram">${svgFor('objective')}</div></section>
 <section class="section"><div class="section-title"><span class="section-no">8</span><h2>Estrategia de intervención</h2></div><p>${esc(p(alt?.text))}</p></section>
 <section class="section"><div class="section-title"><span class="section-no">9</span><h2>Resultados esperados</h2></div>${res.length?'<ul>'+res.map(x=>'<li>'+esc(compact(x.text,32))+'</li>').join('')+'</ul>':'<p>[POR VERIFICAR]</p>'}</section>
 <section class="section"><div class="section-title"><span class="section-no">10</span><h2>Plan de actividades</h2></div>${acts.length?table(['ID','Resultado / objetivo','Actividad'],acts.map(x=>[x.id,compact(x.resultText||x.objectiveText||'',32),compact(x.text,28)])):'<p>[POR VERIFICAR]</p>'}</section>
 <section class="section page-break"><div class="section-title"><span class="section-no">11</span><h2>Indicadores y metas</h2></div><p class="lead">La tabla resumida permite leer rápidamente la cadena de seguimiento. La matriz técnica conserva los datos necesarios para verificar cada indicador.</p><h3>11.1 Tabla resumida</h3>${inds.length?indicatorSummaryTable(inds):'<p>[POR VERIFICAR]</p>'}<h3>11.2 Matriz técnica de indicadores</h3>${inds.length?'<div class="table-wrap">'+indicatorTechnicalTable(inds)+'</div>':'<p>[POR VERIFICAR]</p>'}</section>
 <section class="section page-break"><div class="section-title"><span class="section-no">12</span><h2>Cronograma</h2></div>${ganttSvg(sch)?'<div class="chart-box">'+ganttSvg(sch)+'</div>':'<div class="note">El cronograma gráfico aparecerá cuando existan fechas de inicio y cierre confirmadas.</div>'}${sch.length?table(['Actividad','Inicio','Fin','Responsable','Frecuencia'],sch.map(x=>[compact(x.activityText,28),x.startDate||'[POR VERIFICAR]',x.endDate||'[POR VERIFICAR]',x.responsible||'[POR VERIFICAR]',x.frequency||''])):'<p>[POR VERIFICAR]</p>'}</section>
 <section class="section page-break"><div class="section-title"><span class="section-no">13</span><h2>Recursos y presupuesto</h2></div><div class="summary-grid"><div class="metric-card"><small>Total valorizado</small><b>${moneyRaw(bs.total)}</b></div><div class="metric-card"><small>Monetario</small><b>${moneyRaw(bs.monetary)}</b></div><div class="metric-card"><small>Aporte en especie</small><b>${moneyRaw(bs.inKind)}</b></div></div>${budgetChartsSvg(bud)?'<div class="chart-box">'+budgetChartsSvg(bud)+'</div>':''}${bud.length?table(['Actividad','Recurso','Unidad','Cantidad','Veces','Costo unitario','Total','Tipo'],bud.map(x=>[compact(x.activityText,28),x.description,x.unit,String(x.quantity),String(x.frequency),moneyRaw(x.unitCost),moneyRaw(x.totalCost),x.costType])):'<p>[POR VERIFICAR]</p>'}</section>
 <section class="section"><div class="section-title"><span class="section-no">14</span><h2>Riesgos y respuestas</h2></div>${risks.length?table(['Origen','Riesgo','Probabilidad','Impacto','Nivel','Prevención','Contingencia','Responsable'],risks.map(x=>[x.linkedObjectType,compact(x.event,30),x.probability,x.impact,x.riskLevel,compact(x.preventiveResponse,36),compact(x.contingencyResponse,36),x.owner])):'<p>[POR VERIFICAR]</p>'}</section>
 <section class="section"><div class="section-title"><span class="section-no">15</span><h2>Coherencia y trazabilidad</h2></div><div class="callout"><b>Índice orientativo de coherencia: ${coherence.score}%</b><p>Este valor resume controles internos del formulador; no sustituye una evaluación externa.</p></div>${coherence.checks?.length?'<ul>'+coherence.checks.map(x=>'<li><b>'+esc(x.label)+':</b> '+esc(x.message)+'</li>').join('')+'</ul>':''}</section>
 <section class="section"><div class="section-title"><span class="section-no">16</span><h2>Fuentes y anexos</h2></div><p>${esc(p(draft?.S04?.fuentes))}</p><small>Los vacíos conservan la marca [POR VERIFICAR].</small></section>
 <div class="doc-footer">${esc(DOC_FOOTER)}</div></body></html>`
}
function professionalDocumentPayload(){
 const obj=objectiveNodes().filter(x=>x.confirmed),central=obj.find(x=>x.zone==='central');
 const v=vesterSnapshot();
 return {
  title:p(draft?.S01?.nombre_del_proyecto),
  entity:p(draft?.S01?.entidad_u_organizacion),
  territory:p(draft?.S02?.territorio_o_lugar_de_intervencion||draft?.S01?.municipio),
  responsible:p(draft?.S01?.responsable),
  summary:p(draft?.S08?.enunciado),
  context:[draft?.S02?.territorio_o_lugar_de_intervencion,draft?.S02?.caracteristicas_culturales,draft?.S02?.principales_dinamicas_sociales,draft?.S02?.antecedentes].map(clean).filter(Boolean).join('\n\n'),
  population:[draft?.S03?.poblacion_afectada,draft?.S03?.poblacion_participante,draft?.S03?.caracterizacion].map(clean).filter(Boolean).join('\n\n'),
  evidence:[draft?.S04?.evidencia_disponible,draft?.S04?.datos_por_verificar].map(clean).filter(Boolean).join('\n\n'),
  sources:p(draft?.S04?.fuentes),
  problem:p(draft?.S08?.enunciado),
  strategy:p(rows(window.fcGetAlternatives).find(x=>x.selected&&x.confirmed)?.text),
  objective_general:p(central?.text),
  objectives:obj.filter(x=>x.zone==='direct_cause').map(x=>({id:x.id,text:x.text,zone:x.zone,parentId:x.parentId||null})),
  results:rows(window.fcGetResults).filter(x=>x.confirmed).map(x=>({...x,text:compact(x.text,40)})),
  activities:rows(window.fcGetActivities).filter(x=>x.confirmed).map(x=>({...x,text:compact(x.text,32)})),
  indicators:rows(window.fcGetIndicators).filter(x=>x.confirmed),
  schedule:rows(window.fcGetSchedule),
  budget:rows(window.fcGetBudget),
  risks:rows(window.fcGetRisks),
  problem_tree:problemNodes(),
  objective_tree:obj,
  vester:{rows:v.rows,meanInfluence:v.meanInfluence,meanDependence:v.meanDependence},
  coherence:{score:(window.fcGetCoherenceReport?.()||{}).score||0,summary:'La revisión interna del formulador reporta el estado vigente de coherencia y trazabilidad.'}
 }
}
let documentGeneratorStatus={mode:'browser',connected:false,message:'Generador profesional Python no conectado.'};
function documentApiBase(){
 const params=new URLSearchParams(location.search),fromQuery=clean(params.get('document_api'));
 if(fromQuery){localStorage.setItem('fc_document_api_url',fromQuery);return fromQuery.replace(/\/$/,'')}
 const configured=clean(window.FC_DOCUMENT_API_URL||localStorage.getItem('fc_document_api_url'));
 if(configured)return configured.replace(/\/$/,'');
 if(['localhost','127.0.0.1'].includes(location.hostname))return 'http://127.0.0.1:8000';
 return ''
}
function announceDocumentGenerator(detail){
 documentGeneratorStatus={...documentGeneratorStatus,...detail};
 window.dispatchEvent(new CustomEvent('fc-document-generator-status',{detail:documentGeneratorStatus}))
}
async function exportProfessionalDocument(kind,fallback){
 const api=documentApiBase();
 if(!api){
  announceDocumentGenerator({mode:'browser',connected:false,message:'El motor Python todavía no tiene una URL pública. Se usará temporalmente la exportación del navegador.'});
  return fallback()
 }
 try{
  announceDocumentGenerator({mode:'python',connected:true,message:'Generando documento profesional…'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  const response=await fetch(api+'/documents/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(professionalDocumentPayload()),signal:controller.signal});
  clearTimeout(timer);
  if(!response.ok)throw new Error('HTTP '+response.status);
  const blob=await response.blob(),ext=kind==='docx'?'docx':'pdf';
  download(filename()+'-proyecto-profesional.'+ext,blob);
  announceDocumentGenerator({mode:'python',connected:true,message:'Documento profesional generado con el motor Python.'});
  return true
 }catch(error){
  console.error('Generador documental Python',error);
  announceDocumentGenerator({mode:'browser',connected:false,message:'No fue posible usar el motor Python. Se generará una copia temporal con el navegador.'});
  return fallback()
 }
}
function exportHtml(){download(filename()+'-proyecto.html',new Blob([reportHtml()],{type:'text/html;charset=utf-8'}))}
async function exportPdf(){await loadScript('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',()=>typeof html2pdf!=='undefined');const holder=document.createElement('div');holder.innerHTML=reportHtml().match(/<body>([\s\S]*)<\/body>/i)?.[1]||reportHtml();holder.querySelector('.doc-footer')?.remove();document.body.appendChild(holder);try{const worker=html2pdf().set({margin:[10,10,16,10],filename:filename()+'-proyecto.pdf',image:{type:'jpeg',quality:.96},html2canvas:{scale:1.3,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(holder).toPdf();const pdf=await worker.get('pdf');const pages=pdf.internal.getNumberOfPages();for(let page=1;page<=pages;page++){pdf.setPage(page);pdf.setFontSize(8);pdf.setTextColor(102,113,124);pdf.text(DOC_FOOTER,pdf.internal.pageSize.getWidth()/2,pdf.internal.pageSize.getHeight()-6,{align:'center'})}await worker.save()}finally{holder.remove()}}
function xmlEsc(v){return clean(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function docParagraph(text,style){return '<w:p>'+((style)?'<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>':'')+'<w:r><w:t xml:space="preserve">'+xmlEsc(text)+'</w:t></w:r></w:p>'}
function docFooterXml(){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="66717C"/></w:rPr><w:t>'+xmlEsc(DOC_FOOTER)+'</w:t></w:r></w:p></w:ftr>'}
function reportParagraphs(){
 const out=[],add=(h,t)=>{out.push(docParagraph(h,'Heading1'));(Array.isArray(t)?t:[t]).filter(Boolean).forEach(x=>out.push(docParagraph(x)))};
 add(p(draft?.S01?.nombre_del_proyecto),['Entidad: '+p(draft?.S01?.entidad_u_organizacion),'Territorio: '+p(draft?.S02?.territorio_o_lugar_de_intervencion||draft?.S01?.municipio)]);
 add('1. Resumen ejecutivo',p(draft?.S08?.enunciado));
 add('2. Contexto',[p(draft?.S02?.territorio_o_lugar_de_intervencion),p(draft?.S02?.caracteristicas_culturales)]);
 add('3. Población',[p(draft?.S03?.poblacion_afectada),p(draft?.S03?.poblacion_participante)]);
 add('4. Problema',p(draft?.S08?.enunciado));
 const docObj=objectiveNodes().filter(x=>x.confirmed);
 add('5. Objetivo general',p(docObj.find(x=>x.zone==='central')?.text));
 add('6. Objetivos específicos',docObj.filter(x=>x.zone==='direct_cause').map(x=>p(x.text)));
 if(docObj.some(x=>x.zone==='indirect_cause'))add('Medios del árbol de objetivos',docObj.filter(x=>x.zone==='indirect_cause').map(x=>p(x.text)));
 if(docObj.some(x=>x.zone==='direct_effect'||x.zone==='indirect_effect'))add('Fines esperados',docObj.filter(x=>x.zone==='direct_effect'||x.zone==='indirect_effect').map(x=>p(x.text)));
 add('7. Estrategia',p(rows(window.fcGetAlternatives).find(x=>x.selected&&x.confirmed)?.text));
 add('8. Resultados',rows(window.fcGetResults).filter(x=>x.confirmed).map(x=>p(compact(x.text,32))));
 add('9. Actividades',rows(window.fcGetActivities).filter(x=>x.confirmed).map(x=>x.id+' · '+p(compact(x.text,28))));
 add('10. Cronograma',rows(window.fcGetSchedule).map(x=>p(compact(x.activityText,28))+' | '+p(x.startDate)+' - '+p(x.endDate)+' | '+p(x.responsible)));
 add('11. Indicadores y metas',rows(window.fcGetIndicators).filter(x=>x.confirmed).map(x=>p(x.linkedType)+' · '+p(x.indicator)+' | Fórmula/criterio: '+p(x.formula)+' | Línea base: '+p(x.lineaBase)+' | Meta: '+p(x.meta)+' | Unidad: '+p(x.unidad)+' | Periodicidad: '+p(x.periodicidad)+' | Fuente: '+p(x.medioVerificacion)+' | Responsable: '+p(x.responsable)+' | Plazo: '+p(x.plazo)));
 add('12. Presupuesto',rows(window.fcGetBudget).map(x=>p(x.activityText)+' | '+p(x.description)+' | '+moneyRaw(x.totalCost)));
 add('13. Riesgos',rows(window.fcGetRisks).map(x=>p(compact(x.event,30))+' | '+p(x.riskLevel)+' | '+p(compact(x.preventiveResponse,36))));
 add('14. Fuentes',p(draft?.S04?.fuentes));
 return out.join('')
}
async function exportDocx(){await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',()=>typeof JSZip!=='undefined');const zip=new JSZip(),body=reportParagraphs();zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');zip.folder('word').folder('_rels').file('document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>');zip.folder('word').file('document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+'<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>');zip.folder('word').file('footer1.xml',docFooterXml());zip.folder('word').file('styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style></w:styles>');const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});download(filename()+'-proyecto.docx',blob)}
async function treePdf(kind){await loadScript('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',()=>typeof html2pdf!=='undefined');const div=document.createElement('div');div.style.padding='20px';div.innerHTML='<h2>'+(kind==='problem'?'Árbol de problemas':'Árbol de objetivos')+'</h2>'+svgFor(kind);document.body.appendChild(div);try{await html2pdf().set({filename:filename()+'-'+(kind==='problem'?'arbol-problemas':'arbol-objetivos')+'.pdf',margin:8,html2canvas:{scale:1.5},jsPDF:{unit:'mm',format:'a3',orientation:'landscape'}}).from(div).save()}finally{div.remove()}}
window.fcTreeSvg=svgFor;window.fcExportProblemTreeSVG=()=>exportSvg('problem');window.fcExportObjectiveTreeSVG=()=>exportSvg('objective');window.fcOpenProblemTree=()=>openSvg('problem');window.fcOpenObjectiveTree=()=>openSvg('objective');window.fcExportProblemTreePDF=()=>treePdf('problem');window.fcExportObjectiveTreePDF=()=>treePdf('objective');window.fcExportProjectHTML=exportHtml;window.fcExportProjectPDF=()=>exportProfessionalDocument('pdf',exportPdf);window.fcExportProjectDOCX=()=>exportProfessionalDocument('docx',exportDocx);window.fcProjectReportHTML=reportHtml;window.fcProjectDocumentPayload=professionalDocumentPayload;window.fcGetDocumentGeneratorStatus=()=>({...documentGeneratorStatus});window.fcSetDocumentApiUrl=url=>{const cleanUrl=clean(url);if(cleanUrl)localStorage.setItem('fc_document_api_url',cleanUrl);else localStorage.removeItem('fc_document_api_url');return documentApiBase()};
})();
