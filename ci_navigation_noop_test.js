const fs=require('fs'),vm=require('vm'),assert=require('assert');
const events={};let local=0,cloud=0;
const document={body:{},querySelector:()=>null,addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)}};
class MutationObserver{observe(){}}
const window={};const context={window,document,MutationObserver,
 active:'S01',order:['S01','S02'],session:{},saveLocal:()=>{local++},
 syncSection:async()=>{cloud++},render:()=>{},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('workflow.js','utf8'),context);
(async()=>{
 assert.equal(await window.fcPersistCurrent(),true);
 assert.equal(local,0,'Consultar una sección no guarda localmente');
 assert.equal(cloud,0,'Consultar una sección no escribe en nube');
 assert.equal(await window.fcNavigate('S02',{scroll:false}),true);
 assert.equal(cloud,0,'Navegar sin cambios no sincroniza');
 events.input[0]({target:{closest:x=>x==='#panel'?{}:null}});
 assert.equal(await window.fcNavigate('S01',{scroll:false}),true);
 assert.equal(local,1,'Una edición requiere guardado');
 assert.equal(cloud,1,'Una edición requiere sincronización');
 assert.equal(await window.fcPersistCurrent(),true);
 assert.equal(cloud,1,'No sincronizar de nuevo después de guardar');
 console.log('Navigation no-op persistence OK');
})().catch(e=>{console.error(e);process.exit(1)});
