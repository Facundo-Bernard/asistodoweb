/* global process */

import { ImportError } from "./_diagnostics.js";

const nullableText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const nullableNumber = (value) => {
  const text = nullableText(value);
  if (!text) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

export function readOracleConfiguration(env = process.env) {
  if (!nullableText(env.COOPYA_IMPORT_TOKEN)) {
    throw new ImportError("IMPORT_TOKEN_MISSING", "Falta COOPYA_IMPORT_TOKEN en Vercel.", { status: 503 });
  }
  if (!nullableText(env.COOPYA_ORACLE_CONFIG)) {
    throw new ImportError("ORACLE_CONFIG_MISSING", "Falta COOPYA_ORACLE_CONFIG en Vercel.", { status: 503 });
  }
  let configuration;
  try {
    configuration = JSON.parse(env.COOPYA_ORACLE_CONFIG);
  } catch {
    throw new ImportError("ORACLE_CONFIG_JSON", "COOPYA_ORACLE_CONFIG no contiene JSON válido.", {
      status: 503, hint: "En Vercel, la clave es COOPYA_ORACLE_CONFIG y el valor comienza con { y termina con }. No incluyas el nombre de la variable ni comillas externas en el valor.",
    });
  }
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw new ImportError("ORACLE_CONFIG_OBJECT", "COOPYA_ORACLE_CONFIG debe ser un objeto JSON.", { status: 503 });
  }
  const missing = ["user", "password", "connectString", "personTypeId", "personStatusId"].filter((key) => !nullableText(configuration[key]));
  if (missing.length) throw new ImportError("ORACLE_CONFIG_FIELDS", `Faltan campos en COOPYA_ORACLE_CONFIG: ${missing.join(", ")}.`, { status: 503 });
  for (const key of ["user", "password", "connectString"]) {
    if (typeof configuration[key] !== "string") throw new ImportError("ORACLE_CONFIG_TYPE", `${key} debe ser texto.`, { status: 503 });
  }
  const connection = configuration.connectString.trim();
  if (/^(?:tcp[s]?:\/\/)?(?:host|host-publico|localhost|127\.0\.0\.1)(?=[:/]|$)/i.test(connection) || /\/(?:servicio|service)$/.test(connection)) {
    throw new ImportError("ORACLE_CONNECTION_PLACEHOLDER", "connectString contiene un ejemplo o un servidor local; no apunta a tu Oracle real.", {
      status: 503, hint: "Reemplazá host:1521/servicio con el host, puerto y Service Name reales de Toad. Si tu conexión usa SID, usá un descriptor con (SID=...). El servidor debe ser alcanzable desde Vercel.",
    });
  }
  if (!connection.includes("/") && !/^\(DESCRIPTION\s*=/i.test(connection)) {
    throw new ImportError("ORACLE_LOCAL_ALIAS", "connectString parece un alias local de Toad, no una dirección de conexión completa.", { status: 503, hint: "Usá host:puerto/ServiceName o un descriptor Oracle completo. Vercel no tiene tu tnsnames.ora local." });
  }
  for (const key of ["personTypeId", "personStatusId", "providerId", "provinceId", "recordId", "postalCodeId"]) {
    if (nullableText(configuration[key]) === null) continue;
    const value = configuration[key];
    if (!["number", "string"].includes(typeof value) || !/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
      throw new ImportError("ORACLE_CONFIG_ID", `${key} debe ser un ID interno entero mayor a cero.`, { status: 503 });
    }
  }
  if (nullableText(configuration.userId)?.length > 10) throw new ImportError("ORACLE_CONFIG_USER_ID", "userId no puede superar 10 caracteres.", { status: 503 });
  return { ...configuration, connectString: connection };
}

export function validateOraclePerson(persona) {
  const problems = [];
  for (const key of ["TipoDoc", "NumeroDoc"]) {
    const value = persona[key];
    if (!["number", "string"].includes(typeof value) || !/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) problems.push(`${key} debe ser un entero positivo`);
  }
  for (const [key, limit] of Object.entries({ Apellido: 50, Nombre: 50, Calle: 50, NumeroCalle: 20, Piso: 5, Dpto: 5, Tel1_Numero: 40, Tel1_CodArea: 5, Observaciones: 100, Sexo: 1, NroEnte: 20, Mail: 50 })) {
    const value = persona[key];
    if (value != null && !["string", "number"].includes(typeof value)) problems.push(`${key} tiene un tipo inválido`);
    else if (nullableText(value)?.length > limit) problems.push(`${key} supera ${limit} caracteres`);
  }
  for (const key of ["Cuil", "Remuneracion"]) {
    if (nullableText(persona[key]) !== null && (!["string", "number"].includes(typeof persona[key]) || nullableNumber(persona[key]) === null || Number(persona[key]) < 0)) problems.push(`${key} debe ser numérico`);
  }
  for (const key of ["FechaNac", "fechaalta", "fechabaja"]) {
    const value = nullableText(persona[key]);
    if (!value) continue;
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) problems.push(`${key} debe ser una fecha válida YYYY-MM-DD`);
  }
  if (problems.length) throw new ImportError("PERSON_VALIDATION", `Revisá los campos antes de importar: ${problems.join("; ")}.`, { status: 422 });
}

export async function importPersonIntoOracle(persona, { env = process.env, configuration = readOracleConfiguration(env), onStage = () => {}, onWarning = () => {}, onDatabase = () => {}, driver } = {}) {
  validateOraclePerson(persona);
  onStage("driver_oracle");
  const oracledb = driver || (await import("oracledb")).default;

  let connection;

  try {
    onStage("conexion_oracle");
    connection = await oracledb.getConnection({
      user: configuration.user,
      password: configuration.password,
      connectString: configuration.connectString,
      connectTimeout: 15,
    });
    connection.callTimeout = 15000;
    onStage("identificacion_oracle");
    const identity = await connection.execute(`SELECT
      SYS_CONTEXT('USERENV', 'DB_NAME') AS "databaseName",
      SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS "serviceName",
      SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS "schema",
      SYS_CONTEXT('USERENV', 'SERVER_HOST') AS "serverHost"
      FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const database = identity.rows?.[0] || {};
    onDatabase(database);

    onStage("procedimiento_oracle");
    const result = await connection.execute(
      `BEGIN
        API_IMPORTAR_PERSONA(
          p_token => :p_token,
          p_tipo_doc => :p_tipo_doc,
          p_numero_doc => :p_numero_doc,
          p_cuil => :p_cuil,
          p_apellido => :p_apellido,
          p_nombre => :p_nombre,
          p_fecha_nac => :p_fecha_nac,
          p_calle => :p_calle,
          p_numero_calle => :p_numero_calle,
          p_piso => :p_piso,
          p_depto => :p_depto,
          p_id_codigo_postal => :p_id_codigo_postal,
          p_id_provincia => :p_id_provincia,
          p_telefono_numero => :p_telefono_numero,
          p_telefono_area => :p_telefono_area,
          p_telefono_observacion => :p_telefono_observacion,
          p_id_tipo_persona => :p_id_tipo_persona,
          p_id_estado_persona => :p_id_estado_persona,
          p_fecha_alta => :p_fecha_alta,
          p_fecha_baja => :p_fecha_baja,
          p_observacion => :p_observacion,
          p_sexo => :p_sexo,
          p_numero_ente => :p_numero_ente,
          p_id_prestador => :p_id_prestador,
          p_id_registro => :p_id_registro,
          p_id_usuario => :p_id_usuario,
          p_remuneracion => :p_remuneracion,
          p_mail => :p_mail,
          p_id_persona => :p_id_persona,
          p_operacion => :p_operacion
        );
      END;`,
      {
        p_token: env.COOPYA_IMPORT_TOKEN,
        p_tipo_doc: nullableNumber(persona.TipoDoc),
        p_numero_doc: nullableNumber(persona.NumeroDoc),
        p_cuil: nullableNumber(persona.Cuil),
        p_apellido: nullableText(persona.Apellido),
        p_nombre: nullableText(persona.Nombre),
        p_fecha_nac: nullableText(persona.FechaNac),
        p_calle: nullableText(persona.Calle),
        p_numero_calle: nullableText(persona.NumeroCalle),
        p_piso: nullableText(persona.Piso),
        p_depto: nullableText(persona.Dpto),
        p_id_codigo_postal: nullableNumber(configuration.postalCodeId),
        p_id_provincia: nullableNumber(configuration.provinceId),
        p_telefono_numero: nullableText(persona.Tel1_Numero),
        p_telefono_area: nullableText(persona.Tel1_CodArea),
        p_telefono_observacion: null,
        p_id_tipo_persona: nullableNumber(configuration.personTypeId),
        p_id_estado_persona: nullableNumber(configuration.personStatusId),
        p_fecha_alta: nullableText(persona.fechaalta),
        p_fecha_baja: nullableText(persona.fechabaja),
        p_observacion: nullableText(persona.Observaciones),
        p_sexo: nullableText(persona.Sexo),
        p_numero_ente: nullableText(persona.NroEnte),
        p_id_prestador: nullableNumber(configuration.providerId),
        p_id_registro: nullableNumber(configuration.recordId),
        p_id_usuario: nullableText(configuration.userId),
        p_remuneracion: nullableNumber(persona.Remuneracion),
        p_mail: nullableText(persona.Mail),
        p_id_persona: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        p_operacion: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20 },
      },
    );

    const idPersona = result.outBinds?.p_id_persona;
    const operacion = result.outBinds?.p_operacion;
    if (!Number.isSafeInteger(idPersona) || idPersona <= 0 || !["INSERCION", "ACTUALIZACION"].includes(operacion)) {
      throw new ImportError("ORACLE_OUTPUT_INVALID", "API_IMPORTAR_PERSONA terminó sin devolver IDPERSONA y operación válidos.", { hint: "Revisá los parámetros OUT del procedimiento y consultá PERSONA por DNI antes de reintentar." });
    }
    // The installed procedure commits internally; explicitly commit before read-back too.
    onStage("commit_oracle");
    await connection.commit();
    onStage("verificacion_oracle");
    const verification = await connection.execute(`SELECT IDPERSONA AS "idPersona" FROM PERSONA
      WHERE IDPERSONA = :idPersona AND IDDOCUMENTO_TIPO = :tipoDoc AND DOCUMENTO_NRO = :numeroDoc`,
    { idPersona, tipoDoc: Number(persona.TipoDoc), numeroDoc: Number(persona.NumeroDoc) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (verification.rows?.length !== 1 || verification.rows[0].idPersona !== idPersona) {
      throw new ImportError("ORACLE_READBACK_FAILED", "El procedimiento devolvió un ID, pero no se encontró esa persona con el DNI enviado en PERSONA.", { hint: "Revisá el esquema, la base y el procedimiento. La escritura puede haber sido confirmada; verificá antes de reintentar." });
    }
    return { confirmed: true, verified: true, idPersona, operacion, database };
  } finally {
    if (connection) {
      try { await connection.close(); } catch (error) { onWarning(error); }
    }
  }
}
