# Contrato experimental S02 — evidencia antes de redacción

## Decisión sobre descenso de gradiente
**No se implementa** la función de pérdida ilustrativa ni su optimización mediante descenso de gradiente. El sistema carece de un conjunto de afirmaciones evaluadas con etiquetas expertas, definiciones medibles de soporte y pruebas fuera de muestra. Optimizar una puntuación arbitraria podría mejorar el ajuste a una heurística sin mejorar la veracidad. Se mantiene como alternativa descartada **en este incremento**, reevaluable solo con corpus de referencia, rúbrica y comparación experimental.

## Modificaciones
1. El asistente de redacción Groq pasa su respuesta por `guard_generated_claims`. Identifica constructos culturales y causales nuevos (identidad regional, cohesión social, festividades, platos tradicionales, impactos, participación y otros) ausentes tanto del escrito del formador como de los **extractos descargados en la consulta**. Elimina oraciones que incorporan esos constructos. Una hipótesis redactada con cautela no queda exenta del control: crear una hipótesis nueva también requiere fundamentación.
2. Si todas las oraciones generadas introducen conceptos de ese tipo, se conserva exactamente el original, marcado como sin corroboración. El texto original no se modifica sin aprobación.
3. `/assistant/s02/guide` recupera los documentos PDF curatoriales disponibles y también intenta pasajes HTML municipales acotados de Villamaría, Caldas. **Solo** extractos realmente descargados, con hash, fuente y localizador, se transmiten al prompt de Groq. Las referencias indexadas previamente quedan en la interfaz, con estado explícito pendiente de lectura/cotejo, pero jamás se usan como pruebas durante la generación.
4. La auditoría transversal asocia a cada afirmación los pasajes candidatos de su **categoría** de evidencia. No atribuye soporte semántico, corroboración ni causalidad por coincidencia temática.
5. Las respuestas incluyen banderas de contenido añadido, contexto documental limitado y procedencia; el usuario conserva aprobación.

## Limitaciones y reglas de evaluación
- La barrera de conceptos es **léxica**: detecta algunos constructos, con posibles falsos positivos y falsos negativos. No es una verificación factual, de causalidad, de verdad o de fidelidad semántica completa.
- La presencia literal de un concepto en un extracto no demuestra que el pasaje respalde una oración nueva. Las fuentes deben cotejarse antes de declararlas evidencia confirmada.
- No se promueve un dato a estado **verificado** sin cotejo documental específico. `INSUFFICIENT_EVIDENCE` sigue siendo una salida válida.
- Una mejora en la fluidez textual no constituye métrica de exactitud del asistente.
- La siguiente etapa de investigación exige construir un corpus anotado (afirmación, evidencia, territorio, fecha, veredicto), evaluarlo fuera de muestra y decidir si un clasificador calibrado añade valor a las reglas transparentes.

## Casos de regresión
La oración sobre gastronomía y bandas de Villamaría se utiliza como entrada. Se comprueba que el motor rechace adiciones como «platos tradicionales reflejan identidad regional», «festividades comunitarias» y «cohesión social» cuando no aparecen en el texto ni en extractos descargados. Se comprueba asimismo que etiquetas o títulos indexados no autoricen nuevos hechos y que una hipótesis de cohesión social generada por IA quede retenida.
