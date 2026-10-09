(()=>{
const SNAPSHOT_SCHEMA='project_snapshot_v1';
const BASELINE_VERSION='20261008-89';

function clone(v){
  if(v===undefined)return undefined;
  try{return JSON.parse(JSON.stringify(v))}catch{return v}
}
function deepFreeze(v){
  if(!v||typeof v!=='object'||Object.isFrozen(v))return v;
  Object.freeze(v);
  for(const x of Object.values(v))deepFreeze(x);
  return v
}
function section(code){
  try{return clone((typeof draft!=='undefined'&&draft?.[code])||{})||{}}catch{return {}}
}
function callSnapshot(name,fallback){
  try{
    const fn=window?.[name];
    if(typeof fn==='function')return clone(fn());
    return clone(fallback);
  }catch{return clone(fallback)}
}
function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'
}
function fnv1a(text){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h=Math.imul(h,0x01000193)>>>0
  }
  return h.toString(16).padStart(8,'0')
}
function projectMeta(sections){
  let id=null,title='',cloudUpdatedAt=null;
  try{
    if(typeof cloudProject!=='undefined'&&cloudProject){
      id=cloudProject.id||null;
      title=cloudProject.title||'';
      cloudUpdatedAt=cloudProject.updated_at||null
    }
  }catch{}
  if(!title)title=String(sections.S01?.nombre_del_proyecto||'').trim();
  return {project_id:id,title:title||null,cloud_updated_at:cloudUpdatedAt}
}
function evidenceSnapshot(){
  try{
    if(typeof window.fcGetEvidenceRecords==='function')return clone(window.fcGetEvidenceRecords())||[]
  }catch{}
  return []
}
function build(){
  const sections={};
  for(let i=1;i<=16;i++){
    const code='S'+String(i).padStart(2,'0');
    sections[code]=section(code)
  }

  const derived={
    vester_preparation:clone(sections.S05?.vester_preparation_v2||sections.S05?.vester_preparation||null),
    vester:clone(sections.S06?.vester_state||null),
    causal_validation:clone(sections.S06?.causal_validation||null),
    tree:clone(sections.S07?.tree_state||null),
    synthesis:clone(sections.S08?.synthesis_state||null),
    objectives:clone(sections.S09?.objectives_state||null),
    alternatives:callSnapshot('fcGetAlternativesSnapshot',sections.S10?.completion_state?.items||[]),
    results:callSnapshot('fcGetResultsSnapshot',sections.S11?.results_state?.items||[]),
    activities:callSnapshot('fcGetActivitiesSnapshot',sections.S11?.completion_state?.items||[]),
    indicators:callSnapshot('fcGetIndicatorsSnapshot',sections.S12?.completion_state?.items||[]),
    schedule:callSnapshot('fcGetScheduleSnapshot',sections.S13?.schedule_state?.items||[]),
    budget:callSnapshot('fcGetBudgetSnapshot',sections.S14?.budget_state?.items||[]),
    budget_state:callSnapshot('fcGetBudgetStateSnapshot',sections.S14?.budget_state||{}),
    risks:callSnapshot('fcGetRiskSnapshot',sections.S15?.risk_state?.items||[]),
    risk_state:callSnapshot('fcGetRiskStateSnapshot',sections.S15?.risk_state||{}),
    review:clone(sections.S16?.review_state||null),
    evidence:evidenceSnapshot()
  };

  const snapshot={
    schema:SNAPSHOT_SCHEMA,
    baseline_version:BASELINE_VERSION,
    project:projectMeta(sections),
    sections,
    derived
  };
  return deepFreeze(snapshot)
}
function hash(snapshot){
  const s=snapshot||build();
  return fnv1a(stable(s))
}

window.fcGetProjectSnapshot=build;
window.fcGetProjectSnapshotHash=()=>hash(build());
window.fcProjectSnapshotStableStringify=stable;
})();