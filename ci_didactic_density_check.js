const fs=require('fs');
function fail(m){console.error('DIDACTIC UX ERROR:',m);process.exitCode=1}
const completion=fs.readFileSync('completion.js','utf8');
const results=fs.readFileSync('results_layer.js','utf8');
const coherence=fs.readFileSync('coherence_engine.js','utf8');
const planning=fs.readFileSync('planning.js','utf8');
const guided=fs.readFileSync('guided_experience.js','utf8');
const semantic=fs.readFileSync('semantic_writing.js','utf8');
for(const id of ['completionS10','completionS11','completionS12'])if(!completion.includes('id="'+id+'"'))fail('Falta contenedor didáctico '+id);
if(/<table class="completion-table"/.test(completion))fail('S12 volvió a una tabla densa en la vista principal');
if(!completion.includes('¿Esta opción parece adecuada para lograr los objetivos del proyecto?'))fail('S10 no contiene la pregunta principal simple');
if(!completion.includes('Ayúdame a redactarla'))fail('S10 no ofrece ayuda visible para redactar la alternativa');
if(!completion.includes('Todavía no escribas actividades concretas'))fail('S10 no explica la diferencia entre alternativa y actividad');
if(!completion.includes('data-use-writing'))fail('S10 no permite adoptar una propuesta de redacción');
if(!completion.includes('¿Qué debe ocurrir para lograr este resultado?'))fail('S11 no guía la descomposición operativa con una pregunta simple');
if(!completion.includes('data-act-plain')||!completion.includes('data-act-convert'))fail('S11 no permite partir de lenguaje cotidiano y convertirlo en actividad técnica');
if(!completion.includes('Viene de')||!completion.includes('Problema central')||!completion.includes('Causa directa'))fail('S11 no muestra trazabilidad metodológica resumida');
if(!guided.includes('sectionHeaderCopy')||!guided.includes('section-screen-header'))fail('El recorrido no utiliza el encabezado visual unificado');
for(const code of ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14','S15','S16'])if(!guided.includes(code+':{title:'))fail('Falta configuración visual del encabezado para '+code);
if(!guided.includes('stageDots'))fail('El encabezado no muestra el progreso por etapas');
if(!completion.includes('Ayúdame con IA'))fail('S11 no ofrece asistencia contextual visible');
if(!completion.includes('activityProjectContext'))fail('S11 no reúne el contexto real del proyecto para ayudar a redactar actividades');
if(!completion.includes('Actividades ya aprobadas para este resultado'))fail('S11 no muestra las actividades previas al proponer una actividad adicional');
if(!completion.includes('showActivityHelp:true'))fail('Al añadir otra actividad no se abre automáticamente la misma asistencia contextual');
if(!completion.includes('Falta conectar esta actividad'))fail('S11 no explica cómo resolver una actividad huérfana');
if(!completion.includes('data-act-link-result')||!completion.includes('linkActivityToResult'))fail('S11 no permite vincular una actividad huérfana con un resultado confirmado');
if(!completion.includes('¿Cómo comprobaremos que esto ocurrió?'))fail('S12 no presenta la lógica asistida de comprobación');
if(!completion.includes('data-ind-help')||!completion.includes('data-use-indicator'))fail('S12 no permite pedir y adoptar ayuda contextual para redactar el indicador');
if(!completion.includes('indicatorProjectContext'))fail('S12 no reúne el contexto real del proyecto para formular indicadores');
if(!completion.includes("Puedes continuar con '+q.issues.length+' dato(s) por verificar"))fail('S12 no deja claro que los pendientes técnicos no bloquean el avance');
if(!completion.includes('Batería sugerida para este elemento'))fail('S12 no presenta múltiples dimensiones de indicador');
if(!completion.includes('Ver y completar ficha técnica'))fail('S12 no mantiene el detalle técnico en una capa secundaria');
if(!completion.includes('Fórmula o criterio')||!completion.includes('Línea base')||!completion.includes('Meta'))fail('S12 perdió elementos de la ficha técnica');
if(!completion.includes('[POR VERIFICAR]'))fail('S12 no conserva explícitamente datos pendientes');
if(!semantic.includes('indicatorBattery'))fail('El motor semántico no construye una batería de indicadores');
if(!semantic.includes('activityGuidance')||!semantic.includes('activityFromPlainLanguage'))fail('El motor semántico no guía la formulación de actividades');
if(!semantic.includes('indicatorGuidance'))fail('El motor semántico no distingue niveles de indicador');
if(!semantic.includes('indicatorQuality'))fail('No existe control de calidad de indicadores');
if(!results.includes('¿Este resultado expresa algo concreto que debería lograrse?'))fail('La capa de resultados no usa una pregunta simple');
const objectives=fs.readFileSync('objectives.js','utf8');
if(!objectives.includes('¿Qué cambio principal debería lograr el proyecto frente a este problema?'))fail('S09 no guía el objetivo general con una pregunta específica');
if(!objectives.includes('data-use-objective'))fail('S09 no permite elegir una propuesta de objetivo');
if(!objectives.includes('sin [POR REVISAR]'))fail('S09 permite confirmar redacciones todavía marcadas por revisar');
if(!objectives.includes('window.fcS09TransitionStatus'))fail('S09 no expone el estado de coherencia con S07');
if(!objectives.includes("code:'direct_causes'"))fail('S09 no detecta ausencia de causas directas');
if(!objectives.includes('Revisar S07 · árbol de problemas'))fail('S09 no ofrece retorno directo a S07 cuando hay inconsistencias');
if(!completion.includes('window.fcS09TransitionStatus'))fail('S10 no bloquea el avance cuando S07/S09 son inconsistentes');
if(!objectives.includes('¿Qué cambio principal debería lograr el proyecto frente a este problema?'))fail('S09 no guía el objetivo general con una pregunta específica');
if(!objectives.includes('¿Qué condición debería mejorar para apoyar uno de los objetivos específicos?'))fail('S09 no distingue una causa indirecta como medio');
if(!semantic.includes('Reducir las diferencias en'))fail('El motor semántico no contempla transformación precisa de diferencias');
if(!semantic.includes('Equilibrar la frecuencia de'))fail('El motor semántico no contempla transformación precisa de frecuencia desigual');
if(!results.includes("x.zone==='direct_cause'"))fail('Los resultados todavía se derivan de causas indirectas');
if(coherence.includes('<div class="coh-score">'))fail('La coherencia vuelve a mostrar un porcentaje competitivo durante el flujo');
if(!coherence.includes('El porcentaje técnico y el diagnóstico completo se muestran en la revisión final S16.'))fail('La coherencia no deriva el detalle completo a S16');
if(!planning.includes('Revisa una actividad por vez'))fail('Presupuesto no declara la lógica de una actividad por vez');
if(!planning.includes('Revisa un elemento por vez'))fail('Riesgos no declara la lógica de un elemento por vez');
if(!guided.includes("item=s.items.find"))fail('El encabezado no muestra la subsección actual');
if(guided.includes("class=\"guided-stage '+(cur?'current ':'')+ss+'\""))fail('El recorrido usa estados CSS genéricos que pueden colisionar con .progress');
if(!guided.includes("'stage-'+ss"))fail('El recorrido no usa clases de estado específicas para cada etapa');
if(!process.exitCode)console.log('Didactic density audit OK');
if(!completion.includes('Usar este indicador y continuar'))fail('S12 no ofrece una acción principal clara para confirmar y avanzar');
if(!completion.includes('Continuar a S13 →'))fail('El último indicador no explica que el recorrido continúa a S13');
if(!completion.includes('Estos datos no bloquean el avance'))fail('S12 no diferencia pendientes técnicos de requisitos para avanzar');

if(!completion.includes('Completar datos pendientes con ayuda'))fail('S12 no ofrece una ruta visible para completar los datos técnicos pendientes');
if(!completion.includes('indicatorMissingFields')||!completion.includes('indicatorScheduleSuggestions'))fail('S12 no guía los campos pendientes ni reutiliza cronograma cuando existe');
if(!completion.includes('Todavía no tengo este dato'))fail('S12 no permite conservar explícitamente [POR VERIFICAR] durante la ayuda');
if(!planning.includes('risk-finish-box')||!planning.includes('Continuar a S16 · revisión final'))fail('S15 no muestra una salida clara después de la matriz de riesgos');
if(!planning.includes('de '+"'"+'+targets.length+'+"'"+' elementos revisados'))fail('S15 no muestra progreso de revisión de riesgos');

if(!completion.includes('Indicador definido ✓'))fail('S12 no distingue la definición del indicador de la ficha técnica');
if(!completion.includes('Ficha técnica pendiente'))fail('S12 no muestra el estado técnico pendiente por separado');
if(!completion.includes("definitionStatus='DEFINIDO'")||!completion.includes("technicalStatus=q.ok?'COMPLETA':'PENDIENTE'"))fail('S12 no guarda estados separados de definición y completitud técnica');

if(!completion.includes('El cronograma ya aporta datos que puedes reutilizar'))fail('S12 no muestra propuestas provenientes del cronograma');
if(!completion.includes('scheduleReconciliationForIndicator')||!completion.includes('fcReconcileIndicatorsFromSchedule'))fail('No existe reconciliación estructurada S12↔S13');
if(!completion.includes('data-accept-schedule'))fail('S12 no permite confirmar explícitamente un dato sugerido desde S13');
if(!planning.includes('No se aplican sin tu confirmación'))fail('S13 no explica que responsable y plazo se proponen sin sobrescribir el indicador');

const review=fs.readFileSync('review_dashboard.js','utf8');
if(!review.includes('Pendientes concretos'))fail('S16 no presenta una lista concreta de pendientes');
if(!review.includes('data-focus-indicator')||!(review.includes('Abrir este indicador')||review.includes('Resolver este indicador')))fail('S16 no lleva al indicador específico pendiente');
if(!review.includes('Falta: '))fail('S16 no enumera únicamente los campos realmente pendientes');
if(!completion.includes('fcFocusIndicator')||!completion.includes('fcFocusResultActivities'))fail('El formulador no expone navegación al componente específico desde S16');
if(!completion.includes('Corrección solicitada desde S16'))fail('S11 no informa cuando se abre un resultado específico desde la revisión final');

if(!coherence.includes('fcGetCurrentValidationSnapshot'))fail('Coherencia no expone una estructura vigente común');
if(!review.includes('fcGetCurrentValidationSnapshot'))fail('S16 no usa la misma estructura vigente del diagnóstico');
if(review.includes("const missingValue=v=>"))fail('S16 volvió a duplicar la lógica de validación de indicadores');

const deliverables=fs.readFileSync('deliverables.js','utf8'),exportSrc=fs.readFileSync('export_completion.js','utf8'),objectivesSrc=fs.readFileSync('objectives.js','utf8');
if(!objectivesSrc.includes('fcGetObjectives'))fail('No existe getter de objetivos vigentes');
if(!deliverables.includes('window.fcGetObjectives'))fail('Las exportaciones documentales no usan objetivos vigentes');
if(!exportSrc.includes('rowsFrom(window.fcGetObjectives)'))fail('El Excel técnico no usa objetivos vigentes');

if(!completion.includes('activityStoredContext'))fail('S11 no conserva contexto separado del texto de actividad');
if(!completion.includes('context=activityStoredContext'))fail('Las actividades asistidas no guardan su contexto estructurado');
if(semantic.includes("+' dirigido a '+low(pop)"))fail('La redacción de actividad vuelve a incrustar toda la población en el texto');

if(!semantic.includes('activityWritingReview'))fail('No existe control semántico de extensión para actividades');
if(!completion.includes('Acorta la redacción antes de aprobar'))fail('S11 no explica cuando una actividad se convirtió en un párrafo');
if(!completion.includes('review.ok'))fail('S11 no bloquea la aprobación de actividades semánticamente extensas');

if(!semantic.includes('resultWritingReview')||!results.includes('Acorta el resultado antes de aprobar'))fail('Los resultados no aplican el límite semántico transversal');
if(!planning.includes('compactLabel')||!planning.includes('riskWritingIssues'))fail('Cronograma y riesgos no aplican la compactación transversal');
const deliverableSrc=fs.readFileSync('deliverables.js','utf8'),exportSrc2=fs.readFileSync('export_completion.js','utf8');
if(!deliverableSrc.includes('compact(x.activityText,28)'))fail('Los documentos finales no compactan etiquetas operativas repetitivas');
if(!exportSrc2.includes('Texto_original'))fail('El respaldo técnico no preserva el texto original cuando muestra una versión compacta');

if(!completion.includes("['formula','Fórmula o criterio'"))fail('La ayuda de S12 no incluye fórmula o criterio');
if(!completion.includes("['unidad','Unidad de medida'"))fail('La ayuda de S12 no incluye unidad de medida');
if(!completion.includes("['medioVerificacion','Medio de verificación'"))fail('La ayuda de S12 no incluye medio de verificación');
if(!completion.includes('indicatorFieldAssist'))fail('S12 no usa asistencia contextual por campo');

const reviewGuide=fs.readFileSync('review_dashboard.js','utf8');
if(!reviewGuide.includes('Cómo usar esta pantalla'))fail('S16 no explica cómo resolver los pendientes');
if(!reviewGuide.includes('¿Cómo completo este indicador?'))fail('S16 no ofrece ayuda para cada indicador pendiente');
if(!reviewGuide.includes('¿Qué debo hacer?'))fail('S16 no explica cómo resolver resultados sin actividades');
if(!reviewGuide.includes('Guardar avance'))fail('S16 no permite guardar el avance de la revisión de forma explícita');
if(!reviewGuide.includes('saveReviewProgress'))fail('S16 no tiene persistencia visible de la revisión');

if(!completion.includes('¿Qué significa?')||!completion.includes('¿Qué debes escribir?')||!completion.includes('Ejemplo para orientarte'))fail('S12 no explica cada campo técnico en lenguaje de principiante');
if(!semantic.includes('indicatorFieldGuide'))fail('No existe guía contextual por campo del indicador');
