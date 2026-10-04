# Formulador Cultural

Migración del formulador asistido v4.6.3 hacia una plataforma web multiusuario con arquitectura hexagonal.

## Estado

- Prototipo público S01–S08 operativo en GitHub Pages.
- Interfaz móvil ajustada con navegación persistente, autoguardado local y preguntas orientadoras plegables.
- Backend FastAPI inicial en `backend/`.
- Dominio desacoplado para Proyecto, Sección, Evidencia y Vester.
- Puerto de persistencia preparado para sustituir el adaptador en memoria por PostgreSQL/Supabase.
- Esquema SQL con Row Level Security preparado en `backend/schema.sql`.

## Reglas metodológicas conservadas

- No inventar datos.
- Usar `[POR VERIFICAR]` cuando falte confirmación.
- Diferenciar proyecto, biblioteca, web y propuesta IA.
- Vester calcula de forma determinística; la valoración 0–3 es decisión humana.
- El árbol de problemas mantiene intervención y confirmación explícita del usuario.
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

## Siguiente incremento

1. Crear proyecto Supabase independiente.
2. Aplicar `schema.sql` y verificar RLS.
3. Sustituir `InMemoryProjectRepository` por adaptador PostgreSQL/Supabase.
4. Conectar autenticación.
5. Integrar el frontend con la API sin eliminar el modo local degradado.
6. Añadir búsqueda web, RAG y router de IA mediante puertos independientes.
