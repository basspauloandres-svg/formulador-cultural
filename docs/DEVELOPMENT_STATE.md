# VÉRTICE — Manifiesto maestro de continuidad
Versión 1.0 | 2026-11-26 | Estado observado posterior al corte 07:33 (Colombia).
Este manifiesto es un índice operativo de referencias verificadas, no sustituye NCM_CONTROL_MATRIX.md, PROJECT_QUALITY_GATE.md ni AGENTS.md. NCM conserva la autoridad de aceptación. Actualizar el manifiesto al cambiar el candidato, cerrar un control o registrar un bloqueo. No atribuir avance a la documentación.

## 1. Referencia única de desarrollo
- Repositorio: basspauloandres-svg/formulador-cultural.
- Producción: main, base del PR #135 c9839baa24afe0817d04e5574eb8a60153d369e1. PR abierto, sin fusión. El job deploy del candidato fue omitido. Esto no es auditoría del entorno alojado.
- Candidato principal de código: s02-research-first-20261124, PR #135, 6bad6998abaf45b91a91a43b1601cf553d2879e4. Seis ejecuciones satisfactorias.
- Checkpoint vigente: checkpoint/2026-11-26-s02-corrected (mismo SHA).
- Control activo: I02 con prueba real local aprobada; V01 y Q07 siguen abiertos. Objetivo 80 %; estimación conservada 74 %, hito formal 75 % no aceptado.
- Este documento se guarda en una rama de control documental independiente para no mover el candidato validado. Los resultados se asignan a sus SHA exactos.

## 2. Inventario y reglas de ramas
Comparación contra el candidato 6bad6998, realizada el 26/11:
| Rama | Relación | Uso |
|---|---|---|
| checkpoint/2026-11-26-auth-resilience | 5 commits detrás | Recuperación histórica |
| checkpoint/2026-11-26-compatibility-validated | 7 detrás | Recuperación histórica |
| checkpoint/2026-11-26-recovery-validated | 15 detrás | Recuperación histórica |
| checkpoint/2026-11-26-s02-corrected | Idéntica | Referencia vigente |
| design/2026-11-26-editorial-workspace | Divergente: 4 delante, 11 detrás | Prototipo, no integrar directamente |
| validation/2026-11-26-review-pack | Divergente: 2 delante, 7 detrás | Casos Q07 y probe histórico |
| validation/2026-11-26-i02-isolated-load | 2 delante, 0 detrás | PR #136 borrador, f46b142e19680fc34435ea7d3c7e338d75049645 |
| control/2026-11-26-development-state | Basada en candidato | Manifiesto documental, no candidato de aplicación |

Al trasladar cambios de una rama divergente, revisar diff por archivo y portar cambios mínimos sobre el candidato vigente, sin sustituir archivos íntegros de versiones antiguas. Repetir regresiones pertinentes y preservar resultados negativos. No borrar ni reescribir ramas, checkpoints o datos históricos. No fusionar ni desplegar sin autorización específica.

## 3. Arquitectura vigente y límites
- Frontend existente: cinco procesos, S01–S16, estado del proyecto, exportaciones, navegación y revisión. Prototipo editorial independiente; requiere actualización al candidato, validación visual y accesibilidad antes de considerar integración.
- Backend FastAPI: rutas existentes, VKE local, recuperación de fuentes nacionales y documentales, reglas deterministas, control de procedencia, abstención, barrera de instrucciones y generación Groq subordinada a los controles epistémicos. Corpus aprobado pendiente; no afirmar cobertura semántica general ni ahorro de tokens.
- Supabase: autenticación y persistencia, políticas RLS; pruebas desechables independientes. Render es alojamiento previsto/existente según arquitectura, no auditado en esta sesión.
- GitHub Actions, AGENTS.md, skills versionadas, NCM y puerta Q01–Q07 gobiernan validaciones. No migrar framework ni contratar servicios sin autorización.

## 4. Registro de aplicación de procedimientos
- AGENTS.md, .agents/skills/vertice-engineering-validation/SKILL.md (v1.0.0), .agents/skills/vertice-milestone-execution/SKILL.md (v1.0.0), NCM y PROJECT_QUALITY_GATE: consultados en el bloque de continuidad 26/11 previo a cambios de I02.
- Skill oficial Supabase: consultada en dicho bloque. I02 reutilizó CLI 2.39.2 y configuración de runner local previamente probada; no se modificaron permisos ni cuotas. No consta una nueva revisión externa de documentación en ese bloque; verificarla antes de cambios de configuración.
- Figma: disponible para trabajo de diseño; no aplicada en este bloque. No confundir skills disponibles con agentes autónomos en ejecución.
- Criterio permanente: en cada bloque documentar qué procedimientos se consultaron y qué evidencia se produjo; no marcar una skill como ejecutada por su mera presencia.

## 5. Evidencia y separación de datos
### Candidato principal
6bad6998: CI E01 45819343713, esquema 45819343916, cobertura 45819343748, QA navegador 45819343919, S01 45819343778, general 45819343742: success. E01 job 139907221025: seis controles S02 reales benignos/adversariales PASS, Neira PASS_STRUCTURAL_ONLY, diez consultas VKE sin llamadas generativas. Conservar fallo anterior b5cc6d64; no afirmar resistencia universal.
### I02
f46b142e, PR #136, run 45821079836, job 139913175687: success. 40 identidades sintéticas autenticadas contra Supabase local desechable, 8 respuestas iniciales HTTP 200, 32 HTTP 429; los 32 recuperados en primera ronda tras espera. 40 completadas, 0 pendientes, 0 otros fallos; contador de uso del modelo sin cambios (0 llamadas en el ensayo), 5502 ms desde inicio de solicitudes hasta recuperación, excluye aprovisionamiento. Se usó ASGI local y corpus vacío; no se midió red alojada, concurrencia generativa ni proyectos reales. I02 REAL_LOCAL_AUTH_40 PASS / HOSTED_GENERATIVE_LOAD_PENDING.
### Reglas de datos
- Mantener separados datos históricos, sintéticos, fuentes públicas curadas, aportes docentes y resultados generativos. Los resultados sintéticos no son evidencia primaria del mundo real.
- Toda prueba debe identificar candidato, origen del dato, entorno, run/job, resultado y alcance. No reutilizar resultados de otra versión como validación automática.
- No ejecutar depuración destructiva de bases de datos. El inventario de registros alojados y su clasificación real no fueron auditados en esta sesión; requieren alcance y acceso autorizados. No copiar secretos, tokens ni datos privados al manifiesto.

## 6. Siguiente secuencia
1. Conservar candidato y checkpoint S02. Registrar cierre I02 local en la discusión del PR #135 y referencia al manifiesto.
2. V01: preparar comparación pareada misma batería/modelo/versión y evidencia, tokens/latencia/costo verificables, sin generar gastos nuevos. Corpus curado y permisos pendientes.
3. Q07: dos revisores humanos independientes, tres proyectos representativos; conservar desacuerdos, incertidumbre y resultados negativos. No asignar evaluación humana mediante IA.
4. Perfil de convocatoria verificable, rediseño independiente y regresión integral según NCM. Mantener 75/80 abiertos mientras falten criterios.
5. No publicar, fusionar o cambiar producción sin autorización específica.

## 7. Continuidad V01 — objetivo 75 % (26/11/2026)
- PR #137, rama validation/2026-11-26-v01-observations, commit eeb2fe5f012a636244895f80fbdff8c8b3e88047. Brazo local VKE sobre candidato exacto 6bad6998; diez tareas sintéticas, dos repeticiones y dos condiciones de índice, 40 observaciones previstas con huellas, rutas, latencia e indexación separadas. Sin credenciales ni llamadas generativas previstas. CI 45823662572: completed/success al consultar; no atribuir observaciones efectivas ni PASS sin verificar logs.
- Q05: fuente oficial consultada 26/11, https://sistemaconvocatorias.mincultura.gov.co/programas/1 : no hay manual específico ni anexos disponibles; https://sistemaconvocatorias.mincultura.gov.co/portafolios : primer bimestre de 2027 proyectado. Perfil PNCC 2027 permanece INSUFFICIENT_EVIDENCE. No fabricar condiciones ni trasladar las de 2026.
- Q07: sigue pendiente revisión humana independiente. V01: línea base comparable, corpus real autorizado, calidad y costo pendientes. Mantener 74% estimado; 75% formal abierto. No fusionar ni desplegar.
