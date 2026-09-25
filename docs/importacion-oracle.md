# Aceptación de solicitudes mediante ORDS (Linux)

El panel llama con Axios a `POST /api/personas/importar` en su mismo origen.
El backend valida la sesión de administrador con la API de solicitudes y manda
una única petición a ORDS. No llama a la API de importación de Coopya, no abre una
conexión TCP a Oracle y nunca envía el token de importación al navegador.

El producto y la documentación siguen en la solicitud. Este flujo solo crea o
actualiza PERSONA; no crea contratos ni asocia planes/servicios en otras tablas.
Los IDs de tipo/estado/prestador se definen en el handler Oracle instalado.

## Probar desde la oficina

Requisitos: Node 22.12+ (o una versión compatible con Vite 7), acceso a la red/VPN,
ORDS funcionando y usuario administrador del panel. No usar datos reales hasta
confirmar cómo afecta la restauración nocturna del Linux.

1. Instalar dependencias con `npm ci` si es un checkout nuevo.
2. Copiar `.env.example` a `.env` y completar `COOPYA_IMPORT_TOKEN` con el token
   configurado en Oracle. Conservar el `.env` existente si ya tiene el token.
3. Crear `.env.development.local` (ignorado por Git) con:

   ```dotenv
   COOPYA_ORDS_URL=http://172.17.1.4:8080/ords/prestaprod/asistodo/personas
   ```

4. Ejecutar `npm run dev` y abrir la dirección local indicada, ruta
   `/admin/solicitudes`. Iniciar sesión como administrador.

Vite ejecuta el mismo backend de aceptación mediante middleware Node. La petición
a ORDS sale de esta computadora. El navegador nunca conecta directamente al puerto
8080; no es necesario habilitar CORS en ORDS para este flujo. Reiniciar el servidor
local si se cambian variables. `npm run preview` no ejecuta el backend.

`GET /api/personas/importar` devuelve versión y `transport: "ords"` sin hacer
escrituras ni mostrar credenciales. No comprueba la conectividad de Oracle.

## Vercel

En Project Settings → Environment Variables → Production:

| Nombre | Valor |
| --- | --- |
| `VITE_API_BASE_URL` | `https://ticketera-backend-production-a834.up.railway.app` |
| `COOPYA_IMPORT_TOKEN` | Token de importación existente, privado |
| `COOPYA_ORDS_URL` | URL HTTPS completa de la API ORDS publicada |

Todavía no se identificó/publicó la URL HTTPS real. No inventar el dominio, no usar
el dominio del frontend como si alojara ORDS y no cargar la IP privada en Vercel.
El servidor detecta la IP privada literal y HTTP en despliegues y devuelve un error
de configuración antes de enviar datos. Tampoco se permite HTTP público en local.
Esta política no contempla una futura red privada de Vercel: requerirá una revisión
explícita cuando esa red exista. Un hostname público que resuelva a una IP privada
no se vuelve alcanzable por cambiar su nombre.

Después de cargar las variables se necesita un nuevo deployment. No se requieren
usuario ni contraseña Oracle en Vercel. `COOPYA_ORACLE_CONFIG` y
`COOPYA_PERSONAS_IMPORT_URL` son heredadas y se ignoran; se pueden quitar de Vercel
después de desplegar esta versión. El token nunca debe llevar prefijo `VITE_`.

## Contrato ORDS instalado mediante el bloque simple del chat

Ruta local: `POST /ords/prestaprod/asistodo/personas`.
Cabeceras: `Content-Type: application/json`, `X-Import-Token: <secreto>`.
Cuerpo: la persona directamente en la raíz, SIN `{ persona: ... }` ni
`{ token, personas: [...] }`. Los faltantes viajan como null; se normalizan números,
fechas y textos. Solo se envían campos de PERSONA, no campos de planes de Coopya.

```json
{
  "TipoDoc": 1,
  "NumeroDoc": "12345678",
  "Apellido": "PRUEBA",
  "Nombre": "PERSONA",
  "FechaNac": null,
  "Sexo": "2",
  "Remuneracion": 400000,
  "Mail": "prueba@example.com"
}
```

Se exige HTTP 2xx y una respuesta como:

```json
{
  "ok": true,
  "oracle": {
    "confirmed": true,
    "verified": true,
    "idPersona": 123,
    "operacion": "INSERCION"
  }
}
```

`ACTUALIZACION` también es válida si la verifica el procedimiento. HTTP 200 solo,
un ID sin verificación o "Documento ya existente" NO equivalen a éxito.
El backend depende de que ORDS realmente valide el token, confirme la transacción
y verifique la fila: no tiene una segunda conexión independiente a la base.

Los scripts alternativos en `docs/oracle19c` usan `/asistodo/v1/personas` y un
envoltorio `{persona: ...}`. No son el contrato de esta integración: no sustituir
solo la URL por esa ruta sin adaptar el contrato. No reinstalarlos para probar
esta web si ya se ejecutó el bloque simple.

## Errores y seguridad

Los diagnósticos conservan requestId, etapa, HTTP externo y códigos Oracle, pero
ocultan token, sesión, contraseña y datos de la persona. No se sigue ninguna
redirección ni se hacen reintentos automáticos (evita repetir una escritura).
Una desconexión o timeout puede ocurrir después del COMMIT: consultar PERSONA
antes de reintentar. La solicitud queda sin indicador de aceptación en ese caso.

Los indicadores de aceptación son solo de esta sesión del navegador, no un estado
persistido en la API de solicitudes ni una consulta en vivo a PERSONA. No se
reutilizan los indicadores viejos de Coopya. Las restauraciones de Linux pueden
eliminar personas/configuración; confirmar con el administrador antes de uso real.

Publicar solamente la ruta de la API con HTTPS y autenticación, no SQL Developer
Web ni el listener 1521. HTTP local transmite datos/token por la red interna sin
cifrar: utilizarlo solo como prueba en red confiable/VPN, no como publicación.

Pruebas automatizadas: `npm test`. Build: `npm run build`. Las pruebas con mocks
no demuestran que el procedimiento esté instalado ni que haya una escritura real.
