# VT Cultural: transición segura del dominio (9 de noviembre de 2026)

## Objetivo

Conectar **www.vtcultural.com** a la aplicación actualmente publicada en `https://basspauloandres-svg.github.io/formulador-cultural/`, y hacer que `vtcultural.com` redirija a `www.vtcultural.com`. Mantener accesible el enlace de GitHub mientras se verifica el nuevo dominio.

## Situación comprobada

- El sitio publica con un **workflow personalizado de GitHub Actions** (`.github/workflows/pages.yml`).
- GitHub documenta que, con esta modalidad de publicación, un archivo `CNAME` en el repositorio **se ignora**. El dominio debe establecerse en **Settings → Pages → Custom domain** o mediante el endpoint administrativo `PUT /repos/{owner}/{repo}/pages`, que exige permisos de Pages y Administration.
- Los registros actuales de Porkbun, de acuerdo con la captura del 9 de noviembre, incluyen un ALIAS al aparcamiento Porkbun (`uixie.porkbun.com`), un CNAME comodín `*` al mismo aparcamiento, dos MX de reenvío de Porkbun, un TXT SPF de Porkbun y dos TXT `_acme-challenge`.
- Las herramientas conectadas en esta conversación permiten modificar archivos GitHub, pero **no** el ajuste administrativo de Pages ni la zona DNS de Porkbun. Ningún registro ha sido modificado a través de esta preparación.

## Secuencia de activación (dependencias obligatorias)

### 1. En GitHub Pages

En `https://github.com/basspauloandres-svg/formulador-cultural/settings/pages` configurar **Custom domain** = `www.vtcultural.com` y guardar. Confirmar que el campo persiste después de recargar. **No añadir un archivo CNAME como sustituto de este paso.**

### 2. En Porkbun, después de guardar el dominio en Pages

| Operación | Tipo | Host en Porkbun | Destino |
|---|---|---|---|
| Eliminar registro de aparcamiento (actual) | ALIAS | @ | `uixie.porkbun.com` |
| Eliminar comodín de aparcamiento (actual) | CNAME | * | `uixie.porkbun.com` |
| Crear | A | @ | `185.199.108.153` |
| Crear | A | @ | `185.199.109.153` |
| Crear | A | @ | `185.199.110.153` |
| Crear | A | @ | `185.199.111.153` |
| Crear | CNAME | www | `basspauloandres-svg.github.io` |

El CNAME de `www` apunta al **dominio del propietario**, sin `/formulador-cultural/` ni rutas. Si el proveedor requiere introducir `www.vtcultural.com` en vez de `www`, se debe respetar el formato del editor Porkbun.

**Conservar intactos** los dos registros MX, el TXT SPF y los dos registros `_acme-challenge`, hasta que exista un procedimiento distinto y verificado para el correo y los certificados.

TTL puede mantenerse en 600 segundos. La propagación DNS global puede tardar hasta 24 horas.

### 3. Validación

- Comprobar `CNAME www.vtcultural.com → basspauloandres-svg.github.io`.
- Comprobar los cuatro A para `vtcultural.com`.
- Comprobar `https://www.vtcultural.com/`, contenido del formulador y que los 16 pasos siguen disponibles.
- Comprobar que `https://vtcultural.com/` redirige correctamente y que `https://basspauloandres-svg.github.io/formulador-cultural/` sigue disponible como ruta anterior cuando corresponda.
- **Enforce HTTPS** solo cuando GitHub emita el certificado y la opción esté disponible.
- Revisar redirecciones de autenticación de Supabase (Site URL y allowed redirect URLs) y probar registro, inicio de sesión y recuperación en la nueva dirección. No modificar estos parámetros antes de comprobar el dominio.

### 4. Correo SMTP (paso posterior)

Seleccionar un proveedor transaccional con plan gratuito y autenticar `vtcultural.com` con los registros SPF/DKIM/DMARC que suministre el proveedor. **No crear dos SPF TXT separados** en `@`; fusionar los mecanismos necesarios en uno, siguiendo las instrucciones verificadas de los proveedores. El dominio por sí mismo no ofrece buzón SMTP ni garantiza que `acceso@vtcultural.com` reciba mensajes. Verificar sender y eventual ruta de respuestas.

Antes de permitir 80 participantes, probar límites de envío, registro, recuperación, aislamiento de datos y concurrencia con cuentas sintéticas.

## Fuentes normativas

- GitHub Pages, dominio personalizado: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- GitHub Pages y workflows de Actions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- API GitHub Pages, permisos y configuración: https://docs.github.com/en/rest/pages/pages

**Estado de aceptación:** PREPARADO, NO ACTIVADO. No se declara que `www.vtcultural.com` funcione hasta validar ambos lados y HTTPS.
