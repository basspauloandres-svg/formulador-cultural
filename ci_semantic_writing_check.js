const fs=require('fs'),vm=require('vm');
function fail(m){console.error('SEMANTIC WRITING ERROR:',m);process.exitCode=1}
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('semantic_writing.js','utf8'),context);
const w=context.window.fcWriting;
if(!w)fail('No se expuso fcWriting');
const central=w.objectiveProposals('1 Diferencias en los niveles de dominio instrumental entre integrantes de una misma sección de la banda.','central');
if(!central.some(x=>/^Reducir las diferencias en los niveles de dominio instrumental/i.test(x)))fail('El problema central no genera un objetivo general preciso');
const indirect=w.objectiveProposals('2 Frecuencia desigual de acompañamiento especializado entre las diferentes familias instrumentales.','indirect_cause');
if(!indirect.some(x=>/^Equilibrar la frecuencia de acompañamiento especializado/i.test(x)))fail('La causa indirecta no genera un medio preciso');
const result=w.resultProposal('Equilibrar la frecuencia de acompañamiento especializado entre las diferentes familias instrumentales.');
if(!/equilibrio en la frecuencia de acompañamiento especializado/i.test(result))fail('El resultado no conserva la lógica del objetivo');
const acts=w.activityProposals(result,'Equilibrar la frecuencia de acompañamiento especializado entre las diferentes familias instrumentales.');
if(acts.length<2||acts.some(x=>/^\[POR REVISAR\]/.test(x)))fail('No se generaron actividades específicas para el caso conocido');
const ind=w.indicatorProposal(result,'Resultado');
if(!/frecuencias? de acompañamiento especializado/i.test(ind))fail('El indicador de resultado no mide el cambio esperado');
const plain=w.activityFromPlainLanguage('Se necesitan 6 talleres de trombón.','Proceso de formación implementado','Mejorar el acceso a procesos de formación','');
if(!/^Realizar 6 talleres de trombón/i.test(plain))fail('La redacción asistida no conserva la cantidad suministrada por el usuario');
const battery=w.indicatorBattery('Realizar 6 talleres de trombón.','Actividad');
if(!battery.some(x=>x.indicatorFamily==='cumplimiento'&&/6 programados/.test(x.indicator)&&/100 %/.test(x.meta)))fail('La batería no deriva un indicador de cumplimiento desde 6 talleres');
if(!battery.some(x=>x.indicatorFamily==='participacion'&&/^\[POR VERIFICAR\]/.test(x.meta)))fail('La batería inventa una meta de participación');
if(battery.some(x=>/80\s*%|90\s*%/.test(String(x.meta))))fail('La batería inventa porcentajes de meta');
const resultBattery=w.indicatorBattery('Mejora verificable en el proceso formativo de trombón','Resultado');
if(!resultBattery.some(x=>x.indicatorFamily==='resultado_cambio'&&/mejora/i.test(x.indicator)))fail('No se genera indicador de cambio para un resultado formativo');
if(resultBattery.some(x=>/(número|cantidad) de talleres/i.test(x.indicator)))fail('El indicador de resultado se limita a contar talleres');
const suff=w.activitySufficiency([{text:'Convocar participantes',confirmed:true}],'Proceso de formación implementado');
if(suff.ok)fail('La suficiencia no detecta un conjunto limitado a convocatoria');
const objectives=fs.readFileSync('objectives.js','utf8');
if(!objectives.includes('no se convierte automáticamente en objetivo específico'))fail('S09 no distingue medios indirectos de objetivos específicos');
const results=fs.readFileSync('results_layer.js','utf8');
if(!results.includes("x.zone==='direct_cause'"))fail('Resultados todavía aceptan causas indirectas como objetivos específicos');
const coherence=fs.readFileSync('coherence_engine.js','utf8');
if(!coherence.includes('Causas directas → objetivos específicos'))fail('Coherencia no comprueba la jerarquía causal correcta');
const docs=fs.readFileSync('deliverables.js','utf8');
if(!docs.includes("spec=obj.filter(x=>x.zone==='direct_cause')"))fail('Documento final mezcla causas indirectas con objetivos específicos');
if(!process.exitCode)console.log('Semantic writing audit OK');
const strategyContext=w.strategyProposals(['Mejorar las condiciones de nivelación para nuevos estudiantes con trayectorias formativas diferentes.']);
if(strategyContext.some(x=>/^\[POR REVISAR\]/.test(x)))fail('S10 sigue devolviendo una estrategia genérica para un objetivo real');
if(!strategyContext.some(x=>/nivelación|trayectorias formativas/i.test(x)))fail('S10 no conserva el contenido real del objetivo específico en la alternativa');
const strategyMissing=w.strategyProposals([]);
if(!strategyMissing[0].includes('Faltan objetivos específicos confirmados'))fail('S10 no distingue ausencia de objetivos de una propuesta válida');

const contextualActivityHelp=w.activityGuidance(
 'Proceso de formación instrumental implementado',
 'Mejorar el acceso a procesos de formación instrumental',
 {population:'Integrantes de la banda',territory:'Municipio de prueba',existingActivities:['Convocar a los participantes']}
);
if(!contextualActivityHelp.suggestions.length)fail('S11 no genera ayuda para una actividad adicional');
if(contextualActivityHelp.suggestions.some(x=>!x.includes('Proceso de formación instrumental implementado')))fail('La ayuda de actividad adicional no usa el resultado real');
if(!contextualActivityHelp.questions.some(x=>x.includes('Mejorar el acceso a procesos de formación instrumental')))fail('Las preguntas de actividad adicional no usan el objetivo específico real');
if(!contextualActivityHelp.questions.some(x=>x.includes('Integrantes de la banda')))fail('La ayuda de actividad adicional no usa la población real cuando existe');
if(contextualActivityHelp.suggestions.some(x=>/\b(\d+|seis|diez|veinte)\b/i.test(x)))fail('La ayuda de actividad adicional inventa cantidades');

const accessResult='Ampliación verificable del acceso a talleres especializados para algunas familias instrumentales.';
const accessResultBattery=w.indicatorBattery(accessResult,'Resultado');
if(accessResultBattery.some(x=>/^\[POR REVISAR\]/.test(x.indicator)))fail('S12 devuelve un indicador genérico para un resultado real de ampliación de acceso');
if(!accessResultBattery.some(x=>/familias instrumentales.*acceso registrado.*talleres especializados/i.test(x.indicator)))fail('S12 no conserva los datos reales del resultado de acceso');
const accessIndicator=accessResultBattery[0];
if(!/línea base/i.test(accessIndicator.formula)||!accessIndicator.unidad)fail('S12 no deriva una fórmula/unidad pertinente para el resultado de acceso');
if(!/^\[POR VERIFICAR\]/.test(accessIndicator.meta))fail('S12 inventó la meta del resultado de acceso');
const contextualIndicator=w.indicatorGuidance(accessResult,'Resultado',accessIndicator.indicatorFamily,{objectiveText:'Ampliar el acceso a talleres especializados',population:'Integrantes de la banda',territory:'Municipio de prueba'});
if(!/Ampliación verificable del acceso a talleres especializados/i.test(contextualIndicator.question))fail('S12 no formula la pregunta con el resultado real');
if(!contextualIndicator.context.population.includes('Integrantes de la banda'))fail('S12 no conserva la población real en la ayuda');
