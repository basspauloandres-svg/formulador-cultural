# H01 — ejecución parcial en staging

Render confirmó `b981a90a459d45f93c9710edc5463bc089868c52` en estado live, deploy `dep-dc4fc23l550s7394s66g`. Chrome de escritorio, sesión invitado, proyectos sintéticos. Hora local mostrada en registros de la aplicación: 26 de noviembre de 2026, aproximadamente 23:12–23:13. Tamaño del viewport sin registrar. Evidencia de interfaz basada en el árbol de accesibilidad de la sesión. La auditoría 71 del protocolo corresponde a un commit previo y se conserva como evidencia histórica.

| ID | Estado | Evidencia o condición pendiente |
|---|---|---|
| W01 | PASS | Bienvenida → escribir idea sintética y construir → guardar nombre y municipio. S01 mostró QA H01 Neira Alfa y Neira. |
| W02 | NOT_RUN | Parcial. Nuevo proyecto abrió S01 sin idea, nombre ni municipio de Neira. Se registró QA H01 Villamaría Beta. Falta inspección de herencia en todas las secciones. |
| W03 | NOT_RUN | Parcial. Seleccionar Neira en el desplegable y pulsar Continuar recuperó idea, nombre, Caldas y Neira. Falta cotejo bidireccional de S01–S16. |
| W04 | PASS | Nuevo proyecto → nombrar QA H01 Gamma. El selector posterior enumeró Neira, Villamaría y Gamma. |
| W05 | PASS | Reemplazar nombre por QA H01 Gamma Renombrado, guardar y reabrir la pestaña. El selector y S01 muestran el nombre nuevo. |
| W06 | NOT_RUN | Parcial. Se cerró y reabrió la pestaña en el mismo navegador. Ir a mi espacio recuperó Gamma Renombrado como activo. Falta reinicio completo del navegador. |
| W07 | PASS | Editar Villamaría sin pulsar Guardar. El selector mostró QA H01 Villamaría Beta y S01 indicó «Borrador de S01 guardado en este navegador». |
| W08 | NOT_RUN | Falta sembrar borrador histórico sintético en un perfil aislado y cotejar original y copia. |
| W09 | BLOCKED | El acceso real a staging requiere cuentas sintéticas A/B existentes. No se acreditó disponibilidad de ambas. |
| W10 | BLOCKED | El acceso real a staging requiere cuentas sintéticas A/B existentes. No se acreditó disponibilidad de ambas. |
| W11 | BLOCKED | El acceso real a staging requiere cuentas sintéticas A/B existentes. No se acreditó disponibilidad de ambas. |
| W12 | BLOCKED | El acceso real a staging requiere cuentas sintéticas A/B existentes. No se acreditó disponibilidad de ambas. |
| W13 | BLOCKED | El acceso real a staging requiere cuentas sintéticas A/B existentes. No se acreditó disponibilidad de ambas. |
| W14 | BLOCKED | El acceso real a staging requiere cuentas sintéticas A/B existentes. No se acreditó disponibilidad de ambas. |
| W15 | BLOCKED | El staging usa persistencia local. Faltan respaldo remoto aislado y comprobación efectiva. |
| W16 | NOT_RUN | Falta ejecutar el flujo con respuesta sintética en navegador aislado. No se llamó al proveedor. |
| W17 | NOT_RUN | Falta ejecutar el flujo con respuesta sintética en navegador aislado. No se llamó al proveedor. |
| W18 | NOT_RUN | Falta ejecutar el flujo con respuesta sintética en navegador aislado. No se llamó al proveedor. |
| W19 | NOT_RUN | Falta ejecutar el flujo con respuesta sintética en navegador aislado. No se llamó al proveedor. |
| W20 | NOT_RUN | Falta ejecutar el flujo con respuesta sintética en navegador aislado. No se llamó al proveedor. |
| W21 | NOT_RUN | Falta ejecutar el flujo con respuesta sintética en navegador aislado. No se llamó al proveedor. |
| W22 | PASS | S01 de Neira mostró simultáneamente la idea sintética, QA H01 Neira Alfa, Neira y Caldas. |
| W23 | NOT_RUN | Falta comprobación del código DIVIPOLA. |
| W24 | NOT_RUN | Falta introducir contradicción y comprobar advertencia. |
| W25 | NOT_RUN | Falta justificar caso intermunicipal y cotejar datos. |
| W26 | PASS | Abrir cada enlace del recorrido en orden. Se registraron los dieciséis encabezados consecutivos S01–S16. |
| W27 | NOT_RUN | Falta cotejar una formulación completa y sus dependencias. |
| W28 | NOT_RUN | Falta aprobar, editar y comprobar revocación. |
| W29 | NOT_RUN | S16 mostró controles DOCX/PDF/Excel/HTML. Faltan descargas verificadas por contenido y cotejo entre proyectos. |
| W30 | NOT_RUN | S16 mostró controles DOCX/PDF/Excel/HTML. Faltan descargas verificadas por contenido y cotejo entre proyectos. |
| W31 | NOT_RUN | S16 mostró controles DOCX/PDF/Excel/HTML. Faltan descargas verificadas por contenido y cotejo entre proyectos. |
| W32 | NOT_RUN | S16 mostró controles DOCX/PDF/Excel/HTML. Faltan descargas verificadas por contenido y cotejo entre proyectos. |
| W33 | NOT_RUN | S16 mostró controles DOCX/PDF/Excel/HTML. Faltan descargas verificadas por contenido y cotejo entre proyectos. |
| W34 | NOT_RUN | Falta interrumpir red durante una edición. |
| W35 | NOT_RUN | Falta recuperar edición tras restaurar red. La sincronización remota está bloqueada en staging. |
| W36 | PASS | Se observó la bienvenida, idea deshabilitada en vacío, habilitación tras escribir y entrada a S01. Ir a mi espacio abrió el proyecto activo. |
| W37 | NOT_RUN | Se observó el control Omitir animación. Falta comprobar la animación completa y cotejar identidad. |
| W38 | NOT_RUN | Parcial. Funcionaron Nuevo proyecto, Continuar proyecto, Guardar y accesos directos S01–S16. Falta verificar navegación secuencial y mensajes. |
| W39 | NOT_RUN | Falta prueba móvil. |
| W40 | NOT_RUN | Falta recorrido completo desde la perspectiva de un participante. |

## Hallazgo por reproducir

El contador de Neira pasó de 1/16 a 10/16 secciones con registro después de recorrer el espacio sin diligenciar otras secciones. El código cuenta valores no nulos, incluidos objetos o listas. Falta un ensayo controlado con snapshot anterior y posterior para identificar qué valores se escribieron y determinar si corresponde modificar el contador o la escritura automática. No se aplicó parche.

H01 sigue OPEN_CRITICAL. La rama de evidencia parte del candidato exacto. Durante esta ejecución no se modificaron producción, permisos, el diseño ni el despliegue. No se generaron respuestas simuladas nuevas ni se usó el proveedor de IA.
