(()=>{
const clean=v=>String(v||'')
 .replace(/^\s*(?:P)?\d+[.)-]?\s*/i,'')
 .replace(/^\s*\[POR (?:REVISAR|VERIFICAR|DEFINIR)\]\s*/i,'')
 .replace(/^\s*Situación deseada respecto de:\s*/i,'')
 .replace(/\s+/g,' ').trim().replace(/[.]+$/,'');
const low=s=>s?s.charAt(0).toLowerCase()+s.slice(1):s;
const finish=s=>s&&/[.!?]$/.test(s)?s:s+'.';
function uniq(xs){return [...new Set(xs.filter(Boolean).map(finish))].slice(0,3)}
function objectiveProposals(text,zone){
 const t=clean(text);if(!t)return ['[POR REVISAR]'];const out=[];
 if(/^diferencias? en\b/i.test(t)){const rest=t.replace(/^diferencias? en\s*/i,'');out.push('Reducir las diferencias en '+rest);out.push('Disminuir las brechas observadas en '+rest)}
 else if(/^frecuencia desigual de\b/i.test(t)){const rest=t.replace(/^frecuencia desigual de\s*/i,'');out.push('Equilibrar la frecuencia de '+rest);out.push('Regularizar la frecuencia de '+rest)}
 else if(/^baja participación (?:de|en)\b/i.test(t)){out.push(t.replace(/^baja participación/i,'Incrementar la participación'))}
 else if(/^participación limitada (?:de|en)\b/i.test(t)){out.push(t.replace(/^participación limitada/i,'Incrementar la participación'))}
 else if(/^acceso restringido a\b/i.test(t)){out.push('Ampliar el acceso a '+t.replace(/^acceso restringido a\s*/i,''));out.push('Mejorar las condiciones de acceso a '+t.replace(/^acceso restringido a\s*/i,''))}
 else if(/^disminución de\b/i.test(t)){out.push('Incrementar '+t.replace(/^disminución de\s*/i,''))}
 else if(/^insuficiencia de\b/i.test(t)||/^condiciones insuficientes de\b/i.test(t)){const rest=t.replace(/^insuficiencia de\s*/i,'').replace(/^condiciones insuficientes de\s*/i,'');out.push('Mejorar las condiciones de '+rest)}
 else if(/^limitad[oa]s?\b/i.test(t)){out.push(t.replace(/^limitad[oa]s?/i,'Ampliar'))}
 else if(/^falta de\b/i.test(t)||/^ausencia de\b/i.test(t)||/^carencia de\b/i.test(t)){const rest=t.replace(/^(falta|ausencia|carencia) de\s*/i,'');out.push('Asegurar la disponibilidad de '+rest)}
 else if(/^filtración sonora\b/i.test(t)){out.push('Reducir la '+low(t))}
 else if(/^interferencia\b/i.test(t)||/^interferencias\b/i.test(t)){out.push('Reducir '+low(t))}
 else if(/^deterioro de\b/i.test(t)){out.push('Mejorar '+t.replace(/^deterioro de\s*/i,''))}
 else if(/ingreso periódico de nuevos estudiantes/i.test(t)&&/trayectorias formativas diferentes/i.test(t)){
  out.push('Reducir las brechas iniciales de formación entre los nuevos estudiantes que ingresan al proceso');
  out.push('Mejorar las condiciones de nivelación para nuevos estudiantes con trayectorias formativas diferentes');
  out.push('Favorecer una incorporación formativa más equilibrada de los nuevos estudiantes')
 }
 if(zone==='indirect_cause'&&/nuevos estudiantes/i.test(t)&&/trayectorias formativas diferentes/i.test(t)&&!out.length){
  out.push('Reducir las brechas iniciales de formación entre los nuevos estudiantes');
  out.push('Mejorar las condiciones de nivelación para los nuevos estudiantes')
 }
 if((zone==='indirect_effect'||zone==='direct_effect')&&/^reducción de\b/i.test(t)){out.unshift('Incrementar '+t.replace(/^reducción de\s*/i,''))}
 if(!out.length)return ['[POR REVISAR] Redactar el cambio deseado para: '+t+'.'];
 return uniq(out)
}
function looksLikeActivity(text){
 const t=clean(text);
 return /^(hacer|realizar|implementar|ejecutar|organizar|aplicar|desarrollar|llevar a cabo|capacitar|convocar|contratar|comprar|dictar|crear)\b/i.test(t)
}
function objectiveWritingReview(text,zone){
 const t=clean(text),issues=[];
 if(!t)return {ok:false,issues:['La redacción está vacía.']};
 if(looksLikeActivity(t))issues.push(zone==='indirect_cause'?'La redacción parece una actividad. En este punto conviene expresar una condición de apoyo o un cambio deseado.':'La redacción parece una actividad. Conviene expresar el cambio que se busca lograr.');
 if(/^\[POR REVISAR\]/i.test(String(text||'')))issues.push('La formulación todavía está marcada [POR REVISAR].');
 return {ok:issues.length===0,issues}
}

function strategyProposals(items){
 const src=(items||[]).map(clean).filter(Boolean);
 if(!src.length)return ['[POR REVISAR] Definir una estrategia coherente con los objetivos específicos confirmados.'];
 const joined=src.join(' | ');
 if(/frecuencia de acompañamiento especializado/i.test(joined))return uniq([
  'Organizar un esquema de acompañamiento especializado que distribuya de manera equilibrada la atención entre las familias instrumentales',
  'Reorganizar el acompañamiento especializado para equilibrar su frecuencia entre las familias instrumentales'
 ]);
 if(/niveles? de dominio instrumental/i.test(joined))return uniq([
  'Desarrollar una estrategia de acompañamiento diferenciado orientada a reducir las brechas de dominio instrumental entre integrantes',
  'Articular acciones de acompañamiento que respondan a las diferencias de dominio instrumental identificadas'
 ]);
 return ['[POR REVISAR] Definir una estrategia que permita alcanzar: '+src.join('; ')+'.']
}
function resultProposal(objective){
 const t=clean(objective);const rules=[
  [/^Reducir las diferencias en\s+/i,'Reducción verificable de las diferencias en '],
  [/^Disminuir las brechas observadas en\s+/i,'Disminución verificable de las brechas en '],
  [/^Equilibrar la frecuencia de\s+/i,'Mayor equilibrio en la frecuencia de '],
  [/^Regularizar la frecuencia de\s+/i,'Frecuencia regularizada de '],
  [/^Incrementar\s+/i,'Incremento verificable de '],
  [/^Mejorar las condiciones de\s+/i,'Mejora verificable de las condiciones de '],
  [/^Mejorar\s+/i,'Mejora verificable de '],
  [/^Ampliar\s+/i,'Ampliación verificable de '],
  [/^Asegurar la disponibilidad de\s+/i,'Disponibilidad asegurada de '],
  [/^Reducir\s+/i,'Reducción verificable de ']
 ];
 for(const [re,prefix] of rules)if(re.test(t))return finish(prefix+t.replace(re,''));
 return '[POR REVISAR] Definir un resultado verificable para: '+t+'.'
}
function activityProposals(result,objective){
 const r=clean(result),o=clean(objective),base=o||r;
 if(/frecuencia de acompañamiento especializado/i.test(base))return uniq([
  'Caracterizar la frecuencia actual de acompañamiento especializado por familia instrumental',
  'Definir e implementar una programación de acompañamiento especializado entre las familias instrumentales',
  'Registrar y revisar periódicamente el cumplimiento de la programación de acompañamiento especializado'
 ]);
 if(/niveles? de dominio instrumental/i.test(base))return uniq([
  'Caracterizar los niveles de dominio instrumental de los integrantes por sección',
  'Implementar acciones de acompañamiento acordes con las diferencias identificadas entre integrantes',
  'Realizar una verificación periódica de los cambios observados en los niveles de dominio instrumental'
 ]);
 if(/formaci[oó]n|taller|capacitaci[oó]n|acompañamiento/i.test(base))return uniq([
  'Preparar las condiciones necesarias para desarrollar el proceso formativo',
  'Implementar las acciones formativas previstas',
  'Registrar y revisar el desarrollo del proceso formativo'
 ]);
 return ['[POR REVISAR] Definir actividades concretas que produzcan el resultado: '+r+'.']
}
function normalizeQuantityWord(v){
 const m={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,dieciséis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20};
 const k=String(v||'').toLowerCase();return m[k]||null
}
function extractQuantity(text){
 const t=clean(text);
 let m=t.match(/\b(\d+)\s+([a-záéíóúñü]+(?:\s+de\s+[a-záéíóúñü]+)?)/i);
 if(m)return {value:Number(m[1]),raw:m[1],unit:m[2]};
 m=t.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|diecis[eé]is|diecisiete|dieciocho|diecinueve|veinte)\s+([a-záéíóúñü]+(?:\s+de\s+[a-záéíóúñü]+)?)/i);
 if(m)return {value:normalizeQuantityWord(m[1]),raw:m[1],unit:m[2]};
 return null
}
function activityGuidance(result,objective){
 const r=clean(result),o=clean(objective),t=(o+' '+r).toLowerCase(),suggestions=[],questions=[];
 if(/formaci[oó]n|taller|capacitaci[oó]n|aprendizaje|acompañamiento/.test(t)){
  suggestions.push('Convocar o seleccionar participantes','Preparar contenidos, materiales o condiciones','Realizar las acciones formativas previstas','Registrar asistencia o participación','Realizar seguimiento al proceso');
  questions.push('¿Hay que preparar algo antes?','¿Qué acción produce directamente el resultado?','¿Con qué población se realizará?','¿Hace falta registrar o hacer seguimiento?')
 }else{
  suggestions.push('Preparar las condiciones necesarias','Realizar la acción principal que produce el resultado','Registrar lo realizado','Revisar el resultado obtenido');
  questions.push('¿Qué debe estar listo antes?','¿Qué acción produce directamente el resultado?','¿Qué debe registrarse o revisarse después?')
 }
 return {suggestions:[...new Set(suggestions)].slice(0,5),questions:[...new Set(questions)].slice(0,4)}
}
function activityFromPlainLanguage(input,result,objective,population){
 const t=clean(input);if(!t)return '[POR REVISAR]';
 const q=extractQuantity(t);let out=t;
 out=out.replace(/^se\s+(?:necesitan?|requieren?)\s+/i,'').replace(/^necesitamos\s+/i,'');
 if(q&&/(taller|sesion|sesión|jornada|encuentro|capacitaci[oó]n|actividad)/i.test(out)){
  out='Realizar '+out.replace(/^realizar\s+/i,'');
 }else if(!/^(realizar|implementar|desarrollar|organizar|preparar|convocar|vincular|registrar|evaluar|hacer|llevar a cabo)\b/i.test(out)){
  out='Realizar '+low(out)
 }
 out=finish(out);
 const pop=clean(population);
 if(pop&&!/participantes?|poblaci[oó]n|personas|beneficiari/i.test(out))out=out.replace(/[.]$/,'')+' dirigido a '+low(pop)+'.';
 return out
}
function activitySufficiency(items,result){
 const xs=(items||[]).filter(x=>x&&x.confirmed!==false).map(x=>clean(x.text||x)).filter(Boolean),r=clean(result).toLowerCase();
 const joined=xs.join(' | ').toLowerCase(),issues=[];
 if(!xs.length)return {ok:false,issues:['Todavía no hay actividades confirmadas para este resultado.']};
 if(/implementad|formaci[oó]n|proceso|taller|servicio|programa/.test(r)&&!/(realizar|implementar|desarrollar|ejecutar|llevar a cabo|prestar|producir)/.test(joined))issues.push('Las actividades actuales preparan o apoyan el proceso, pero todavía no aparece una acción que produzca directamente el resultado.');
 if(xs.every(x=>/convocar|seleccionar|difundir|invitar/i.test(x)))issues.push('El conjunto se concentra en convocatoria o vinculación; falta revisar cómo se ejecutará el resultado.');
 return {ok:issues.length===0,issues}
}
function sourceNoun(text){
 const t=clean(text),q=extractQuantity(t);
 if(q)return q.unit.replace(/\s+de\s+$/i,'');
 const m=t.match(/\b(taller(?:es)?|sesion(?:es)?|sesión(?:es)?|jornada(?:s)?|encuentro(?:s)?|actividad(?:es)?|capacitaci[oó]n(?:es)?)\b/i);
 return m?m[1]:'acciones'
}
function baseIndicator(source,type){
 const t=clean(source);
 if(type==='Actividad'){
  if(/^Caracterizar\b/i.test(t))return 'Caracterización elaborada y documentada.';
  if(/^Definir e implementar una programación\b/i.test(t))return 'Porcentaje de cumplimiento de la programación definida.';
  if(/^Registrar y revisar\b/i.test(t))return 'Número de revisiones documentadas de la programación.';
  if(/^Implementar\b/i.test(t))return 'Porcentaje de acciones previstas efectivamente realizadas.';
  const q=extractQuantity(t),noun=sourceNoun(t);
  if(q)return 'Porcentaje de '+noun+' realizados respecto de los '+q.raw+' programados.';
  return '[POR REVISAR] Definir un indicador de ejecución para: '+t+'.'
 }
 if(type==='Resultado'){
  if(/Reducción verificable de las diferencias en los niveles de dominio instrumental/i.test(t))return 'Variación de la brecha entre niveles de dominio instrumental respecto de la línea base.';
  if(/equilibrio en la frecuencia de acompañamiento especializado/i.test(t))return 'Variación entre frecuencias de acompañamiento especializado por familia instrumental respecto de la línea base.';
  if(/mejora|aprendizaje|desempeño|dominio|capacidad|formativ/i.test(t))return 'Porcentaje de participantes que muestran mejora entre la valoración inicial y la valoración final.';
  return '[POR REVISAR] Definir un indicador de resultado para: '+t+'.'
 }
 if(type==='Objetivo'){
  if(/Reducir las diferencias en los niveles de dominio instrumental/i.test(t))return 'Cambio en la diferencia de niveles de dominio instrumental entre integrantes de una misma sección respecto de la línea base.';
  return '[POR REVISAR] Definir un indicador de cambio para: '+t+'.'
 }
 return '[POR REVISAR]'
}
function indicatorBattery(source,type,context={}){
 const t=clean(source),items=[],q=extractQuantity(t),noun=sourceNoun(t);
 const common={linkedType:type,linkedText:t,provenance:'propuesta_sistema',verificationStatus:'POR_VERIFICAR'};
 const add=x=>items.push({...common,formula:'[POR VERIFICAR]',unidad:'[POR VERIFICAR]',lineaBase:'[POR VERIFICAR]',meta:'[POR VERIFICAR]',medioVerificacion:'[POR VERIFICAR]',periodicidad:'[POR VERIFICAR]',responsable:'[POR VERIFICAR]',plazo:'[POR VERIFICAR]',verificationSuggestions:[],...x});
 if(type==='Actividad'){
  if(q){
   add({indicatorFamily:'cumplimiento',indicator:'Porcentaje de '+noun+' realizados respecto de los '+q.raw+' programados.',formula:'('+noun.charAt(0).toUpperCase()+noun.slice(1)+' realizados / '+q.value+') × 100',unidad:'%',lineaBase:'0 '+noun+' ejecutados al inicio del periodo de ejecución (línea base operativa)',meta:q.raw+' '+noun+' realizados / 100 % de ejecución',verificationStatus:'PROPUESTA_DERIVADA',verificationSuggestions:['Registros de ejecución','Actas o informes de actividad']});
  }else add({indicatorFamily:'cumplimiento',indicator:baseIndicator(t,'Actividad'),verificationSuggestions:['Registros de ejecución','Actas o informes de actividad']});
  if(/taller|sesion|sesión|jornada|encuentro|formaci[oó]n|capacitaci[oó]n/i.test(t))add({indicatorFamily:'participacion',indicator:'Promedio de participantes asistentes por '+(noun==='acciones'?'actividad':noun.replace(/s$/,''))+'.',formula:'Total de asistencias registradas / '+(q?q.value:'número de actividades realizadas'),unidad:'personas por actividad',verificationSuggestions:['Registros de asistencia']});
  if(/taller|sesion|sesión|formaci[oó]n|capacitaci[oó]n/i.test(t))add({indicatorFamily:'calidad',indicator:'Porcentaje de '+noun+' desarrollados con los criterios de registro y seguimiento definidos.',formula:'('+noun.charAt(0).toUpperCase()+noun.slice(1)+' que cumplen criterios / '+noun+' revisados) × 100',unidad:'%',verificationSuggestions:['Lista de chequeo','Actas o informes de seguimiento']});
 }
 if(type==='Resultado'){
  add({indicatorFamily:/mejora|aprendizaje|desempeño|dominio|capacidad|formativ/i.test(t)?'resultado_cambio':'resultado',indicator:baseIndicator(t,'Resultado'),verificationSuggestions:/mejora|aprendizaje|desempeño|dominio|capacidad|formativ/i.test(t)?['Instrumento de valoración inicial y final','Rúbrica de seguimiento']:['Informe de resultados','Registro del producto o resultado']});
 }
 if(type==='Objetivo')add({indicatorFamily:'objetivo_cambio',indicator:baseIndicator(t,'Objetivo'),verificationSuggestions:['Fuente de seguimiento del objetivo']});
 return items.length?items:[{...common,indicatorFamily:'pendiente',indicator:'[POR REVISAR]',formula:'[POR VERIFICAR]',unidad:'[POR VERIFICAR]',lineaBase:'[POR VERIFICAR]',meta:'[POR VERIFICAR]',medioVerificacion:'[POR VERIFICAR]',periodicidad:'[POR VERIFICAR]',responsable:'[POR VERIFICAR]',plazo:'[POR VERIFICAR]',verificationSuggestions:[]}]
}
function indicatorProposal(source,type){return indicatorBattery(source,type)[0]?.indicator||'[POR REVISAR]'}
function indicatorGuidance(source,type,family){
 const t=clean(source),battery=indicatorBattery(t,type),candidate=battery.find(x=>x.indicatorFamily===family)||battery[0];
 if(type==='Objetivo')return {level:'Indicador de cambio',purpose:'Debe mostrar si el problema principal realmente está cambiando. Evita medir talleres, reuniones o actividades realizadas.',question:'¿Qué cambio observable demostraría que el objetivo general está avanzando?',formulaHint:'Expresa cómo compararás el cambio frente a la línea base.',unitHint:'Porcentaje, diferencia, índice, nivel, frecuencia u otra unidad directamente relacionada con el cambio.',suggestions:battery.map(x=>x.indicator),formulaExamples:['Valor de seguimiento − línea base','((Valor de seguimiento − línea base) / línea base) × 100, cuando la línea base sea distinta de cero']};
 if(type==='Resultado')return {level:'Indicador de resultado',purpose:'Debe comprobar que el resultado esperado existe o que ocurrió el cambio previsto. Contar actividades no es suficiente.',question:'¿Qué dato demostraría que este resultado fue realmente alcanzado?',formulaHint:'Define el criterio que permite decidir cuándo el resultado se considera logrado.',unitHint:'Cantidad, porcentaje, proporción, nivel de calidad u otra unidad del resultado.',suggestions:battery.map(x=>x.indicator),formulaExamples:['Valor observado comparado con la meta definida','(Personas que alcanzan el criterio / personas evaluadas) × 100']};
 const labels={cumplimiento:'Cumplimiento',participacion:'Participación',calidad:'Calidad',producto:'Producto',oportunidad:'Oportunidad',eficiencia:'Eficiencia'};
 return {level:labels[candidate?.indicatorFamily]||'Indicador de ejecución',purpose:'Mide una dimensión concreta de la actividad. Este dato no demuestra por sí solo el cambio del proyecto.',question:'¿Cómo comprobaremos que esta parte de la actividad ocurrió?',formulaHint:'El sistema propone una fórmula cuando puede derivarla sin inventar datos.',unitHint:'Número, porcentaje, personas, productos u otra unidad pertinente.',suggestions:battery.map(x=>x.indicator),formulaExamples:battery.map(x=>x.formula).filter(x=>!/^\[POR/.test(x))}
}
function indicatorQuality(x){
 const missing=v=>!String(v||'').trim()||/^\s*\[POR (VERIFICAR|REVISAR|DEFINIR)\]/i.test(String(v||''));
 const issues=[];
 if(missing(x.indicator))issues.push('Falta definir qué se medirá.');
 if(missing(x.formula))issues.push('Falta explicar cómo se calculará o evaluará.');
 if(missing(x.unidad))issues.push('Falta definir la unidad de medida.');
 if(missing(x.lineaBase))issues.push('Falta la línea base.');
 if(missing(x.meta))issues.push('Falta una meta verificable.');
 if(missing(x.medioVerificacion))issues.push('Falta una fuente o medio de verificación confirmada.');
 if(missing(x.periodicidad))issues.push('Falta indicar cada cuánto se medirá.');
 if(missing(x.responsable))issues.push('Falta asignar responsable.');
 if(missing(x.plazo))issues.push('Falta definir el plazo o momento de cumplimiento.');
 const text=String(x.indicator||'').toLowerCase();
 if(x.linkedType==='Objetivo'&&/(número|cantidad|porcentaje) de (actividades|talleres|reuniones|sesiones)/i.test(text))issues.push('Este indicador parece medir ejecución, pero está asociado al objetivo general.');
 if(x.linkedType==='Resultado'&&/(número|cantidad) de (actividades|talleres|reuniones)/i.test(text))issues.push('Este indicador parece contar actividades y no el resultado alcanzado.');
 return {ok:issues.length===0,issues}
}

function isPlaceholder(v){return /^\s*\[POR (REVISAR|VERIFICAR|DEFINIR)\]/i.test(String(v||''))}
window.fcWriting={clean,objectiveProposals,objectiveWritingReview,looksLikeActivity,strategyProposals,resultProposal,activityProposals,activityGuidance,activityFromPlainLanguage,activitySufficiency,extractQuantity,indicatorBattery,indicatorProposal,indicatorGuidance,indicatorQuality,isPlaceholder};
})();