const fs=require('fs'),vm=require('vm'),assert=require('assert');
let writes=0;const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>{writes++;storage.set(k,v)}};
const draft={S09:{objectives_state:{items:[{id:'O1',zone:'direct_cause',text:'Mejorar cobertura',confirmed:true}]}},S11:{results_state:{sourceSignature:'old',items:[]},completion_state:{items:[]}}};
const document={body:{},querySelector:()=>null};class MutationObserver{observe(){}}
const window={},context={window,document,MutationObserver,draft,localStorage,session:{},syncSection:()=>{writes++},storeKey:'draft'};
vm.createContext(context);vm.runInContext(fs.readFileSync('results_layer.js','utf8'),context);
const original=JSON.stringify(draft),a=window.fcGetResults();
assert.equal(a.length,1,'La vista derivada debe ofrecer resultado pendiente');
assert.equal(JSON.stringify(draft),original,'Consultar resultados no debe modificar S11');
assert.equal(writes,0,'Consultar resultados no debe escribir en almacenamiento');
assert.equal(window.fcGetResultsSnapshot().length,0,'Snapshot persistido permanece igual');
console.log('Read-only result derivation OK');
