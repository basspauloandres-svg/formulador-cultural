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
if(contextualActivityHelp.suggestions.some(x=>x.split(/\s+/).length>28))fail('La ayuda de actividad adicional genera enunciados demasiado extensos');
if(contextualActivityHelp.context.result!=='Proceso de formación instrumental implementado')fail('La ayuda perdió el resultado real al compactar la redacción');
if(!contextualActivityHelp.questions.some(x=>x.includes('Mejorar el acceso a procesos de formación instrumental')))fail('Las preguntas de actividad adicional no usan el objetivo específico real');
if(contextualActivityHelp.context.population!=='Integrantes de la banda')fail('La ayuda de actividad adicional no conserva la población real en el contexto');
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

const longPopulationActivity=w.activityFromPlainLanguage('Se necesitan 6 talleres de trombón','Proceso formativo implementado','Mejorar la formación','Integrantes de la banda con trayectorias distintas, niveles de dominio diversos y criterios de selección específicos');
if(longPopulationActivity.includes('trayectorias distintas')||longPopulationActivity.length>100)fail('La actividad sigue incrustando la caracterización poblacional en el enunciado');
if(!/6 talleres de trombón/i.test(longPopulationActivity))fail('La actividad perdió el dato operativo suministrado por el usuario');

const longActivity='Realizar una actividad extensa que repite el problema central, el objetivo específico, el resultado esperado y toda la caracterización territorial y poblacional del proyecto dentro del mismo enunciado operativo para explicar nuevamente la justificación completa.';
const longReview=w.activityWritingReview(longActivity);
if(longReview.ok)fail('La revisión semántica acepta una actividad convertida en párrafo contextual');
const shortReview=w.activityWritingReview('Realizar seis talleres de trombón.');
if(!shortReview.ok)fail('La revisión semántica rechaza una actividad breve y operativa');

const longResult='Resultado esperado: mejora amplia y verificable del proceso con una descripción extensa que vuelve a repetir el objetivo específico, el problema central, la población, el territorio, la justificación y múltiples condiciones del proyecto dentro del mismo enunciado.';
if(w.resultWritingReview(longResult).ok)fail('La revisión semántica acepta un resultado convertido en párrafo contextual');
if(!w.resultWritingReview('Ampliación verificable del acceso a talleres especializados.').ok)fail('La revisión semántica rechaza un resultado breve y verificable');
if(w.compactPresentationText(longResult,12).split(/\s+/).length>12)fail('La compactación de presentación supera el límite solicitado');

const fieldAssist=w.indicatorFieldAssist('Realizar seis talleres de trombón','Actividad','participacion',{},{});
if(!fieldAssist.formula?.some(x=>/asistencias registradas/i.test(x)))fail('La asistencia de ficha no propone fórmula para indicador de participación');
if(!fieldAssist.unidad?.some(x=>/personas/i.test(x)))fail('La asistencia de ficha no propone unidad para indicador de participación');
if(!fieldAssist.medioVerificacion?.some(x=>/asistencia/i.test(x)))fail('La asistencia de ficha no propone medio de verificación pertinente');

const noviceGuide=w.indicatorFieldGuide('Realizar seis talleres de trombón','Actividad','cumplimiento',{}, {indicator:'Porcentaje de talleres realizados'});
if(!/operación|regla/i.test(noviceGuide.formula.meaning))fail('La ayuda no explica qué significa fórmula');
if(!/multiplica por 100|%/i.test(noviceGuide.unidad.write+noviceGuide.unidad.example))fail('La ayuda no orienta sobre la unidad porcentual');
if(!/valor inicial/i.test(noviceGuide.lineaBase.meaning))fail('La ayuda no explica línea base');
if(!/compromete a alcanzar/i.test(noviceGuide.meta.meaning))fail('La ayuda no explica meta');
if(!/fuente/i.test(noviceGuide.medioVerificacion.meaning))fail('La ayuda no explica medio de verificación');
if(!/frecuencia|cada cuánto|momento/i.test(noviceGuide.periodicidad.meaning))fail('La ayuda no explica periodicidad');


const genericResult='Fortalecimiento de la articulación territorial entre agentes culturales y espacios de circulación.';
const genericActivities=w.activityProposals(genericResult,'Fortalecer la articulación territorial entre agentes culturales');
if(!genericActivities.length||genericActivities.some(x=>/^\[POR REVISAR\]/.test(x)))fail('S11 deja resultados válidos sin actividades accionables cuando el vocabulario no coincide con patrones conocidos');
if(!genericActivities.every(x=>w.activityWritingReview(x).ok))fail('Las actividades genéricas de respaldo no cumplen el contrato de escritura');

const genericActivity='Articular espacios de circulación para agrupaciones culturales del territorio.';
const genericBattery=w.indicatorBattery(genericActivity,'Actividad');
if(!genericBattery.length||genericBattery.some(x=>/^\[POR REVISAR\]/.test(x.indicator)))fail('S12 deja actividades válidas sin una definición de indicador confirmable');
const genericMain=genericBattery.find(x=>x.indicatorFamily==='cumplimiento')||genericBattery[0];
if(genericMain.unidad!=='%'||!/100/.test(genericMain.formula)||!/100/.test(genericMain.meta))fail('El indicador genérico de actividad no entrega una ficha mínima coherente');
const genericAssist=w.indicatorFieldAssist(genericActivity,'Actividad',genericMain.indicatorFamily,{},genericMain);
if(!genericAssist.unidad?.includes('%'))fail('La ayuda técnica no conserva una unidad derivable de un indicador porcentual');

const genericResultIndicator=w.indicatorBattery(genericResult,'Resultado')[0];
if(/^\[POR REVISAR\]/.test(genericResultIndicator.indicator))fail('S12 deja un resultado válido sin indicador confirmable');
const genericObjectiveIndicator=w.indicatorBattery('Fortalecer la articulación territorial entre agentes culturales.','Objetivo')[0];
if(/^\[POR REVISAR\]/.test(genericObjectiveIndicator.indicator))fail('S12 deja un objetivo válido sin indicador confirmable');


const legacyLongActivity='Ampliación verificable del acceso a talleres especializados para algunas familias instrumentales dirigido a la población participante estará conformada por los estudiantes de la Banda Sinfónica Estudiantil que participen directamente en los talleres instrumentales por secciones. Permanece por verificar el número exacto de participantes y sus criterios definitivos de selección.';
if(!w.activityNeedsSynthesis(legacyLongActivity,'Ampliación verificable del acceso a talleres especializados para algunas familias instrumentales.'))fail('S11 no detecta una actividad heredada que en realidad repite el resultado y el contexto');
if(w.activityNeedsSynthesis('Implementar las acciones formativas previstas','Ampliación verificable del acceso a talleres especializados para algunas familias instrumentales.'))fail('S11 intenta sintetizar una actividad ya correcta');

const genericResultAid=w.indicatorBattery('Fortalecimiento de la articulación territorial entre agentes culturales y espacios de circulación.','Resultado')[0];
if(!/100/.test(genericResultAid.formula)||genericResultAid.unidad!=='%')fail('S12 todavía deja sin orientación técnica un resultado cultural genérico');
const genericObjectiveAid=w.indicatorBattery('Fortalecer la articulación territorial entre agentes culturales.','Objetivo')[0];
if(!/100/.test(genericObjectiveAid.formula)||genericObjectiveAid.unidad!=='%')fail('S12 todavía deja sin orientación técnica un objetivo cultural genérico');
const genericFieldAid=w.indicatorFieldAssist('Articular espacios de circulación para agrupaciones culturales del territorio.','Actividad','cumplimiento',{}, {indicator:'Porcentaje de cumplimiento documentado de la actividad respecto de lo programado.',formula:'(Avance ejecutado / avance programado) × 100'});
if(!genericFieldAid.responsable?.length||!genericFieldAid.plazo?.length||!genericFieldAid.unidad?.includes('%'))fail('S12 no ofrece ayudas accionables para responsable, plazo y unidad');


const metaAssist=w.indicatorFieldAssist('Articular espacios de circulación para agrupaciones culturales del territorio.','Actividad','cumplimiento',{}, {indicator:'Porcentaje de cumplimiento documentado de la actividad respecto de lo programado.',formula:'(Avance ejecutado / avance programado) × 100',unidad:'%'});
if(!metaAssist.meta?.some(v=>/100\s*%/.test(v)))fail('La ayuda de meta para cumplimiento porcentual no ofrece una propuesta resolutiva');
const resultGuide=w.indicatorFieldGuide('Fortalecimiento de la articulación territorial entre agentes culturales.','Resultado','resultado',{}, {unidad:'%',formula:'(Criterios de logro cumplidos / criterios de logro definidos) × 100',indicator:'Porcentaje de criterios de logro cumplidos'});
if(!/%/.test(resultGuide.meta.example)||!/alcance real del proyecto/i.test(resultGuide.meta.example))fail('La guía de meta de resultado no orienta la decisión en la unidad disponible');
