# Matriz maestra NCM — control de ejecución
Orden obligatorio: 1 epistémico, 2 seguridad, 3 metodología, 4 infraestructura, 5 evaluación, 6 publicación, 7 contingencia. Un proceso activo; hallazgos nuevos se registran sin cambiar el orden. Estado activo: 1, PR #135. Cierre requiere evidencia de prueba y checkpoint.

| ID | Fundamento tecnológico | Código / control | Aceptación | Estado y evidencia |
|---|---|---|---|---|
| E01 | RAG, recuperación previa | backend/automatic_assistant.py, source_research.py | Campo vacío investiga; sin evidencia abstención | CI_PASS en 266d0ed (144 pruebas Python, 19 advertencias; runs 45476524555 y 45476524424); checkpoint/2026-11-24-e01-ci-pass; aceptación real pendiente |
| E02 | Proveniencia y validación de citas | assistant_pilot.py, automatic_assistant.py | Citas existentes, extractos localizables; apoyo semántico evaluado | Parcial; prueba sintética M1/M2 |
| E03 | Identidad territorial determinista | section_review_ui.js, resolución DIVIPOLA | Cambio Chinchiná/Villamaría invalida propuesta y bloquea incorporación incompatible | P0 abierto; capturas de usuario, causa pendiente |
| E04 | Guardrails epistémicos | assistant_pilot.py | Diferenciar fuente descubierta, evidencia recuperada, afirmación sustentada, aporte humano, hipótesis e insuficiencia | Parcial |
| S01 | RLS y privilegio mínimo | Supabase projects/sections/evidence | 42 permisos efectivos; aislamiento A/B | Permisos verificados; guardado confirmado por usuario; A/B pendiente. Ver SUPABASE_SECURITY_20261124.md |
| S02 | Contención de prompt injection y herramientas | backend y UI | Documentos tratados como datos; sin acciones privilegiadas inducidas | Pendiente |
| M01 | Herramientas deterministas y aprobación humana | Vester, S01–S16 | Repetibilidad, coherencia y aprobación explícita | Pendiente revisión integral |
| I01 | Caché pública y deduplicación | automatic_assistant.py | 40 solicitudes equivalentes, una descarga; sin datos privados | Prueba sintética verde en commit a196a4b; carga real pendiente |
| I02 | Backpressure y límites | request_limits.py | Saturación controlada, recuperación, 40 participantes | Rama PR135; CI final y carga real pendientes |
| I03 | Routing y tolerancia a fallos | assistant_pilot.py | Modelo autorizado, continuidad manual ante fallo | Configuración desplegada c9839baa; inferencia real pendiente |
| V01 | Observabilidad y evaluación | pytest, Playwright, logs | Trazabilidad, latencia, errores, regresión y privacidad | Parcial; aceptación integral pendiente |
| P01 | Recuperación y congelamiento | RECOVERY_ROADMAP.md | Restauración aislada, versión estable, contingencia | Checkpoint existente; restauración pendiente |

Fundamentos corresponden a la síntesis de investigación previa sobre RAG, control de acceso, guardrails, caché, routing y evaluación. Referencias bibliográficas exactas y correspondencia con fuentes originales pendientes de reverificación; esta matriz no certifica implementación ni validación académica. Cronograma: 24 motor epistémico, 25 seguridad, 26 metodología, 27 infraestructura, 28 validación/congelamiento, 29 contingencia. No publicar sin pruebas de aceptación.

## Registro E01 — 2026-11-24
- Corrección 9f5c11d: coincidencia municipal explícita en fragmentos PDF; identidad resuelta también en documentos institucionales. Filtro conservador con posible pérdida de evidencia pertinente sin mención local explícita; no certifica apoyo semántico.
- Regresión 266d0ed: caso sintético Neira/Chinchiná. CI Python global: 144 passed, 19 warnings, 21.80 s; salida agregada, no log individual. QA navegador público: success. Job deploy: skipped. Base main c9839baa, PR abierto y sin merge al verificar.
- Advertencias: 1 deprecación TestClient/Starlette-httpx; 18 advertencias de etiquetas de ejes en exportación (document_generator.py:572). Registrar para M01/V01 sin alterar el orden.
- Estado E01: CI_PASS / REAL_VALIDATION_PENDING. Falta evidencia de recuperación real e inferencia autenticada en entorno aislado; no cerrar, no avanzar E02, no publicar. Checkpoint de código probado: 266d0ed86c5a9b0cbafa0a3b5dd2c055d64b6109. No incluye datos ni secretos.
