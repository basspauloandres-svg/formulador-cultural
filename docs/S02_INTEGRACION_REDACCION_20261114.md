# S02 — Corrección de asistencia a la formulación (M01)

## Comportamiento implementado
- «Ayúdame a formular» utiliza Groq en vez de reformatear localmente la entrada. El borrador es editable y permanece pendiente de aprobación.
- «Investigar y complementar» consulta las fuentes disponibles y entrega orientación; genera también un borrador basado en el texto del participante aunque no existan pasajes institucionales, indicando explícitamente la insuficiencia de evidencia externa.
- Cuando se detectan expresiones causales afirmativas sin atenuación local, se convierte la oración afectada en una hipótesis marcada **[POR VERIFICAR]**, preservando las demás oraciones. Se muestran banderas de revisión. Esta transformación de forma no demuestra validez metodológica ni elimina todos los riesgos de alucinación.
- La extracción de PDF evita fragmentos cortados en líneas aisladas y da prioridad a expresiones musicales, celebraciones o prácticas concretas; las menciones genéricas del Paisaje Cultural Cafetero no constituyen, por sí solas, evidencia de prácticas musicales en Neira.
- Siguen vigentes las restricciones de autenticación, cuotas, fuente documental, control de localizadores y aprobación humana.

## Distinciones metodológicas
- Redacción basada en el texto del formador: **propuesta generativa, sin verificación externa**.
- Fragmento recuperado: **pasaje localizado**, todavía sujeto a pertinencia y corroboración.
- Causalidad cualificada como hipótesis: **interpretación pendiente**, jamás evidencia.
- Las fuentes candidatas del catálogo no son hechos demostrados.

## Pendiente
Integración de datos DANE con DIVIPOLA y año, ampliación de fuentes por municipio y evaluación semántica de soporte afirmación/pasaje. Las pruebas simuladas no sustituyen pruebas con sesión y documentos reales.
