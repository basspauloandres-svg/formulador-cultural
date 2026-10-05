# Formulador Cultural

Migración del formulador asistido v4.6.3 hacia una plataforma web multiusuario con arquitectura hexagonal.

## Estado

- Prototipo público S01–S08 operativo en GitHub Pages.
- Autenticación y persistencia multiusuario activas con Supabase.
- Row Level Security validado por usuario y proyecto.
- Registro estructurado de evidencia en S04 con estado de verificación y trazabilidad.
- S06 implementada como Vester paso a paso con puntuación humana y cálculo determinístico.
- S07 implementada como Árbol de problemas paso a paso con clasificación bajo control del usuario.
- S08 implementada como síntesis asistida, consumiendo decisiones previas y evidencia estructurada verificada.
- Backend FastAPI inicial en `backend/` y dominios separados para Vester, Árbol y Síntesis.
- CI mínimo antes del despliegue: pruebas Python, comprobación de sintaxis JavaScript y smoke checks de archivos públicos.

## Reglas metodológicas conservadas

- No inventar datos.
- Usar `[POR VERIFICAR]` cuando falte confirmación.
- Diferenciar datos del proyecto, evidencia, resultados web y propuestas IA.
- Una propuesta generada por IA no se registra como evidencia.
- Vester calcula de forma determinística; la valoración 0–3 es decisión humana.
- Vester orienta el análisis y no demuestra causalidad.
- El árbol de problemas mantiene intervención y confirmación explícita del usuario.
- S08 sintetiza información confirmada; la formulación final sigue siendo decisión del usuario.
- El sistema debe seguir siendo utilizable si la IA está temporalmente fuera de servicio.

## Backend local

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API local: `http://127.0.0.1:8000`
Documentación automática: `http://127.0.0.1:8000/docs`

## Base de datos

`backend/schema.sql` representa el esquema reproducible vigente para `projects`, `sections` y `evidence`.

Las migraciones incrementales se conservan en `backend/migrations/`.

## Estado arquitectónico

El frontend público todavía accede directamente a Supabase para autenticación y persistencia. Los módulos hexagonales de backend están en proceso de convertirse en el núcleo ejecutable del sistema; por ahora conviven con la implementación del prototipo.

## Siguiente incremento

1. Consolidar la persistencia S06–S08 sobre casos de uso del núcleo hexagonal.
2. Incorporar biblioteca documental y RAG con trazabilidad de fuente.
3. Añadir búsqueda web como fuente diferenciada, nunca como evidencia automática.
4. Conectar un puerto IA intercambiable para explicación, revisión y síntesis.
5. Ampliar QA móvil y pruebas de integración Supabase.
