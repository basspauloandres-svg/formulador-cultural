# VÉRTICE S02 — asistencia automática orientada al formador

**Estado:** piloto acotado; extensión territorial y verificación semántica pendientes.

## Experiencia del formador
El usuario aporta su municipio en S01 y sus propias observaciones en S02. Al pulsar «Investigar y orientar», el backend busca fuentes institucionales candidatas mediante el servicio de investigación existente, intenta obtener de forma automática extractos de los PDF institucionales registrados para ese territorio y devuelve recomendaciones de diligenciamiento. No se solicitan URLs ni pasajes manuales en la interfaz principal.

Cuando el backend logra extraer un pasaje original con localizador, puede enviarlo a Groq como contexto acotado para generar un borrador. Se muestran documento, año, URL, página y extracto para que el formador revise la pertinencia. El borrador continúa sujeto a aprobación, sin guardado automático.

## Piloto inicial
- Documento institucional registrado: ficha territorial de Neira de 2016. Su URL está registrada como posible fuente, pero la disponibilidad HTTP se comprueba en cada solicitud.
- Solo se usa cuando el contexto permite identificar Neira, Caldas, y el campo requiere información cultural o antecedentes.
- Para otros municipios o documentos inaccesibles se devuelve orientación específica del campo y se declara evidencia insuficiente; no se inventan cifras ni actores culturales.
- Los metadatos del catálogo y de los resultados web permanecen como candidatos y no se envían a Groq como evidencia.
- No existe todavía recuperación automatizada de las cifras municipales de DANE ni integración con todas las fuentes de ESAP, gobiernos territoriales y repositorios académicos.

## Trazabilidad y seguridad
- Las fuentes se descargan exclusivamente de hosts institucionales permitidos en el backend; tamaño, páginas y redirecciones están limitados.
- El extracto se mantiene marcado como texto documental no confiable frente a instrucciones maliciosas.
- Los localizadores generados deben referir a páginas extraídas. Esta verificación no prueba por sí sola que la afirmación esté respaldada lógicamente.
- La barrera de afirmaciones causales continúa activa.
- Las fallas de descarga y las cuotas de Groq no impiden entregar la orientación de diligenciamiento.
- No se escriben datos en Supabase; el original y los históricos permanecen intactos.

## Criterios de evaluación
Pruebas sintéticas de municipios sin fuente, falla de PDF, extracción de página, evidencia remitida a Groq, bloqueo de causalidad, referencias fuera del documento y caída del proveedor. Después: prueba autenticada real en S02, contraste de pertinencia y verificación manual de las afirmaciones sugeridas.

## Próximo desarrollo
Integrar conectores oficiales de DANE para cifras municipales con código DIVIPOLA, año, unidad y definición; ampliar registro e ingesta institucional, verificación de afirmaciones atómicas, RAG de la biblioteca y web con proveedor configurable. Priorizar fuentes vigentes para cada campo y evitar transferir la investigación documental al formador.
