# Seguridad Supabase — 2026-11-24
Migración aplicada en producción con autorización expresa: `vertice_least_privilege_workshop`.
```sql
REVOKE ALL PRIVILEGES ON TABLE public.projects, public.sections, public.evidence FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.projects, public.sections, public.evidence FROM authenticated;
```
Verificación posterior con has_table_privilege: 42 combinaciones; anon sin los siete permisos evaluados en las tres tablas; authenticated conserva SELECT, INSERT, UPDATE, DELETE y carece de TRUNCATE, REFERENCES, TRIGGER. RLS y políticas de propiedad observadas antes de la migración; no modificadas. No se ejecutó DML. Para recuperación aplicar los mismos REVOKE después de restaurar esquema y verificar permisos efectivos. Pendiente prueba A/B con sesiones reales, respaldo/restauración y protección de contraseñas comprometidas. No restaurar privilegios excesivos como procedimiento ordinario de rollback.
