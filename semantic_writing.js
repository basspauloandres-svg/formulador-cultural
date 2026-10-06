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
 else if(/^disminución de\b/i.test(t)){out.push('Incrementar '+t.replace(/^disminución de\s*/i,''))}
 else if(/^insuficiencia de\b/i.test(t)||/^condiciones insuficientes de\b/i.test(t)){const rest=t.replace(/^insuficiencia de\s*/i,'').replace(/^condiciones insuficientes de\s*/i,'');out.push('Mejorar las condiciones de '+rest)}
 else if(/^limitad[oa]s?\b/i.test(t)){out.push(t.replace(/^limitad[oa]s?/i,'Ampliar'))}
 else if(/^falta de\b/i.test(t)||/^ausencia de\b/i.test(t)||/^carencia de\b/i.test(t)){const rest=t.replace(/^(falta|ausencia|carencia) de\s*/i,'');out.push('Asegurar la disponibilidad de '+rest)}
 else if(/^filtración sonora\b/i.test(t)){out.push('Reducir la '+low(t))}
 else if(/^interferencia\b/i.test(t)||/^interferencias\b/i.test(t)){out.push('Reducir '+low(t))}
 else if(/^deterioro de\b/i.test(t)){out.push('Mejorar '+t.replace(/^deterioro de\s*/i,''))}
 if((zone==='indirect_effect'||zone==='direct_effect')&&/^reducción de\b/i.test(t)){out.unshift('Incrementar '+t.replace(/^reducción de\s*/i,''))}
 if(!out.length)return ['[POR REVISAR] Redactar el cambio deseado para: '+t+'.'];
 return uniq(out)
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
 return ['[POR REVISAR] Definir actividades concretas que produzcan el resultado: '+r+'.']
}
function indicatorProposal(source,type){
 const t=clean(source);
 if(type==='Actividad'){
  if(/^Caracterizar\b/i.test(t))return 'Caracterización elaborada y documentada.';
  if(/^Definir e implementar una programación\b/i.test(t))return 'Porcentaje de cumplimiento de la programación definida.';
  if(/^Registrar y revisar\b/i.test(t))return 'Número de revisiones documentadas de la programación.';
  if(/^Implementar\b/i.test(t))return 'Porcentaje de acciones previstas efectivamente realizadas.';
  return '[POR REVISAR] Definir un indicador de ejecución para: '+t+'.'
 }
 if(type==='Resultado'){
  if(/Reducción verificable de las diferencias en los niveles de dominio instrumental/i.test(t))return 'Variación de la brecha entre niveles de dominio instrumental respecto de la línea base.';
  if(/equilibrio en la frecuencia de acompañamiento especializado/i.test(t))return 'Variación entre frecuencias de acompañamiento especializado por familia instrumental respecto de la línea base.';
  return '[POR REVISAR] Definir un indicador de resultado para: '+t+'.'
 }
 if(type==='Objetivo'){
  if(/Reducir las diferencias en los niveles de dominio instrumental/i.test(t))return 'Cambio en la diferencia de niveles de dominio instrumental entre integrantes de una misma sección respecto de la línea base.';
  return '[POR REVISAR] Definir un indicador de cambio para: '+t+'.'
 }
 return '[POR REVISAR]'
}
function isPlaceholder(v){return /^\s*\[POR (REVISAR|VERIFICAR|DEFINIR)\]/i.test(String(v||''))}
window.fcWriting={clean,objectiveProposals,strategyProposals,resultProposal,activityProposals,indicatorProposal,isPlaceholder};
})();