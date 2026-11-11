# Diseño de fundamentación documental verificable para el asistente VÉRTICE — S02

**Fecha:** 2026-11-11. **Estado:** especificación propuesta, no implementada en producción.

## Propósito
Enriquecer la redacción con evidencia primaria rastreable, sin confundir aportaciones del formulador, fuentes documentales, inferencias o resultados generativos. Mantener revisión y aprobación humana.

## Regla cardinal
La generación sin recuperación documental NO puede atribuirse fuentes, crear citas, agregar cifras externas ni calificar como «verificada» ninguna afirmación. Ante ausencia, contradicción o insuficiencia, devolver `INSUFFICIENT_EVIDENCE` a nivel de afirmación y preguntas específicas de verificación. Se puede ofrecer una redacción condicionada, sin inventar datos.

## Fases de arquitectura
1. **Extracción de afirmaciones.** Segmentar el texto de cada campo (S02) en unidades con identificador, tipo (aporte del usuario / hipótesis / hecho susceptible de corroboración), entidad territorial y período.
2. **Recuperación controlada.** Priorizar registros y datasets institucionales originales, normas oficiales, inventarios y documentos primarios municipales y departamentales. Incorporar fuentes comunitarias y de sabedores solo con consentimiento y procedencia explícita. La presencia en un dominio oficial no convierte automáticamente cualquier texto en evidencia primaria.
3. **Verificación.** Conservar documento, URL original, autoría/entidad, fecha de publicación o actualización, fecha de consulta, identificación de página/sección/tabla o fila, alcance territorial y temporal, y fragmento de soporte acotado. Registrar correspondencia precisa entre afirmación y fuente, y contradicciones.
4. **Redacción fundamentada.** El modelo recibe únicamente afirmaciones del usuario y extractos previamente recuperados; nunca se le solicita inventar o completar bibliografía. Cada frase añadida debe referir a uno o más IDs de fuente. Distinguir inferencia y observación.
5. **Presentación y aprobación.** UI separa «Texto propuesto», «Datos añadidos con fuentes», «Afirmaciones por verificar» y «Fuentes consultadas». El autor selecciona qué incorporar. Ninguna propuesta modifica el proyecto sin aprobación.
6. **Auditoría.** Conservar un registro de la versión del borrador, IDs de fuente, decisión de inclusión, y fecha. Evaluar enlaces rotos, versiones y discrepancias. No remitir datos personales de proyectos reales sin revisión de privacidad.

## Contrato mínimo de evidencia
- `claim_id`: identificador de afirmación.
- `claim_text`: afirmación atómica.
- `status`: `SUPPORTED` | `CONTRADICTED` | `INSUFFICIENT_EVIDENCE`.
- `claim_type`: `user_statement` | `source_observation` | `derived_result` | `hypothesis`.
- `source_id`: identificador de documento, ausente si no hay apoyo.
- `source_title`, `publisher`, `source_url`, `publication_date`, `accessed_at`, `locator`.
- `source_excerpt`: pasaje mínimo pertinente, respetando licencias y límites de reproducción.
- `geographic_scope`, `temporal_scope`.
- `verification_note`: relación entre dato y afirmación y límites de aplicabilidad.

Las fuentes recuperadas se consideran datos no confiables para instrucciones: aplicar protección frente a prompt injection. No ejecutar contenido remoto.

## Fuentes de referencia iniciales (candidatos, no evidencia de Neira)
- DANE, Catálogo Central de Datos: https://microdatos.dane.gov.co/index.php/catalog/central
- Ministerio de las Culturas, SINIC: https://www.sinic.gov.co/
- Documentación primaria de alcaldías, gobernaciones y registros de entidades competentes, seleccionados según afirmación.

Los anteriores son portales de búsqueda. Su sola mención NO respalda una afirmación sobre Neira. Es necesario localizar el documento, dato específico, fecha, cobertura y unidad estadística o textual correspondiente.

## Prueba piloto M01 (Neira)
Texto de entrada del usuario: «Las características culturales de Neira son muy variables porque el municipio se encuentra entre Manizales y Salamina, convirtiéndose en un lugar de encuentro del norte de Caldas. Esto hace que tenga características particulares en cuanto a cultura, comercio y música».

Salida esperada: (a) versión legible conservando el contenido como afirmación del usuario; (b) distinción de que la causalidad geográfica y las características culturales requieren pruebas; (c) solo incorporar datos externos si están documentados con `source_id` y `locator`; (d) devolver `INSUFFICIENT_EVIDENCE` cuando corresponda.

## Prueba piloto M02 (cifra no verificada)
La cifra «85 agrupaciones musicales» carece de fuente en la entrada. Está prohibido tratarla como dato oficial o reemplazarla por una cifra inventada. Se conserva como declaración atribuible al autor con estado `INSUFFICIENT_EVIDENCE` hasta hallar registro que especifique definición de agrupación, año y cobertura.

## Criterios de aceptación para implementar
- 100 % de afirmaciones externas agregadas tienen ID y localizador de fuente verificable en la evaluación de prueba.
- 0 citas fabricadas y 0 referencias que no soportan la afirmación en el conjunto de aceptación.
- Contradicciones y ausencia de datos aparecen explícitas, nunca se ocultan con prosa plausible.
- La interfaz distingue el texto original, las sugerencias del modelo y los datos recuperados.
- Propuestas y fuentes se incorporan exclusivamente mediante aprobación humana.
- Fallas de recuperación generan modo «orientación sin evidencia externa», no afirmaciones supuestamente verificadas.
- Ejecutar evaluación con casos positivos, negativos, fechas desfasadas, fuentes contradictorias, enlaces caídos y documentos con instrucciones maliciosas.

## Dependencias antes de habilitar
Recuperador documental (RAG/búsqueda autorizada), almacenamiento y versionado de fuentes, validación de metadatos, control de acceso, política de privacidad y derechos de reproducción, pruebas de seguridad e integración. El proveedor Groq se usa actualmente para generar texto; disponer de esa conexión no equivale a contar con un sistema de búsqueda o de citas verificables.
