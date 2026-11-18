# S02 · Regresión al cambiar Neira por Villamaría (18 noviembre 2026)

## Motivo
La prueba móvil indicó orientación territorial genérica y versión anterior del frontend después de cambiar municipio. Se distinguen el problema del contexto (posibles resultados heredados) y el problema de versiones abiertas en Safari.

## Modificaciones
1. El frontend envía municipio **y departamento** desde S01 a la búsqueda y a Groq, y compara contexto/versión de solicitud al recibir la respuesta. Si cambian texto o municipio, descarta resultados pendientes sin alterar el texto del formulario.
2. «Investigar y complementar» puede investigar con el campo S02 vacío, tomando el municipio de S01; Groq solo genera cuando existe texto original suficiente.
3. Se muestra una identificación territorial de Villamaría, Caldas, código DIVIPOLA 17873, con enlace a la Alcaldía. Se mantiene diferenciada de datos de población no consultados; Neira conserva su identificación por separado.
4. Si el texto en un proyecto de Villamaría menciona Neira, se alerta sobre la posible discrepancia sin eliminarlo, puesto que podría ser una comparación legítima.
5. Las pestañas que ejecutan esta versión podrán detectar versiones posteriores al recuperar el foco y ofrecer recargar después de guardar. No se fuerza recarga ni se borran datos locales.

## Fuentes de la identificación territorial
- Alcaldía de Villamaría: https://www.villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx (Código DANE 17873)
- DANE, codificación DIVIPOLA: https://www.dane.gov.co/index.php/sistema-estadistico-nacional-sen/normas-y-estandares/nomenclaturas-y-clasificaciones/nomenclaturas/codificacion-de-la-division-politica-administrativa-de-colombia-divipola

## Evidencia y límites
La identificación DIVIPOLA es un dato administrativo respaldado. La recuperación de estadísticas demográficas actualizadas y la comprobación semántica de fuentes musicales de Villamaría siguen pendientes. Las pruebas E2E emplean respuestas sintéticas de la API, por lo que debe distinguirse validación de enrutamiento de validación de contenido oficial real.
