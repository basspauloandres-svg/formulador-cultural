# VÉRTICE · Flujo integrado de investigación y redacción

## Problema detectado
Hasta el 18 de noviembre de 2026, la función «Revisar afirmaciones y fuentes» podía devolver un listado de hipótesis y fuentes candidatas sin ofrecer una versión redactada para incorporar al proyecto. El formador debía pasar a otro botón o copiar contenidos.

## Comportamiento implementado
En los campos con necesidad de fundamentación documental en S02–S05, S07–S12 y S14–S15, el control **«Investigar y preparar redacción»** ejecuta, en una solicitud:
1. Verificación de sesión, sección y campo.
2. Identificación de afirmaciones, hipótesis y cifras.
3. Recuperación de candidatos y, cuando hay conectores municipales disponibles, pasajes institucionales.
4. Petición de borrador a Groq con el texto del formador y **exclusivamente extractos descargados realmente**, nunca referencias indexadas como fuentes demostradas.
5. Control de conceptos y cifras generadas, además de identificadores de cita. Las afirmaciones mantienen estado `INSUFFICIENT_EVIDENCE` hasta tener una corroboración específica.
6. Presentación del borrador en un cuadro editable con acciones **«Incorporar y guardar redacción»** y «Descartar redacción».

La incorporación requiere pulsación explícita, actualiza el campo correspondiente y ejecuta el guardado que ya utiliza el formulario. Cuando el municipio cambia, se invalidan resultados anteriores. Las pruebas de navegador verifican persistencia local tras recarga.

## Límites metodológicos
El flujo integra revisión y redacción, pero **todavía no constituye verificación semántica de afirmaciones contra fuentes**. El cotejo actual por categorías y el filtro léxico de conceptos pueden generar falsos positivos o negativos. La ausencia de un pasaje descargado impide atribuir soporte documental nuevo a un borrador. No se promete que el modelo pueda subsanar automáticamente un vacío documental. Si la IA no responde, se conserva el texto original y la revisión de fuentes.

## Pruebas de aceptación
- Respuesta conjunta de afirmaciones, fuentes y redacción pendiente de aprobación.
- Descarte no altera el original.
- Aprobación incorpora el borrador y guarda el campo.
- Cambio de municipio invalida la propuesta.
- Un documento preindexado no pasa al prompt de Groq como si se hubiera descargado.
- Sin modelo, cuota o conectividad suficiente, no se finge una propuesta redactada.

## Pendiente
Corroboración semántica por afirmación con extracto original, fecha y alcance; conectores oficiales adicionales para cifras y registros culturales. El descenso de gradiente continúa descartado mientras no exista un corpus anotado que justifique su rendimiento.
