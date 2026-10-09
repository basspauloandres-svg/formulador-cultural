const fs=require('fs');

function fail(msg){console.error('ARCHITECTURE ERROR:',msg);process.exitCode=1}
function read(p){return fs.readFileSync(p,'utf8')}

const html=read('index.html');
const localScripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x)).map(x=>x.split('?')[0]);
const localCss=[...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x)).map(x=>x.split('?')[0]);

for(const group of [localScripts,localCss]){
 const seen=new Set();
 for(const file of group){if(seen.has(file))fail('Recurso duplicado en index.html: '+file);seen.add(file);if(!fs.existsSync(file))fail('Recurso referenciado inexistente: '+file)}
}
const versions=[...html.matchAll(/(?:src|href)="[^"]+\?v=([^"]+)"/g)].map(m=>m[1]);
if(versions.length&&new Set(versions).size!==1)fail('Los recursos locales tienen versiones de caché mezcladas: '+[...new Set(versions)].join(', '));
if((html.match(/id="guidedJourney"/g)||[]).length!==1)fail('Debe existir exactamente un contenedor guidedJourney en el HTML base');

const ext=read('sections_extension.js');
for(let i=9;i<=16;i++){const code='S'+String(i).padStart(2,'0');if(!ext.includes(code))fail('Falta '+code+' en sections_extension.js')}

const schema=read('backend/schema.sql');
for(let i=1;i<=16;i++){const code='S'+String(i).padStart(2,'0');if(!schema.includes("'"+code+"'"))fail('Falta '+code+' en la restricción de backend/schema.sql')}

const app=read('app.js');
for(const key of ['completion_state','results_state','schedule_state','budget_state','risk_state','review_state']){
 if(!app.includes('d.'+key+'?.updatedAt'))fail('nestedUpdatedAt no contempla '+key)
}

const completion=read('completion.js');
if(!completion.includes('function confirmedResults()'))fail('S11 no dispone de resultados confirmados como fuente');
if(!completion.includes('resultId:r.id'))fail('Las actividades propuestas no guardan resultId');
if(/function activityProposals\(\)[\s\S]{0,1200}for\(const m of means/.test(completion))fail('S11 todavía deriva actividades directamente de medios/objetivos');

const coherence=read('coherence_engine.js');
if(!coherence.includes("Resultados → indicadores"))fail('El motor de coherencia no verifica indicadores de resultados');
if(!coherence.includes("Objetivo general → indicador"))fail('El motor de coherencia no verifica indicador del objetivo general');
if(!coherence.includes("s==='COHERENTE CON DATOS PENDIENTES'?0.5"))fail('El índice de coherencia no pondera datos pendientes');

const review=read('review_dashboard.js');
if(!review.includes('complete===codes.length'))fail('La revisión final puede marcar listo sin completar todas las secciones evaluadas');

const workflow=read('.github/workflows/pages.yml');
if(!workflow.includes("github.ref == 'refs/heads/main'"))fail('El despliegue no está limitado explícitamente a main durante auditoría');

if(!process.exitCode)console.log('Architecture audit OK');

const appManager=read('app.js');
if(!appManager.includes('Nuevo proyecto')||!appManager.includes('Mis proyectos')||!appManager.includes('switchCloudProject'))fail('No existe gestor de proyectos independientes');
const synthesisAudit=read('synthesis.js');
if(!synthesisAudit.includes('return sentence(c)'))fail('S08 vuelve a concatenar contexto completo en el enunciado breve');
if(!coherence.includes("'AÚN NO EVALUABLE'"))fail('S16 no distingue controles todavía no evaluables');
const causalSimple=read('simple_causal_ui.js');
if(!causalSimple.includes("draft?.S06?.causal_validation"))fail('S06 no reconcilia la vista guiada con el estado estructurado');

const exportCompletionPf02=read('export_completion.js');
const deliverablesPf02=read('deliverables.js');
for(const token of ['fcGetActivitiesSnapshot','fcGetScheduleSnapshot','fcGetBudgetSnapshot','fcGetRiskSnapshot']){if(!exportCompletionPf02.includes(token)||!deliverablesPf02.includes(token))fail('PF02-F09: exportación no usa snapshot inmutable '+token)}
if(!read('app.js').includes('Recargar desde nube'))fail('No existe recuperación explícita del proyecto desde nube');


const projectSnapshot=read('project_snapshot.js');
if(!html.includes('project_snapshot.js'))fail('El snapshot canónico no está cargado en index.html');
for(const token of ['fcGetProjectSnapshot','fcGetProjectSnapshotHash','project_snapshot_v1']){
 if(!projectSnapshot.includes(token))fail('Falta contrato de snapshot canónico: '+token)
}
if(!coherence.includes('fcGetProjectSnapshot'))fail('Coherencia no prioriza el snapshot canónico');
if(!review.includes('fcGetProjectSnapshot'))fail('S16 no prioriza el snapshot canónico');
if(!workflow.includes('project_snapshot.js'))fail('CI no valida project_snapshot.js');


// PF02-F09: impedir regresión hacia reconciliaciones destructivas sin autorización.
const pfCompletion=read('completion.js');
const pfPlanning=read('planning.js');
const pfResults=read('results_layer.js');
if(!pfCompletion.includes('requiresReview:existing.length>0'))fail('PF02-F09: S10 reemplaza alternativas existentes sin revisión');
if(!pfCompletion.includes("reviewReason:'resultado_no_disponible'"))fail('PF02-F09: S11 descarta actividades desvinculadas');
if(!pfPlanning.includes("reviewReason:'actividad_no_disponible'"))fail('PF02-F09: S14 elimina rubros históricos');
if(!pfPlanning.includes("reviewReason:'dependencia_no_disponible'"))fail('PF02-F09: S15 elimina riesgos desvinculados');
if(!pfResults.includes('if(!src.length&&Array.isArray(s.items)&&s.items.length)return s'))fail('PF02-F09: S11 elimina resultados cuando faltan objetivos');
