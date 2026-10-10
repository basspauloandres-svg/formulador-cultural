const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('project_snapshot.js','utf8');
function instance(id,title){
 const draft={S01:{nombre_del_proyecto:title},S10:{completion_state:{items:[{id:'A1',text:title+' alternativa'}]}},S11:{completion_state:{items:[{id:'ACT1',text:title+' actividad',resultId:'R1'}]},results_state:{items:[{id:'R1',text:'Resultado'}]}},S09:{objectives_state:{items:[]}},S14:{budget_state:{items:[],activityStatus:{}}},S15:{risk_state:{items:[],assessments:{}}}};
 const context={window:{},draft,cloudProject:{id,title,updated_at:null}};
 vm.createContext(context);vm.runInContext(source,context);
 return {context,draft,snapshot:context.window.fcGetProjectSnapshot(),hash:context.window.fcGetProjectSnapshotHash()};
}
const a=instance('project-banda','Talleres para banda');
const b=instance('project-pf02','Proyecto hipotético');
assert.equal(a.snapshot.project.project_id,'project-banda');
assert.equal(b.snapshot.project.project_id,'project-pf02');
assert.notEqual(a.hash,b.hash,'Los estados distintos deben producir hashes distintos');
assert.equal(a.snapshot.sections.S10.completion_state.items[0].text,'Talleres para banda alternativa');
assert.equal(b.snapshot.sections.S10.completion_state.items[0].text,'Proyecto hipotético alternativa');
assert.equal(a.context.window.fcGetProjectSnapshotHash(),a.hash,'Leer el segundo proyecto no altera el primero');
assert.equal(b.context.window.fcGetProjectSnapshotHash(),b.hash,'Leer el primero no altera el segundo');
const original=JSON.stringify(a.draft);
const report=a.context.window.fcGetProjectIntegrityReport();
assert.equal(typeof report.ok,'boolean');
assert.equal(JSON.stringify(a.draft),original,'La auditoría no modifica un proyecto');
assert(Object.isFrozen(a.snapshot.sections.S10),'Snapshot debe ser inmutable');
console.log('Synthetic multiproject isolation OK');
