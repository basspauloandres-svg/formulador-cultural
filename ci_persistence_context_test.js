const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app.js','utf8').split("q('#save').onclick=save;")[0];
const clone=v=>JSON.parse(JSON.stringify(v));
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
function fixture(){
 const projects={A:{id:'A',title:'A'},B:{id:'B',title:'B'}};
 const rows=new Map();for(const id of ['A','B'])for(let n=1;n<=16;n++)rows.set(id+':S'+String(n).padStart(2,'0'),{code:'S'+String(n).padStart(2,'0'),data:{value:id+n},updated_at:'2026-01-01T00:00:00Z'});
 const storage=new Map([['formulador-cultural-cloud-project-v1','A'],['formulador-cultural-prototipo-v1',JSON.stringify({S01:{value:'A1'},S06:{value:'pending A6'}})]]);
 const calls=[],holds=[],writes=[];
 const sb={from(table){
  const query={table,mode:'read',filters:{}};
  const api={select(){return api},eq(k,v){query.filters[k]=v;return api},order(){return api},limit(){return api},
   upsert(payload){query.mode='upsert';query.payload=clone(payload);return api},update(payload){query.mode='update';query.payload=clone(payload);return api},insert(payload){query.mode='insert';query.payload=clone(payload);return api},
   single(){return execute(true)},maybeSingle(){return execute(true)},then(resolve,reject){return execute(false).then(resolve,reject)}};
  async function execute(single){
   const q=clone(query);calls.push(q);
   // Freeze the read result before pausing: the response may arrive after the UI changed.
   const readResult=q.mode!=='read'?null:table==='projects'?
    (single?clone(projects[q.filters.id]||null):clone(Object.values(projects))):
    (single?clone(rows.get(q.filters.project_id+':'+q.filters.code)||null):clone([...rows].filter(([key])=>key.startsWith(q.filters.project_id+':')).map(([,v])=>v)));
   const hold=holds.find(h=>!h.used&&h.match(q,single));if(hold){hold.used=true;hold.entered.resolve();await hold.release.promise;if(hold.error)return {data:null,error:hold.error}}
   if(q.mode==='upsert'){writes.push(q);rows.set(q.payload.project_id+':'+q.payload.code,{code:q.payload.code,data:clone(q.payload.data),updated_at:q.payload.updated_at});return {data:null,error:null}}
   if(q.mode==='update'){writes.push(q);Object.assign(projects[q.filters.id],q.payload);return {data:null,error:null}}
   if(table==='projects'||table==='sections')return {data:readResult,error:null};
   throw Error('Unexpected query '+JSON.stringify(q));
  }
  return api;
 }};
 const nodes=new Map();const context={window:{supabase:{createClient:()=>sb},fcPersistCurrent:async()=>true},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),get length(){return storage.size},key:i=>[...storage.keys()][i]},
  document:{querySelector:s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',classList:{toggle(){},add(){},remove(){}}});return nodes.get(s)},querySelectorAll:()=>[]},
  console:{error(){},warn(){},log(){}},queueMicrotask(){},setInterval,clearInterval,prompt:()=>null,confirm:()=>true};
 vm.createContext(context);vm.runInContext(source+`\nrender=()=>{};renderAuth=()=>{};renderProjectControls=async()=>{};
 session={user:{id:'owner'}};
 window.test={syncSection,queueSectionSync,loadCloud,switchCloudProject,
  ensureProject,syncProject,get draft(){return draft},get meta(){return syncMeta},get project(){return cloudProject},
  set project(value){cloudProject=value},setSession:setAuthSession,set active(code){active=code}};`,context);
 function hold(match,error){const h={match,error,used:false,entered:deferred(),release:deferred()};holds.push(h);return h}
 return {api:context.window.test,window:context.window,rows,projects,storage,calls,writes,hold};
}
const tests=[];
function test(name,fn){tests.push([name,fn])}

test('late project lookup cannot redirect another project draft',async()=>{
 const f=fixture();const h=f.hold(q=>q.table==='projects'&&q.filters.id==='A');
 const saving=f.api.syncSection('S06');const outcome=saving.catch(e=>e);
 await h.entered.promise;await f.api.switchCloudProject('B');h.release.resolve();await outcome;
 assert.equal(f.api.project.id,'B','Late lookup must not select A again');
 assert.equal(f.rows.get('A:S06').data.value,'A6','No B draft may be written to A');
 assert.equal(f.rows.get('B:S06').data.value,'B6');
});

test('edits during network wait remain pending instead of being acknowledged',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);f.api.draft.S06={value:'first'};
 const h=f.hold(q=>q.mode==='upsert'&&q.payload.code==='S06');
 const saving=f.api.syncSection('S06');const outcome=saving.then(v=>({value:v}),e=>({error:e}));
 await h.entered.promise;f.api.draft.S06.value='second';h.release.resolve();const result=await outcome;
 assert.equal(f.rows.get('A:S06').data.value,'first','The payload must be a snapshot of the requested save');
 assert(result.error||result.value===false,'A newer local edit must remain pending');
 assert.equal(f.api.draft.S06.value,'second');
 await f.api.syncSection('S06');assert.equal(f.rows.get('A:S06').data.value,'second');
});

test('failed project load leaves previous draft and identity intact',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);const before=JSON.stringify(f.api.draft);
 const h=f.hold(q=>q.table==='sections'&&q.filters.project_id==='B',Error('B load unavailable'));
 const switching=f.api.switchCloudProject('B');const outcome=switching.catch(e=>e);
 await h.entered.promise;h.release.resolve();await outcome;
 assert.equal(f.api.project.id,'A');assert.equal(f.storage.get('formulador-cultural-cloud-project-v1'),'A');assert.equal(JSON.stringify(f.api.draft),before);
});

test('all direct section writes are serialized, including queue aliases',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);f.api.draft.S06={value:'first'};
 const h=f.hold(q=>q.mode==='upsert'&&q.payload.code==='S06');
 const first=f.api.syncSection('S06');const firstOutcome=first.catch(e=>e);await h.entered.promise;
 f.api.draft.S06={value:'second'};const second=f.api.queueSectionSync('S06');
 await new Promise(r=>setImmediate(r));
 assert.equal(f.calls.filter(q=>q.mode==='upsert').length,1,'Second write must wait for first');
 h.release.resolve();await firstOutcome;await second;
 assert.equal(f.rows.get('A:S06').data.value,'second');
});

test('stale cloud response cannot contaminate the newly selected project',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);
 const h=f.hold(q=>q.table==='sections'&&q.filters.project_id==='A'&&!q.filters.code);
 const loading=f.api.loadCloud();await h.entered.promise;
 await f.api.switchCloudProject('B');const before=JSON.stringify(f.api.draft);
 h.release.resolve();assert.equal(await loading,false);
 assert.equal(f.api.project.id,'B');assert.equal(JSON.stringify(f.api.draft),before);
});

test('failed target read and edits during target load do not discard current data',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);
 const h=f.hold(q=>q.table==='sections'&&q.filters.project_id==='B');
 const switching=f.api.switchCloudProject('B');const outcome=switching.catch(e=>e);
 await h.entered.promise;f.api.draft.S06={value:'new local edit'};h.release.resolve();
 assert.match((await outcome).message,/cambios locales nuevos/i);assert.equal(f.api.project.id,'A');
 assert.equal(f.api.draft.S06.value,'new local edit');assert.equal(f.writes.length,0);
});

test('sign-out and sign-in invalidate old requests even for the same account',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);
 const h=f.hold(q=>q.table==='sections'&&q.filters.code==='S06'&&q.mode==='read');
 const saving=f.api.syncSection('S06');const outcome=saving.catch(e=>e);await h.entered.promise;
 f.api.setSession(null);f.api.setSession({user:{id:'owner'}});h.release.resolve();await outcome;
 assert.equal(f.writes.length,0);assert.equal(f.api.draft.S06.value,'pending A6');
});

test('pending queues reject without unhandled cleanup promises and allow retry',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);
 const failure=Error('Controlled write failure');const h=f.hold(q=>q.mode==='upsert',failure);
 const saving=f.api.syncSection('S06');const outcome=saving.catch(e=>e);await h.entered.promise;h.release.resolve();
 assert.equal(await outcome,failure);await new Promise(r=>setImmediate(r));
 assert.equal(await f.api.syncSection('S06'),true);assert.equal(f.rows.get('A:S06').data.value,'pending A6');
});

test('rename failures are visible and retry even when section data already matches',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);f.api.draft.S01={nombre_del_proyecto:'Renamed A'};
 const failure=Error('Controlled title failure');const h=f.hold(q=>q.table==='projects'&&q.mode==='update',failure);
 const saving=f.api.syncSection('S01');const outcome=saving.catch(e=>e);await h.entered.promise;h.release.resolve();
 assert.equal(await outcome,failure);assert.equal(f.projects.A.title,'A');
 assert.equal(await f.api.syncSection('S01'),true);assert.equal(f.projects.A.title,'Renamed A');
 assert.equal(f.calls.filter(q=>q.table==='sections'&&q.mode==='upsert').length,1,'Retry must not rewrite unchanged section');
});

test('saves of all sixteen sections retain structured data without normalization',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);
 for(let n=1;n<=16;n++){
  const code='S'+String(n).padStart(2,'0');
  const data={legacy:'[POR VERIFICAR]',state:{items:[{id:'kept-'+code,parentId:'legacy-ref'}],archivedItems:[{id:'history',note:'keep'}]},empty:[],flag:false,count:0};
  f.api.draft[code]=clone(data);await f.api.syncSection(code);
  assert.deepStrictEqual(f.rows.get('A:'+code).data,data);
 }
 assert.equal(f.projects.A.title,'A','Non-S01 writes may not rename a project');
});

test('a cloud response older than a completed save cannot roll that save back locally',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);
 const h=f.hold(q=>q.table==='sections'&&q.filters.project_id==='A'&&!q.filters.code);
 const loading=f.api.loadCloud();await h.entered.promise;
 await f.api.syncSection('S06');h.release.resolve();
 assert.equal(await loading,false,'Metadata changed after the read started; do not reconcile the old response');
 assert.equal(f.api.draft.S06.value,'pending A6');
 assert.equal(f.rows.get('A:S06').data.value,'pending A6');
});

test('a failed in-flight save blocks project selection and retains the newer draft',async()=>{
 const f=fixture();f.api.project=clone(f.projects.A);f.api.draft.S06={value:'first A edit'};
 const h=f.hold(q=>q.mode==='upsert'&&q.payload.code==='S06');
 const first=f.api.syncSection('S06').catch(e=>e);await h.entered.promise;
 f.api.draft.S06={value:'second A edit'};const second=f.api.syncSection('S06').catch(e=>e);
 f.api.draft.S06={value:'third A edit, not yet saved'};
 const switching=f.api.switchCloudProject('B').catch(e=>e);
 await new Promise(r=>setImmediate(r));assert.equal(f.api.project.id,'A','Do not leave A while its write is in flight');
 h.release.resolve();await first;await second;const blocked=await switching;
 assert.match(blocked.message,/cambios nuevos pendientes/i);
 assert.equal(f.api.project.id,'A');assert.equal(f.rows.get('B:S06').data.value,'B6');
 assert.equal(f.api.draft.S06.value,'third A edit, not yet saved');
});

test('concurrent first-use lookups share one project resolution',async()=>{
 const f=fixture();f.storage.delete('formulador-cultural-cloud-project-v1');
 const h=f.hold(q=>q.table==='projects'&&!q.filters.id);
 const a=f.api.ensureProject(),b=f.api.ensureProject();await h.entered.promise;h.release.resolve();
 assert.equal((await a).id,(await b).id);
 assert.equal(f.calls.filter(q=>q.table==='projects').length,1);
});

module.exports={fixture};
if(require.main===module)(async()=>{
 let failures=0;
 for(const [name,fn]of tests){try{await fn();console.log('PASS '+name)}catch(e){failures++;console.error('FAIL '+name+'\n'+e.stack)}}
 if(failures)process.exitCode=1;else console.log('Persistence context regression OK ('+tests.length+' cases)');
})().catch(e=>{console.error(e);process.exitCode=1});
