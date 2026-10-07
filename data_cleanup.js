(()=>{
const MIGRATION='context-real-20261007-v1';
const FLAG='formulador-cultural-data-cleanup-version';
if(localStorage.getItem(FLAG)===MIGRATION)return;
const DRAFT_KEY='formulador-cultural-prototipo-v1';
function parse(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function stripTransient(x){if(!x||typeof x!=='object')return x;const y={...x};delete y.showHelp;delete y.showActivityHelp;delete y.stale;return y}
function cleanObjectives(){
 const key='formulador-cultural-objectives-v1',s=parse(key);if(!Array.isArray(s.items))return null;
 const confirmed=s.items.filter(x=>x?.confirmed).map(stripTransient);
 if(!confirmed.length){localStorage.removeItem(key);return null}
 s.items=s.items.map(x=>x?.confirmed?stripTransient(x):{...stripTransient(x),text:'[POR REVISAR]',confirmed:false});
 s.engineVersion=MIGRATION;save(key,s);return s
}
function cleanResults(){
 const key='formulador-cultural-results-v1',s=parse(key);if(!Array.isArray(s.items))return null;
 const kept=s.items.filter(x=>x?.confirmed).map(stripTransient);
 if(!kept.length){localStorage.removeItem(key);return null}
 s.items=kept;s.engineVersion=MIGRATION;save(key,s);return s
}
function cleanActivities(){
 const key='formulador-cultural-activities-v1',s=parse(key);if(!Array.isArray(s.items))return null;
 s.items=s.items.filter(x=>x?.confirmed||x?.source==='usuario'||x?.source==='usuario_editado'||x?.plainText).map(stripTransient);
 s.staleItems=[];s.engineVersion=MIGRATION;save(key,s);return s
}
function cleanIndicators(){
 const key='formulador-cultural-indicators-v1',s=parse(key);if(!Array.isArray(s.items))return null;
 s.items=s.items.filter(x=>x?.confirmed||x?.provenance==='usuario').map(stripTransient);
 s.staleItems=[];s.sourceSignature='';s.engineVersion=MIGRATION;save(key,s);return s
}
function cleanAlternatives(){
 const key='formulador-cultural-alternatives-v1',s=parse(key);if(!Array.isArray(s.items))return null;
 const kept=s.items.filter(x=>x?.selected||x?.confirmed||x?.note||x?.source==='usuario').map(stripTransient);
 if(!kept.length){localStorage.removeItem(key);return null}
 s.items=kept;s.sourceSignature='';s.engineVersion=MIGRATION;save(key,s);return s
}
const cleaned={S09:cleanObjectives(),results:cleanResults(),S11:cleanActivities(),S12:cleanIndicators(),S10:cleanAlternatives()};
const draft=parse(DRAFT_KEY);
if(draft&&typeof draft==='object'){
 draft.S09=draft.S09||{};if(cleaned.S09)draft.S09.objectives_state=cleaned.S09;else delete draft.S09.objectives_state;
 draft.S11=draft.S11||{};if(cleaned.results)draft.S11.results_state=cleaned.results;else delete draft.S11.results_state;if(cleaned.S11)draft.S11.completion_state=cleaned.S11;else delete draft.S11.completion_state;
 draft.S12=draft.S12||{};if(cleaned.S12)draft.S12.completion_state=cleaned.S12;else delete draft.S12.completion_state;
 draft.S10=draft.S10||{};if(cleaned.S10)draft.S10.completion_state=cleaned.S10;else delete draft.S10.completion_state;
 draft.data_cleanup={version:MIGRATION,updatedAt:new Date().toISOString(),policy:'preserve_confirmed_and_user_data_remove_generated_pending'};
 save(DRAFT_KEY,draft)
}
localStorage.setItem(FLAG,MIGRATION);
})();