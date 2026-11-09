const assert=require('assert');
const {fixture}=require('./ci_persistence_context_test');
(async()=>{
 const f=fixture();f.api.project={...f.projects.A};
 const data={value:'unchanged',state:{items:[],archivedItems:[{id:'kept'}]},confirmed:false};
 f.rows.get('A:S06').data=data;
 // Different object key order represents the same stored section.
 f.api.draft.S06={confirmed:false,state:{archivedItems:[{id:'kept'}],items:[]},value:'unchanged'};
 assert.equal(await f.api.syncSection('S06'),true);
 assert.equal(f.writes.length,0,'A no-op save must not issue any database write');
 const failure=Error('Controlled read failure');
 const h=f.hold(q=>q.table==='sections'&&q.mode==='read',failure);
 const saving=f.api.syncSection('S06');const outcome=saving.catch(e=>e);
 await h.entered.promise;h.release.resolve();assert.equal(await outcome,failure);
 assert.equal(f.writes.length,0,'A failed comparison must never fall through to an upsert');
 console.log('Cloud no-op sync execution OK');
})().catch(e=>{console.error(e);process.exitCode=1});
