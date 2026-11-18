# VÉRTICE · Revisión transversal de afirmaciones

## Decisión de producto
La asistencia documental se aplica por necesidad de evidencia, no de forma indiscriminada a los 16 pasos. Se habilita una auditoría inicial en:
- **S02**: caracterización territorial, cultural y social y antecedentes.
- **S03**: población, caracterización y cobertura (cifras, periodo, unidad).
- **S04**: evidencia disponible y fuentes.
- **S05, S07, S08**: situaciones, causas, efectos y formulación del problema.
- **S09–S12**: objetivos, alternativas, actividades, indicadores y metas; distinguir acciones futuras, supuestos, línea base y resultados reales.
- **S14–S15**: presupuesto y riesgos; cifras de costos y supuestos por corroborar.

En S01 se registra el territorio y la identidad institucional; no se impone auditoría por oración a un nombre propio. S06 (Vester), S13 (cronograma) y S16 (revisión final) ya requieren cálculo o juicio metodológico de otra naturaleza y mantienen sus controles especializados. Esto no significa que queden exentos de fundamentación documental cuando corresponda.

## Implementación piloto
- Nuevo endpoint autenticado `POST /assistant/section/review` y botón contextual **«Revisar afirmaciones y fuentes»** en los campos indicados.
- Cada oración se identifica como afirmación aportada, hipótesis o texto que requiere interpretación; todas mantienen **INSUFFICIENT_EVIDENCE** mientras no exista cotejo con evidencia primaria y una regla de decisión definida.
- Se consultan automáticamente fuentes **candidatas** del catálogo público, mediante las categorías de búsqueda ya existentes. Los títulos o resúmenes jamás se convierten en referencias que prueben una afirmación.
- Se conserva el campo íntegro, se exige sesión y se descartan resultados previos cuando cambia el municipio.
- Para S03 se solicita explícitamente corroboración de cifras, años, unidades y alcance poblacional.
- La auditoría no declara veracidad o falsedad sobre un texto hipotético; registra la necesidad de cotejo.

## Limitaciones verificables
Este incremento **NO constituye todavía RAG ni corroboración documental semántica**. La separación en oraciones se realiza con reglas deterministas y puede requerir ajustes para textos complejos. La recuperación actual continúa centrada en metadatos y no permite verificar si un documento respalda una frase. El resultado `INSUFFICIENT_EVIDENCE` es correcto mientras falte documento primario, pasaje y contexto.

## Etapas obligatorias siguientes
1. Conectores institucionales por tipo de dato, empezando por DANE con DIVIPOLA, año, cobertura y definición de variable; registros culturales con documentos primarios.
2. Recuperar documentos íntegros y extraer pasajes o tablas con página, fecha, hash y pertinencia territorial.
3. Cotejo por afirmación atómica: apoyada, contradicha, parcialmente respaldada o insuficiente, conservando los casos negativos.
4. Generación con Groq **después** de este cotejo, con un ledger de soporte por afirmación y control posterior para descartar referencias inventadas.
5. Pruebas con cifras falsas, hipótesis, conflictos territoriales y casos sin evidencia, antes de escalar a nuevos campos.

La responsabilidad interpretativa y la aprobación siguen en manos del investigador o formador.
