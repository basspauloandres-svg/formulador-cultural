# Etapa 2: aislamiento de persistencia y recuperación S01-S16

Base inspeccionada: `9eb6f19870203e7ce09feef30cd72119cc01b23e` (main y cierre PR #91). Referencia documental: `CIERRE_PR91_CONSOLIDADO_20261026.zip`. Las seis evaluaciones de ese cierre corresponden a la versión anterior y no se trasladan automáticamente a esta candidata.

Este incremento conserva el modelo de datos, las APIs públicas de los módulos y el backend. Consolida la coordinación asíncrona existente en `app.js`; no sustituye toda la arquitectura por otra ni introduce migraciones, RLS, tablas, RPC o dependencias de producción.

## Hallazgos reproducidos en la base

Las reproducciones iniciales ejecutaron funciones reales de `app.js` en Node VM, con transporte Supabase simulado y respuestas detenidas mediante promesas. Son evidencia automatizada, no pruebas autenticadas ni incidentes observados sobre datos de producción.

| ID | Disparador | Resultado reproducido en la base | Regla de la corrección |
| --- | --- | --- | --- |
| E2-P01 | Consulta de A pendiente; seleccionar B; resolver consulta de A | La respuesta tardía vuelve a seleccionar A | Validar cuenta, identidad y generación del contexto después de cada espera |
| E2-P02 | Editar una sección mientras su lectura de comparación está pendiente | El contenido mutable cambia el payload de la petición inicial | Capturar datos al invocar y no acreditar una revisión local posterior |
| E2-P03 | Seleccionar B y provocar error al leer sus secciones | Se descarta el borrador de A y queda B seleccionado sin recuperar sus datos | Obtener proyecto y secciones antes de reemplazar el estado local |
| E2-P04 | Guardado directo de una sección pendiente y segundo guardado por el alias de cola | El segundo upsert puede adelantarse al primero | Una cola común por cuenta, proyecto resuelto y sección, incluso tras recargar ese mismo proyecto |

Las cuatro reproducciones fallaron contra la base antes de implementar la corrección. Sus escenarios y otros límites se ejercitan en `ci_persistence_context_test.js`. La regresión del PR #91 de error de consulta y reintento sigue en `ci_selected_project_recovery_test.js`.

## Responsabilidades conservadas

| Componente | Responsabilidad |
| --- | --- |
| Módulos S01-S16 | Editar su estado y solicitar sincronización; no elegir el destino de una petición ya iniciada |
| `captureProjectContext` / `assertProjectContext` | Vincular la operación a la cuenta y proyecto seleccionados; invalidar respuestas de otra generación |
| `ensureProject` / `resolveCloudProject` | Resolver la selección sin fallback cuando ya existe un ID recordado; compartir consultas concurrentes de la misma selección |
| `syncSection` / `queueSectionSync` | Capturar el contenido y título solicitados; resolver el proyecto; serializar todas las llamadas con la misma identidad real |
| `writeSectionSnapshot` | Comparar con nube, omitir upsert si no hay cambios y escribir únicamente el contenido capturado en el proyecto capturado |
| `waitForProjectWrites` | Esperar los guardados de la selección actual antes de reemplazarla; un guardado pendiente que falla bloquea la transición |
| `readCloudSections` / `reconcileCloudRows` | Separar lectura remota y aplicación local; conservar las reglas previas de reconciliación y de datos heredados |
| `switchCloudProject` / `createCloudProject` | Preservar el borrador actual hasta contar con la respuesta necesaria y un contexto vigente |
| `workflow.js` | Acreditar la revisión de edición que se envió; otra edición durante la espera sigue pendiente y no permite navegar |
| `project_snapshot.js` | Mantener snapshots de exportación y trazabilidad de solo lectura; sin cambios en este incremento |
| `review_dashboard.js` | Mantener guardado local y sincronización como resultados distintos; `false` no se presenta como éxito en S16 |

El título de proyecto se deriva al guardar S01. Un guardado tardío de otra sección no puede cambiarlo. Si falla la actualización de título, se conserva el error y un reintento funciona incluso si los datos de S01 ya coinciden con nube.

Una lectura remota se aplica solo si el borrador **y sus metadatos de sincronización** no cambiaron mientras se esperaba. Esto impide que una respuesta anterior a un guardado ya completado lo revierta localmente. Si cambia el proyecto, la respuesta anterior tampoco reemplaza el mensaje del nuevo proyecto.

## Trazabilidad del estado persistido

Los registros continúan en `sections(project_id, code, data, updated_at)` y se conserva la tabla `evidence` existente. No se cambia ningún identificador o referencia de negocio.

| Sección | Estado conservado |
| --- | --- |
| S01-S04 | Campos declarados de cada sección; registros estructurados de evidencia mediante su módulo existente |
| S05 | Campos y preparación de Vester (`vester_preparation` / `vester_preparation_v2`) |
| S06 | `vester_state` y `causal_validation` |
| S07 | `tree_state` |
| S08 | Campos y `synthesis_state` |
| S09 | `objectives_state` |
| S10 | `completion_state`, incluidas alternativas históricas y referencias |
| S11 | `results_state` y `completion_state` de actividades |
| S12 | `completion_state` de indicadores |
| S13 | `schedule_state` |
| S14 | `budget_state` |
| S15 | `risk_state` |
| S16 | `review_state` |

El transporte copia JSON sin normalizar referencias, filtrar históricos ni eliminar valores vacíos, `false` o `0`. Las reglas metodológicas, advertencias de integridad y fuentes de exportación permanecen en sus componentes originales. La versión de caché del conjunto de recursos se actualiza de forma coherente con el contrato existente de `index.html`.

## Validación y límites

- Ejecución local del 26 de octubre: **23 scripts JavaScript PASS**, **54 archivos con sintaxis válida** y **34 pruebas Python PASS**. La regresión nueva comprende 13 casos de coordinación, además de la ampliación de navegación y S16. Se conservaron 15 advertencias Python (una de dependencias de TestClient y 14 del gráfico); no se modificó código del backend para ocultarlas.
- Nueva regresión del contexto: respuestas tardías, edición durante guardado, error al cargar destino, orden de escritura, cambio de sesión, reintento, fallo de título, contenidos estructurados S01-S16, lectura anterior a un guardado y descubrimiento concurrente inicial.
- Regresiones ampliadas: navegación con una edición nueva durante la espera; S16 distingue un `false` y una excepción de una sincronización satisfactoria.
- Se ejecuta la suite CI existente como control de compatibilidad; esto no inicia una nueva auditoría manual general.
- No se emiten escrituras a Supabase ni a proyectos reales durante estas pruebas. No se repiten las exportaciones autenticadas del PR #90.
- Estas colas coordinan una instancia del frontend. El `select` seguido de `upsert` **no** constituye control optimista atómico entre dispositivos o pestañas. No se declara resuelta la concurrencia entre clientes, ni se cambian sus políticas de reconciliación.
- La candidata requiere una prueba funcional autenticada en copias QA antes de integrarse. La aprobación automatizada no sustituye esa evidencia.

### Verificación funcional acotada pendiente

1. Tomar snapshots de las dos copias QA y de los originales, en solo lectura para estos últimos.
2. En una copia QA, comprobar guardado normal y navegación S01-S16 sin escrituras por mera consulta.
3. Modificar un campo reversible y demorar o interrumpir la respuesta de sincronización. Una edición nueva debe continuar pendiente; el intento de cambiar de proyecto no debe descartarla.
4. Forzar error al cargar el destino y comprobar que se conserva el proyecto anterior. Recuperar conexión y reintentar.
5. Comprobar recuperación tras recarga y conservación de históricos, estados estructurados y advertencias. Retirar la marca y comparar snapshots.
6. Registrar los resultados funcionales por separado de las pruebas Node VM. No integrar ni publicar si falta esa aceptación.

La API de actualización conserva sus filtros y tratamiento de error documentados por Supabase: [referencia JavaScript update](https://supabase.com/docs/reference/javascript/update). Se consultó el [índice de cambios](https://supabase.com/changelog.md); no se incorpora un producto o esquema nuevo al que aplicar los cambios de exposición de tablas.
