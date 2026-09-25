-- Oracle 19c. Ejecutar conectado a la base correcta como PRESTAPROD.
-- Consulta parametrizada; NO publica una API ni valida un token.
-- Los valores :... se suministran como binds. Fechas: YYYY-MM-DD o NULL.
-- Los IDs de catalogos deben existir. No se inventa una fecha a partir de la edad.
-- IDPERSONA es la secuencia observada en las capturas del chat.
-- Verificar que esa secuencia este sincronizada; no se modifica aqui.

INSERT INTO PRESTAPROD.PERSONA (
    IDPERSONA, IDDOCUMENTO_TIPO, DOCUMENTO_NRO, CUIL,
    APELLIDO, NOMBRE, FECHANACIMIENTO, CALLE, CALLE_NRO,
    PISO, DEPTO, IDCODIGOPOSTAL, IDPROVINCIA, TELEFONO_NRO,
    IDTIPOPERSONA, IDESTADOPERSONA, FECHAALTA, FECHABAJA,
    OBSERVACION, IDSEXO, NUMEROENTE, IDPRESTADOR, IDREGISTRO,
    IDUSUARIO, TELEFONO_AREA, TELEFONO_OBSERVACION, REMUNERACION, MAIL
) VALUES (
    PRESTAPROD.IDPERSONA.NEXTVAL, :tipo_doc, :documento, :cuil,
    :apellido, :nombre, TO_DATE(:fecha_nacimiento, 'FXYYYY-MM-DD'),
    :calle, :numero_calle, :piso, :departamento, :id_codigo_postal,
    :id_provincia, :telefono_numero, :id_tipo_persona, :id_estado_persona,
    SYSDATE, NULL, :observacion, :id_sexo, :numero_ente, :id_prestador,
    :id_registro, :id_usuario, :telefono_area, :telefono_observacion,
    :remuneracion, :mail
)
RETURNING IDPERSONA INTO :id_persona_creada;

-- Revisar el resultado antes de confirmar desde Toad:
-- COMMIT;
-- Para cancelar el INSERT aun no confirmado:
-- ROLLBACK;
