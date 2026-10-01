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
- La ruta de escritura y consulta posterior se probó con conexiones simuladas.
  Todavía no se insertó una persona real ni se verificó un acceso HTTPS público.

La consulta manual para comprobar un DNI después de aceptar es:

```sql
SELECT IDPERSONA, IDDOCUMENTO_TIPO, DOCUMENTO_NRO, APELLIDO, NOMBRE,
       FECHAALTA, IDTIPOPERSONA, IDESTADOPERSONA, IDPRESTADOR
FROM PRESTAPROD.PERSONA
WHERE IDDOCUMENTO_TIPO = 1 AND DOCUMENTO_NRO = :dni;
```
