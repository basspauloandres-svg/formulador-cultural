// Auditoría read-only de relaciones persistidas de PF02 (sin Supabase ni mutaciones).
const fs=require('fs');
const assert=require('assert');
const input=process.argv[2];
if(!input){console.error('Uso: node scripts/audit_pf02_references.js <sections.json>');process.exit(2)}
const raw=JSON.parse(fs.readFileSync(input,'utf8'));
const sections=Array.isArray(raw)?Object.fromEntries(raw.map(x=>[x.code,x.data])):(raw.sections||raw);
const items=(section,key)=>Array.isArray(sections?.[section]?.[key]?.items)?sections[section][key].items:[];
const activities=items('S11','completion_state'),results=items('S11','results_state');
const activityIds=new Set(activities.map(x=>x.id).filter(Boolean));
const resultIds=new Set(results.map(x=>x.id).filter(Boolean));
const findings=[];
for(const [id,status] of Object.entries(sections?.S14?.budget_state?.activityStatus||{})){
 if(!activityIds.has(id))findings.push({type:'orphan_budget_activity_status',id,status});
}
for(const key of Object.keys(sections?.S15?.risk_state?.assessments||{})){
 const [kind,id]=key.split(':');
 if(kind==='activity'&&!activityIds.has(id))findings.push({type:'orphan_risk_activity_assessment',id,key});
 if(kind==='result'&&!resultIds.has(id))findings.push({type:'orphan_risk_result_assessment',id,key});
}
for(const row of items('S13','schedule_state')){
 const id=row.activityId||row.activity_id;
 if(id&&!activityIds.has(id))findings.push({type:'orphan_schedule_reference',id});
}
for(const row of items('S14','budget_state')){
 const id=row.activityId||row.activity_id;
 if(id&&!activityIds.has(id))findings.push({type:'orphan_budget_item_reference',id});
}
const output={status:findings.length?'REQUIERE_REVISION':'SIN_REFERENCIAS_HUERFANAS_EN_CONTROLES',activity_count:activities.length,result_count:results.length,findings};
console.log(JSON.stringify(output,null,2));
if(process.env.PF02_STRICT==='1'&&findings.length)process.exitCode=1;
