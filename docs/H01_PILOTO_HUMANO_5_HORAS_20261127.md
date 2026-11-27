# VÉRTICE · Piloto humano en cinco horas

27 de noviembre de 2026, Colombia. [Abrir el ensayo en Render](https://vertice-e01-staging.onrender.com/). Versión verificada en Render: `11fe3de`. Usar un proyecto sintético nuevo y mantener la misma ventana normal y el mismo perfil de navegador durante el recorrido. El guardado de proyectos en este ensayo es local. El piloto principal se puede ejecutar como invitado.

## Primera comprobación

El 27 de noviembre, la primera solicitud desde este entorno agotó su espera de 20 segundos. Render registró arranque y preparación de fuentes. La repetición de la portada devolvió HTTP 200 en 30,3 segundos. La comprobación posterior de estado devolvió HTTP 200 en 2,3 segundos y confirmó guardado local. El motor de Word y PDF generó archivos de prueba desde el servicio y se leyó en ambos su título sintético. Hay evidencia anterior de ocho descargas y de recuperación de proyectos en [la matriz H01](H01_STAGING_ACCEPTANCE_20261127.md).

Abre el ensayo antes de iniciar el cronómetro del participante y deja que cargue la bienvenida. Si aparece una espera al abrirlo, permite hasta un minuto para el arranque inicial. Registra un bloqueo si tampoco carga tras un segundo intento. Una vez visible la bienvenida, el participante puede comenzar.

## Bloques de trabajo

| Tiempo acumulado | Acción del participante | Resultado que se comprueba |
|---|---|---|
| 00:00–00:15 | Crear el caso desde una idea. Guardar S01, recargar y recuperar el mismo proyecto. | La idea y los campos vuelven íntegros. Se distingue el guardado local. Registrar la primera duda espontánea. |
| 00:15–01:30 | S02–S08. Contexto, población, evidencia, dos situaciones, Vester, árbol y síntesis. | Queda claro qué es evidencia y qué está por verificar. El problema, la causa y el efecto conservan la misma formulación. |
| 01:30–02:45 | S09–S15. Objetivos, alternativa, resultado, actividad, indicador, cronograma, presupuesto y riesgo. | Las relaciones entre elementos son comprensibles, los importes coinciden y se conserva el dato pendiente. |
| 02:45–03:30 | S16. Leer el diagnóstico en voz alta, exportar Word, PDF, Excel y HTML y abrirlos. | El participante explica qué falta. Los archivos contienen el título, la actividad, el indicador, el total y el tratamiento del riesgo. |
| 03:30–04:15 | Crear un segundo caso mínimo, regresar al primero y repetir solo el control que haya fallado. | Se conserva el caso original y el nuevo inicia sin herencia. Si se guardó una aprobación válida, editar un dato y verificar que pasa a revisión. |
| 04:15–05:00 | Consolidar observaciones y decidir el alcance del piloto. | Cada problema tiene evidencia y condición de reproducción. Una falta de evidencia queda como pendiente. |

## Caso sintético para empezar

Idea para pegar en la bienvenida: «Quiero organizar seis ensayos guiados para una banda estudiantil de 24 jóvenes y cerrar con una muestra. En este ejercicio hipotético, el ruido del aula interrumpe los ensayos y necesitamos un espacio alterno».

| Sección | Datos iniciales |
|---|---|
| S01 | QA H01 · Banda estudiantil. Municipio Neira, Caldas. Responsable: coordinación del ejercicio. |
| S02–S04 | Aula de ensayo y espacio alterno hipotéticos. 24 participantes ficticios. Registro simulado: cuatro de seis ensayos anteriores presentaron interrupciones. Disponibilidad del espacio alterno: [POR VERIFICAR]. |
| S05–S08 | Situación A: interrupciones de ensayo por ruido. Situación B: pocas alternativas de horario y espacio. Efecto hipotético: se reduce el tiempo efectivo de práctica. El participante justifica sentido y valores de Vester antes de elegir el problema central. |
| S09–S11 | Objetivo: mejorar la continuidad de los ensayos. Comparar cambiar horario y gestionar un espacio alterno. Resultado: ciclo de seis ensayos ejecutado. Actividad: programar, realizar y registrar los seis ensayos. |
| S12–S13 | Indicador: ensayos ejecutados con acta. Línea base del ciclo: 0. Meta: 6. Verificación: actas. Revisión: semanal. Responsable: coordinación del ejercicio. Seis fechas semanales ficticias a partir del 1 de diciembre. |
| S14–S15 | Apoyo logístico: 6 sesiones × COP 100.000 = COP 600.000, monto sintético. Riesgo: indisponibilidad del espacio. Prevención: confirmar reserva. Contingencia: reprogramar en horario alterno. |
| S16 | Explicar el diagnóstico. Conservar la disponibilidad sin verificar. Abrir las cuatro exportaciones y cotejar los campos seleccionados. |

Este caso es una base para el ensayo. El software puede pedir datos adicionales. Registra dónde se requieren y cómo los entiende el participante. Conserva los faltantes como tales. El participante ejecuta los pasos por su cuenta y la persona observadora registra cuándo tuvo que intervenir.

## Registro y decisión

Para cada incidencia registra: versión, navegador, sección, acción, resultado esperado, resultado observado, evidencia y si volvió a ocurrir. Una fila por incidencia. Clasifica PASS, FAIL, BLOCKED o NOT_RUN según la evidencia.

Una pérdida de datos, mezcla de proyectos, navegación sin salida o archivo inválido detiene el ensayo del flujo afectado. Si el problema persiste tras una recarga normal y el proyecto guardado no reaparece, conserva evidencia y evita crear o sobrescribir datos para compensarlo. Si falla un formato, registra el fallo de ese formato y continúa el cotejo de los otros.

En la versión actual S16 puede decir «No hay pendientes concretos» en tres categorías aunque el resumen muestre secciones incompletas. El ajuste está validado en QA y queda pendiente de despliegue. Registra si el participante interpreta mal esa frase antes de intervenir.

La prueba humana como invitado puede comenzar con la versión actual. El cierre H01 sigue pendiente y su balance previo es 25 PASS, 7 BLOCKED, 6 SIMULATED y 2 PARTIAL. Autenticación con cuentas de prueba, persistencia remota y cotejo humano de la identidad visual requieren su evidencia específica.
