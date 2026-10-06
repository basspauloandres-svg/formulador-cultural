const fs=require('fs');
function fail(m){console.error('BUTTON CONTRACT ERROR:',m);process.exitCode=1}
const files=['vester.js','tree.js','simple_tree_ui.js','objectives.js','completion.js','planning.js','review_dashboard.js','guided_experience.js','workflow.js'];
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
const must=[
 ['tree.js','data-tree-help','bindTop'],
 ['tree.js','data-tree-phase','dataset.treePhase'],
 ['simple_tree_ui.js','data-role','dataset.role'],
 ['simple_tree_ui.js','data-depth','dataset.depth'],
 ['objectives.js','data-confirm','dataset.confirm'],
 ['objectives.js','objectiveNext','onclick'],
 ['completion.js','data-alt-confirm','dataset.altConfirm'],
 ['completion.js','data-act-confirm','dataset.actConfirm'],
 ['completion.js','data-ind-confirm','dataset.indConfirm'],
 ['planning.js','confirmSchedule','onclick'],
 ['planning.js','confirmBudgetActivity','onclick'],
 ['planning.js','confirmRisk','onclick'],
 ['planning.js','data-risk-assess','dataset.riskAssess'],
 ['guided_experience.js','data-code','dataset.code'],
 ['workflow.js','#prev','navigateTo'],
 ['review_dashboard.js','review-dashboard','render']
];
for(const [f,a,b] of must){if(!src[f].includes(a))fail(f+' no contiene control '+a);if(!src[f].includes(b))fail(f+' no contiene acción esperada '+b)}
if(/data-risk[^]*?onchange[^]*?renderS15\(\)/.test(src['planning.js']))fail('S15 vuelve a renderizar durante edición de campos de riesgo y puede perder el clic de confirmación');
if(!src['planning.js'].includes("Falta completar: "))fail('Confirmar riesgo no explica qué campos faltan');
if(!src['tree.js'].includes("scrollIntoView({behavior:'smooth',block:'center'})"))fail('La ayuda de S07 no lleva visualmente a la respuesta');
if(!process.exitCode)console.log('Button contract audit OK');