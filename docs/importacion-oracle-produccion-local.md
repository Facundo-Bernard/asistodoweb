# Aceptación en Oracle de producción

La computadora de la oficina llega a Oracle 11g en `172.17.1.3:1521/orcl`.
El ZIP `api-oracle-coopya.zip` demostró una conexión de consulta con Oracle Instant
Client 19c. La cuenta `NMONTI` incluida en el ZIP tiene `SELECT` sobre
`PRESTAPROD.PERSONA`, pero no tiene `INSERT`: no sirve para aceptar personas.

El panel local valida primero la sesión de administrador contra Railway. Al
aceptar una solicitud, el backend local se conecta directamente a producción
en modo Thick, busca el documento, inserta en `PRESTAPROD.PERSONA`, confirma la
transacción y abre una segunda conexión para consultar el mismo ID y documento.
Solo entonces muestra la persona como aceptada. Un DNI ya existente produce un
error visible y no modifica el registro. No se crea un préstamo ni un contrato.

## Preparar la computadora

1. Desde la red de la oficina, comprobar que `172.17.1.3:1521` responde.
2. Conservar el ZIP fuera del repositorio. Extraer únicamente el cliente Oracle:

   ```powershell
   ./scripts/prepareLocalOracleClient.ps1 -ZipPath 'C:\ruta\api-oracle-coopya.zip'
   ```

   El destino `.oracle-client/` está ignorado por Git. El script no copia el `.env`
   ni las credenciales del ZIP.
3. En el `.env` local de la oficina, configurar:

   ```dotenv
   VITE_API_BASE_URL=https://ticketera-backend-production-a834.up.railway.app
   COOPYA_IMPORT_TARGET=oracle_prod
   COOPYA_IMPORT_TOKEN=TOKEN_COMPARTIDO_CON_VERCEL
   COOPYA_ORACLE_PROD_CONFIG={"user":"PRESTAPROD","password":"CLAVE_PRIVADA","connectString":"172.17.1.3:1521/orcl"}
   ```

   La cuenta PRESTAPROD ya se probó conectando a producción, consultando
   `PERSONA` y encontrando la secuencia `IDPERSONA`. Nunca usar `NMONTI` como
   cuenta de escritura ni publicar el `.env`.
4. Ejecutar `npm run dev` y abrir `/admin/solicitudes` en la URL local.
   Reiniciar el servidor tras cambiar el `.env`.

## Panel estático servido por Caddy en la oficina

Un servidor de archivos estáticos no ejecuta `/api/personas/importar`: si esa
ruta devuelve `index.html`, **Aceptar persona** no puede insertar en Oracle.
Para conservar la web estática en Caddy, el proceso Node y Caddy deben correr
en el **mismo equipo de la oficina**, con acceso a `172.17.1.3:1521`, Node
22.12+ y Oracle Instant Client para el sistema operativo de ese equipo. En
Windows se usa el cliente del ZIP; en Linux instalar Instant Client **Basic
19c para Linux** y configurar su directorio en el cargador del sistema
(`ldconfig`, según la distribución). Node-oracledb en Linux habilita el modo
Thick sin `libDir`: no sirve copiar el `oci.dll` de Windows. El `.env`
privado debe existir en ese equipo; nunca copiarlo a `dist` ni a Caddy.

En el `.env` del servidor Linux, además de las variables anteriores, definir
`COOPYA_ORACLE_CLIENT_DIR` con la **ruta absoluta** que contiene
`libclntsh.so`, por ejemplo `/opt/oracle/instantclient_19_32`. Esa carpeta
debe existir y ser visible en `ldconfig -p`; instalar también las dependencias
del sistema que exige Oracle Instant Client (por ejemplo `libaio`). Comprobar
primero desde ese Linux que puede alcanzar `172.17.1.3:1521`. No copiar el
`.env` ni los binarios Oracle al directorio público `dist`.

1. En ese equipo, desde la raíz del proyecto, instalar dependencias (`npm ci`),
   compilar (`npm run build`) y ejecutar `npm run office:api`. Dejar este último
   proceso activo como servicio. Se enlaza **solo** a `127.0.0.1:8788`, valida
   la sesión administradora y usa Oracle directo; no requiere exponer 1521.
2. En el sitio `:8083` del Caddyfile, poner las rutas API **antes** del fallback
   de la SPA. Adaptar la ruta absoluta de `dist` al equipo real:

   ```caddyfile
   :8083 {
       handle /api/personas/* {
           reverse_proxy 127.0.0.1:8788
       }

       handle {
           root * /ruta/absoluta/asistodoweb/dist
           try_files {path} /index.html
           file_server
       }
   }
   ```

   Usar `handle`, **no** `handle_path`: la API necesita recibir la ruta
   `/api/personas/importar` completa. Si el Caddyfile actual tiene otras
   reglas, integrarlas sin reemplazarlo a ciegas.
3. Validar la configuración de Caddy y recargarla con el procedimiento de ese
   servidor. `GET http://10.16.3.17:8083/api/personas/importar` debe devolver
   **JSON** con `version: "2026-10-13.office.1"`, `transport: "oracle_prod"`
   y `ready: true`; si devuelve HTML,
   todavía se está sirviendo la SPA. Un `POST` sin sesión administradora debe
   devolver HTTP 401 y no escribir nada.
4. Abrir `/admin/solicitudes` y comprobar primero **Consultar DNI en Oracle**.
   Solo aceptar una solicitud real después de confirmar conexión, datos y
   política de altas; no se hace ninguna inserción durante los checks anteriores.

El HTTP de `:8083` deja el token de sesión y los datos personales sin cifrar
en la LAN. Restringir el acceso a la red confiable y usar HTTPS en Caddy antes
de emplearlo fuera de esa red. El frontend no utiliza `crypto.randomUUID()`:
genera identificadores de diagnóstico compatibles con HTTP local.

En la rama local `codex/admin-oracle-local`, cada solicitud tiene el botón
**Consultar DNI en Oracle**. La consulta utiliza directamente el SQL de
`GET /personas/{dni}` del ZIP `api-oracle-coopya.zip`, adaptado a Node y protegido
por la misma sesión administradora del panel. Solo lee `PRESTAPROD.PERSONA`:
devuelve ID, nombre, apellido, CUIL y domicilio; nunca hace cambios. Si ya existe
una persona con ese DNI, el panel avisa y deshabilita la aceptación de esa fila.
Aunque no se consulte antes, la escritura vuelve a verificar duplicados dentro
de Oracle antes de insertar.

El ZIP trae credenciales de una cuenta de **solo lectura** y no contiene un
endpoint de alta probado. La rama reutiliza su conexión con Instant Client en
modo Thick y su consulta por DNI, pero conserva la inserción propia del proyecto
con PRESTAPROD. No se copiaron al repositorio ni al navegador las credenciales
incluidas en el ZIP.

La conexión directa no se ejecuta en Vercel: `172.17.1.3` es una IP privada. La
integración ORDS de Linux permanece como opción separada cuando
`COOPYA_IMPORT_TARGET` no vale `oracle_prod`.

## Usar el mismo flujo desde Vercel

El puente de la oficina usa la conexión directa ya probada. En la computadora
que tiene acceso a Oracle y el `.env` local, ejecutar `npm run oracle:bridge`.
Escucha solo en `127.0.0.1:8787`: `GET /health` informa si la configuración
local está lista y `POST /personas` exige `X-Import-Token`. El token y las
credenciales Oracle quedan del lado del servidor, nunca en el navegador.

Se debe publicar **solo** `POST /personas` como URL HTTPS estable (por ejemplo,
mediante un túnel saliente o proxy existente). No se publica el puerto Oracle
1521, la carpeta del cliente ni SQL Developer Web. El equipo y el túnel deben
quedar encendidos; una URL temporal que cambia al reiniciar no sirve para una
configuración estable de Vercel.

En Vercel → Project Settings → Environment Variables, cargar las tres variables
siguientes para Production:

| Variable | Valor |
| --- | --- |
| `COOPYA_IMPORT_TARGET` | `oracle_prod` |
| `COOPYA_IMPORT_TOKEN` | El mismo token secreto del `.env` local |
| `COOPYA_ORACLE_BRIDGE_URL` | URL HTTPS pública completa terminada en `/personas` |

Mantener también `VITE_API_BASE_URL` con la URL HTTPS **operativa** de la API de
solicitudes y autenticación. **No** cargar `COOPYA_ORACLE_PROD_CONFIG` en Vercel:
ni la cuenta ni la contraseña de Oracle ayudan a Vercel a llegar a una IP privada.
Después de guardar las variables, hacer un nuevo deploy. `GET
/api/personas/importar` solo valida la forma de la configuración; no demuestra
que el puente esté en línea. La primera aceptación requiere primero una sesión
válida de administrador y luego invoca el puente.

Actualmente la URL de Railway que figuraba en el proyecto devuelve HTTP 404
(`Application not found`). Hasta restaurar esa API o sustituir
`VITE_API_BASE_URL` por su nueva URL, no se podrá iniciar sesión ni consultar
solicitudes aunque el puente Oracle esté listo. Tampoco existe todavía una URL
HTTPS pública del puente: cargar únicamente variables sin publicar el puente
no alcanza para que Vercel escriba en Oracle.

## Qué se comprobó

- Con la cuenta del ZIP: conexión real a `orcl`, `SELECT` en `PERSONA` y ausencia
  de permiso `INSERT`.
- Se confirmó en producción la estructura de las 28 columnas de `PERSONA` y
  la existencia de los IDs de catálogo `TIPOPERSONA=3`, `ESTADOPERSONA=1` y
  `PRESTADOR=75`.
- Se verificó conexión Node en modo Thick con el cliente extraído del ZIP,
  incluyendo acceso con PRESTAPROD y consulta a PERSONA y la secuencia.
- El 2026-10-02 se autenticó PRESTAPROD en `orcl` y Oracle aceptó un `INSERT`
  contra `PRESTAPROD.PERSONA` que afectó cero filas. Se hizo `ROLLBACK` sin
  consumir la secuencia: esto verifica acceso de escritura sin dar de alta a
  nadie, pero no sustituye la prueba de un alta real con datos válidos.
- La ruta de escritura y consulta posterior se probó con conexiones simuladas.
  Todavía no se insertó una persona real ni se verificó un acceso HTTPS público.

La consulta manual para comprobar un DNI después de aceptar es:

```sql
SELECT IDPERSONA, IDDOCUMENTO_TIPO, DOCUMENTO_NRO, APELLIDO, NOMBRE,
       FECHAALTA, IDTIPOPERSONA, IDESTADOPERSONA, IDPRESTADOR
FROM PRESTAPROD.PERSONA
WHERE IDDOCUMENTO_TIPO = 1 AND DOCUMENTO_NRO = :dni;
```
