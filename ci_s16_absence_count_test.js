const assert=require('assert'),fs=require('fs'),vm=require('vm');
const s=fs.readFileSync('review_dashboard.js','utf8');
assert(/const absenceCount=missing\+progress\+/.test(s),'Debe contar secciones faltantes y en progreso');
assert(s.includes('window.fcGetProjectIntegrityReport?.().issues?.length||0'),'Debe contar referencias inválidas');
const saveSource=s.slice(s.indexOf('async function saveReviewProgress('),s.indexOf('\nfunction pendingAdvice'));
const ctx={draft:{},storeKey:'test-only',localStorage:{setItem(){}},session:{},
 window:{fcGetProjectIntegrityReport:()=>({ok:true})},syncSection:async()=>false,console:{error(){}}};
vm.createContext(ctx);vm.runInContext(saveSource,ctx);
(async()=>{
 const report={ready:false,completion:30,coh:{score:70}};
 const declined=await ctx.saveReviewProgress(report);
 assert.equal(declined.saved,true);assert.equal(declined.synced,false,'False no acredita sincronización de S16');
 assert.equal(ctx.draft.S16.review_state.ready,false,'Conservar los pendientes de revisión');
 ctx.syncSection=async()=>true;
 assert.equal((await ctx.saveReviewProgress(report)).synced,true);
 ctx.syncSection=async()=>{throw Error('Controlled offline failure')};
 assert.equal((await ctx.saveReviewProgress(report)).synced,false);
 console.log('S16 absence count and synchronization results OK');
})().catch(e=>{console.error(e);process.exitCode=1});
