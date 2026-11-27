# H01 — repetición aislada del 27 de noviembre de 2026

Base: `b981a90a459d45f93c9710edc5463bc089868c52`. Archivos de corrección y regresión publicados en `b7a0abb872372ba40ece66f72011876e173f5b3a`; sus blobs coinciden con los ejecutados localmente. Chromium 131, servidor local con la configuración editorial, datos sintéticos, dependencias de navegador entregadas desde paquetes locales y solicitudes externas bloqueadas. El [registro de los 40 controles originales](H01_WORK_EVIDENCE_b981a90.md) preserva los resultados de Render. Este registro añade evidencia acotada del candidato corregido en copia local.

## H01 — contador de secciones

**Observación negativa en la base.** Crear proyecto, completar únicamente el nombre en S01, guardar y abrir S02–S16 desde el recorrido. El snapshot persistido pasó de 1 a 10 secciones con registro. S05, S06, S07, S09, S11, S12, S13, S14 y S15 recibieron estructuras iniciales con listas o mapas vacíos y metadatos.

**Repetición en candidato corregido.** Misma secuencia, 1 → 1. Diligenciar el contexto de S02 y volver a S01, 1 → 2. El cambio cuenta el contenido de las estructuras conocidas y recalcula el valor del proyecto activo al mostrarlo. La regresión quedó en `e2e/h01-project-isolation.cjs`. Log: `H01_PROJECT_SECTION_COUNT_PASS`.

## Controles ejecutados y alcance

| Control | Resultado observado |
|---|---|
| W02, W03, W08 | Regresión local positiva. Sembró un borrador histórico sintético, recuperó Neira al cambiar repetidamente entre proyectos y comprobó ausencia de herencia en S02 y S16 del proyecto nuevo. Queda pendiente el cotejo de S01–S16 y de las claves originales en el protocolo manual. |
| W09–W14 | La simulación de identidades conservó los borradores de invitado, A y B. La prueba multipestaña comprobó la identidad de cada proyecto. La autenticación real y el cambio real de cuenta entre pestañas siguen pendientes. |
| W15 | Bloqueado por falta de persistencia remota aislada. |
| W16–W19, W21 | Respuesta simulada diferida en navegador. El proyecto original conservó el borrador, el segundo proyecto quedó sin respuesta y la identidad simulada B no recuperó la respuesta de A desde la interfaz. La sugerencia permaneció fuera del campo escrito. Falta demostrar incorporación mediante aprobación explícita. Log: `H01_07_SYNTHETIC_DEFERRED_REVIEW_PASS`. |
| W20, W23 | Pendientes. La respuesta simulada tenía manifiesto vacío y no se cotejó una identidad DIVIPOLA en esta ejecución. |
| W24, W25 | Observación local. La referencia a Villamaría con Neira declarado activó la advertencia. Se registró la justificación intermunicipal y Neira conservó su valor. Log: `H01_11_CALDAS_WARNING_PASS`. |
| W27, W28 | Integración con fixture sintético cargado en el estado del proyecto. S01–S15 completos, sin ausencias, y S16 aprobado por UI. Al cambiar el título desde el formulario S01, guardar y recargar, la aprobación dejó de estar vigente y el documento volvió a «Proyecto en revisión». La repetición en staging sigue pendiente. Log: `INTEGRAL_CLOSURE_PASS`. |
| W29–W33 | Ocho descargas desde S16, DOCX/PDF/XLSX/HTML para NEIRAALFAQA y VILLAMARIABETAQA, ambos en modo invitado. En cada documento el título y marcador CONTEXTO propios estuvieron presentes y el título del otro proyecto estuvo ausente. El snapshot persistido fue idéntico antes y después de cada exportación. Contenido leído mediante XML DOCX, texto PDF, hojas Excel y HTML. Alcance: título y contexto de dos borradores, sin cotejo integral S01–S16 ni cuentas reales. |
| W34, W35 | Observación local. Editar y guardar en modo sin red y recuperar después de restablecer la conexión y recargar. Sincronización remota pendiente. Log: `H01_10_LOCAL_OFFLINE_RECOVERY_PASS`. |
| W39 | Auditoría local en 1440×900, 1024×768 y 390×844. S01–S16 en cada tamaño, 48 inspecciones, 1745 muestras de contraste y cero incidencias bajo las aserciones del repositorio. Log: `UNIFIED_WORKSPACE_PASS`. |

H01 conserva **OPEN_CRITICAL**. No se promovió el parche ni se ejecutó en Render. No se modificaron producción, permisos, checkpoints ni diseño, ni se llamó al proveedor de IA. La consolidación final requiere las pruebas reales que siguen bloqueadas, la validación manual del candidato publicado y la aceptación humana.
