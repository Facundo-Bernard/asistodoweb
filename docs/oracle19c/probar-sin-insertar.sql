-- Opcional. Pruebas locales de procedimientos: F5, como PRESTAPROD.
-- No consume secuencias, no cambia configuracion y nunca envia una persona valida.
-- No prueba HTTPS ni los bindings de ORDS; eso requiere POST /comprobar desde fuera.
SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE
    L_TOKEN PRESTAPROD.ASISTODO_WEB_CONFIG.TOKEN%TYPE;
    L_ACTIVE NUMBER;
    L_STATUS NUMBER;
    L_JSON VARCHAR2(32767);
    L_COUNT NUMBER;
    PROCEDURE ASSERT_STATUS(P_EXPECTED NUMBER, P_CASE VARCHAR2) IS
    BEGIN
        IF L_STATUS <> P_EXPECTED THEN
            DBMS_OUTPUT.PUT_LINE(L_JSON);
            RAISE_APPLICATION_ERROR(-20080, P_CASE || ': estado HTTP inesperado.');
        END IF;
        DBMS_OUTPUT.PUT_LINE('OK: ' || P_CASE || ' -> ' || L_STATUS);
    END;
BEGIN
    SELECT TOKEN, ACTIVO INTO L_TOKEN, L_ACTIVE FROM PRESTAPROD.ASISTODO_WEB_CONFIG WHERE ID = 1;
    PRESTAPROD.ASISTODO_WEB_COMPROBAR(NULL, L_STATUS, L_JSON);
    ASSERT_STATUS(401, 'comprobar sin token');
    PRESTAPROD.ASISTODO_WEB_COMPROBAR(L_TOKEN, L_STATUS, L_JSON);
    ASSERT_STATUS(200, 'comprobar con token valido');
    DBMS_OUTPUT.PUT_LINE(L_JSON);
    PRESTAPROD.ASISTODO_WEB_INSERTAR(NULL, '{}', L_STATUS, L_JSON);
    ASSERT_STATUS(401, 'insertar sin token');
    IF L_ACTIVE = 0 THEN
        PRESTAPROD.ASISTODO_WEB_INSERTAR(L_TOKEN, '{}', L_STATUS, L_JSON);
        ASSERT_STATUS(503, 'API apagada');
    ELSE
        PRESTAPROD.ASISTODO_WEB_INSERTAR(L_TOKEN, 'no-es-json', L_STATUS, L_JSON);
        ASSERT_STATUS(400, 'JSON invalido');
        PRESTAPROD.ASISTODO_WEB_INSERTAR(L_TOKEN, '{"persona":{}}', L_STATUS, L_JSON);
        ASSERT_STATUS(422, 'datos requeridos ausentes');
        PRESTAPROD.ASISTODO_WEB_INSERTAR(L_TOKEN, '{"persona":{},"persona":{}}', L_STATUS, L_JSON);
        ASSERT_STATUS(400, 'propiedades JSON duplicadas');
        PRESTAPROD.ASISTODO_WEB_INSERTAR(L_TOKEN,
            '{"persona":{"TipoDoc":1,"NumeroDoc":"12.5"}}', L_STATUS, L_JSON);
        ASSERT_STATUS(422, 'documento fraccionario');
    END IF;
END;
/
