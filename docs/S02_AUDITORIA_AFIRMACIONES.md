# S02: retención preventiva de afirmaciones causales (piloto)

La evaluación M01 de Neira (dos salidas observadas) mostró que el prompt de Groq no garantiza el tratamiento adecuado de causalidad y evidencia. Se incorpora una barrera determinista posterior a la generación.

## Contrato
- El backend analiza el texto de Groq mediante un conjunto explícito de patrones para identificar algunas relaciones causales o impactos afirmados sin lenguaje de hipótesis o señalización cercana de incertidumbre.
- Si detecta patrones, responde con `blocked_for_evidence=true`, `suggestion=""` y `review_flags` que explican qué fragmentos requieren respaldo; la interfaz oculta la opción de aprobación para esa salida.
- Si no los detecta, la propuesta sigue siendo **generativa y no verificada**, con revisión humana obligatoria.
- Los fragmentos y tokens del usuario no se registran en logs de Render; únicamente el número de señales.
- El texto del proyecto, Supabase y los históricos permanecen intactos.

## Limitaciones
Este control se basa en expresiones léxicas, no en análisis de entailment ni en corroboración documental. Puede no detectar causalidades formuladas de otra manera y bloquear expresiones legítimas; una hipótesis con marcador tampoco es evidencia de veracidad. Por ello, la barrera **no certifica** las propuestas que deja pasar.

La verificación por afirmación exigirá recuperar el documento primario original, registrar pasaje y localizador, evaluar alcance y temporalidad, contrastar la afirmación y conservar contradicciones. Solo después podrá construirse una redacción enriquecida con evidencia trazable. No se deben inferir fuentes desde metadatos de catálogo.

## Regresión
`python -m pytest backend/test_claim_audit.py backend/test_assistant_acceptance.py -q`

Casos: causalidad no condicionada de M01 bloqueada, hipótesis marcada no bloqueada automáticamente, redacción descriptiva y respuesta real simulada de Groq con propuesta retenida.
