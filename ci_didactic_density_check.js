const fs=require('fs');
function fail(m){console.error('DIDACTIC UX ERROR:',m);process.exitCode=1}
const completion=fs.readFileSync('completion.js','utf8');
const results=fs.readFileSync('results_layer.js','utf8');
const coherence=fs.readFileSync('coherence_engine.js','utf8');
const planning=fs.readFileSync('planning.js','utf8');
const guided=fs.readFileSync('guided_experience.js','utf8');
for(const id of ['completionS10','completionS11','completionS12'])if(!completion.includes('id="'+id+'"'))fail('Falta contenedor didáctico '+id);
if(/<table class="completion-table"/.test(completion))fail('S12 volvió a una tabla densa en la vista principal');
if(!completion.includes('¿Esta opción parece adecuada para lograr los objetivos del proyecto?'))fail('S10 no contiene la pregunta principal simple');
if(!completion.includes('¿Esta actividad es necesaria para lograr ese resultado?'))fail('S11 no contiene la pregunta principal simple');
if(!completion.includes('¿Cómo sabremos que esto se logró?'))fail('S12 no contiene la pregunta principal simple');
if(!results.includes('¿Este resultado expresa algo concreto que debería lograrse?'))fail('La capa de resultados no usa una pregunta simple');
if(coherence.includes('<div class="coh-score">'))fail('La coherencia vuelve a mostrar un porcentaje competitivo durante el flujo');
if(!coherence.includes('El porcentaje técnico y el diagnóstico completo se muestran en la revisión final S16.'))fail('La coherencia no deriva el detalle completo a S16');
if(!planning.includes('Revisa una actividad por vez'))fail('Presupuesto no declara la lógica de una actividad por vez');
if(!planning.includes('Revisa un elemento por vez'))fail('Riesgos no declara la lógica de un elemento por vez');
if(!guided.includes("item=s.items.find"))fail('El encabezado no muestra la subsección actual');
if(!process.exitCode)console.log('Didactic density audit OK');