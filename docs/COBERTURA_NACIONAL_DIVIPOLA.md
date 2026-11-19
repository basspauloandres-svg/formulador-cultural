# Cobertura territorial nacional de VÉRTICE — fase DIVIPOLA

## Decisión
La identificación del municipio deja de depender de los dos registros provisionales de Neira y Villamaría. El servicio nacional `territory_registry.py` consulta automáticamente la fuente pública DANE en Datos Abiertos Colombia (recurso `gdxc-w37w`) para identificar municipios, distritos, islas y áreas no municipalizadas con código DIVIPOLA. Se conserva el tipo administrativo; una isla o área no municipalizada no se renombra «municipio» por conveniencia.

### Fuentes, fecha y unidad
- Catálogo: https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w
- API: https://www.datos.gov.co/resource/gdxc-w37w.json
- Campos oficiales: `cod_dpto`, `dpto`, `cod_mpio`, `nom_mpio`, `tipo_municipio`.
- El catálogo informa corte administrativo **30 de diciembre de 2024** y fecha de datos **24 de enero de 2025**. Su publicación puede actualizarse posteriormente; la versión disponible de los datos no debe presentarse como un censo de 2026.
- Los cinco dígitos DIVIPOLA se conservan como cadenas para preservar ceros iniciales. El código **identifica** la unidad administrativa; no informa población, prácticas culturales, cobertura ni efectos.

## Funcionamiento
1. El asistente obtiene la combinación municipio + departamento de S01 y consulta el catálogo nacional en una sola descarga acotada de máximo 1.500 filas, validando integralidad, esquema, unicidad de códigos y controles de consistencia. Cachea durante 24 horas el conjunto íntegro. Si la actualización falla, solo puede usar una copia completa obtenida previamente, señalando indisponibilidad si nunca hubo descarga válida.
2. Los nombres con y sin tildes se normalizan para búsqueda; las denominaciones oficiales y códigos se conservan. Si un nombre es compartido por varios territorios, la búsqueda sin departamento devuelve `AMBIGUOUS_MUNICIPALITY`, nunca una coincidencia arbitraria. Los datos con departamento incorrecto devuelven `NOT_FOUND`.
3. En S01 la comprobación ocurre automáticamente tras modificar municipio/departamento. Muestra la identificación y tipo territorial sin sustituir la información introducida.
4. S02 y la revisión de afirmaciones de otras secciones utilizan el registro nacional. Las declaraciones administrativas simples reciben `ADMINISTRATIVE_REGISTRY_MATCH`; la decisión del formador de intervenir un lugar permanece una declaración del proyecto.
5. La investigación sobre gastronomía, prácticas musicales, población, causas, indicadores y otras características mantiene `INSUFFICIENT_EVIDENCE` hasta contar con fuentes de contenido adecuado; el catálogo DIVIPOLA no es prueba de esas afirmaciones.

## Pruebas
- Descarga sintética de 1.122 entradas, validación de cinco dígitos y ceros iniciales, rechazo de duplicados y descargas parciales.
- Homónimos «Granada» en distintos departamentos; selección por departamento y rechazo de combinaciones falsas.
- Accentos y prefijos «Municipio de»; preservación del tipo administrativo.
- Desconexión inicial y reutilización de un conjunto íntegro cacheado.
- Navegador S01 con Anserma, Caldas (código 17042), municipio homónimo y servicio inactivo; no reemplaza texto original.
- Regresiones de S02 y revisión documental con servicios aislados del tráfico externo.

## Límites
La descarga real del recurso DANE depende de la disponibilidad del servicio de Datos Abiertos. Las pruebas unitarias/E2E usan datos simulados y no demuestran disponibilidad permanente desde Render; se requiere comprobación de operación real tras desplegar. Esta fase extiende la **identificación administrativa** a escala nacional, no garantiza que todos los municipios cuenten con documentos culturales estructurados. La recuperación, verificación por afirmación y redacción científica fundamentada continúan como trabajos independientes y necesitan pruebas con datos primarios. Los metadatos DIVIPOLA y las fuentes indexadas nunca se convierten por sí solos en evidencia cultural.
