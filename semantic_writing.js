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
 if(!src.length)return ['[POR REVISAR] Faltan objetivos específicos confirmados para formular una alternativa.'];
 const joined=src.join(' | ');
 if(/frecuencia de acompañamiento especializado/i.test(joined))return uniq([
  'Organizar un esquema de acompañamiento especializado que distribuya de manera equilibrada la atención entre las familias instrumentales',
  'Reorganizar el acompañamiento especializado para equilibrar su frecuencia entre las familias instrumentales'
 ]);
 if(/niveles? de dominio instrumental/i.test(joined))return uniq([
  'Desarrollar una estrategia de acompañamiento diferenciado orientada a reducir las brechas de dominio instrumental entre integrantes',
  'Articular acciones de acompañamiento que respondan a las diferencias de dominio instrumental identificadas'
 ]);
 if(/acceso a .*formaci[oó]n|acceso a .*taller|acceso a .*acompañamiento/i.test(joined))return uniq([
  'Desarrollar una estrategia de acceso y acompañamiento formativo orientada a '+low(src[0]),
  'Articular una ruta de acceso a procesos formativos que contribuya a '+low(src[0])
 ]);
 if(/nivelaci[oó]n|trayectorias formativas diferentes|brechas iniciales de formaci[oó]n/i.test(joined))return uniq([
  'Desarrollar una estrategia de nivelación que contribuya a '+low(src[0]),
  'Articular acciones de diagnóstico y nivelación orientadas a '+low(src[0])
 ]);
 if(/participaci[oó]n .*cert[aá]men|participaci[oó]n .*encuentro|participaci[oó]n .*evento/i.test(joined))return uniq([
  'Fortalecer la preparación y participación del proceso artístico para contribuir a '+low(src[0]),
  'Desarrollar una estrategia de preparación progresiva orientada a '+low(src[0])
 ]);
 if(src.length===1)return [
  'Desarrollar una estrategia orientada a '+low(src[0]),
  'Articular acciones coherentes con el objetivo específico: '+src[0]
 ];
 return [
  'Desarrollar una estrategia integrada orientada a '+src.map(low).join(' y '),
  'Articular acciones que respondan de manera conjunta a: '+src.join('; ')
 ]
}
function compactPresentationText(value,maxWords=30){
 const t=clean(value);if(!t)return t;
 const first=t.split(/(?<=[.!?])\s+/)[0],candidate=first.split(/\s+/).length<=maxWords?first:t;
 const words=candidate.split(/\s+/).filter(Boolean);
 return words.length>maxWords?words.slice(0,maxWords).join(' ')+'…':candidate
}
function resultWritingReview(value){
 const t=clean(value),issues=[],words=t.split(/\s+/).filter(Boolean);
 if(!t||isPlaceholder(t))issues.push('Falta un resultado verificable.');
 if(words.length>32)issues.push('El resultado es demasiado extenso. Describe un cambio o producto verificable y deja el contexto en el objetivo y la trazabilidad.');
 if((t.match(/[.!?]+/g)||[]).length>1)issues.push('El resultado debe expresarse en una sola formulación verificable.');
 if(/\b(?:objetivo espec[ií]fico|causa directa|problema central)\s*:/i.test(t))issues.push('El resultado no debe repetir las etiquetas del contexto metodológico.');
 return {ok:issues.length===0,issues,wordCount:words.length}
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
function activityObjectFromResult(value){
 const raw=clean(value).replace(/[.]+$/,'');if(!raw)return 'el resultado esperado';
 let t=raw.replace(/^(ampliaci[oó]n|mejora|incremento|fortalecimiento|reducci[oó]n) verificable (?:del|de la|de los|de las|de)\s+/i,'');
 t=t.split(/\s+(?:mediante|a trav[eé]s de|con el fin de|con el prop[oó]sito de)\s+/i)[0];
 if(/\s+para\s+/i.test(t))t=t.split(/\s+para\s+/i)[0];
 t=t.replace(/\b(implementad[oa]s?|fortalecid[oa]s?|mejorad[oa]s?|alcanzad[oa]s?)$/i,'').trim();
 const words=t.split(/\s+/).filter(Boolean);
 return (words.length>14?words.slice(0,14).join(' '):t)||'el resultado esperado'
}
function activityWritingReview(value){
 const t=clean(value),issues=[],words=t.split(/\s+/).filter(Boolean);
 if(!t||isPlaceholder(t))issues.push('Falta una actividad concreta.');
 if(words.length>28)issues.push('La actividad es demasiado extensa. Déjala en una acción, su objeto y, solo si hace falta, la población directamente relacionada.');
 const sentences=(t.match(/[.!?]+/g)||[]).length;
 if(sentences>1)issues.push('La actividad debe expresarse como una sola acción, no como un párrafo.');
 if(/\b(?:problema central|objetivo espec[ií]fico|resultado esperado)\s*:/i.test(t))issues.push('El contexto metodológico debe quedar en la trazabilidad, no dentro del enunciado de la actividad.');
 if(/\b(?:con el fin de|con el prop[oó]sito de)\b/i.test(t)&&words.length>20)issues.push('Evita repetir la justificación del proyecto dentro de la actividad.');
 return {ok:issues.length===0,issues,wordCount:words.length}
}
function activityGuidance(result,objective,context={}){
 const r=clean(result),o=clean(objective),p=clean(context.population),territory=clean(context.territory),existing=(context.existingActivities||[]).map(clean).filter(Boolean),t=(o+' '+r).toLowerCase(),suggestions=[],questions=[],object=activityObjectFromResult(r);
 const rq=r||'[POR VERIFICAR]',oq=o||'[POR VERIFICAR]';
 const has=re=>existing.some(x=>re.test(x));
 if(/formaci[oó]n|taller|capacitaci[oó]n|aprendizaje|acompañamiento|nivelaci[oó]n/.test(t)){
  if(!has(/prepar|organizar|definir|program/i))suggestions.push('Preparar las condiciones para '+object);
  if(!has(/realizar|implementar|desarrollar|ejecutar/i))suggestions.push('Desarrollar las acciones formativas para '+object);
  if(!has(/registr|document|asistencia|seguimiento/i))suggestions.push('Registrar el desarrollo de '+object);
  if(!has(/evalu|verificar|revisar|valorar/i))suggestions.push('Verificar el avance de '+object);
 }else{
  if(!has(/prepar|organizar|definir/i))suggestions.push('Preparar las condiciones para '+object);
  if(!has(/realizar|implementar|desarrollar|ejecutar/i))suggestions.push('Ejecutar la acción principal para '+object);
  if(!has(/registr|document|seguimiento/i))suggestions.push('Registrar el desarrollo de '+object);
  if(!has(/evalu|verificar|revisar/i))suggestions.push('Verificar el avance de '+object);
 }
 questions.push('Para producir “'+rq+'”, ¿qué acción concreta falta realizar?');
 questions.push('¿Esta nueva actividad aporta directamente a “'+oq+'” y evita repetir las actividades ya aprobadas?');
 if(existing.length)questions.push('Ya hay '+existing.length+' actividad(es) aprobada(s) para este resultado. ¿Qué acción necesaria todavía no está cubierta?');
 if(p)questions.push('Con la población ya registrada, ¿esta actividad necesita precisar quién participa?');
 if(territory)questions.push('En el territorio registrado, ¿esta actividad requiere una condición específica ya documentada?');
 const compact=[...new Set(suggestions.map(finish))].filter(x=>activityWritingReview(x).ok);
 return {suggestions:compact.slice(0,5),questions:[...new Set(questions.map(finish))].slice(0,5),context:{result:rq,objective:oq,population:p,territory,existingActivities:existing}}
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
  if(/ampliaci[oó]n verificable del acceso a/i.test(t)||/mejora verificable del acceso a/i.test(t)||/mayor acceso a/i.test(t)){
   const m=t.match(/acceso a\s+(.+?)(?:\s+para\s+(.+))?$/i),resource=clean(m?.[1]||'los procesos definidos'),target=clean(m?.[2]||'la población vinculada').replace(/^algunas?\s+/i,'');
   return 'Variación en el número de '+target+' con acceso registrado a '+resource+' respecto de la línea base.'
  }
  if(/mejora|aprendizaje|desempeño|dominio|capacidad|formativ/i.test(t))return 'Porcentaje de participantes que muestran mejora entre la valoración inicial y la valoración final.';
  return '[POR REVISAR] Definir un indicador de resultado para: '+t+'.'
 }
 if(type==='Objetivo'){
  if(/Reducir las diferencias en los niveles de dominio instrumental/i.test(t))return 'Cambio en la diferencia de niveles de dominio instrumental entre integrantes de una misma sección respecto de la línea base.';
  if(/Incrementar la participación de la banda en certámenes musicales de mayor exigencia interpretativa/i.test(t))return 'Variación en el número de certámenes musicales de mayor exigencia interpretativa en los que participa la banda respecto de la línea base.';
  if(/incrementar la participación.+(?:certámenes|encuentros|eventos|festivales)/i.test(t)){
   const m=t.match(/incrementar la participación(?: de .+?)? en (.+)$/i),scope=clean(m?.[1]||'los espacios definidos');
   return 'Variación en el número de '+scope+' con participación registrada respecto de la línea base.'
  }
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
  const access=/ampliaci[oó]n verificable del acceso a|mejora verificable del acceso a|mayor acceso a/i.test(t);
  const change=/mejora|aprendizaje|desempeño|dominio|capacidad|formativ/i.test(t);
  if(access){
   const m=t.match(/acceso a\s+(.+?)(?:\s+para\s+(.+))?$/i),resource=clean(m?.[1]||'los procesos definidos'),target=clean(m?.[2]||'la población vinculada').replace(/^algunas?\s+/i,'');
   add({indicatorFamily:'resultado_acceso',indicator:baseIndicator(t,'Resultado'),formula:'Número de '+target+' con acceso registrado a '+resource+' en seguimiento − número de '+target+' con acceso registrado a '+resource+' en la línea base',unidad:target,verificationSuggestions:['Registros de inscripción o participación','Listas de asistencia','Informe de seguimiento del acceso']});
  }else add({indicatorFamily:change?'resultado_cambio':'resultado',indicator:baseIndicator(t,'Resultado'),verificationSuggestions:change?['Instrumento de valoración inicial y final','Rúbrica de seguimiento']:['Informe de resultados','Registro del producto o resultado']});
 }
 if(type==='Objetivo'){
  const participation=/incrementar la participación.+(?:certámenes|encuentros|eventos|festivales)/i.test(t);
  if(participation){
   const m=t.match(/incrementar la participación(?: de .+?)? en (.+)$/i),scope=clean(m?.[1]||'los espacios definidos');
   add({indicatorFamily:'objetivo_participacion',indicator:baseIndicator(t,'Objetivo'),formula:'Número de '+scope+' con participación registrada en seguimiento − número de '+scope+' con participación registrada en la línea base',unidad:'espacios de participación',verificationSuggestions:['Registros de inscripción o participación','Certificaciones o constancias de participación','Informes de participación']});
  }else add({indicatorFamily:'objetivo_cambio',indicator:baseIndicator(t,'Objetivo'),verificationSuggestions:['Fuente de seguimiento del objetivo']});
 }
 return items.length?items:[{...common,indicatorFamily:'pendiente',indicator:'[POR REVISAR]',formula:'[POR VERIFICAR]',unidad:'[POR VERIFICAR]',lineaBase:'[POR VERIFICAR]',meta:'[POR VERIFICAR]',medioVerificacion:'[POR VERIFICAR]',periodicidad:'[POR VERIFICAR]',responsable:'[POR VERIFICAR]',plazo:'[POR VERIFICAR]',verificationSuggestions:[]}]
}
function indicatorProposal(source,type){return indicatorBattery(source,type)[0]?.indicator||'[POR REVISAR]'}
function indicatorFieldGuide(source,type,family,context={},current={}){
 const t=clean(source),assist=indicatorFieldAssist(t,type,family,context,current),indicator=clean(current.indicator),unit=(assist.unidad||[])[0]||clean(current.unidad);
 const qty=extractQuantity(t);
 const formulaExample=(assist.formula||[])[0]||'Describe cómo se obtiene el valor del indicador.';
 const unitExample=unit||'%, personas, talleres, puntos u otra unidad coherente con el indicador.';
 let baselineExample='Registra el valor real antes de iniciar el proyecto.';
 let targetExample='Registra el valor que se espera alcanzar al finalizar o en el momento definido.';
 if(type==='Actividad'&&family==='cumplimiento'&&qty){
   baselineExample='Si el indicador mide únicamente ejecución del proyecto, puede proponerse 0 al inicio porque todavía no se ha realizado ninguna de las '+qty+' acciones programadas.';
   targetExample=qty+' acciones realizadas o 100 % de cumplimiento, según la unidad elegida.';
 }
 return {
  formula:{meaning:'Explica la operación o regla que convierte los datos en el valor del indicador.',write:'Escribe la operación con palabras o números. Debe quedar claro qué se divide, resta, suma o compara.',example:formulaExample},
  unidad:{meaning:'Es la forma en que se expresa el resultado del indicador.',write:'Debe coincidir con la fórmula. Si la fórmula multiplica por 100, normalmente la unidad será %. Si cuenta personas, será personas; si cuenta talleres, talleres.',example:unitExample},
  lineaBase:{meaning:'Es el valor inicial del indicador antes de ejecutar el proyecto.',write:'Usa un dato real del punto de partida. Si aún no existe, deja [POR VERIFICAR].',example:baselineExample},
  meta:{meaning:'Es el valor que el proyecto se compromete a alcanzar para ese mismo indicador.',write:'Debe estar expresada en la misma unidad del indicador y ser verificable.',example:targetExample},
  medioVerificacion:{meaning:'Es la fuente donde quedará registrado el dato usado para comprobar el indicador.',write:'Escribe un documento, registro o instrumento que realmente existirá en el proyecto.',example:(assist.medioVerificacion||[])[0]||'Lista de asistencia, acta, rúbrica, informe, base de datos o registro equivalente.'},
  periodicidad:{meaning:'Indica cada cuánto se medirá o revisará el indicador.',write:'Escribe una frecuencia o momento de medición, no una cantidad de personas ni una meta.',example:(assist.periodicidad||[])[0]||'Después de cada actividad, mensual, al inicio y al cierre, o al cierre del proyecto.'},
  responsable:{meaning:'Es la persona o rol encargado de recoger, consolidar o verificar el dato.',write:'Escribe el cargo, rol o persona realmente responsable de este seguimiento.',example:'Coordinación del proyecto, docente responsable, profesional de seguimiento u otro rol real.'},
  plazo:{meaning:'Es el momento límite en que debe estar comprobado el indicador.',write:'Escribe una fecha o hito temporal concreto.',example:'Al finalizar los seis talleres, al cierre del proyecto o una fecha específica.'}
 }
}
function indicatorFieldAssist(source,type,family,context={},current={}){
 const t=clean(source),battery=indicatorBattery(t,type,context),candidate=battery.find(x=>x.indicatorFamily===family)||battery[0]||{},out={};
 const add=(k,values)=>{const xs=[...new Set((values||[]).map(clean).filter(v=>v&&!isPlaceholder(v)))];if(xs.length)out[k]=xs};
 add('formula',[candidate.formula]);
 add('unidad',[candidate.unidad]);
 add('lineaBase',[candidate.lineaBase]);
 add('meta',[candidate.meta]);
 add('medioVerificacion',candidate.verificationSuggestions||[]);
 if(type==='Actividad'){
   if(/taller|sesion|sesión|jornada|encuentro|capacitaci[oó]n|formaci[oó]n/i.test(t))add('periodicidad',['Al cierre de cada actividad realizada']);
   else add('periodicidad',['Al cierre de la actividad']);
 }else if(type==='Resultado')add('periodicidad',['Al inicio y al cierre del proceso']);
 else if(type==='Objetivo')add('periodicidad',['Al inicio y al cierre del proyecto']);
 return out
}

function indicatorGuidance(source,type,family,context={}){
 const t=clean(source),battery=indicatorBattery(t,type,context),candidate=battery.find(x=>x.indicatorFamily===family)||battery[0],objective=clean(context.objectiveText),result=clean(context.resultText),population=clean(context.population),territory=clean(context.territory);
 if(type==='Objetivo')return {level:'Indicador de cambio',purpose:'Debe comprobar el avance del objetivo real “'+t+'”. Evita sustituirlo por el conteo de actividades.',question:'¿Qué cambio observable demostraría que “'+t+'” está avanzando?',formulaHint:'Compara el cambio de “'+t+'” frente a su línea base o criterio inicial.',unitHint:'Usa una unidad directamente relacionada con el cambio del objetivo.',suggestions:battery.map(x=>x.indicator),formulaExamples:battery.map(x=>x.formula).filter(x=>!/^\[POR/.test(x)),context:{objectiveText:t,population,territory}};
 if(type==='Resultado')return {level:'Indicador de resultado',purpose:'Debe comprobar el resultado real “'+t+'”. Contar las actividades que lo producen no es suficiente.',question:'¿Qué dato demostraría que “'+t+'” fue alcanzado?',formulaHint:'Define cómo compararás “'+t+'” con la línea base o con un criterio verificable.',unitHint:'Usa una unidad propia del resultado, sin inventar una cifra.',suggestions:battery.map(x=>x.indicator),formulaExamples:battery.map(x=>x.formula).filter(x=>!/^\[POR/.test(x)),context:{objectiveText:objective,resultText:t,population,territory}};
 const labels={cumplimiento:'Cumplimiento',participacion:'Participación',calidad:'Calidad',producto:'Producto',oportunidad:'Oportunidad',eficiencia:'Eficiencia'};
 return {level:labels[candidate?.indicatorFamily]||'Indicador de ejecución',purpose:'Mide una dimensión concreta de la actividad real “'+t+'”. Este dato no demuestra por sí solo el cambio del proyecto.',question:'¿Cómo comprobaremos que “'+t+'” ocurrió como estaba previsto?',formulaHint:'El sistema propone una fórmula solo cuando puede derivarla de los datos ya registrados.',unitHint:'Usa una unidad pertinente a esta actividad.',suggestions:battery.map(x=>x.indicator),formulaExamples:battery.map(x=>x.formula).filter(x=>!/^\[POR/.test(x)),context:{activityText:t,resultText:result,objectiveText:objective,population,territory}}
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
window.fcWriting={clean,compactPresentationText,resultWritingReview,objectiveProposals,objectiveWritingReview,looksLikeActivity,strategyProposals,resultProposal,activityProposals,activityGuidance,activityFromPlainLanguage,activityWritingReview,activityObjectFromResult,activitySufficiency,extractQuantity,indicatorBattery,indicatorProposal,indicatorGuidance,indicatorFieldAssist,indicatorFieldGuide,indicatorQuality,isPlaceholder};
})();