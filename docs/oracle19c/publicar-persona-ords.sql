-- PASO 1: abrir este archivo en Toad, conectado como PRESTAPROD, y ejecutar F5.
-- Revisar Script Output y detenerse ante cualquier error.
-- Requiere Oracle 19c y ORDS instalado, configurado para esta misma base,
-- HTTPS publico funcionando para acceso desde Vercel.
-- No instala ORDS, no abre puertos, no cambia la app ni concede acceso a PUBLIC.
-- No modifica API_IMPORTAR_PERSONA ni COOPYA_IMPORT_CREDENTIAL.
-- No contiene tokens y no inserta personas. Instala un modulo inicialmente apagado.
-- Configurar despues con configurar-persona-ords.sql y activar-persona-ords.sql.

WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET DEFINE OFF
SET SERVEROUTPUT ON

-- 0. PRECOMPROBACION (solo lectura). Confirmar destino y objetos.
SELECT SYS_CONTEXT('USERENV', 'SESSION_USER') AS USUARIO,
       SYS_CONTEXT('USERENV', 'DB_NAME') AS BASE,
       SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS SERVICIO
FROM DUAL;

SELECT OBJECT_NAME, OBJECT_TYPE, STATUS FROM USER_OBJECTS
WHERE OBJECT_NAME IN ('PERSONA', 'IDPERSONA', 'TIPOPERSONA',
  'ESTADOPERSONA', 'ASISTODO_WEB_CONFIG', 'ASISTODO_WEB_INSERTAR');

SELECT OWNER, OBJECT_NAME, STATUS FROM ALL_OBJECTS
WHERE OBJECT_NAME = 'ORDS' AND OBJECT_TYPE = 'PACKAGE';

SELECT ORDS.INSTALLED_VERSION AS VERSION_ORDS FROM DUAL;

-- 1. CONFIGURACION PRIVADA, una sola fila. No contiene ningun token de ejemplo.
-- Los nombres ASISTODO_WEB_* se reservan exclusivamente para esta API.
-- En reinstalacion se conserva el token y se apaga la API hasta la reactivacion.
DECLARE
    L_COUNT NUMBER;
BEGIN
    IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'PRESTAPROD'
       OR SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') <> 'PRESTAPROD' THEN
        RAISE_APPLICATION_ERROR(-20080, 'Conectarse como PRESTAPROD, no solo cambiar CURRENT_SCHEMA.');
    END IF;
    SELECT COUNT(*) INTO L_COUNT FROM USER_OBJECTS
    WHERE (OBJECT_NAME = 'PERSONA' AND OBJECT_TYPE = 'TABLE')
       OR (OBJECT_NAME = 'IDPERSONA' AND OBJECT_TYPE = 'SEQUENCE')
       OR (OBJECT_NAME = 'TIPOPERSONA' AND OBJECT_TYPE = 'TABLE')
       OR (OBJECT_NAME = 'ESTADOPERSONA' AND OBJECT_TYPE = 'TABLE');
    IF L_COUNT <> 4 THEN
        RAISE_APPLICATION_ERROR(-20080, 'Faltan PERSONA, IDPERSONA, TIPOPERSONA o ESTADOPERSONA.');
    END IF;
    SELECT COUNT(*) INTO L_COUNT FROM USER_OBJECTS WHERE OBJECT_NAME = 'ASISTODO_WEB_CONFIG';
    IF L_COUNT = 0 THEN
        EXECUTE IMMEDIATE q'~CREATE TABLE PRESTAPROD.ASISTODO_WEB_CONFIG (
    ID NUMBER(1) CONSTRAINT ASISTODO_WEB_CONFIG_PK PRIMARY KEY,
    TOKEN VARCHAR2(200 BYTE) NOT NULL,
    IDTIPOPERSONA NUMBER NOT NULL,
    IDESTADOPERSONA NUMBER NOT NULL,
    IDPRESTADOR NUMBER,
    ACTIVO NUMBER(1) DEFAULT 0 NOT NULL,
    CONSTRAINT ASISTODO_WEB_CONFIG_ID CHECK (ID = 1),
    CONSTRAINT ASISTODO_WEB_CONFIG_ACT CHECK (ACTIVO IN (0, 1))
)~';
    ELSE
        SELECT COUNT(*) INTO L_COUNT FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME = 'ASISTODO_WEB_CONFIG' AND (
            (COLUMN_NAME = 'TOKEN' AND DATA_TYPE = 'VARCHAR2' AND DATA_LENGTH = 200)
            OR (COLUMN_NAME IN ('ID','IDTIPOPERSONA','IDESTADOPERSONA','IDPRESTADOR','ACTIVO')
                AND DATA_TYPE = 'NUMBER'));
        IF L_COUNT <> 6 THEN
            RAISE_APPLICATION_ERROR(-20080, 'ASISTODO_WEB_CONFIG ya existe con otra estructura. No se modifica.');
        END IF;
        EXECUTE IMMEDIATE 'UPDATE PRESTAPROD.ASISTODO_WEB_CONFIG SET ACTIVO = 0 WHERE ID = 1';
        COMMIT;
    END IF;
END;
/

-- 2. INSERT autenticado. Inserta; nunca actualiza ni borra personas existentes.
-- Atiende su propia transaccion. No llamarlo dentro de una transaccion mayor.
CREATE OR REPLACE PROCEDURE PRESTAPROD.ASISTODO_WEB_INSERTAR (
    P_TOKEN IN VARCHAR2,
    P_BODY IN CLOB,
    O_STATUS OUT NUMBER,
    O_JSON OUT VARCHAR2
) AUTHID DEFINER AS
    L_CONFIG PRESTAPROD.ASISTODO_WEB_CONFIG%ROWTYPE;
    L_ROW PRESTAPROD.PERSONA%ROWTYPE;
    L_ROOT JSON_OBJECT_T;
    L_PERSON JSON_OBJECT_T;
    L_RESULT JSON_OBJECT_T := JSON_OBJECT_T();
    L_ORACLE JSON_OBJECT_T := JSON_OBJECT_T();
    L_ERROR JSON_OBJECT_T := JSON_OBJECT_T();
    L_REQUEST_ID VARCHAR2(32) := LOWER(RAWTOHEX(SYS_GUID()));
    L_COUNT NUMBER;
    L_LOCK_ID NUMBER;
    L_CODE VARCHAR2(60) := 'INTERNAL_ERROR';
    L_MESSAGE VARCHAR2(500) := 'Error interno. Revisar el servidor.';
    L_AUTHENTICATED BOOLEAN := FALSE;
    L_STAGE VARCHAR2(30) := 'autenticacion';
    L_SQLCODE NUMBER;
    L_FIELD VARCHAR2(50);

    PROCEDURE FAIL(P_STATUS NUMBER, P_CODE VARCHAR2, P_MESSAGE VARCHAR2) IS
    BEGIN
        O_STATUS := P_STATUS;
        L_CODE := P_CODE;
        L_MESSAGE := P_MESSAGE;
        RAISE_APPLICATION_ERROR(-20090, P_MESSAGE);
    END;

    FUNCTION TXT(P_KEY VARCHAR2, P_MAX_BYTES NUMBER DEFAULT 32767) RETURN VARCHAR2 IS
        V JSON_ELEMENT_T;
        V_TEXT VARCHAR2(32767);
    BEGIN
        L_FIELD := P_KEY;
        V := L_PERSON.GET(P_KEY);
        IF V IS NULL THEN RETURN NULL; END IF;
        IF V.IS_NULL() THEN RETURN NULL; END IF;
        IF NOT V.IS_STRING() AND NOT V.IS_NUMBER() THEN
            FAIL(422, 'INVALID_FIELD', P_KEY || ' debe ser texto o numero.');
        END IF;
        V_TEXT := TRIM(L_PERSON.GET_STRING(P_KEY));
        IF LENGTHB(V_TEXT) > P_MAX_BYTES THEN
            FAIL(422, 'FIELD_TOO_LONG', P_KEY || ' supera ' || P_MAX_BYTES || ' bytes.');
        END IF;
        RETURN V_TEXT;
    END;

    FUNCTION NUM(P_KEY VARCHAR2) RETURN NUMBER IS
        V VARCHAR2(32767) := TXT(P_KEY);
    BEGIN
        IF V IS NULL THEN RETURN NULL; END IF;
        -- JSON usa punto decimal, independientemente de NLS_NUMERIC_CHARACTERS.
        IF NOT REGEXP_LIKE(V, '^[0-9]+([.][0-9]+)?$') THEN
            FAIL(422, 'INVALID_NUMBER', P_KEY || ' debe ser un numero no negativo.');
        END IF;
        RETURN TO_NUMBER(V, '999999999999999999999999999999D99999999',
                            'NLS_NUMERIC_CHARACTERS=''.,''');
    END;

    FUNCTION IDENTIFICADOR(P_KEY VARCHAR2) RETURN NUMBER IS
        V NUMBER := NUM(P_KEY);
    BEGIN
        IF V IS NOT NULL AND (V <= 0 OR V <> TRUNC(V)) THEN
            FAIL(422, 'INVALID_ID', P_KEY || ' debe ser un entero positivo.');
        END IF;
        RETURN V;
    END;

    FUNCTION FECHA(P_KEY VARCHAR2) RETURN DATE IS
        V VARCHAR2(32767) := TXT(P_KEY);
    BEGIN
        IF V IS NULL THEN RETURN NULL; END IF;
        BEGIN
            RETURN TO_DATE(V, 'FXYYYY-MM-DD');
        EXCEPTION WHEN OTHERS THEN
            FAIL(422, 'INVALID_DATE', P_KEY || ' debe ser una fecha YYYY-MM-DD valida.');
        END;
        RETURN NULL;
    END;
BEGIN
    O_STATUS := 500;
    BEGIN
        SELECT * INTO L_CONFIG FROM PRESTAPROD.ASISTODO_WEB_CONFIG WHERE ID = 1;
    EXCEPTION WHEN NO_DATA_FOUND THEN
        FAIL(503, 'API_NOT_CONFIGURED', 'La API no esta configurada.');
    END;
    IF P_TOKEN IS NULL OR P_TOKEN <> L_CONFIG.TOKEN THEN
        FAIL(401, 'INVALID_TOKEN', 'Token invalido.');
    END IF;
    L_AUTHENTICATED := TRUE;
    IF L_CONFIG.ACTIVO <> 1 THEN
        FAIL(503, 'API_DISABLED', 'La API no esta habilitada para insertar.');
    END IF;
    L_STAGE := 'validacion';
    IF P_BODY IS NULL OR DBMS_LOB.GETLENGTH(P_BODY) > 65536 THEN
        FAIL(400, 'INVALID_BODY', 'Se requiere JSON de hasta 65536 caracteres.');
    END IF;
    SELECT CASE WHEN P_BODY IS JSON STRICT WITH UNIQUE KEYS THEN 1 ELSE 0 END
    INTO L_COUNT FROM DUAL;
    IF L_COUNT <> 1 THEN
        FAIL(400, 'INVALID_JSON', 'JSON invalido o con propiedades repetidas.');
    END IF;
    BEGIN
        L_ROOT := JSON_OBJECT_T.PARSE(P_BODY);
        L_PERSON := L_ROOT.GET_OBJECT('persona');
        IF L_PERSON IS NULL THEN RAISE VALUE_ERROR; END IF;
    EXCEPTION WHEN OTHERS THEN
        FAIL(400, 'INVALID_JSON', 'Se requiere un objeto JSON con un objeto persona.');
    END;

    L_ROW.IDDOCUMENTO_TIPO := IDENTIFICADOR('TipoDoc');
    L_ROW.DOCUMENTO_NRO := IDENTIFICADOR('NumeroDoc');
    L_ROW.CUIL := IDENTIFICADOR('Cuil');
    L_ROW.APELLIDO := TXT('Apellido', 50);
    L_ROW.NOMBRE := TXT('Nombre', 50);
    L_ROW.FECHANACIMIENTO := FECHA('FechaNac');
    L_ROW.CALLE := TXT('Calle', 50);
    L_ROW.CALLE_NRO := TXT('NumeroCalle', 20);
    L_ROW.PISO := TXT('Piso', 5);
    L_ROW.DEPTO := TXT('Dpto', 5);
    -- IDs internos, no el codigo postal literal CP.
    L_ROW.IDCODIGOPOSTAL := IDENTIFICADOR('IdCodigoPostal');
    L_ROW.IDPROVINCIA := IDENTIFICADOR('IdProvincia');
    L_ROW.TELEFONO_NRO := TXT('Tel1_Numero', 40);
    L_ROW.TELEFONO_AREA := TXT('Tel1_CodArea', 5);
    L_ROW.TELEFONO_OBSERVACION := TXT('TelefonoObservacion', 40);
    L_ROW.IDTIPOPERSONA := L_CONFIG.IDTIPOPERSONA;
    L_ROW.IDESTADOPERSONA := L_CONFIG.IDESTADOPERSONA;
    L_ROW.IDPRESTADOR := L_CONFIG.IDPRESTADOR;
    L_ROW.FECHAALTA := NVL(FECHA('fechaalta'), SYSDATE);
    L_ROW.FECHABAJA := NULL;
    L_ROW.OBSERVACION := TXT('Observaciones', 100);
    L_ROW.IDSEXO := TXT('Sexo', 1);
    L_ROW.NUMEROENTE := TXT('NroEnte', 20);
    L_ROW.IDREGISTRO := NULL;
    L_ROW.IDUSUARIO := NULL;
    L_ROW.REMUNERACION := NUM('Remuneracion');
    L_ROW.MAIL := TXT('Mail', 50);
    L_FIELD := NULL;

    IF L_ROW.IDDOCUMENTO_TIPO IS NULL OR L_ROW.IDDOCUMENTO_TIPO <= 0
       OR L_ROW.IDDOCUMENTO_TIPO <> TRUNC(L_ROW.IDDOCUMENTO_TIPO)
       OR L_ROW.DOCUMENTO_NRO IS NULL OR L_ROW.DOCUMENTO_NRO <= 0
       OR L_ROW.DOCUMENTO_NRO <> TRUNC(L_ROW.DOCUMENTO_NRO)
       OR L_ROW.APELLIDO IS NULL OR L_ROW.NOMBRE IS NULL THEN
        FAIL(422, 'REQUIRED_FIELDS', 'TipoDoc y NumeroDoc deben ser enteros positivos; Nombre y Apellido son obligatorios.');
    END IF;

    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.TIPOPERSONA
    WHERE IDTIPOPERSONA = L_ROW.IDTIPOPERSONA;
    IF L_COUNT <> 1 THEN FAIL(503, 'INVALID_CONFIG', 'IDTIPOPERSONA no existe o es ambiguo.'); END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.ESTADOPERSONA
    WHERE IDESTADOPERSONA = L_ROW.IDESTADOPERSONA;
    IF L_COUNT <> 1 THEN FAIL(503, 'INVALID_CONFIG', 'IDESTADOPERSONA no existe o es ambiguo.'); END IF;

    -- Serializa SOLO llamadas a este endpoint. No bloquea toda PERSONA.
    -- Otros escritores requieren una restriccion unica de documento en la BD.
    L_STAGE := 'insercion';
    SELECT ID INTO L_LOCK_ID FROM PRESTAPROD.ASISTODO_WEB_CONFIG
    WHERE ID = 1 FOR UPDATE NOWAIT;
    -- Revalidar despues del lock por si se roto el token o se apago la API.
    SELECT * INTO L_CONFIG FROM PRESTAPROD.ASISTODO_WEB_CONFIG WHERE ID = 1;
    IF P_TOKEN IS NULL OR P_TOKEN <> L_CONFIG.TOKEN THEN
        FAIL(401, 'INVALID_TOKEN', 'La credencial cambio durante el intento.');
    END IF;
    IF L_CONFIG.ACTIVO <> 1 OR L_CONFIG.IDTIPOPERSONA <> L_ROW.IDTIPOPERSONA
       OR L_CONFIG.IDESTADOPERSONA <> L_ROW.IDESTADOPERSONA
       OR NVL(L_CONFIG.IDPRESTADOR, -1) <> NVL(L_ROW.IDPRESTADOR, -1) THEN
        FAIL(503, 'CONFIG_CHANGED', 'La configuracion cambio durante el intento.');
    END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.PERSONA
    WHERE IDDOCUMENTO_TIPO = L_ROW.IDDOCUMENTO_TIPO
      AND DOCUMENTO_NRO = L_ROW.DOCUMENTO_NRO;
    IF L_COUNT > 0 THEN
        FAIL(409, 'DOCUMENT_EXISTS', 'El documento ya existe. No se modifico la persona.');
    END IF;

    L_ROW.IDPERSONA := PRESTAPROD.IDPERSONA.NEXTVAL;
    INSERT INTO PRESTAPROD.PERSONA (
        IDPERSONA, IDDOCUMENTO_TIPO, DOCUMENTO_NRO, CUIL, APELLIDO, NOMBRE,
        FECHANACIMIENTO, CALLE, CALLE_NRO, PISO, DEPTO, IDCODIGOPOSTAL,
        IDPROVINCIA, TELEFONO_NRO, IDTIPOPERSONA, IDESTADOPERSONA,
        FECHAALTA, FECHABAJA, OBSERVACION, IDSEXO, NUMEROENTE,
        IDPRESTADOR, IDREGISTRO, IDUSUARIO, TELEFONO_AREA,
        TELEFONO_OBSERVACION, REMUNERACION, MAIL
    ) VALUES (
        L_ROW.IDPERSONA, L_ROW.IDDOCUMENTO_TIPO, L_ROW.DOCUMENTO_NRO,
        L_ROW.CUIL, L_ROW.APELLIDO, L_ROW.NOMBRE, L_ROW.FECHANACIMIENTO,
        L_ROW.CALLE, L_ROW.CALLE_NRO, L_ROW.PISO, L_ROW.DEPTO,
        L_ROW.IDCODIGOPOSTAL, L_ROW.IDPROVINCIA, L_ROW.TELEFONO_NRO,
        L_ROW.IDTIPOPERSONA, L_ROW.IDESTADOPERSONA, L_ROW.FECHAALTA,
        L_ROW.FECHABAJA, L_ROW.OBSERVACION, L_ROW.IDSEXO, L_ROW.NUMEROENTE,
        L_ROW.IDPRESTADOR, L_ROW.IDREGISTRO, L_ROW.IDUSUARIO,
        L_ROW.TELEFONO_AREA, L_ROW.TELEFONO_OBSERVACION,
        L_ROW.REMUNERACION, L_ROW.MAIL
    );
    L_STAGE := 'verificacion';
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.PERSONA
    WHERE IDPERSONA = L_ROW.IDPERSONA
      AND IDDOCUMENTO_TIPO = L_ROW.IDDOCUMENTO_TIPO
      AND DOCUMENTO_NRO = L_ROW.DOCUMENTO_NRO;
    IF L_COUNT <> 1 THEN FAIL(500, 'VERIFY_FAILED', 'No se pudo verificar la insercion.'); END IF;

    L_ORACLE.PUT('confirmed', TRUE);
    L_ORACLE.PUT('verified', TRUE);
    L_ORACLE.PUT('idPersona', L_ROW.IDPERSONA);
    L_ORACLE.PUT('operacion', 'INSERCION');
    L_RESULT.PUT('ok', TRUE);
    L_RESULT.PUT('requestId', L_REQUEST_ID);
    L_RESULT.PUT('version', '2026-09-25.1');
    L_RESULT.PUT('oracle', L_ORACLE);
    O_JSON := L_RESULT.TO_STRING();
    L_STAGE := 'commit';
    COMMIT;
    O_STATUS := 201;
EXCEPTION WHEN OTHERS THEN
    L_SQLCODE := SQLCODE;
    ROLLBACK;
    IF L_SQLCODE <> -20090 THEN
        O_STATUS := 500;
        IF L_SQLCODE IN (-6502, -12899, -1722, -1438) THEN
            O_STATUS := 422; L_CODE := 'INVALID_FIELD_SIZE_OR_TYPE';
            L_MESSAGE := 'Un campo excede el tamano o tiene un tipo invalido.';
        ELSIF L_SQLCODE = -2291 THEN
            O_STATUS := 422; L_CODE := 'INVALID_REFERENCE';
            L_MESSAGE := 'Un ID de catalogo no existe.';
        ELSIF L_SQLCODE = -1 THEN
            O_STATUS := 409; L_CODE := 'DUPLICATE_KEY';
            L_MESSAGE := 'Clave duplicada. Revisar documento y secuencia IDPERSONA.';
        ELSIF L_SQLCODE = -54 THEN
            O_STATUS := 503; L_CODE := 'IMPORT_BUSY';
            L_MESSAGE := 'Hay otra insercion en curso.';
        END IF;
    END IF;
    L_RESULT := JSON_OBJECT_T();
    L_RESULT.PUT('ok', FALSE);
    L_RESULT.PUT('requestId', L_REQUEST_ID);
    L_RESULT.PUT('version', '2026-09-25.1');
    L_ERROR.PUT('code', L_CODE);
    L_ERROR.PUT('message', L_MESSAGE);
    IF L_AUTHENTICATED THEN
        L_ERROR.PUT('stage', L_STAGE);
        L_ERROR.PUT('oracleCode', L_SQLCODE);
        IF L_FIELD IS NOT NULL THEN L_ERROR.PUT('field', L_FIELD); END IF;
    END IF;
    L_RESULT.PUT('error', L_ERROR);
    O_JSON := L_RESULT.TO_STRING();
END;
/

SELECT LINE, POSITION, TEXT FROM USER_ERRORS
WHERE NAME = 'ASISTODO_WEB_INSERTAR' ORDER BY SEQUENCE;

-- 3. Comprobacion protegida, exclusivamente de lectura. Funciona aun con ACTIVO=0.
-- No devuelve personas, secretos ni consume NEXTVAL.
CREATE OR REPLACE PROCEDURE PRESTAPROD.ASISTODO_WEB_COMPROBAR (
    P_TOKEN IN VARCHAR2, O_STATUS OUT NUMBER, O_JSON OUT VARCHAR2
) AUTHID DEFINER AS
    L_CONFIG PRESTAPROD.ASISTODO_WEB_CONFIG%ROWTYPE;
    L_RESULT JSON_OBJECT_T := JSON_OBJECT_T();
    L_DB JSON_OBJECT_T := JSON_OBJECT_T();
    L_ERROR JSON_OBJECT_T := JSON_OBJECT_T();
    L_COUNT NUMBER;
    L_AUTHENTICATED BOOLEAN := FALSE;
    L_CODE VARCHAR2(60) := 'CHECK_FAILED';
    L_MESSAGE VARCHAR2(300) := 'No se pudo comprobar la API.';
    PROCEDURE FAIL(P_STATUS NUMBER, P_CODE VARCHAR2, P_MESSAGE VARCHAR2) IS
    BEGIN
        O_STATUS := P_STATUS; L_CODE := P_CODE; L_MESSAGE := P_MESSAGE;
        RAISE_APPLICATION_ERROR(-20090, P_MESSAGE);
    END;
BEGIN
    O_STATUS := 500;
    BEGIN
        SELECT * INTO L_CONFIG FROM PRESTAPROD.ASISTODO_WEB_CONFIG WHERE ID = 1;
    EXCEPTION WHEN NO_DATA_FOUND THEN
        FAIL(503, 'API_NOT_CONFIGURED', 'Primero ejecutar configurar-persona-ords.sql.');
    END;
    IF P_TOKEN IS NULL OR P_TOKEN <> L_CONFIG.TOKEN THEN
        FAIL(401, 'INVALID_TOKEN', 'Token invalido.');
    END IF;
    L_AUTHENTICATED := TRUE;
    SELECT COUNT(*) INTO L_COUNT FROM USER_OBJECTS
    WHERE OBJECT_NAME = 'ASISTODO_WEB_INSERTAR' AND OBJECT_TYPE = 'PROCEDURE' AND STATUS = 'VALID';
    IF L_COUNT <> 1 THEN FAIL(503, 'PROCEDURE_INVALID', 'Revisar USER_ERRORS de ASISTODO_WEB_INSERTAR.'); END IF;
    SELECT COUNT(*) INTO L_COUNT FROM USER_SEQUENCES WHERE SEQUENCE_NAME = 'IDPERSONA';
    IF L_COUNT <> 1 THEN FAIL(503, 'SEQUENCE_MISSING', 'No se encontro la secuencia IDPERSONA.'); END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.TIPOPERSONA WHERE IDTIPOPERSONA = L_CONFIG.IDTIPOPERSONA;
    IF L_COUNT <> 1 THEN FAIL(503, 'INVALID_CONFIG', 'IDTIPOPERSONA no existe o es ambiguo.'); END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.ESTADOPERSONA WHERE IDESTADOPERSONA = L_CONFIG.IDESTADOPERSONA;
    IF L_COUNT <> 1 THEN FAIL(503, 'INVALID_CONFIG', 'IDESTADOPERSONA no existe o es ambiguo.'); END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.PERSONA WHERE 1 = 0;
    L_DB.PUT('schema', SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA'));
    L_DB.PUT('databaseName', SYS_CONTEXT('USERENV', 'DB_NAME'));
    L_DB.PUT('serviceName', SYS_CONTEXT('USERENV', 'SERVICE_NAME'));
    L_RESULT.PUT('ok', TRUE);
    L_RESULT.PUT('version', '2026-09-25.1');
    L_RESULT.PUT('insertEnabled', L_CONFIG.ACTIVO = 1);
    L_RESULT.PUT('database', L_DB);
    L_RESULT.PUT('message', 'Conexion y lectura comprobadas. No se probo una escritura ni todos los catalogos.');
    O_STATUS := 200;
    O_JSON := L_RESULT.TO_STRING();
EXCEPTION WHEN OTHERS THEN
    L_RESULT := JSON_OBJECT_T();
    L_RESULT.PUT('ok', FALSE);
    L_ERROR.PUT('code', L_CODE);
    L_ERROR.PUT('message', L_MESSAGE);
    IF L_AUTHENTICATED THEN L_ERROR.PUT('oracleCode', SQLCODE); END IF;
    L_RESULT.PUT('error', L_ERROR);
    O_JSON := L_RESULT.TO_STRING();
END;
/

SELECT NAME, LINE, POSITION, TEXT FROM USER_ERRORS
WHERE NAME IN ('ASISTODO_WEB_INSERTAR','ASISTODO_WEB_COMPROBAR') ORDER BY NAME, SEQUENCE;

-- 4. Modulo dedicado. Si ya existe asistodo.persona.insert.v1, esta definicion
-- reemplaza SUS rutas. No reutilizar el nombre de otro modulo.
-- La autenticacion de este handler es X-Import-Token, validada por el procedimiento.
-- p_auto_rest_auth protege el catalogo; NO autentica este handler por si solo.
BEGIN
    DECLARE
        L_COUNT NUMBER;
    BEGIN
        IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'PRESTAPROD' THEN
            RAISE_APPLICATION_ERROR(-20080, 'Conectarse como PRESTAPROD.');
        END IF;
        SELECT COUNT(*) INTO L_COUNT FROM USER_OBJECTS
        WHERE OBJECT_NAME IN ('ASISTODO_WEB_INSERTAR','ASISTODO_WEB_COMPROBAR')
          AND OBJECT_TYPE = 'PROCEDURE' AND STATUS = 'VALID';
        IF L_COUNT <> 2 THEN
            RAISE_APPLICATION_ERROR(-20080, 'No se publican rutas: hay procedimientos invalidos. Revisar USER_ERRORS.');
        END IF;
        -- Conservar cualquier alias anterior. No deshabilitar/remapear otros servicios.
        SELECT COUNT(*) INTO L_COUNT FROM USER_ORDS_SCHEMAS;
        IF L_COUNT = 0 THEN
            ORDS.ENABLE_SCHEMA(p_enabled => TRUE, p_schema => 'PRESTAPROD',
                p_url_mapping_type => 'BASE_PATH', p_url_mapping_pattern => 'prestaprod',
                p_auto_rest_auth => TRUE);
        END IF;
    END;
    ORDS.DEFINE_MODULE(
        p_module_name => 'asistodo.persona.insert.v1',
        p_base_path => '/asistodo/v1/', p_status => 'PUBLISHED');
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'asistodo.persona.insert.v1', p_pattern => 'personas');
    ORDS.DEFINE_HANDLER(
        p_module_name => 'asistodo.persona.insert.v1',
        p_pattern => 'personas', p_method => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_mimes_allowed => 'application/json',
        p_source => q'~
DECLARE
    L_BODY CLOB := :body_text;
    L_STATUS NUMBER;
    L_JSON VARCHAR2(32767);
BEGIN
    PRESTAPROD.ASISTODO_WEB_INSERTAR(:import_token, L_BODY, L_STATUS, L_JSON);
    :status_code := L_STATUS;
    OWA_UTIL.MIME_HEADER('application/json; charset=utf-8', FALSE);
    HTP.P('Cache-Control: no-store');
    OWA_UTIL.HTTP_HEADER_CLOSE;
    HTP.P(L_JSON);
END;
~');
    ORDS.DEFINE_PARAMETER(
        p_module_name => 'asistodo.persona.insert.v1', p_pattern => 'personas',
        p_method => 'POST', p_name => 'X-Import-Token',
        p_bind_variable_name => 'import_token', p_source_type => 'HEADER',
        p_param_type => 'STRING', p_access_method => 'IN');

    -- PL/SQL de ORDS usa POST/PUT/DELETE. POST /comprobar no hace escrituras.
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'asistodo.persona.insert.v1', p_pattern => 'comprobar');
    ORDS.DEFINE_HANDLER(
        p_module_name => 'asistodo.persona.insert.v1', p_pattern => 'comprobar',
        p_method => 'POST', p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_mimes_allowed => 'application/json',
        p_source => q'~
DECLARE
    L_STATUS NUMBER;
    L_JSON VARCHAR2(32767);
BEGIN
    PRESTAPROD.ASISTODO_WEB_COMPROBAR(:import_token, L_STATUS, L_JSON);
    :status_code := L_STATUS;
    OWA_UTIL.MIME_HEADER('application/json; charset=utf-8', FALSE);
    HTP.P('Cache-Control: no-store');
    OWA_UTIL.HTTP_HEADER_CLOSE;
    HTP.P(L_JSON);
END;
~');
    ORDS.DEFINE_PARAMETER(
        p_module_name => 'asistodo.persona.insert.v1', p_pattern => 'comprobar',
        p_method => 'POST', p_name => 'X-Import-Token',
        p_bind_variable_name => 'import_token', p_source_type => 'HEADER',
        p_param_type => 'STRING', p_access_method => 'IN');
    COMMIT;
END;
/

-- Alias real, rutas y procedimientos instalados (sin secretos).
SELECT * FROM USER_ORDS_SCHEMAS;
SELECT NAME, URI_PREFIX, STATUS FROM USER_ORDS_MODULES
WHERE NAME = 'asistodo.persona.insert.v1';
SELECT OBJECT_NAME, STATUS FROM USER_OBJECTS
WHERE OBJECT_NAME IN ('ASISTODO_WEB_INSERTAR','ASISTODO_WEB_COMPROBAR');

-- Siguiente paso: configurar-persona-ords.sql. Luego probar POST /comprobar.
