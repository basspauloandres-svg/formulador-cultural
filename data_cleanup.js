(()=>{
const MIGRATION='context-real-20261007-v2';
const FLAG='formulador-cultural-data-cleanup-version';
if(localStorage.getItem(FLAG)===MIGRATION)return;
const DRAFT_KEY='formulador-cultural-prototipo-v1';
function parse(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function stripTransient(x){if(!x||typeof x!=='object')return x;const y={...x};delete y.showHelp;delete y.showActivityHelp;delete y.stale;return y}
function archiveOf(s,removed){return [...(s.archivedItems||[]),...removed.map(x=>({...stripTransient(x),archived:true,archiveReason:'propuesta_anterior_no_confirmada',archivedAt:new Date().toISOString()}))].slice(-250)}
function cleanState(key,keep){
 const s=parse(key);if(!Array.isArray(s.items))return null;
 const kept=[],removed=[];
 s.items.forEach(x=>(keep(x)?kept:removed).push(stripTransient(x)));
 s.items=kept;s.archivedItems=archiveOf(s,removed);s.staleItems=[];s.sourceSignature='';s.engineVersion=MIGRATION;save(key,s);return s
}
function cleanObjectives(){
 const key='formulador-cultural-objectives-v1',s=parse(key);if(!Array.isArray(s.items))return null;
 const kept=[],removed=[];
 s.items.forEach(x=>(x?.confirmed?kept:removed).push(stripTransient(x)));
 s.items=kept;s.archivedItems=archiveOf(s,removed);s.sourceSignature='';s.engineVersion=MIGRATION;save(key,s);return s
}
function cleanResults(){return cleanState('formulador-cultural-results-v1',x=>x?.confirmed||x?.source==='usuario'||x?.source==='usuario_editado')}
function cleanActivities(){return cleanState('formulador-cultural-activities-v1',x=>x?.confirmed||x?.source==='usuario'||x?.source==='usuario_editado'||x?.plainText)}
function cleanIndicators(){return cleanState('formulador-cultural-indicators-v1',x=>x?.confirmed||x?.provenance==='usuario')}
function cleanAlternatives(){return cleanState('formulador-cultural-alternatives-v1',x=>x?.selected||x?.confirmed||x?.note||x?.source==='usuario')}
const cleaned={S09:cleanObjectives(),results:cleanResults(),S11:cleanActivities(),S12:cleanIndicators(),S10:cleanAlternatives()};
const draft=parse(DRAFT_KEY);
if(draft&&typeof draft==='object'){
 draft.S09=draft.S09||{};if(cleaned.S09)draft.S09.objectives_state=cleaned.S09;
 draft.S11=draft.S11||{};if(cleaned.results)draft.S11.results_state=cleaned.results;if(cleaned.S11)draft.S11.completion_state=cleaned.S11;
 draft.S12=draft.S12||{};if(cleaned.S12)draft.S12.completion_state=cleaned.S12;
 draft.S10=draft.S10||{};if(cleaned.S10)draft.S10.completion_state=cleaned.S10;
 draft.data_cleanup={version:MIGRATION,updatedAt:new Date().toISOString(),policy:'preserve_confirmed_and_user_data_archive_generated_pending',archiveLimit:250};
 save(DRAFT_KEY,draft)
}
localStorage.setItem(FLAG,MIGRATION);
})();