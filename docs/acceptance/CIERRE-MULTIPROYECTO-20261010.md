# Cierre de estabilización: aceptación de dos proyectos (2026-10-10)

## Identificación y alcance
- Aplicación: Formulador Cultural. SHA desplegado verificado: `0585e02d719a64aeb2b29ce84f69b98cc2f5e36d`.
- GitHub Actions `38055925899`: `test=success`, `deploy=success`.
- Proyecto de referencia: `ec2b3cb7-2354-45e6-91eb-202da53aaa2a` — talleres instrumentales para bandas estudiantiles.
- Proyecto de contraste: `f515f84a-8723-434e-9e2c-e1c4846844ea` — HIPOTÉTICO — PRUEBA FUNCIONAL 02.
- Consulta de solo lectura: ambos tienen registros de S01 a S16. **Existencia de una sección no equivale a aceptación funcional.**
- Ningún dato del proyecto se modifica durante esta auditoría documental.

## Evidencia positiva ya disponible
1. Código de la última integración compilado y desplegado: PASS (CI + deploy).
2. Dos proyectos con ID distinto y 16 secciones cada uno en la base: PASS (inventario de solo lectura).
3. Pruebas de compatibilidad con datos sintéticos para regresiones y no mutación del Excel: PASS (CI), **no sustituyen prueba visual ni archivo real**.

## Estado de la aceptación funcional
Se preserva el criterio de `docs/acceptance/PF02-F09-v89.md`. Los controles siguientes requieren evidencia real; ningún control obtiene PASS únicamente por CI.

| ID | Prueba | Estado | Evidencia indispensable |
|---|---|---|---|
| A01 | Abrir taller de banda y PF02, identidad de proyecto no mezclada | INSUFFICIENT_EVIDENCE | Capturas y IDs en sesiones independientes |
| A02 | S10–S16 de PF02 coincide con el estado persistido previo | INSUFFICIENT_EVIDENCE | Snapshot por campo, IDs y hash |
| A03 | S16 representa confirmados, pendientes y huérfanos | INSUFFICIENT_EVIDENCE | Captura y correspondencia por ID |
| A04 | Excel real refleja datos del proyecto abierto | INSUFFICIENT_EVIDENCE | XLSX original, comparación por ID y valor |
| A05 | PDF real refleja datos del proyecto abierto | INSUFFICIENT_EVIDENCE | PDF original, comparación por ID y valor |
| A06 | DOCX real refleja datos del proyecto abierto | INSUFFICIENT_EVIDENCE | DOCX original, comparación por ID y valor |
| A07 | Ver S16 y exportar no modifica S10–S16 | INSUFFICIENT_EVIDENCE | Hash y diff antes/después por acción |
| A08 | Guardar, cerrar sesión y reabrir ambos proyectos | INSUFFICIENT_EVIDENCE | Comparación de instantáneas tras reapertura |
| A09 | Cambios confirmados y [POR VERIFICAR] se preservan | INSUFFICIENT_EVIDENCE | Comparación antes/después por campo |

## Incidencias históricas observadas en PF02
- S10 posee alternativa confirmada **archivada**; `completion_state.items` activo está vacío.
- S11 contiene una actividad `ACT1-0277` sin confirmar, mientras que el resultado activo está vacío.
- S13 y las líneas de S14 están vacíos.
- S14 conserva referencias de `activityStatus` a `ACT-R1-1`, `ACT-R1-2` y `ACT-R1-3`.
- S15 conserva evaluaciones históricas ligadas a `result:R1` y `activity:ACT-R1-1`, `ACT-R1-2`, `ACT-R1-3`.
- No atribuir causalmente pérdidas a una versión sin copia histórica que lo pruebe. No reconstruir referencias de manera automática.

## Regla de cierre
- Implementación técnica (CI y deploy) y aceptación funcional son indicadores **separados**.
- Aceptación = PASS solo con **9/9** controles aprobados y evidencias verificables, después de tomar copia de seguridad y ensayar sobre copia si hay escrituras.
- No etiquetar una versión estable ni iniciar migración destructiva mientras A01–A09 carezcan de evidencia.
- El porcentaje global histórico 96 % carece de ponderación documentada; no se utiliza como medida auditada de aceptación.
