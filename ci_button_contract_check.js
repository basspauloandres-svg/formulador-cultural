const fs=require('fs');
function fail(m){console.error('BUTTON CONTRACT ERROR:',m);process.exitCode=1}
const files=['synthesis.js','vester.js','tree.js','simple_tree_ui.js','s07_front.js','objectives.js','completion.js','planning.js','review_dashboard.js','guided_experience.js','workflow.js'];
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
const must=[
 ['synthesis.js','confirmFinal','confirmAndContinue'],
 ['synthesis.js','mSave','persistEditors'],
 ['tree.js','data-tree-help','bindTop'],
 ['tree.js','data-tree-phase','dataset.treePhase'],
 ['simple_tree_ui.js','data-role','dataset.role'],
 ['simple_tree_ui.js','data-depth','dataset.depth'],
 ['simple_tree_ui.js','stContinue',"fcNavigate('S08')"],
 ['s07_front.js','s07Objectives',"fcNavigate('S08')"],
 ['objectives.js','data-confirm','dataset.confirm'],
 ['objectives.js','objectiveNext','onclick'],
 ['completion.js','data-alt-confirm','dataset.altConfirm'],
 ['completion.js','data-act-confirm','dataset.actConfirm'],
 ['completion.js','data-act-link-result','dataset.actLinkResult'],
 ['completion.js','data-ind-confirm','dataset.indConfirm'],
 ['completion.js','data-open-indicator-completion','dataset.openIndicatorCompletion'],
 ['completion.js','indNext',"fcNavigate('S13')"],
 ['planning.js','confirmSchedule','onclick'],
 ['planning.js','confirmBudgetActivity','onclick'],
 ['planning.js','confirmRisk','onclick'],
 ['planning.js','riskNext',"fcNavigate('S16')"],
 ['planning.js','riskFinish','advanceRiskReview'],
 ['planning.js','data-risk-assess','dataset.riskAssess'],
 ['guided_experience.js','data-code','dataset.code'],
 ['workflow.js','#prev','navigateTo'],
 ['review_dashboard.js','review-dashboard','render']
];
for(const [f,a,b] of must){if(!src[f].includes(a))fail(f+' no contiene control '+a);if(!src[f].includes(b))fail(f+' no contiene acción esperada '+b)}
if(src['planning.js'].includes("host.querySelectorAll('[data-risk]').forEach(el=>el.onchange"))fail('S15 vuelve a usar onchange con re-render durante edición de riesgos');
if(!src['planning.js'].includes("Falta completar: "))fail('Confirmar riesgo no explica qué campos faltan');
if(!src['tree.js'].includes("scrollIntoView({behavior:'smooth',block:'center'})"))fail('La ayuda de S07 no lleva visualmente a la respuesta');
if(src['simple_tree_ui.js'].includes("querySelector('[data-tree-phase=\"review\"]')?.click()"))fail('El botón Continuar de S07 vuelve a abrir una revisión técnica oculta en vez de avanzar');
if(!src['simple_tree_ui.js'].includes("Continuar al problema central"))fail('S07 no explica a qué sección avanza el botón principal');
if(!process.exitCode)console.log('Button contract audit OK');