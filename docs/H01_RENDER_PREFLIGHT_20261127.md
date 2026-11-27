# H01 — verificación previa al ensayo en Render

Fecha local 2026-11-27. Candidato probado `11fe3de4ee986d7cebf198012d56eab188cee856`. Se partió de `0d7369479d8a0c6a3e311ad8c0ad1630e79221ec` en una copia aislada y se añadió únicamente la regresión W02. El blob de la regresión ejecutada coincide con el publicado (`0d9cc0e43048f83233b453de2ebd52fa1bc4d126`). Chromium 131 y datos sintéticos. El navegador recibió copias locales de las dependencias de terceros.

| Comprobación | Resultado |
|---|---|
| Backend | 247 pruebas aprobadas. Se conservaron 21 avisos de dependencias y etiquetas de eje de las gráficas. |
| Configuración editorial local | Se observó el modo editorial local, autenticación para cuentas existentes, nube e IA generativa desactivadas durante la prueba. |
| W02 en navegador local | Desde un proyecto completo con evidencia, se abrió un proyecto nuevo y se visitó S01–S16. Los campos editables quedaron vacíos, el contador mostró 0/16 y no se heredó evidencia ni aprobación. Al volver al original se cotejaron las 16 secciones persistidas y la evidencia asociada. Log `W02_NEW_PROJECT_ALL_SECTIONS_ISOLATED_PASS`. |
| Cierre integral | Aprobación en S16 y revocación al editar y guardar S01. Log `INTEGRAL_CLOSURE_PASS`. |
| Regresión H01 | Pasaron exportación HTML, guardado local sin red, justificación territorial visible y persistida, cambio de proyecto entre pestañas e identidades y consulta simuladas. |
| Auditoría visual | 48 inspecciones, 1745 muestras de contraste y 0 problemas bajo las aserciones del repositorio. Log `UNIFIED_WORKSPACE_PASS`. |

## Condiciones del ensayo

- Servicio: `srv-dc2uvf5g1s2s73b9dkeg`, `vertice-e01-staging`. Rama conectada: `staging/2026-11-26-editorial-review`. Plan gratuito y despliegue automático desactivado, verificados mediante metadatos de Render.
- Referencia de recuperación: versión activa `b981a90a459d45f93c9710edc5463bc089868c52`, despliegue `dep-dc4fc23l550s7394s66g`. Antes de añadir la prueba W02, GitHub comparó el candidato y confirmó que descendía de esa versión sin divergencia. La rama principal conserva `c9839baa24afe0817d04e5574eb8a60153d369e1`.
- Con autorización específica para staging, promover el candidato solo a la rama de ensayo, verificar el SHA efectivo en Render y ejecutar el [protocolo W01–W40](H01_WORK_ACCEPTANCE.md). La identificación estática de `/health` no se usa para certificar la versión desplegada. Si aparece una regresión que impida el ensayo, verificar el alcance y usar la referencia de recuperación del servicio de staging dentro de la autorización concedida.
- W09–W14 requieren cuentas de prueba existentes para autenticación real. W15 requiere un entorno remoto aislado autorizado, porque este servicio guarda proyectos en el navegador. W23 requiere el catálogo real para acreditar identidad territorial. La aceptación humana permanece pendiente.

H01 permanece **OPEN_CRITICAL**. La matriz de Render conserva su última ejecución con 7/40 aprobados. Durante esta verificación no se promovió la rama, no se desplegó un servicio y no se cambiaron permisos, plan ni producción.
