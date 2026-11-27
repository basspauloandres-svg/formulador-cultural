# H01 — territorio, bienvenida y recuperación

Candidato de validación `176f82eda195d5c05ce7f181d4e9be1d95d288f7`. Chromium 131, copia local del servidor editorial, perfil de prueba y entradas sintéticas. Los blobs de los archivos corregidos y sus regresiones coinciden con los ejecutados. Los resultados de Render se conservan en [la matriz original](H01_WORK_EVIDENCE_b981a90.md).

| Control | Resultado local |
|---|---|
| W06 | Se cerró el navegador y se inició otro proceso con el mismo perfil de prueba. Se recuperaron el proyecto activo y su nombre. Log `W06_FULL_BROWSER_RESTART_PASS`. |
| W08 | Se partió de un borrador sintético anterior a H01. Se recuperó su contenido, se modificó solo la copia y se comprobó que la clave histórica original permaneció idéntica. Log `W08_HISTORICAL_RAW_UNCHANGED_PASS`. |
| W23 | Reproducción negativa: una respuesta tardía HTTP 503 reaparecía al borrar el municipio. La corrección invalida solicitudes al cambiar campos o salir de la sección y usa un contenedor propio. La prueba reprodujo la respuesta tardía, conservó oculto el aviso e identificó una nueva consulta con un código sintético en el ensayo local. Cuatro pruebas en el sitio estático local pasaron con respuestas interceptadas de coincidencia, homonimia, indisponibilidad y respuesta tardía. Falta comprobar el catálogo real. |
| W24–W25 | Se reprodujo la advertencia entre Neira y Villamaría. La primera repetición ampliada mostró que la justificación podía guardarse sin un texto visible de confirmación. Se corrigió la presentación. La prueba final exigió una confirmación visible, verificó el valor persistido y comprobó que el municipio declarado permaneció intacto. Log `H01_11_CALDAS_WARNING_PASS`. |
| W37 | La intro terminó y dio paso a la bienvenida en WebGL y en Canvas 2D forzado. WebGL ejecutó 36 llamadas de dibujo bajo instrumentación, con profundidad activa y sin errores GL observados. El modo de movimiento reducido se usó en las pruebas de recorrido. Falta aceptación visual humana en Render. |
| W38 | Navegación secuencial por S01–S16, bloqueo de Siguiente en S16 y retorno a S15. Log `W38_SEQUENTIAL_NAVIGATION_PASS`. Este alcance no incluye todos los mensajes del producto. |
| W39 | Auditoría en 1440×900, 1024×768 y 390×844. 48 inspecciones y 1745 muestras de contraste, sin problemas bajo las aserciones del repositorio. Log `UNIFIED_WORKSPACE_PASS`. |
| W40 | Reproducción negativa: explorar secciones vacías hacía que la bienvenida ocultara la opción de empezar con una idea. Se reutilizó el conteo de contenido del proyecto activo. En los tres tamaños, el ejemplo de formación artística se incorporó en S01 y la bienvenida reconoció el texto guardado. También se recuperó al pulsar Continuar en la prueba focalizada. Falta la revisión integral del recorrido por un participante del diplomado. |

La suite H01 de aislamiento volvió a pasar, incluidos autoguardado, conteo, recuperación sin red, exportación HTML, consulta simulada y cambio entre cuentas simuladas. Se interceptó el servicio territorial en esa suite para conservar la independencia del catálogo externo.

Render confirmó que el ensayo sigue en `b981a90` (deploy `dep-dc4fc23l550s7394s66g`). La validación local no incrementa el conteo aprobado de la matriz de Render. H01 continúa **OPEN_CRITICAL**, con pendiente de validación del candidato corregido en Render, autenticación real con cuentas sintéticas, persistencia remota aislada y aceptación humana. Sin cambios de permisos, producción ni servicios.
