const fs=require('fs'),vm=require('vm'),assert=require('assert');
const events={};let saves=0,renders=0,attempts=0,shouldFail=true;
const document={body:{},querySelector:()=>null,addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)}};
class MutationObserver{observe(){}}
const window={};
const context={window,document,MutationObserver,active:'S01',order:['S01','S02'],
 session:{},saveLocal:()=>{saves++},
 syncSection:async()=>{attempts++;if(shouldFail)throw Error('Red desconectada')},
 render:()=>{renders++},console:{error:()=>{},warn:()=>{},log:()=>{}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('workflow.js','utf8'),context);

(async()=>{
 events.input[0]({target:{closest:x=>x==='#panel'?{}:null}});
 assert.strictEqual(await window.fcNavigate('S02',{scroll:false}),false,
   'No se debe navegar cuando falla la persistencia');
 assert.strictEqual(context.active,'S01','Preservar sección activa ante fallo');
 assert.strictEqual(renders,0,'No representar la siguiente sección tras fallo');
 assert.strictEqual(attempts,1,'Intentar sincronización');
 shouldFail=false;
 assert.strictEqual(await window.fcNavigate('S02',{scroll:false}),true,
   'Permitir reintentar después de reconexión');
 assert.strictEqual(context.active,'S02');
 assert.strictEqual(attempts,2,'Conservar dirty para reintento');
 assert.strictEqual(renders,1);
 assert.strictEqual(await window.fcPersistCurrent(),true);
 assert.strictEqual(attempts,2,'No sincronizar otra vez datos guardados');
 console.log('Navigation persistence failure regression OK');
})().catch(e=>{console.error(e);process.exit(1)});
