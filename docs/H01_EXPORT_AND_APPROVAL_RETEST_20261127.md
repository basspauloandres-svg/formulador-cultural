# H01 — cotejo documental y aprobación de redacción

Candidato de QA `e525be058ef0c3ed822f6bf75df36becdf4a9088`. Chromium 131, servidor editorial local, dos proyectos sintéticos NEIRAALFAQA y VILLAMARIABETAQA. Se reutilizó la estructura del caso integrado S01–S16 y se aprobó cada proyecto desde S16 antes de exportar. Se bloquearon solicitudes externas y se sirvieron las dependencias instaladas localmente. Render y producción quedaron fuera de esta ejecución.

| Control | Resultado anterior al cambio | Repetición |
|---|---|---|
| W29 DOCX | Faltaba el registro libre de situaciones de S05 y la tabla legible de Vester. La inspección de XML no encontró el marcador de la causa presente en el árbol. | Ambos DOCX incluyen S05 y la tabla de Vester, además de la figura existente. |
| W30 PDF | Faltaba el registro libre de S05. | Ambos PDF incluyen el registro y conservan el resumen de Vester. |
| W31 Excel | Contenía los marcadores examinados. | Ambos Excel volvieron a incluirlos. |
| W32 HTML | Faltaba el registro libre de S05. | Ambos HTML incluyen el registro y conservan el resumen de Vester. |
| W33 Contenido y aislamiento | Ocho archivos preservaron el título y el contexto propios. | Ocho de ocho contienen los marcadores seleccionados, carecen del título ajeno y conservan idéntico el borrador persistido antes y después de la descarga. |
| W19, W20 | Prueba anterior solo comprobaba que la propuesta no se aplicaba automáticamente. | La respuesta simulada mostró el pasaje QA-SRC-01. Cancelar conservó el texto original. Confirmar aplicó la propuesta, y al recargar persistieron el texto, el identificador de la fuente sintética y el estado ACCEPTED_UNVERIFIED con la afirmación marcada INSUFFICIENT_EVIDENCE. |

Se inspeccionó XML de Word, texto extraído de PDF, celdas de Excel y contenido HTML. Además del título y contexto exclusivos del proyecto, se cotejaron estos 12 marcadores: población, registro de evidencia, situaciones S05, problema central, causa, objetivo, alternativa, resultado, actividad, indicador, fecha del cronograma y estado de revisión. El caso usó una actividad sin costo adicional y una evaluación de riesgos sin alertas. La prueba acredita la conservación de esos marcadores y no cubre todos los campos, partidas monetarias ni riesgos con medidas de tratamiento.

La primera ejecución ampliada de la regresión H01 completó aprobación y procedencia, y falló posteriormente al consultar el almacenamiento antes de que terminara de cargar el script tras cambiar de usuario simulado. Se esperó la disponibilidad del script antes de consultar. La repetición completa pasó, incluidos contador, aislamiento local, cambios de pestaña, trabajo sin conexión y las identidades simuladas. Las dos pruebas del motor DOCX/PDF también pasaron. El generador emitió un aviso de Matplotlib sobre marcas del eje del cronograma.

H01 continúa OPEN_CRITICAL. Las pruebas se realizaron en copia local. Permanecen pendientes la repetición en Render, la autenticación real, la persistencia remota aislada y la aceptación humana. Evidencia anterior: [repetición aislada](H01_WORK_RETEST_20261127.md).
