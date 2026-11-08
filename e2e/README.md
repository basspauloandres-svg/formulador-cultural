# QA de navegador sin Word (Issue #93)

Este incremento incorpora Playwright para pruebas **públicas y de solo lectura** sobre el frontend candidato, servido localmente en GitHub Actions. No usa contraseñas, sesión de Supabase, ni modifica proyectos.

## Qué comprueba
- E2E-01: renderizado y recorrido S01–S16; detectar peticiones mutantes dirigidas al proyecto de Supabase mientras no hay autenticación.
- E2E-02: navegación y restauración de la sección seleccionada tras recarga.
- E2E-03: controles de acceso visibles; no envía enlaces ni contraseñas.

Los archivos `test-results/results.json`, `test-results/matrix.csv`, `playwright-report/` y las trazas/capturas cuando falla una prueba se guardan como artefacto de GitHub Actions. No hay exportación Word.

## Alcance pendiente
Las pruebas NO acreditan autenticación real, persistencia remota, evaluación de coherencia metodológica ni exportaciones de documentos. La automatización autenticada de «Prueba 3» requiere credenciales QA protegidas como secretos de Actions y un diseño de pruebas que NO altere ese proyecto; preferir copia sintética. Ninguna prueba con secretos puede ejecutarse automáticamente desde PR de contribuyentes externos.

## Ejecución en CI
Workflow `.github/workflows/browser-qa.yml`, separado del despliegue de GitHub Pages. El candidato debe superar estas pruebas antes de considerar su integración. Una falla de disponibilidad de CDN se registra como incidencia de entorno, sin atribución automática al código.

## Regla de evidencia
PASS = ejecutada con aserciones; FAIL = ejecución fallida; INSUFFICIENT_EVIDENCE = no ejecutada. No contar los 16 módulos como 16 pruebas independientes: son pasos de E2E-01.
