-- PASO 2. Ejecutar este bloque completo como sentencia (F9 en Toad, sin agregar /).
-- Toad pedira :token. Ingresar el mismo COOPYA_IMPORT_TOKEN de Vercel.
-- No escribir el secreto en este archivo ni guardar capturas del dialogo de binds.
-- 3/1/75 son los valores que indicaste; confirmarlos contra tus catalogos.
-- Se conserva ACTIVO=0 para poder probar /comprobar antes de admitir inserciones.
DECLARE
    L_TOKEN VARCHAR2(200) := :token;
    L_TIPO NUMBER := 3;
    L_ESTADO NUMBER := 1;
    L_PRESTADOR NUMBER := 75;
    L_COUNT NUMBER;
BEGIN
    IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'PRESTAPROD' THEN
        RAISE_APPLICATION_ERROR(-20080, 'Conectarse como PRESTAPROD.');
    END IF;
    IF L_TOKEN IS NULL OR LENGTHB(L_TOKEN) < 32 OR LENGTHB(L_TOKEN) > 200
       OR L_TOKEN <> TRIM(L_TOKEN) THEN
        RAISE_APPLICATION_ERROR(-20080, 'Usar el token privado completo, de 32 a 200 bytes y sin espacios externos.');
    END IF;
    IF L_TIPO IS NULL OR L_TIPO <= 0 OR L_TIPO <> TRUNC(L_TIPO)
       OR L_ESTADO IS NULL OR L_ESTADO <= 0 OR L_ESTADO <> TRUNC(L_ESTADO)
       OR (L_PRESTADOR IS NOT NULL AND (L_PRESTADOR <= 0 OR L_PRESTADOR <> TRUNC(L_PRESTADOR))) THEN
        RAISE_APPLICATION_ERROR(-20080, 'Los IDs internos deben ser enteros positivos.');
    END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.TIPOPERSONA WHERE IDTIPOPERSONA = L_TIPO;
    IF L_COUNT <> 1 THEN RAISE_APPLICATION_ERROR(-20080, 'El ID de tipo de persona no existe o es ambiguo.'); END IF;
    SELECT COUNT(*) INTO L_COUNT FROM PRESTAPROD.ESTADOPERSONA WHERE IDESTADOPERSONA = L_ESTADO;
    IF L_COUNT <> 1 THEN RAISE_APPLICATION_ERROR(-20080, 'El ID de estado no existe o es ambiguo.'); END IF;

    MERGE INTO PRESTAPROD.ASISTODO_WEB_CONFIG C
    USING (SELECT 1 AS ID FROM DUAL) S ON (C.ID = S.ID)
    WHEN MATCHED THEN UPDATE SET
        C.TOKEN = L_TOKEN, C.IDTIPOPERSONA = L_TIPO,
        C.IDESTADOPERSONA = L_ESTADO, C.IDPRESTADOR = L_PRESTADOR, C.ACTIVO = 0
    WHEN NOT MATCHED THEN INSERT
        (ID, TOKEN, IDTIPOPERSONA, IDESTADOPERSONA, IDPRESTADOR, ACTIVO)
    VALUES (1, L_TOKEN, L_TIPO, L_ESTADO, L_PRESTADOR, 0);
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Configuracion guardada. Probar POST /comprobar; insercion aun desactivada.');
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
