# Piloto evaluable: Asistente de Formulación S02

**Alcance:** primera evaluación, sin modificación de proyectos ajenos ni cambios a las tablas de Supabase.

## Qué se puede probar

En la sección S02, debajo de cada campo de texto, aparecen tres controles:

1. **Ayúdame a redactar:** propone una revisión local de capitalización, espacios y puntuación exclusivamente a partir de las palabras del docente. **No usa IA generativa** y no añade información.
2. **Oriéntame:** muestra preguntas metodológicas concretas sobre el campo, sin costo.
3. **Consultar IA (experimental):** usa el backend y un modelo Groq **solo si** el administrador ha configurado `GROQ_API_KEY` en el servidor y la persona tiene una sesión Supabase válida. Sin clave, se informa que la función está desactivada y se conserva la ayuda local.

El texto original no se sustituye por defecto. El docente debe revisar o editar la propuesta y pulsar **Usar esta propuesta**; puede pulsar **Descartar**. No se sincroniza automáticamente con la nube.

El piloto **no** incorpora todavía biblioteca documental RAG, búsqueda web, citas de fuentes ni generación independiente de evidencia. Está limitado deliberadamente a S02.

## Protección y consumo

- La clave del modelo se guarda solo en variables privadas del servidor Render; nunca en GitHub Pages.
- Peticiones generativas: autentificación de JWT de Supabase a través de `/auth/v1/user`.
- 8 solicitudes/hora por usuario y 160 solicitudes/hora totales, en memoria por proceso. Los topes **no garantizan un cupo global en despliegues con múltiples procesos**: se requerirá un limitador centralizado antes del taller de 80 participantes.
- Entradas máximas de 1.800 caracteres, contexto 700, presupuesto de salida 1024 tokens (GPT-OSS, incluye razonamiento) y tiempo de conexión 18 s.
- Solo origen de VT Cultural y GitHub Pages en CORS.
- La solicitud generativa envía el texto original y el municipio registrado al proveedor externo; por tanto, evitar nombres, datos personales o información sensible hasta completar una evaluación de privacidad y condiciones del proveedor.
- El endpoint rechaza una consulta sin `GROQ_API_KEY`, sin sesión o fuera de S02; no existe acceso anónimo al modelo.
- Los registros de acceso, costos y límites del proveedor deben revisarse antes de habilitar el servicio para participantes.

## Activación posterior de Groq

El administrador configura `GROQ_API_KEY` y `GROQ_MODEL=openai/gpt-oss-20b` como variables privadas de Render. El modelo de respaldo en el código se conserva por compatibilidad y no debe asumirse disponible en producción. La cuota gratis depende de la cuenta y del modelo: no presuponer disponibilidad ni 80 usuarios concurrentes. Se debe revisar la política de procesamiento de datos de Groq antes de usar textos de proyectos reales.

API de referencia: https://console.groq.com/docs/api-reference

## Criterio de evaluación

- Preguntas orientadoras y reescritura local visibles en cuatro campos de S02.
- Sin escribir texto, la función no produce contenido.
- Antes de aceptar, el original permanece idéntico.
- Descartar no altera la respuesta.
- Aceptar actualiza solo el campo seleccionado y permite el guardado local normal.
- Si cambia el original antes de aceptar, la propuesta anterior no puede reemplazarlo.
- Ante ausencia del servicio generativo, la guía local sigue funcionando.
- Pruebas de navegador y backend reproducibles sin claves ni cuentas personales.

**Estado al 11-11-2026:** IA externa operativa según prueba reportada por el usuario, con calidad metodológica todavía pendiente de evaluación sistemática. No equivale a una biblioteca documental ni a un asistente IA completo. Véase `docs/EVALUACION_ASISTENTE_S02.md`.
