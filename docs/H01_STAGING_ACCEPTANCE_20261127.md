# H01 — verificación de la versión desplegada en Render

Fecha de Colombia 2026-11-27. Servicio de ensayo `vertice-e01-staging`, deploy `dep-dc4nmul6e07s73fvng40`, candidato `11fe3de4ee986d7cebf198012d56eab188cee856`, activo desde las 07:47. La rama de staging avanzó al commit exacto con autorización expresa. Se verificó el SHA en Render antes y después de iniciar las pruebas. `main` permaneció en `c9839baa24afe0817d04e5574eb8a60153d369e1`. Se conservó el plan gratuito con despliegue automático desactivado.

## Alcance de la evidencia

Chromium 131, perfiles de navegador aislados y proyectos de prueba sintéticos. La primera navegación directa de Chromium en el ejecutor falló por el certificado de su proxy. Las pruebas de aplicación se ejecutaron con las respuestas del staging obtenidas mediante HTTPS con validación de certificado y entregadas a Chromium mediante intercepción de pruebas. Las dependencias CDN se cargaron desde paquetes locales. El backend de exportación DOCX/PDF y la consulta territorial W23 respondieron desde Render. Las identidades y la respuesta de IA de W16–W21 fueron simuladas. No se ejecutó el proveedor de IA ni se usaron cuentas reales. Estos resultados acreditan el comportamiento de la versión desplegada bajo dichas condiciones, con aceptación humana e inspección de conectividad directa pendientes.

## Matriz W01–W40

| Controles | Estado | Evidencia |
|---|---|---|
| W01 | PASS | Desde bienvenida, la idea de Neira se conservó en S01 al iniciar. Se diligenció la identificación del proyecto sintético. |
| W02 | PASS | Proyecto nuevo abierto desde un caso completo. Recorrido S01–S16 vacío, contador 0/16, registro de evidencia vacío y sin aprobación heredada. Se restauró el original y coincidieron sus 16 secciones y evidencia. `W02_NEW_PROJECT_ALL_SECTIONS_ISOLATED_PASS`. |
| W03 | PASS | Cambio bidireccional con el selector. Se cotejó, sección por sección, el estado persistido de cada proyecto con su captura anterior a las exportaciones. Dos `W03_STAGING_SNAPSHOT_PASS`. |
| W04–W05 | PASS | Tres identificadores distintos en el selector. El nombre editado quedó persistido tras recargar en la prueba integral. |
| W06–W08 | PASS | Reinicio de proceso con el mismo perfil, recuperación del proyecto activo, autoguardado con indicador y recarga, y preservación byte a byte de la clave histórica al editar su copia. |
| W09–W14 | BLOCKED | Pendientes dos cuentas sintéticas reales ya habilitadas para probar la autenticación. La simulación de cuentas confirmó el comportamiento local de la interfaz sin acreditar autenticación real. |
| W15 | BLOCKED | Este servicio usa almacenamiento local para proyectos. Falta un entorno remoto aislado habilitado. |
| W16–W21 | SIMULATED | Consulta A/B interceptada. Se alternó proyecto durante una respuesta diferida. Recuperación solo en origen, aprobación explícita, rechazo de la otra identidad simulada y persistencia del pasaje sintético `QA-SRC-01`, con `ACCEPTED_UNVERIFIED` e `INSUFFICIENT_EVIDENCE`. |
| W22–W23 | PASS | Idea, nombre, municipio y departamento coincidieron en S01 guardada. La consulta real devolvió Neira, Caldas, código 17486, y la interfaz conservó los valores escritos. `W22_STAGING_IDENTIFICATION_MATCH_PASS` y `W23_STAGING_REAL_DIVIPOLA_PASS`. |
| W24–W25 | PASS | Contradicción Neira–Villamaría visible. Se aprobó y registró la justificación, conservando el municipio declarado. `H01_11_CALDAS_WARNING_PASS`. |
| W26 | PASS | Recorrido secuencial S01–S16, límite de Siguiente en S16 y retorno a S15. |
| W27–W28 | PASS | Caso sintético completo preparado en el estado de la aplicación, con coherencia de la cadena metodológica comprobada en S16. La revisión se revocó al editar desde el formulario, guardar y recargar. Se cotejaron también dos casos con cronograma, recursos y riesgos en el ensayo integral de exportaciones. |
| W29–W33 | PASS | 8/8 descargas de dos proyectos completos en modo invitado. DOCX, PDF, XLSX y HTML conservaron título y contexto propios, marcadores de la formulación, montos, medidas de riesgo y vínculo «Actividad · A». No apareció el marcador del otro proyecto. Estado persistido idéntico antes y después. También pasaron ocho descargas de dos borradores introducidos desde el formulario. |
| W34–W35 | PASS | Modo sin conexión de Chromium durante edición, guardado local, restablecimiento y recarga con recuperación del dato. Sincronización remota fuera del alcance del servicio actual. |
| W36 | PASS | Bienvenida, inicio desde una idea y recuperación. El ejemplo de formación artística se conservó al pasar a S01 en los tres tamaños evaluados. |
| W37 | PARTIAL | Intro ejecutada y transición a bienvenida en WebGL y Canvas 2D. Se observaron 24 llamadas GL instrumentadas, profundidad activa y cero errores GL. Falta cotejo visual humano contra la identidad aprobada. |
| W38–W39 | PASS | Navegación directa y secuencial, botones de inicio, guardado y retorno, e indicadores de guardado y advertencia territorial. 48 inspecciones y 1745 muestras de contraste en escritorio, tableta y móvil, sin incidencias bajo las aserciones del repositorio. |
| W40 | PARTIAL | Se verificó el inicio con ejemplo, la incorporación a S01 y el reconocimiento del borrador. Falta evaluación integral por un participante del diplomado. |

La primera corrida del cotejo documental completo mezcló en un mismo flujo el arranque con una idea desde la interfaz y la carga directa del caso de prueba. Esa corrida no completó la aprobación S16. Se separaron las dos precondiciones, se repitió el cotejo integral y quedaron aprobadas las ocho descargas. El flujo desde una idea tuvo su propia corrida satisfactoria. No se cambió el candidato para hacer pasar la prueba.

**Balance:** 25 PASS en el alcance indicado, 7 BLOCKED, 6 SIMULATED y 2 PARTIAL. H01 sigue **OPEN_CRITICAL**. La [matriz histórica de b981a90](H01_WORK_EVIDENCE_b981a90.md) y la [referencia de recuperación](H01_RENDER_PREFLIGHT_20261127.md) se conservan. Producción fuera del ensayo.

## Comprobación directa en Chrome

27 de noviembre, aproximadamente 08:04 de Colombia. Se abrió la URL pública de staging en Chrome, sin intercepción de respuestas, y Render confirmó que el mismo despliegue seguía activo. El navegador mostró el espacio de ensayo y la animación de entrada, incluidos el fondo turquesa, las partículas y el control «Omitir animación». Se observó la bienvenida después de la entrada. La comparación final de la identidad visual con el referente aprobado sigue pendiente (W37).

Se recorrió el inicio como invitado con un borrador nuevo de prueba. El selector mostró 0/16 secciones y la identificación vacía. El ejemplo «Formación artística» habilitó «Construir mi proyecto» y trasladó el texto a «Idea inicial (aporte del usuario)» en S01. Se guardó el caso sintético `QA H01 · Ensayo de formación musical`, con Neira y Caldas. En S16 apareció «Proyecto en revisión» y se ofreció «Guardar revisión con pendientes», junto a los cuatro formatos. Queda pendiente la experiencia de un participante independiente (W40).

S16 mostró también «No hay pendientes concretos en indicadores, resultados → actividades ni tratamiento financiero» en este borrador inicial. El mensaje tiene un alcance acotado y el resumen general sí indicó que faltaba completar secciones. Conviene incluir esta diferencia en la revisión de claridad con participantes. El balance W01–W40 se conserva. La limitación de conectividad directa de la corrida automatizada anterior ya no aplica a este recorrido focalizado.

## Corrección posterior del mensaje de S16

Candidato `ffeac38f76a1ef23c12a8227b16b021de79ec470` en QA. En borradores con secciones pendientes y sin tarjetas de ajuste específico, S16 pide completar las secciones y enlaza con la primera incompleta. Si todas las secciones están completas y la revisión todavía está pendiente, remite al diagnóstico de ausencias y coherencia. La vista de un caso listo para revisión conserva el resumen específico.

En Chromium contra la copia editorial local, se comprobó el enlace a S01 en un proyecto vacío y el enlace a S02 tras completar S01. El caso completo pudo aprobarse, la aprobación se revocó al editar y el proyecto original conservó sus datos tras alternar al nuevo. Evidencia: `S16_INCOMPLETE_PROJECT_GUIDANCE_PASS`, `INTEGRAL_CLOSURE_PASS` y `W02_NEW_PROJECT_ALL_SECTIONS_ISOLATED_PASS`.

El ajuste aún no está desplegado. La matriz de aceptación anterior corresponde a `11fe3de`; su balance no se incrementa con la prueba local. W40 y la aceptación humana siguen pendientes.
