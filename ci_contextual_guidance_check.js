const fs=require('fs');
function fail(m){console.error('CONTEXTUAL GUIDANCE ERROR:',m);process.exitCode=1}
const guidance=fs.readFileSync('guidance.js','utf8');
const tree=fs.readFileSync('tree.js','utf8');
const cleanup=fs.readFileSync('data_cleanup.js','utf8');
if(!guidance.includes('fcCurrentContext'))fail('No existe capa global de contexto real');
for(const code of ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14','S15','S16'])if(!guidance.includes(code+':'))fail('Falta contexto para '+code);
if(!guidance.includes('situaciones_observables'))fail('La ayuda no recupera situaciones reales de S05');
if(!guidance.includes("zone==='central'"))fail('La ayuda no recupera el problema central vigente');
if(!guidance.includes("x.confirmed&&x.zone==='direct_cause'"))fail('La ayuda no recupera objetivos específicos confirmados');
if(tree.includes('Pregunta central: ¿este elemento contribuye'))fail('S07 conserva ayuda genérica en lugar de datos reales');
if(!tree.includes("Estamos revisando si “'+n.text+'”"))fail('S07 no inserta el texto real del elemento revisado');
if(!tree.includes("centralText=c?.text||'[POR VERIFICAR]'"))fail('S07 no inserta el problema central real');
if(!cleanup.includes('preserve_confirmed_and_user_data_remove_generated_pending'))fail('La depuración no documenta política de conservación');
if(!cleanup.includes("x?.confirmed||x?.source==='usuario'"))fail('La depuración no protege actividades confirmadas o creadas por usuario');
if(!cleanup.includes("s.staleItems=[]"))fail('La depuración no elimina propuestas obsoletas acumuladas');
if(!process.exitCode)console.log('Contextual guidance and cleanup audit OK');