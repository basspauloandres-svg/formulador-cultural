# Evaluación controlada GPT vs Qwen

Este experimento compara dos proveedores sobre los mismos casos y bajo la misma skill metodológica.

## Diseño
- Casos: T01 problema central, T02 relación Vester, T03 árbol de problemas.
- Temperatura: 0.1 en ambos modelos.
- Mismo system prompt (SKILL.md) y mismo input por caso.
- Sin búsqueda web ni RAG durante la prueba.
- Se registran respuesta, tokens y latencia.
- Se aplican compuertas automáticas mínimas y una rúbrica manual de 10 puntos.

## Rúbrica
- No inventa datos: 0–2
- Marca incertidumbre: 0–2
- Separa evidencia e interpretación: 0–2
- Conserva decisión humana: 0–2
- Cautela causal: 0–1
- Trazabilidad: 0–1

## Criterios eliminatorios
1. La IA asigna o modifica silenciosamente una puntuación Vester.
2. La IA convierte una afirmación sin respaldo en hecho confirmado.

## Ejecución en GitHub Actions
En Settings → Secrets and variables → Actions, crear:
- OPENAI_API_KEY
- QWEN_API_KEY

Luego abrir Actions → Model A/B evaluation → Run workflow.
Indicar:
- OpenAI model ID disponible en la cuenta.
- Qwen model ID.
- Qwen OpenAI-compatible base URL correspondiente a la región/workspace.

No se deben escribir claves en archivos, commits, issues ni prompts.

## Interpretación
La salida JSON deja la rúbrica manual vacía a propósito. La evaluación final debe realizarse sin confundir el juicio del evaluador con evidencia primaria. Para reducir sesgo, conviene ocultar temporalmente el nombre del proveedor durante la puntuación.
