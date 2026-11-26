# VÉRTICE — checkpoint y continuidad 2026-11-24

## Recuperación
Repositorio canónico: basspauloandres-svg/formulador-cultural. Producción conocida: c9839baa24afe0817d04e5574eb8a60153d369e1 (Render, verificado previamente). Rama de recuperación: checkpoint/2026-11-24-pre-hardening, commit 14bae8075a387e2f20e9383958a44beacfbdb87b. Rama activa: s02-research-first-20261124, PR #135. Última batería verde anterior: 19da77a829ed03103f6bf7d5b6d2eb8ef10ea3f8, runs 45426235325 y 45426235472. El checkpoint posterior aún requiere pruebas.
Frontend: vtcultural.com; API: formulador-cultural-api.onrender.com. Infraestructura: GitHub Pages, Render, Supabase/PostgreSQL, Groq. No almacenar secretos ni datos de participantes en GitHub (repositorio público).
Para migrar: clonar repositorio, recuperar rama checkpoint, inspeccionar README, dependencias y migraciones; reproducir CI; configurar secretos desde gestor autorizado; respaldar base de datos y verificar restauración en entorno aislado antes de cambiar DNS o producción. El checkpoint de Git no incluye base de datos ni secretos. No revertir esquema automáticamente.

## Roadmap y puertas de aceptación
- 24 nov: S02 investigación primero; evidencia recuperada, citas exactas, abstención, pruebas con campo vacío. P0.
- 25 nov: auditoría RLS/API, aislamiento A/B, inyección indirecta, sanitización. P0.
- 26 nov: integración S01–S16, cálculo Vester determinista, aprobación humana, exportación. P0.
- 27 nov: carga representativa 40 usuarios, cuotas, latencia, fallos Groq, caché pública, registros sin datos privados. P0.
- 28 nov: aceptación, congelación, respaldo y prueba de recuperación.
- 29 nov: ensayo y contingencias críticas; taller 30 nov.
No ampliar dependencias antes de medir. Cada cambio: rama, prueba, PR, CI verde, revisión, despliegue, smoke test y registro de SHA. Ante fallo crítico, detener despliegue; recuperar versión anterior comprobada. No confundir CI verde con prueba real de carga o seguridad.

## Reglas metodológicas
Fuente localizada != evidencia recuperada != afirmación sustentada. Aprobación humana es independiente. IA propone, docente decide. Cálculos deterministas fuera del LLM. Citas válidas sintácticamente no prueban respaldo semántico. Conservar incertidumbre y contradicciones. No compartir caché privada.
Referentes: Lewis et al. 2020 (RAG), Gao et al. 2023 (ALCE), Greshake et al. 2023 (inyección indirecta), NIST AI 600-1, OWASP GenAI, documentación PostgreSQL RLS.
## Pendientes
Auditoría efectiva Supabase, respaldo/restauración, inferencia real, carga real, cobertura documental nacional y verificación semántica. No certificados.
