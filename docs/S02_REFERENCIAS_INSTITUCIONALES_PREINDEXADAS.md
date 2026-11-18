# Villamaría · Seguimiento de recuperación institucional (18/11/2026)

## Incidente reproducido
En S02, la auditoría clasifica por separado territorio, gastronomía y música, pero devolvía listas vacías tras filtrar fuentes de otros municipios. La ausencia de datos en pantalla no representa ausencia de fuentes institucionales.

## Corrección
1. El lector HTML SharePoint ahora conserva fragmentos visibles incluso cuando se publican fuera de etiquetas `<p>`; el límite de descarga sigue acotado (3 MB, sin redirecciones, lista de dominios permitidos) y solo extrae patrones territoriales o de la vereda Gallinazo específicamente identificados.
2. Cuando la página no puede descargarse o no ofrece fragmento usable, VÉRTICE presenta referencias institucionales **preindexadas el 18/11/2026** con su enlace y localizador de sección. Se identifican como **síntesis, no citas literales ni lecturas efectuadas durante esta sesión**; su estado es `INDEXED_INSTITUTIONAL_REFERENCE_UNVERIFIED` y carecen de hash de documento.
3. Las referencias iniciales corresponden a la relación vial Villamaría–Manizales y a la gastronomía de Gallinazo (Alcaldía municipal), así como a registros históricos de banda y talleres de música en un informe municipal publicado en 2023.
4. Los mensajes de interfaz distinguen referencias indexadas, extractos recién recuperados y falta de material. Ninguna afirmación se marca `SUPPORTED` o `VERIFIED` por esta identificación.

## Fuentes examinadas
- https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Mi-Municipio.aspx — sección Geografía.
- https://villamaria-caldas.gov.co/MiMunicipio/Paginas/Territorios.aspx — Gallinazo: Gastronomía.
- https://www.villamaria-caldas.gov.co/Participa/Documents/Informe%20Procuradur%C3%ADa%20Secretar%C3%ADa%20de%20Desarrollo%20Social%20a%C3%B1o%202023.pdf — informe municipal con información retrospectiva de procesos de formación musical.

## Límites y etapas pendientes
El PDF de 2023 es de gran tamaño y no se descarga automáticamente con las restricciones vigentes. La referencia preindexada permite conocer su existencia, sin afirmar que la aplicación ha leído sus páginas. Falta cotejo semántico afirmación-pasaje, integración de fuentes de otros municipios y generación con Groq a partir de afirmaciones efectivamente corroboradas. La continuidad actual de procesos musicales no se infiere de datos históricos.
