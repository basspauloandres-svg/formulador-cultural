# Verificador de pasajes PDF institucionales — S02

## Alcance implementado
El usuario aporta un enlace HTTPS directo a un PDF de un dominio institucional permitido y un fragmento textual exacto de al menos 25 caracteres. El backend autentica la sesión, limita el tamaño a 6 MB y 35 páginas, impide redirecciones y recuperaciones a hosts arbitrarios, extrae texto con pypdf y busca la cadena normalizada por página. Devuelve URL, SHA-256 del documento y localizador de página cuando encuentra una coincidencia.

El estado `EXCERPT_FOUND` acredita únicamente que la secuencia textual suministrada está presente en el PDF recuperado en esa ejecución. **No equivale a `SUPPORTED` para la afirmación del usuario**, ni determina autenticidad institucional de contenido, actualidad, suficiencia, causalidad, aplicabilidad territorial ni contradicciones. El campo `claim_status` permanece `INSUFFICIENT_EVIDENCE` hasta juicio documental y metodológico.

## Seguridad y límites
- Hosts inicialmente permitidos: `mng.mincultura.gov.co`, `mincultura.gov.co` y `www.mincultura.gov.co`, sin consultas en URL, credenciales, redirecciones ni puertos no estándar.
- No hay crawler general, navegador remoto ni acceso arbitrario a intranet.
- PDF debe tener texto extraíble; documentos escaneados requieren otro procedimiento.
- La coincidencia puede fallar por extracción de caracteres, guiones o composición del PDF.
- Los pasajes se comprueban por solicitud; no se almacenan en Supabase ni se incorporan al texto.
- Este endpoint comparte el cupo separado de investigación, sin consumir llamadas a Groq.
- La extracción y visualización de fragmentos deben respetar derechos de autor y condiciones de uso.

## Prueba de aceptación
Usar un PDF institucional autorizado y copiar un fragmento literal. Validar `EXCERPT_FOUND`, número de página y huella documental. Repetir con una frase ausente y comprobar `EXCERPT_NOT_FOUND`. En ambos casos `claim_status` debe continuar `INSUFFICIENT_EVIDENCE`. Nunca sustituir el texto original sin aprobación humana.

## Próximo módulo
Almacenar, con consentimiento y control de versiones, registros de pasajes revisados por el investigador y evaluar la relación entre cada afirmación atómica y su(s) pasaje(s). Solo el conjunto de relaciones aprobadas podrá alimentar una propuesta generativa referenciada; deberá documentarse divergencia y ausencia de soporte.
