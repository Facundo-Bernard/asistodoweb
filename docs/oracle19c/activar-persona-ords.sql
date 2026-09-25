-- PASO 3. Ejecutar F5 solo DESPUES de probar /comprobar por HTTPS desde el exterior.
-- Este archivo habilita inserciones autenticadas. No inserta ninguna persona.
-- Verificar dominio/certificado, limites y protecciones del proxy antes de activar.
SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE
    L_TOKEN PRESTAPROD.ASISTODO_WEB_CONFIG.TOKEN%TYPE;
    L_STATUS NUMBER;
    L_JSON VARCHAR2(32767);
    L_COUNT NUMBER;
BEGIN
    IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'PRESTAPROD' THEN
        RAISE_APPLICATION_ERROR(-20080, 'Conectarse como PRESTAPROD.');
    END IF;
    SELECT TOKEN INTO L_TOKEN FROM PRESTAPROD.ASISTODO_WEB_CONFIG WHERE ID = 1 FOR UPDATE NOWAIT;
    PRESTAPROD.ASISTODO_WEB_COMPROBAR(L_TOKEN, L_STATUS, L_JSON);
    IF L_STATUS <> 200 THEN
        DBMS_OUTPUT.PUT_LINE(L_JSON);
        RAISE_APPLICATION_ERROR(-20080, 'La comprobacion fallo. No se activa la API.');
    END IF;
    SELECT COUNT(*) INTO L_COUNT FROM USER_ORDS_MODULES
    WHERE NAME = 'asistodo.persona.insert.v1' AND STATUS = 'PUBLISHED';
    IF L_COUNT <> 1 THEN
        RAISE_APPLICATION_ERROR(-20080, 'El modulo de esta API no esta publicado.');
    END IF;
    UPDATE PRESTAPROD.ASISTODO_WEB_CONFIG SET ACTIVO = 1 WHERE ID = 1;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('API habilitada. POST /personas requiere X-Import-Token.');
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/

-- Para desactivar sin borrar personas ni rutas:
-- UPDATE PRESTAPROD.ASISTODO_WEB_CONFIG SET ACTIVO = 0 WHERE ID = 1;
-- COMMIT;
