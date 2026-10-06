# Informe de auditoría técnica y arquitectónica
Fecha: 6 de octubre de 2026
Rama de revisión: `audit/arquitectura-2026-10-06`
Estado: APROBADA PARA REVISIÓN PREVIA A PRODUCCIÓN
Publicación: NO REALIZADA

## 1. Alcance
Se ejecutó una auditoría adicional del Formulador Cultural S01–S16 antes de publicar una nueva versión. La revisión incluyó GitHub Actions, pruebas Python, validación de sintaxis JavaScript, smoke test del front, control estructural de arquitectura, persistencia, trazabilidad entre resultados y actividades, cálculo de coherencia y criterios de cierre.

## 2. Hallazgos principales

### H1. Sincronización incompleta de estados estructurados
**Severidad: alta.**
La función que determinaba la fecha real de modificación local solo contemplaba estados de Vester, árboles y validación causal. No incluía alternativas, resultados, actividades, indicadores, cronograma, presupuesto, riesgos ni revisión final.

**Riesgo:** una copia remota podía considerarse más reciente y ocultar cambios locales válidos de S10–S16 durante una reconciliación.

**Corrección:** `nestedUpdatedAt()` ahora contempla:
- vester_state
- tree_state
- objectives_state
- causal_validation
- vester_preparation / vester_preparation_v2
- completion_state
- results_state
- schedule_state
- budget_state
- risk_state
- review_state

### H2. Ruptura de la cadena resultado → actividad
**Severidad: alta.**
Las actividades seguían generándose directamente desde medios/objetivos y la alternativa seleccionada. Los resultados aprobados se añadían posteriormente como enlace.

**Riesgo metodológico:** podía existir una actividad que respondiera a un objetivo sin derivarse realmente de un resultado aprobado, rompiendo la cadena objetivo → resultado → actividad.

**Corrección:** S11 ahora genera propuestas desde resultados confirmados. Cada actividad guarda `resultId`, `resultText`, `objectiveId` y `objectiveText`. Las actividades ya editadas se preservan cuando la relación lógica continúa vigente.

### H3. Índice de coherencia sobreestimado
**Severidad: media-alta.**
Los estados “COHERENTE CON DATOS PENDIENTES” contaban igual que un estado completamente coherente. Además, la ausencia de evidencia podía entrar como dato pendiente en vez de falta de evidencia.

**Riesgo:** un proyecto incompleto podía mostrar un porcentaje artificialmente alto.

**Corrección:**
- COHERENTE = 1 punto.
- COHERENTE CON DATOS PENDIENTES = 0,5 puntos.
- REQUIERE AJUSTE / INSUFFICIENT_EVIDENCE = 0 puntos.
- La ausencia de evidencia se clasifica como `INSUFFICIENT_EVIDENCE`.

### H4. Cobertura insuficiente de indicadores
**Severidad: media.**
El motor comprobaba principalmente indicadores asociados a actividades.

**Riesgo:** resultados u objetivo general podían quedar sin indicador sin afectar adecuadamente la revisión de coherencia.

**Corrección:** se verifica de forma separada:
- actividades → indicadores;
- resultados → indicadores;
- objetivo general → indicador;
- completitud del indicador: línea base, unidad, periodicidad, meta, fuente, responsable y plazo.

### H5. “Listo para presentar” podía activarse con secciones en curso
**Severidad: alta.**
La regla final exigía ausencia de secciones “Falta”, pero permitía secciones “En curso”.

**Riesgo:** el sistema podía declarar el proyecto listo sin haber completado realmente todos los bloques evaluados.

**Corrección:** la condición final exige que todas las secciones S01–S15 evaluadas estén en estado `Completa`, además de coherencia mínima y ausencia de riesgos altos sin tratamiento.

### H6. Estados de presupuesto demasiado permisivos
**Severidad: media.**
Una actividad con estado “Tiene costos” podía considerarse cubierta aunque sus rubros siguieran incompletos.

**Corrección:** S14 solo se considera completa cuando:
- la actividad está marcada “Sin costo adicional”; o
- tiene uno o más recursos y todos están confirmados; o
- el aporte en especie tiene recursos valorizados y confirmados.

### H7. Estados de riesgo demasiado permisivos
**Severidad: media.**
Una revisión de riesgo podía considerarse completa solo por haber seleccionado “Sí”, aunque el riesgo asociado no estuviera confirmado.

**Corrección:** cuando la respuesta es “Sí”, el riesgo debe estar confirmado; “No aplica” puede cerrar la revisión sin crear un riesgo.

## 3. Mejoras de control incorporadas

Se agregó `ci_architecture_check.js`, que verifica antes de publicar:

1. recursos locales sin duplicados;
2. archivos referenciados existentes;
3. una única versión de caché para recursos locales;
4. un solo contenedor `guidedJourney`;
5. existencia de S09–S16 en la extensión del front;
6. existencia de S01–S16 en el esquema;
7. cobertura de todos los estados estructurados en sincronización;
8. que las actividades deriven de resultados;
9. cobertura de indicadores de resultados y objetivo general;
10. ponderación correcta del índice de coherencia;
11. criterio estricto de “Listo para presentar”;
12. restricción del despliegue a la rama `main`.

## 4. Resultado de GitHub Actions

Workflow de auditoría: `37501827100`

- Pruebas Python: SUCCESS
- Instalación de dependencias de prueba: SUCCESS
- Sintaxis JavaScript: SUCCESS
- Smoke test del front: SUCCESS
- Auditoría de arquitectura: SUCCESS
- Verificación de archivos públicos: SUCCESS
- Deploy: SKIPPED

El despliegue fue omitido intencionalmente porque la auditoría se ejecutó en una rama separada.

## 5. Estado de arquitectura después de la corrección

La cadena estructural queda:

`evidencia → situación → causa/problema → objetivo → resultado → actividad → cronograma → presupuesto → indicador/meta → riesgo → revisión final`

Las principales decisiones siguen siendo humanas. Las propuestas automáticas permanecen editables y sujetas a aprobación.

La persistencia continúa utilizando:
- localStorage para trabajo inmediato;
- Supabase para persistencia multiusuario;
- JSON estructurado por sección;
- IDs para relaciones internas.

No se añadieron servicios de producción ni procesos permanentes adicionales.

## 6. Riesgo residual

La arquitectura del front continúa siendo modular mediante scripts clásicos y un estado global compartido (`draft`, `active`, `sections`). La auditoría actual controla sus principales fallos de integración, pero una futura etapa de maduración podría encapsular este estado detrás de un único almacén/event bus.

Ese cambio no se recomienda antes de validar funcionalmente S01–S16 con proyectos reales, porque implicaría una refactorización amplia con mayor riesgo de migración.

## 7. Recomendación de publicación

**Recomendación: PUBLICAR DESPUÉS DE REVISIÓN FUNCIONAL HUMANA.**

La auditoría automatizada no detecta bloqueos arquitectónicos pendientes. Antes de fusionar a `main`, se recomienda una prueba manual corta con el proyecto existente:

1. recuperar proyecto desde Supabase;
2. abrir S06 y S07;
3. verificar resultados y actividades S11;
4. revisar S13 cronograma;
5. revisar S14 presupuesto;
6. revisar S15 riesgos;
7. abrir S16;
8. generar SVG de ambos árboles;
9. generar Excel técnico;
10. generar DOCX/PDF final.

Hasta completar esa revisión, la rama no debe fusionarse a producción.
