# H01 — presupuesto, riesgos y recuperación de proyectos

Candidato `6b0bb7e18fcf4c47a8078ec0f49f873366fb76cc`. Pruebas en Chromium 131 contra copia local del servidor editorial, sin nube ni llamadas a IA. Los archivos de código y prueba publicados coinciden con los ejecutados. Se cargaron dos casos sintéticos completos en el estado de la aplicación, se aprobó cada caso en S16 desde la interfaz y se descargaron DOCX, PDF, XLSX y HTML desde sus botones.

| Proyecto | Tarifa unitaria (COP) | Rubro monetario (COP) | Aporte en especie (COP) |
|---|---:|---:|---:|
| NEIRAALFAQA | 123.457 | 740.742 | 246.914 |
| VILLAMARIABETAQA | 234.569 | 1.407.414 | 469.138 |

Se comprobó la presencia de la tarifa y de los dos subtotales en cada formato, además de los nombres de los rubros, financiación, referencia de cotización, evento, prevención, contingencia y responsable. Las dos partidas estuvieron vinculadas a una actividad con tratamiento mixto. Cada riesgo alto recibió una decisión expresa y quedó asociado a la actividad A.

## Defecto y corrección

Word, PDF y HTML mostraban el tipo de origen del riesgo, sin el identificador de la actividad. Excel ya incluía ambos campos. Se corrigieron los tres formatos narrativos para mostrar «Actividad · A» y se amplió la regresión DOCX para exigir el identificador. Cuando se exporta un registro histórico sin identificador se conserva el tipo que tenga registrado.

La primera inspección del PDF por texto con disposición física no reconoció marcadores artificiales largos en columnas estrechas. La repetición utilizó frases breves con palabras separadas y extracción de texto en orden de lectura. Los dos PDF incluyeron los campos cotejados. La prueba no establece que toda combinación de cadenas largas sea legible.

## Resultados

- **W29–W33.** Ocho de ocho archivos superaron el cotejo de presupuesto, riesgo y los 12 marcadores metodológicos previamente comprobados. Cada uno conservó título y contexto propios y careció del título del otro proyecto. Las descargas dejaron intacto el borrador persistido.
- **W03.** Se alternó entre los dos proyectos con el selector y la acción Continuar proyecto. Cada sección persistida de S01 a S16 coincidió con la captura previa de su proyecto. Dos comprobaciones `H01_FULL_SNAPSHOT_RESTORE_PASS`. Los proyectos se evaluaron como invitado en navegador local.
- **Regresiones del motor.** Pasaron las funciones de prueba DOCX/PDF del generador. Se observó un aviso de Matplotlib sobre etiquetas del eje del cronograma.

H01 continúa OPEN_CRITICAL. El resultado acredita los campos comprobados con dos casos sintéticos, sin aceptación en Render. Las ramas de staging y producción conservan sus referencias de partida. La autenticación real, la persistencia remota aislada y la aceptación humana siguen pendientes.
