# Auditoría de pertinencia municipal — caso Villamaría

## Hallazgo
Captura de prueba (18 de noviembre de 2026): el campo de características culturales contenía tres asuntos distintos —proximidad a Manizales, gastronomía y bandas—. El sistema devolvió títulos relacionados con Pereira y Cali. Son coincidencias temáticas del catálogo, pero no evidencia territorial válida de Villamaría.

## Medidas integradas
- El catálogo exige coincidencia **del municipio normalizado** en título o descripción, además del tema. Una mera mención de Caldas o la palabra música no basta. Ante ausencia de datos municipales expresos, conserva `INSUFFICIENT_EVIDENCE`.
- Se segmentan cautelosamente afirmaciones sobre ubicación, gastronomía y música para solicitar fuentes diferentes. Es una heurística de detección, no una validación semántica.
- En el caso de Villamaría, S02 intenta leer automáticamente fragmentos de las páginas oficiales «Mi Municipio» y «Territorios» de la Alcaldía, con recuperación HTTPS acotada, hash SHA256, índice de párrafo HTML y advertencia sobre el ámbito espacial del pasaje. En particular, una descripción de la gastronomía de la vereda Gallinazo no se generaliza al municipio.
- Los fragmentos HTML localizados se muestran por separado de los documentos aún candidatos. Su `passage_status` es `EXCERPT_FOUND_CLAIM_UNVERIFIED`; ninguna afirmación recibe el estado de verificada solo por coincidencia de palabras.
- La interfaz deja de exhibir una lista de documentos de otras ciudades como si fuera pertinente, y explicita la ausencia de evidencia cuando el filtro no recupera documentos.

## Fuentes primarias institucionales
- https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx
- https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx

## Pendiente
El cotejo semántico afirmación-pasaje y la redacción generativa posterior al cotejo siguen pendientes. La geografía del documento recuperado y su mención temática no certifican automáticamente la verdad de un dato. Es necesario ampliar el corpus institucional sobre música y comparar datos numéricos con conjuntos de datos estructurados del DANE. El equipo investigador conservará juicio y aprobación final.
