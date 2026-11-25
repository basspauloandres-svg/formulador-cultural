---
name: vertice-milestone-execution
description: Ejecutar trabajo de VÉRTICE por objetivo porcentual con mínima comunicación visible, manteniendo control de evidencia, pruebas, checkpoint y autorización de producción. Usar cuando el investigador indique avanzar hasta un porcentaje, continuar o trabajar sin comentarios.
version: 1.0.0
---

# VÉRTICE Milestone Execution

## Objetivo
Reducir interrupciones conversacionales y agrupar el trabajo en bloques verificables. Complementa la skill vertice-engineering-validation y la matriz NCM; no reemplaza sus requisitos, ni convierte al agente en un servicio autónomo en segundo plano.

## Entrada y continuidad
- Una orden «avanza hasta X %» fija el objetivo de ejecución hasta nueva indicación. «Avanza», «sigue» y «adelante» retoman ese mismo objetivo desde el último candidato registrado.
- Antes de intervenir, leer AGENTS.md, la skill vertice-engineering-validation, el último registro de NCM y la puerta de calidad. Consultar PR, commit candidato, base, checkpoints y pruebas.
- Objetivo vigente al incorporar esta skill: 30 % (partida: 27 % estimado; último hito aceptado: 25 %).
- El 30 % se tratará como objetivo intermedio: criterio operativo propuesto, sujeto a verificación, es S01 (42 permisos, RLS y prueba A/B real con operaciones CRUD/upsert y rechazo de accesos cruzados) aprobado en candidato exacto, regresiones esenciales verdes y checkpoint documentado. No redefine los hitos 25/50/75/100.

## Ciclo de ejecución con comunicación mínima
1. Reanudar el control activo, no duplicar pasos ya demostrados.
2. Agrupar acciones relacionadas que puedan comprobarse en la ejecución actual. Inspeccionar, implementar, probar, diagnosticar y documentar.
3. Ante fallo corregible, intentar la solución y comprobarla antes de escalar. Mantener la evidencia negativa.
4. Consultar las ejecuciones CI ya iniciadas. Evitar sondeos repetitivos sin información nueva y cambios innecesarios que reinicien las pruebas. No declarar PASS mientras una prueba esté pendiente, cancelada o fallida.
5. Registrar decisiones y resultados en el repositorio, no narrar cada operación en el chat.
6. Si se alcanza el objetivo, verificar el candidato exacto, crear checkpoint, actualizar NCM, detener el bloque y emitir el reporte de cierre.
7. Si se agota la ejecución disponible, guardar un estado reanudable: objetivo, porcentaje estimado, control activo, commit, runs pendientes, siguiente acción y limitaciones. Emitir un reporte parcial mínimo y veraz. Una ejecución CI puede continuar por su cuenta en GitHub; el agente conversacional no puede continuar trabajando ni enviar por sí mismo un reporte futuro fuera de un mecanismo autorizado.

## Comunicación
- No emitir saludos, narraciones de pasos, felicitaciones ni reportes redundantes. Priorizar un único cierre al alcanzar el objetivo cuando la plataforma lo permita.
- Respetar las actualizaciones mínimas exigidas por el entorno. Si se requieren antes del objetivo, indicar solo una situación comprobable o un bloqueo, sin relato de implementación.
- Informar de inmediato si existe riesgo para producción, datos, credenciales, autorización, costo no previsto, pérdida irreversible o criterio científicamente indeterminado que no puede resolverse con evidencia disponible.
- No pedir aprobación para cambios aislados y reversibles ya autorizados dentro del alcance. Solicitar autorización específica para producción, ampliación de permisos, gastos o decisiones fuera del alcance.
- Formato de cierre: «X % alcanzado [o estimado]. [Evidencia principal]. [Limitaciones o bloqueo, si existen]. Producción [estado comprobado]». Si no se alcanza el objetivo, indicar que queda pendiente y conservarlo para reanudación.

## Reglas de integridad
- Porcentaje intermedio: estimación operativa, no medición científica. El objetivo se considera satisfecho solo cuando el criterio explícito está probado.
- No aumentar porcentajes por número de archivos, commits, pruebas agregadas ni tiempo transcurrido.
- No modificar criterios para declarar éxito, eliminar pruebas negativas, ocultar contradicciones o atribuir resultados de CI a otro commit.
- No fusionar, desplegar, modificar producción ni acceder a información privada sin autorización específica. Verificar base de PR y estado de producción antes de declarar que permanece intacta.
