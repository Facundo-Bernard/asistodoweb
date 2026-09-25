# API ORDS para insertar PERSONA en Oracle 19c

## Instalacion rapida en Toad

Conectarse como **PRESTAPROD** al servicio correcto. No ejecutar como SYS.

1. Abrir `publicar-persona-ords.sql` y ejecutar como script con **F5**. No contiene
   secretos ni crea personas. Instala las dos rutas y sus procedimientos, conserva
   el alias ORDS anterior (o crea `prestaprod` si aun no estaba habilitado) y deja
   las inserciones apagadas. Ambos procedimientos deben terminar con STATUS=VALID.
2. Abrir `configurar-persona-ords.sql` y ejecutar el bloque como sentencia con **F9**.
   Toad solicita `:token`: ingresar el mismo valor de COOPYA_IMPORT_TOKEN, sin comillas
   adicionales. Los IDs propuestos son 3/1/75, segun la configuracion proporcionada;
   revisarlos antes de ejecutar. Tipo/estado se comprueban contra sus catalogos.
3. Probar **POST /comprobar** por HTTPS con el token. No crea personas y funciona
   aunque la insercion este apagada. Comprobar que database corresponda a la base de Toad.
4. Si todo esta bien, abrir `activar-persona-ords.sql` y ejecutar **F5**. Ahora
   **POST /personas** admite inserciones autenticadas. No reintenta ni actualiza duplicados.

En Toad, F5 ejecuta los archivos con bloques terminados en `/` y muestra Script Output.
El archivo de configuracion es un unico bloque con binds, sin `/`, para F9.
Los scripts F5 incluyen WHENEVER SQLERROR; si el cliente no soporta esa directiva,
ejecutar por bloques y detenerse en el primer error. No continuar con objetos INVALID.

Para ver errores de compilacion sin exponer secretos:

```sql
SELECT NAME, LINE, POSITION, TEXT
FROM USER_ERRORS
WHERE NAME IN ('ASISTODO_WEB_INSERTAR', 'ASISTODO_WEB_COMPROBAR')
ORDER BY NAME, SEQUENCE;
```

## Rutas

| Metodo | Ruta relativa al esquema | Funcion |
| --- | --- | --- |
| POST | `asistodo/v1/comprobar` | Comprueba token, conexion, lectura y configuracion basica; no escribe. |
| POST | `asistodo/v1/personas` | Valida e inserta una persona, hace COMMIT y devuelve IDPERSONA. |

Ambas requieren `X-Import-Token`. No hay rutas GET para listar personas, ni PUT ni DELETE.
Se usa POST tambien en comprobar porque el handler PL/SQL de ORDS admite POST/PUT/DELETE.

## Fuentes y alcance

Preparado a partir de GPTGPT.xls (Sheet 1, A1:F29), GPTGPT2.xls
(Sheet 1, A1:B98), GPTGPT3.xls (Sheet 1, A1:G40) y las capturas del chat.
La tabla se llama PRESTAPROD.PERSONA, no PERSONAS. La secuencia IDPERSONA
proviene de la captura de USER_SEQUENCES, no de estos archivos.

Los .xls muestran columnas, tipos y nulabilidad, NO todos los indices,
restricciones, permisos, procedimientos instalados ni la instalacion de ORDS.
Los scripts se revisaron contra esos campos y la documentacion; no se ejecutaron
ni compilaron contra una instancia Oracle real. Probar primero en una base de prueba.

## Elegir el archivo

- `insertar-persona.sql`: INSERT de las 28 columnas, con binds. No es una API.
  Las fechas se convierten explicitamente. No confirma automaticamente.
- `publicar-persona-ords.sql`: configuracion privada, procedimientos y dos POST
  ORDS. No necesita DBMS_CRYPTO ni cambia la tabla de credenciales
  existente, que segun GPTGPT3 tiene HASH_TOKEN RAW(32) NOT NULL.
- `configurar-persona-ords.sql`: guarda el token mediante bind, sin incluirlo en el archivo.
- `activar-persona-ords.sql`: habilita inserciones despues de las comprobaciones.
- `probar-sin-insertar.sql`: pruebas de procedimientos en Toad sin insertar personas.

## Requisito que SQL no puede resolver

ORDS debe estar instalado y conectado a la misma base/servicio que Toad.
Su servidor debe alcanzar 172.17.1.4:1521/orcl y estar publicado mediante un
dominio HTTPS y certificado valido. Publicar solamente el proxy HTTPS (443),
NO el listener de Oracle (1521). SQL registra rutas en ORDS; no instala el
servidor web, no configura DNS ni resuelve el acceso de Internet.

Si ya hay una API propia de la empresa, no asumir que utiliza ORDS solo por
estar conectada a Oracle. Su URL, codigo o configuracion deben verificarse.

## Seguridad y reinstalacion

Antes de activar: asegurar HTTPS, limites de solicitudes y cuerpo en el proxy,
proteger configuracion/backups/logs y restringir acceso de red o usar mTLS para
este servicio sensible cuando sea viable. No registrar X-Import-Token ni cuerpos
de solicitudes. No conceder privilegios a PUBLIC ni habilitar AutoREST sin
proteccion para toda PERSONA. `p_auto_rest_auth` protege el catalogo ORDS; los
handlers se autentican explicitamente mediante el token dentro de los procedimientos.

La instalacion utiliza exclusivamente los nombres ASISTODO_WEB_CONFIG,
ASISTODO_WEB_INSERTAR, ASISTODO_WEB_COMPROBAR y el modulo asistodo.persona.insert.v1.
Al repetirla conserva la configuracion privada, apaga inserciones y reemplaza
estos procedimientos/rutas. No reutilizar esos nombres para otro sistema.
No modifica API_IMPORTAR_PERSONA, COOPYA_IMPORT_CREDENTIAL ni otras rutas ORDS.
Si hay privilegios ORDS que protegen rutas por patron, no quitarlos para hacer
pasar la prueba: el administrador debe definir la autenticacion correspondiente.

Configurar el token lo guarda en texto en una tabla privada por compatibilidad
con lo solicitado. No se generan claves nuevas ni se publica el secreto en React.

Para apagar solo la insercion:

```sql
UPDATE PRESTAPROD.ASISTODO_WEB_CONFIG SET ACTIVO = 0 WHERE ID = 1;
COMMIT;
```

## Llamada desde el servidor de Vercel

URL orientativa (no es un dominio desplegado):

```http
POST https://TU_DOMINIO/ords/ALIAS_EXISTENTE/asistodo/v1/personas
Content-Type: application/json
X-Import-Token: <COOPYA_IMPORT_TOKEN>
```

La ruta puede incluir un prefijo de pool ORDS o proxy adicional. El administrador
debe confirmar la URL publica real. El token se agrega en Vercel, nunca en React.

Antes de insertar, usar esa misma base de URL con `comprobar`:

```http
POST https://TU_DOMINIO/ords/ALIAS_EXISTENTE/asistodo/v1/comprobar
Content-Type: application/json
X-Import-Token: <COOPYA_IMPORT_TOKEN>

{}
```

Respuesta esperada HTTP 200 (valores de destino ilustrativos):

```json
{
  "ok": true,
  "version": "2026-09-25.1",
  "insertEnabled": false,
  "database": {"schema": "PRESTAPROD", "databaseName": "ORCL", "serviceName": "orcl"},
  "message": "Conexion y lectura comprobadas. No se probo una escritura ni todos los catalogos."
}
```

Esto verifica acceso de lectura, no permisos de escritura efectivos, sincronizacion
de secuencia, IDPRESTADOR, reglas de sexo ni todos los constraints. Para validar esos
aspectos hace falta una insercion autorizada en una base de prueba.

Ejemplo ficticio; usar un documento autorizado que no exista al probar escritura:

```json
{
  "persona": {
    "TipoDoc": 1,
    "NumeroDoc": "12345678",
    "Apellido": "EJEMPLO",
    "Nombre": "PERSONA",
    "Cuil": null,
    "FechaNac": null,
    "Calle": "CALLE EJEMPLO",
    "NumeroCalle": "123",
    "Sexo": "1",
    "Tel1_CodArea": "11",
    "Tel1_Numero": "12345678",
    "Mail": "persona@example.com",
    "Remuneracion": 400000
  }
}
```

Sexo es VARCHAR2(1) en Oracle. El mapeo actual envia 1/2; confirmar que coincida
con el catalogo de esa base. No se deduce fecha de nacimiento a partir de edad.
Los campos opcionales ausentes quedan NULL. IdCodigoPostal/IdProvincia son IDs
internos; CP no se usa como ID. Tipo/Estado/Prestador internos salen de la
configuracion privada, no de los codigos Tipo=57 u Organismo=1146 de Coopya.
FECHAALTA usa fechaalta si llega o SYSDATE. FECHABAJA, IDREGISTRO e IDUSUARIO
quedan NULL en este endpoint de alta; el INSERT local permite indicar mas campos.

No genera un prestamo, contrato, cuota social ni asociaciones de plan/servicio.
PERSONA no contiene esas columnas. Los campos de producto del JSON actual no se
persisten por este endpoint y deben resolverse en la integracion correspondiente.

Respuesta HTTP 201 despues de insertar, verificar y confirmar:

```json
{"ok":true,"requestId":"identificador","oracle":{"confirmed":true,"verified":true,"idPersona":123,"operacion":"INSERCION"}}
```

Errores de insercion JSON con ok=false, requestId y error: 401 token incorrecto; 400 JSON;
422 tipo/tamano/referencia; 409 documento o clave existente; 503 desactivado,
configuracion invalida o una insercion en curso; 500 fallo interno.
No devuelve SQLERRM, token, cuerpo enviado ni datos de otras personas. En errores
autenticados incluye stage, oracleCode y field cuando se conoce. Los limites de
texto son en bytes, conservadores respecto a las definiciones exportadas.
El procedimiento incluye COMMIT/ROLLBACK y es una transaccion independiente:
no invocarlo dentro de una operacion con otros cambios pendientes.

## Duplicados, concurrencia y pruebas

Este endpoint es INSERT, no UPSERT. Documento existente devuelve 409 sin
modificarlo; nunca convierte ese rechazo en una aceptacion automatica.
Serializa sus propias llamadas con la fila de configuracion (NOWAIT), no toda
PERSONA. Los .xls no prueban una restriccion unica por tipo/documento: el DBA debe
verificarla si otros sistemas tambien escriben. No agrega restricciones ni
modifica la secuencia automaticamente. No garantiza idempotencia persistente.

Si se pierde la respuesta tras COMMIT, consultar PERSONA por documento antes de
reintentar; no hacer reintentos automaticos. Un duplicado posterior no demuestra
que todos los datos anteriores coincidan.

Pruebas minimas con la API configurada y activa: sin token ->401; token incorrecto ->401; JSON invalido ->400;
nombre excedido ->422; nueva persona autorizada ->201 y visible en otra sesion;
repetir documento ->409 sin crear otro registro. Token valido con ACTIVO=0 ->503
en /personas y ->200 con insertEnabled=false en /comprobar.
`probar-sin-insertar.sql` automatiza las pruebas locales sin una alta valida.
`node --test tests/ordsArtifacts.test.mjs` revisa estaticamente columnas, rutas y
propiedades del codigo entregado. No sustituye compilacion ni pruebas Oracle/HTTP.
No se realizaron las pruebas Oracle contra tu base porque no hay acceso desde aqui.

## Alternativa, no instalar sobre el bloque simple del chat

La web ahora usa ORDS directamente. La integracion activa corresponde al bloque
simple que el usuario ejecuto: `/ords/prestaprod/asistodo/personas`, con la persona
en la raiz del JSON y `X-Import-Token`. Ver [configuracion de la web](../importacion-oracle.md).

Los scripts de esta carpeta son una alternativa anterior mas extensa: usan
`/asistodo/v1/personas` y esperan `{persona: ...}`. No son intercambiables con el
handler simple. Se conservan como referencia; no ejecutarlos para configurar
la integracion actual. Ninguno fue probado contra Oracle desde este entorno.

## Referencias oficiales

- https://docs.oracle.com/en/database/oracle/oracle-rest-data-services/25.3/orddg/ORDS-reference.html
- https://docs.oracle.com/en/database/oracle/oracle-rest-data-services/25.3/orddg/implicit-parameters.html
- https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/json-types.html
- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
