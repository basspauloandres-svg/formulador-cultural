# QA autenticado de solo lectura (Issue #93)

Este incremento permite recorrer S01–S16 en el proyecto «Prueba 3» con un navegador real, sin Word ni cambios deliberados en el formulario.

## Configuración exclusiva de GitHub Actions
En **Settings → Secrets and variables → Actions** del repositorio:
- Secret `FC_QA_EMAIL`: usuario de una cuenta QA autorizada para consultar «Prueba 3».
- Secret `FC_QA_PASSWORD`: contraseña de esa cuenta QA.
- Variable `FC_QA_PROJECT_ID`: `54e79ac9-a83b-4457-b701-4b485c3565c0`.

Nunca publicar esas credenciales en código, archivos, issues o chat. Utilizar una cuenta QA separada y con permisos mínimos. El workflow autenticado es **solo manual**, ejecutable en `main`, nunca sobre código de un PR.

En GitHub → Actions → **QA autenticado solo lectura - Issue 93** → **Run workflow**.

Si los secretos no están configurados, el caso AUTH-01 se registra como **INSUFFICIENT_EVIDENCE**; no cuenta como prueba aprobada.

## Criterio AUTH-01
Inicio de sesión real, selección explícita del proyecto, recorrido de S01 a S16, presencia de las 16 secciones en el estado recuperado, recarga, selección persistente y ausencia de operaciones de escritura en las tablas del proyecto durante el recorrido.

Los resultados se conservan como matriz CSV y ejecución Actions. No se cargan capturas ni trazas de sesiones autenticadas para no revelar datos.

**Lo que no demuestra:** funcionalidad de cálculos, relaciones metodológicas, exportaciones, guardado de modificaciones, ni integridad remota después de una escritura. Esas pruebas requerirán copias sintéticas QA con controles de integridad independientes.

Para navegación pública sin credenciales, se mantiene `.github/workflows/browser-qa.yml`.
