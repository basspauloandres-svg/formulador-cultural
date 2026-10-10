# Etapa 1 — inspección inicial multiproyecto (2026-10-10)

## Alcance y condiciones
Auditoría de **solo lectura** sobre los proyectos «talleres instrumentales para bandas estudiantiles» y «HIPOTÉTICO — PRUEBA FUNCIONAL 02». No se modifica ni restaura información, ni se declara aceptación funcional por la mera existencia de filas en Supabase.

### Infraestructura
- Aplicación, commit de producción: `e58f3ad36deb483f4b64d52d1868532e937000eb`.
- Ejecución CI: `38057985052`, trabajos `test` y `deploy` completados correctamente.
- Prueba sintética de aislamiento multiproyecto, PR #75: aprobada e integrada.
- Registro de aceptación principal: `docs/acceptance/CIERRE-MULTIPROYECTO-20261010.md`.

### Inventario contrastado
| Variable | Banda | PF02 |
|---|---:|---:|
| Secciones persistidas | 16/16 | 16/16 |
| Alternativas S10 activas | 3 | 0 |
| Alternativas S10 archivadas | 6 | 1 |
| Resultados S11 | 2 | 0 |
| Actividades S11 | 0 | 1 |
| Actividades S13 cronograma | 0 | 0 |
| Ítems S14 presupuesto | 0 | 0 |

Las cantidades expresan presencia de registros, **no completitud de la formulación**. Para S10–S16 se obtuvieron hashes MD5 de cada estado JSONB, que coinciden con la inspección anterior de la misma fecha; verificar de nuevo después de las pruebas funcionales.

### Hallazgos
1. La base de datos distingue los proyectos por ID y conserva 16 registros de sección para cada uno.
2. PF02 conserva una alternativa archivada confirmada, mientras S10 activo está vacío.
3. PF02 conserva referencias financieras y de evaluación del riesgo que no se corresponden con actividades activas: deben revisarse desde S16, sin reconstrucción automática.
4. El proyecto de banda tiene datos activos en S10 y resultados en S11; ninguno de los dos tiene cronograma ni presupuesto activos.
5. La separación de datos observada desde SQL y el test sintético son **evidencia parcial**; las pruebas A01–A09 siguen `INSUFFICIENT_EVIDENCE`, pues requieren interacción autenticada en el navegador y comparación de archivos exportados.

## Criterio para avanzar a etapa 2
- Acceder a cada proyecto por separado; registrar sus identificadores visibles y comprobar qué presenta S10–S16.
- Tomar copia verificable de cada uno antes de probar cambios.
- Exportar XLSX, PDF, DOCX y comparar el contenido con los estados confirmados.
- Comprobar que abrir S16 y exportar no cambia hashes del estado.
- Guardar sobre una copia, cerrar sesión y reabrir; documentar persistencia.
- Marcar cada control A01–A09 como PASS, FAIL o INSUFFICIENT_EVIDENCE con sus archivos originales.
- **No ejecutar migración de arquitectura ni afirmar cierre hasta alcanzar una aceptación reproducible.**
