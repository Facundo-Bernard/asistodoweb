# Aceptación de solicitudes

La aceptación se ejecuta en `POST /api/personas/importar` del mismo dominio del panel. El servidor valida la sesión de administrador, la configuración y los datos; después importa en Coopya, llama a `API_IMPORTAR_PERSONA` y consulta `PERSONA` por el ID devuelto y el documento enviado. Solamente esa verificación permite marcar la solicitud como aceptada.

## Configuración real

Usar `.env.example` como referencia. En Vercel, cada nombre y valor van en campos separados. `COOPYA_ORACLE_CONFIG` contiene solo un objeto JSON, sin el nombre de la variable, sin `=` y sin comillas externas. Los cambios en variables requieren un nuevo deployment en el ambiente correspondiente.

- `COOPYA_IMPORT_TOKEN`: la misma credencial que valida el procedimiento, privada.
- `COOPYA_ORACLE_CONFIG`: usuario, contraseña, conexión e IDs internos. `host:1521/servicio` es un ejemplo que se rechaza, no una conexión utilizable. Copiar los datos reales de Toad. Para Service Name: `HOST_REAL:PUERTO_REAL/SERVICE_NAME_REAL`. Para SID: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=HOST_REAL)(PORT=PUERTO_REAL))(CONNECT_DATA=(SID=SID_REAL)))`.
- `VITE_API_BASE_URL` (o `COOPYA_CANDIDATES_API_URL` en el servidor): URL HTTPS de la API de solicitudes/autenticación.
- `COOPYA_PERSONAS_IMPORT_URL`: opcional; por defecto se conserva el endpoint **de pruebas** `https://test.coopya.com.ar/Personas/ImportarPersonasApi`.

`personTypeId`, `personStatusId` y `providerId` deben existir en los catálogos internos de Oracle; los números de ejemplos previos no verifican esas equivalencias. `postalCodeId` es el ID interno, no el código postal literal. La base debe ser accesible desde Vercel por la red configurada. No se debe abrir indiscriminadamente el listener a Internet para resolver conectividad.

El driver usa Thin (Oracle 12.1+). Si la base es realmente 11g, se necesita un backend con Oracle Client y modo Thick; cambiar el connectString no resuelve esa incompatibilidad. Referencias: [conexión Oracle](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html), [modos del driver](https://node-oracledb.readthedocs.io/en/latest/user_guide/appendix_a.html).

## Diagnóstico

En DevTools → Console, expandir `[Aceptación IDENTIFICADOR]`. Se informa la etapa, código, HTTP local y externo, versiones, commit desplegado, duración de etapas, errores ORA/NJS/DPI/PLS, causa de red, estado parcial y sugerencia. El panel también permite expandir «Ver diagnóstico».

En Vercel → Logs, buscar ese mismo identificador. Los logs son JSON con `requestId`, `stage` y `event`. No se registran el cuerpo enviado, headers de autenticación, binds, claves ni tokens. Los mensajes técnicos se filtran para ocultar valores de la persona.

`GET /api/personas/importar` informa servicio y versión sin ejecutar escrituras ni revelar configuración. Confirma que se publicó la función, no que la conexión esté lista. El fallback del sitio excluye `/api` para no devolver HTML como si fuera una respuesta de aceptación.

Un rechazo de Coopya enviado con HTTP 200 ahora se convierte en HTTP 502 y conserva el motivo filtrado. No se debe interpretar `HTTP 200` por sí solo como aceptación.

Los dos sistemas no comparten una transacción. Si Coopya terminó y Oracle falló, el diagnóstico lo informa. Si hay un timeout después de enviar una escritura, el resultado puede ser desconocido: verificar antes de reintentar. No hay reintentos automáticos ni garantía de exclusión entre navegadores.

El indicador de aceptación se guarda localmente en el navegador, no en la API de solicitudes. Los indicadores viejos sin verificación Oracle no se reutilizan. No sustituye una consulta a la base.

## Verificar en Toad

Consultar el destino de la sesión y compararlo con `database` del diagnóstico:

```sql
SELECT SYS_CONTEXT('USERENV', 'DB_NAME') AS BASE,
       SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS SERVICIO,
       SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS ESQUEMA,
       SYS_CONTEXT('USERENV', 'SERVER_HOST') AS SERVIDOR
FROM DUAL;
```

Consultar por el documento real (parámetro bind), no por la primera página de `SELECT *`:

```sql
SELECT IDPERSONA, IDDOCUMENTO_TIPO, DOCUMENTO_NRO, APELLIDO, NOMBRE
FROM PERSONA
WHERE DOCUMENTO_NRO = :dni;
```

No se despliega ni se modifica el procedimiento Oracle desde este proyecto. Su versión instalada controla cómo actualiza campos existentes, incluidos los vacíos.

## Verificaciones locales

`node --test tests/personImport.test.mjs` ejecuta pruebas aisladas de rechazos HTTP 200, credenciales, configuración inválida, logs sin secretos, fallas del procedimiento y confirmación real mediante lectura simulada. No inserta personas en servicios reales.

`npm run dev` ejecuta solo Vite. Para probar la función localmente, usar el entorno de funciones de Vercel (`vercel dev`) o un deployment de prueba con la configuración de ese ambiente. La validación de respuesta detecta un servidor que solo devuelve HTML.
