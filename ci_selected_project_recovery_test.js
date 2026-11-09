const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app.js','utf8');
// Execute the actual coordinator and adapter together, rather than isolated function text.
const persistenceSource=source.slice(source.indexOf('function captureProjectContext(){'),source.indexOf('\nasync function save()'));

function fixture({remembered='qa-a',firstError=null,missing=false}={}){
 const storage=new Map(remembered?[['selected-project',remembered]]:[]),calls=[],writes=[];
 const projects={'qa-a':{id:'qa-a',title:'QA A'},'qa-b':{id:'qa-b',title:'QA B'}};
 let failed=false;
 const sb={from(table){
  const query={table,columns:null,filters:{},payload:null};
  const api={select(columns){query.columns=columns;return api},eq(k,v){query.filters[k]=v;return api},order(){return api},limit(){return api},
   upsert(payload){query.payload=payload;return execute()},update(payload){query.payload=payload;return api},
   maybeSingle(){return execute()},single(){return execute()},then(resolve,reject){return execute().then(resolve,reject)}};
  async function execute(){
   calls.push({...query,filters:{...query.filters}});
   if(query.payload){writes.push({...query,filters:{...query.filters}});return {data:null,error:null}}
   if(table==='projects'&&query.filters.id){
    if(firstError&&!failed){failed=true;return {data:null,error:firstError}}
    return {data:missing?null:projects[query.filters.id],error:null};
   }
   if(table==='sections'&&query.filters.project_id)return {data:{data:{responsable:'before'}},error:null};
   if(table==='sections')return {data:[{project_id:'qa-b'}],error:null};
   if(table==='projects')return {data:[projects['qa-b']],error:null};
   throw Error('Unexpected query');
  }
  return api;
 }};
 const context={window:{},projectContextVersion:0,projectLookup:null,sectionSyncQueues:{},dirty:false,session:{user:{id:'owner'}},cloudProject:null,sb,cloudProjectKey:'selected-project',
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  active:'S01',draft:{S01:{responsable:'pending QA A edit'}},collect(){},metaFor:()=>({}),nestedUpdatedAt:()=>null,saveSyncMeta(){}};
 vm.createContext(context);vm.runInContext(persistenceSource,context);
 return {context,calls,writes,storage};
}

(async()=>{
 const networkError={message:'Controlled offline failure'};
 const interrupted=fixture({firstError:networkError});
 await assert.rejects(interrupted.context.syncSection('S01'),e=>e===networkError,
  'A failed lookup of selected QA A must reject; it must never fall back to QA B');
 assert.equal(interrupted.calls.length,1,'Stop after selected-project lookup fails');
 assert.equal(interrupted.writes.length,0,'Do not write pending QA A data to another project');
 assert.equal(interrupted.storage.get('selected-project'),'qa-a','Keep selected identity for retry');
 assert.equal(interrupted.context.cloudProject,null);
 assert.equal(await interrupted.context.syncSection('S01'),true,'Retry succeeds after reconnection');
 assert.equal(interrupted.context.cloudProject.id,'qa-a');
 assert.equal(interrupted.writes.length,1);
 assert.equal(interrupted.writes[0].payload.project_id,'qa-a');
 assert.equal(interrupted.writes[0].payload.data.responsable,'pending QA A edit');
 assert(!interrupted.calls.some(c=>c.filters.id==='qa-b'||(c.table==='sections'&&!c.filters.project_id&&!c.payload)),
  'Recovery must not consult the most-recent-project fallback');

 const missing=fixture({missing:true});
 await assert.rejects(missing.context.ensureProject(),/proyecto seleccionado/i,
  'An unavailable selected project must require explicit selection');
 assert.equal(missing.calls.length,1);
 assert.equal(missing.storage.get('selected-project'),'qa-a');
 assert.equal(missing.writes.length,0);

 const cached=fixture();cached.context.cloudProject={id:'qa-a',title:'QA A'};
 assert.equal((await cached.context.ensureProject()).id,'qa-a');assert.equal(cached.calls.length,0);
 const firstUse=fixture({remembered:null});
 assert.equal((await firstUse.context.ensureProject()).id,'qa-b','Keep first-use discovery when nothing is selected');
 console.log('Selected-project failure and recovery isolation OK');
})().catch(e=>{console.error(e);process.exit(1)});
