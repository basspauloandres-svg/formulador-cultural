# VÉRTICE — Protocolo de aceptación manual y transferencia a Work

Estado: OPEN_CRITICAL. Fecha de referencia: 2026-11-26 (Colombia).
Candidato técnico verificado: ae9e535f25b03110aa871413eb11c74ad9bd72dc.
Checkpoint: checkpoint/2026-11-26-H01-audit71.
PR: https://github.com/basspauloandres-svg/formulador-cultural/pull/153
Auditoría positiva: https://github.com/basspauloandres-svg/formulador-cultural/actions/runs/45925115005 (247 backend; regresiones navegador; 13/13 escenarios con evidencia positiva parcial o completa; 7/13 completos, 6/13 parciales).
Ensayo conocido: https://vertice-e01-staging.onrender.com (NO asumir que sirve el candidato: confirmar commit desplegado en Render antes de validar). El endpoint /health puede tener un identificador desactualizado; no sustituye la evidencia de despliegue.
Producción main y servicio srv-db3hc18m7kps73emrj40 fuera de alcance. Ensayo svc srv-dc2uvf5g1s2s73b9dkeg; mantener autodeploy desactivado.
No fusionar/desplegar producción, cambiar permisos, esquemas o datos reales, ni generar costos. No solicitar contraseñas. Mantener diseño aprobado. Datos sintéticos exclusivamente; no borrar históricos. Si acceso real o nube no disponibles, registrar BLOCKED y no inferir PASS. Autenticación real, almacenamiento remoto y IA real requieren entornos/recursos autorizados. La segregación local por cuenta no es una frontera de seguridad ni sustituye RLS.

## Ejecución
Antes de comenzar, confirmar exacto commit en ensayo y registrar fecha, navegador, tamaño de pantalla y cuenta sintética. Para cada prueba registrar ID, precondiciones, pasos, resultado esperado y observado, evidencia (captura/log), estado PASS/FAIL/BLOCKED/NOT_RUN, y defecto asociado. Conservar fallos y repetir sin eliminar criterios. Usar cuentas y proyectos sintéticos no identificables. Evitar credenciales y datos personales en capturas. Cada exportación debe verificarse por contenido, no solo descarga. La aceptación final de H01 corresponde al investigador. No afirmar cierre por resultados de simulación.

## Gestión de proyectos
- [ ] W01 — Crear Neira desde cero
- [ ] W02 — Crear Villamaría sin herencia de datos
- [ ] W03 — Alternar Neira y Villamaría; cotejar S01–S16
- [ ] W04 — Crear un tercer proyecto
- [ ] W05 — Renombrar y comprobar persistencia
- [ ] W06 — Recuperar proyecto activo al cerrar y abrir navegador
- [ ] W07 — Comprobar guardado automático e indicador
- [ ] W08 — Recuperar borradores históricos sin sobrescribirlos

## Autenticación y seguridad
- [ ] W09 — Iniciar sesión con cuenta sintética A y crear proyecto
- [ ] W10 — Cerrar sesión y recuperar invitado
- [ ] W11 — Iniciar sesión con cuenta sintética B y comprobar independencia
- [ ] W12 — Volver a A y recuperar proyectos
- [ ] W13 — Cambiar cuenta con varias pestañas
- [ ] W14 — Intentar URL directa de proyecto A desde B
- [ ] W15 — Auditar persistencia remota y políticas/grants efectivos mediante entorno aislado; registrar bloqueo si nube deshabilitada

## IA y evidencia
- [ ] W16 — Iniciar consulta de IA desde A (usar respuesta sintética salvo autorización de costo)
- [ ] W17 — Cambiar proyecto durante consulta
- [ ] W18 — Recuperar respuesta solo en origen
- [ ] W19 — Verificar aprobación humana previa a incorporación
- [ ] W20 — Cotejar fuentes/evidencias y sus identificadores
- [ ] W21 — Intentar recuperar respuesta desde otra cuenta

## Coherencia metodológica
- [ ] W22 — Cotejar idea inicial, nombre, municipio y departamento
- [ ] W23 — Contrastar identificación DIVIPOLA
- [ ] W24 — Probar advertencia ante contradicción municipal
- [ ] W25 — Justificar proyecto intermunicipal sin sobrescribir datos
- [ ] W26 — Recorrer S01–S16
- [ ] W27 — Cotejar Vester, árboles, objetivos, alternativas, actividades, indicadores, cronograma y presupuesto
- [ ] W28 — Modificar dato aprobado y comprobar revocación

## Exportaciones y recuperación
- [ ] W29 — Exportar Word de A y B
- [ ] W30 — Exportar PDF de A y B
- [ ] W31 — Exportar Excel de A y B
- [ ] W32 — Exportar HTML de A y B
- [ ] W33 — Comparar todos los documentos contra sus proyectos; ausencia de contenido cruzado
- [ ] W34 — Interrumpir conexión durante edición
- [ ] W35 — Restablecer conexión y verificar recuperación; sincronización remota solo si habilitada en entorno aislado

## Experiencia de usuario
- [ ] W36 — Recorrer inicio y bienvenida
- [ ] W37 — Comprobar animación V e identidad aprobada sin rediseño
- [ ] W38 — Revisar navegación, botones y mensajes
- [ ] W39 — Probar vista móvil
- [ ] W40 — Evaluar recorrido desde perspectiva de participante del diplomado

## Decisión
40 controles manuales iniciales, todos NOT_RUN. Los resultados automatizados previos son evidencia separada. Revisar especialmente H01-06 a H01-11: recuperación autenticada real, IA diferida real, aislamiento efectivo, cuatro formatos, sincronización tras desconexión y cobertura territorial general. El ensayo actual es local/auth-only; la persistencia remota es un bloqueo arquitectónico, no una prueba manual que pueda darse por superada en ese modo. Preparar propuesta aislada para validación remota antes de cualquier cambio de permisos. No cerrar H01 hasta cumplir los 13 criterios originales y aceptación humana.
