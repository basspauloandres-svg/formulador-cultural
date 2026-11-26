# Seguridad Supabase — 2026-11-24
Migración aplicada en producción con autorización expresa: `vertice_least_privilege_workshop`.
```sql
REVOKE ALL PRIVILEGES ON TABLE public.projects, public.sections, public.evidence FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.projects, public.sections, public.evidence FROM authenticated;
```
Verificación posterior con has_table_privilege: 42 combinaciones; anon sin los siete permisos evaluados en las tres tablas; authenticated conserva SELECT, INSERT, UPDATE, DELETE y carece de TRUNCATE, REFERENCES, TRIGGER. RLS y políticas de propiedad observadas antes de la migración; no modificadas. No se ejecutó DML. Para recuperación aplicar los mismos REVOKE después de restaurar esquema y verificar permisos efectivos. Pendiente prueba A/B con sesiones reales, respaldo/restauración y protección de contraseñas comprometidas. No restaurar privilegios excesivos como procedimiento ordinario de rollback.


## S01 — auditoría de metadatos y prueba reproducible
Consulta de solo lectura al catálogo de producción: 3 tablas de aplicación en public, RLS activo en las 3, 9 políticas de propiedad coincidentes con backend/schema.sql; 42 combinaciones de permisos efectivas coincidentes con mínimo privilegio. Sin vistas ni funciones propias no pertenecientes a extensiones en public; 0 buckets Storage. No se consultaron filas de proyectos ni se realizó DDL/DML. No equivale a auditoría completa de todas las interfaces.
Advisors security: una advertencia auth_leaked_password_protection. Pendiente evaluar disponibilidad y costo del plan y autorización explícita antes de cambiar configuración de producción. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
Documentación revisada: https://supabase.com/changelog.md (CLI v3 con cambios incompatibles; se mantiene v2.39.2 fijada para reproducibilidad), https://supabase.com/docs/guides/database/postgres/row-level-security y https://supabase.com/docs/guides/api/securing-your-api.
Candidato e5e630b: script s01_isolation.py, s01_privileges.sql y workflow s01-isolated-rls.yml, entorno efímero sin credenciales alojadas. Validación A/B todavía pendiente (run 45535606939). Se amplía prueba de escritura anónima y comprobación de integridad de propietario y contenido. Mantener S01 abierto hasta aprobación efectiva.
