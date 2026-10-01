/* global process */
import path from "node:path";
import { existsSync } from "node:fs";
import { ImportError } from "./_diagnostics.js";
import { isPrivateHost, prepareOrdsPerson } from "./_ordsPersonImport.js";
import { isOracleConfirmed } from "../../shared/personImportContract.js";

const PRODUCTION_DSN = "172.17.1.3:1521/orcl";
const PRODUCTION_CLIENT = path.resolve(".oracle-client", "instantclient_19_24");

// These IDs were checked against the production catalogues on 2026-10-01.
const PERSON_TYPE_ID = 3;
const PERSON_STATUS_ID = 1;
const PROVIDER_ID = 75;

export function readProductionOracleConfiguration(env = process.env) {
  if (env.VERCEL === "1" || env.VERCEL_ENV) {
    throw new ImportError("PRODUCTION_ORACLE_LOCAL_ONLY", "La importación directa a Oracle de producción solo funciona desde el servidor local de la oficina.", { status: 503 });
  }
  let config;
  try { config = JSON.parse(env.COOPYA_ORACLE_PROD_CONFIG || "null"); } catch {
    throw new ImportError("PRODUCTION_ORACLE_CONFIG_INVALID", "COOPYA_ORACLE_PROD_CONFIG no contiene JSON válido.", { status: 503 });
  }
  if (!config || typeof config !== "object" || Array.isArray(config)
      || typeof config.user !== "string" || !config.user.trim()
      || typeof config.password !== "string" || !config.password
      || typeof config.connectString !== "string") {
    throw new ImportError("PRODUCTION_ORACLE_CONFIG_MISSING", "Falta configurar la cuenta de escritura en COOPYA_ORACLE_PROD_CONFIG. La cuenta del ZIP solo tiene permiso SELECT.", { status: 503 });
  }
  if (config.user.trim().toUpperCase() === "NMONTI") {
    throw new ImportError("PRODUCTION_ORACLE_READ_ONLY", "NMONTI es la cuenta de consulta del ZIP y no puede insertar personas.", { status: 503 });
  }
  if (config.connectString.trim().toLowerCase() !== PRODUCTION_DSN) {
    throw new ImportError("PRODUCTION_ORACLE_TARGET_INVALID", "La conexión de escritura debe apuntar a 172.17.1.3:1521/orcl, la base de producción comprobada.", { status: 503 });
  }
  return { user: config.user.trim(), password: config.password, connectString: PRODUCTION_DSN,
    clientDir: PRODUCTION_CLIENT, execution: "local" };
}

export function productionOracleReadiness(env = process.env) {
  try {
    const config = readProductionOracleConfiguration(env);
    if (!existsSync(path.join(config.clientDir, "oci.dll"))) {
      return { ready: false, message: "Falta preparar Oracle Instant Client desde el ZIP." };
    }
    return { ready: true, message: "Configuración local de Oracle lista para probar." };
  } catch (error) {
    return { ready: false, message: error instanceof ImportError ? error.message : "La configuración de Oracle está incompleta." };
  }
}

export function readProductionBridgeConfiguration(env = process.env) {
  if (!env.COOPYA_IMPORT_TOKEN?.trim()) {
    throw new ImportError("PRODUCTION_BRIDGE_TOKEN_MISSING", "Falta COOPYA_IMPORT_TOKEN en Vercel.", { status: 503 });
  }
  let url;
  try {
    url = new URL(env.COOPYA_ORACLE_BRIDGE_URL || "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
        || !url.pathname.endsWith("/personas") || isPrivateHost(url.hostname)) throw new Error();
  } catch {
    throw new ImportError("PRODUCTION_BRIDGE_URL_INVALID", "COOPYA_ORACLE_BRIDGE_URL debe ser la URL HTTPS pública completa del puente, terminada en /personas.", { status: 503 });
  }
  return { url: url.href, execution: "desplegado" };
}

export function productionBridgeReadiness(env = process.env) {
  try {
    readProductionBridgeConfiguration(env);
    return { ready: true, message: "URL HTTPS del puente configurada; falta comprobar su conexión en vivo." };
  } catch (error) {
    return { ready: false, message: error instanceof ImportError ? error.message : "Falta configurar el puente de Oracle." };
  }
}

export async function importPersonViaProductionBridge(persona, { env = process.env,
  configuration = readProductionBridgeConfiguration(env), fetchImpl = fetch, onStage = () => {} } = {}) {
  const person = prepareOrdsPerson(persona);
  onStage("solicitud_puente_oracle");
  let response;
  try {
    response = await fetchImpl(configuration.url, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Import-Token": env.COOPYA_IMPORT_TOKEN },
      body: JSON.stringify(person),
    });
  } catch (error) {
    throw new ImportError("PRODUCTION_BRIDGE_UNAVAILABLE", "No se pudo llegar al puente HTTPS de Oracle. La escritura no está confirmada.", {
      cause: error, hint: "Comprobá que el puente de la oficina y su publicación HTTPS estén activos. Verificá PERSONA antes de reintentar.",
    });
  }
  onStage("respuesta_puente_oracle");
  let data;
  try {
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error();
    data = await response.json();
  } catch {
    throw new ImportError("PRODUCTION_BRIDGE_INVALID_RESPONSE", "El puente no devolvió un JSON válido. Verificá PERSONA antes de reintentar.", { upstreamStatus: response.status });
  }
  if (!response.ok || data?.ok !== true || !isOracleConfirmed(data.oracle)) {
    throw new ImportError("PRODUCTION_BRIDGE_NOT_CONFIRMED", typeof data?.detail === "string"
      ? data.detail.slice(0, 1000) : "El puente no confirmó la importación en Oracle de producción.", {
      status: response.ok ? 502 : response.status, upstreamStatus: response.status,
      hint: "Revisá el diagnóstico del puente y consultá PERSONA antes de reintentar.",
    });
  }
  return data.oracle;
}

const duplicateSql = `SELECT IDPERSONA AS "idPersona" FROM PRESTAPROD.PERSONA
  WHERE IDDOCUMENTO_TIPO = :tipoDoc AND DOCUMENTO_NRO = :numeroDoc AND ROWNUM <= 2`;

const insertSql = `INSERT INTO PRESTAPROD.PERSONA (
  IDPERSONA, IDDOCUMENTO_TIPO, DOCUMENTO_NRO, CUIL, APELLIDO, NOMBRE,
  FECHANACIMIENTO, CALLE, CALLE_NRO, PISO, DEPTO, IDCODIGOPOSTAL,
  IDPROVINCIA, TELEFONO_NRO, IDTIPOPERSONA, IDESTADOPERSONA, FECHAALTA,
  FECHABAJA, OBSERVACION, IDSEXO, NUMEROENTE, IDPRESTADOR, IDREGISTRO,
  IDUSUARIO, TELEFONO_AREA, TELEFONO_OBSERVACION, REMUNERACION, MAIL
) VALUES (
  PRESTAPROD.IDPERSONA.NEXTVAL, :tipoDoc, :numeroDoc, :cuil, :apellido, :nombre,
  TO_DATE(:fechaNac, 'FXYYYY-MM-DD'), :calle, :numeroCalle, :piso, :dpto,
  :codigoPostal, :provincia, :telefono, :tipoPersona, :estadoPersona, SYSDATE,
  NULL, :observacion, :sexo, :numeroEnte, :prestador, NULL, NULL,
  :area, NULL, :remuneracion, :mail
) RETURNING IDPERSONA INTO :idPersona`;

const readbackSql = `SELECT IDPERSONA AS "idPersona", NOMBRE AS "nombre", APELLIDO AS "apellido"
  FROM PRESTAPROD.PERSONA
  WHERE IDPERSONA = :idPersona AND IDDOCUMENTO_TIPO = :tipoDoc AND DOCUMENTO_NRO = :numeroDoc`;

export async function importPersonIntoProduction(persona, { env = process.env,
  configuration = readProductionOracleConfiguration(env), driver,
  onStage = () => {}, onDatabase = () => {}, onWarning = () => {} } = {}) {
  const person = prepareOrdsPerson(persona);
  if (!driver && !existsSync(path.join(configuration.clientDir, "oci.dll"))) {
    throw new ImportError("PRODUCTION_ORACLE_CLIENT_MISSING", "Falta Oracle Instant Client del ZIP en .oracle-client/instantclient_19_24.", { status: 503 });
  }
  onStage("driver_oracle");
  const oracledb = driver || (await import("oracledb")).default;
  if (oracledb.thin) oracledb.initOracleClient({ libDir: configuration.clientDir });
  if (oracledb.thin) throw new ImportError("PRODUCTION_ORACLE_THIN_MODE", "Oracle 11g requiere el cliente Oracle del ZIP en modo Thick.", { status: 503 });

  let connection;
  let verificationConnection;
  let committed = false;
  try {
    onStage("conexion_oracle");
    connection = await oracledb.getConnection({ user: configuration.user, password: configuration.password,
      connectString: configuration.connectString, connectTimeout: 15 });
    connection.callTimeout = 20000;
    const identity = await connection.execute(`SELECT USER AS "userName",
      SYS_CONTEXT('USERENV', 'DB_NAME') AS "databaseName",
      SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS "serviceName" FROM DUAL`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const database = identity.rows?.[0] || {};
    if (String(database.databaseName).toLowerCase() !== "orcl" || String(database.serviceName).toLowerCase() !== "orcl"
        || String(database.userName).toUpperCase() !== configuration.user.toUpperCase()) {
      throw new ImportError("PRODUCTION_ORACLE_IDENTITY_MISMATCH", "La conexión no identificó la base y cuenta de producción esperadas.", { status: 503 });
    }
    onDatabase(database);

    onStage("busqueda_duplicado");
    const key = { tipoDoc: Number(person.TipoDoc), numeroDoc: Number(person.NumeroDoc) };
    const existing = await connection.execute(duplicateSql, key, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (existing.rows?.length) {
      throw new ImportError("PRODUCTION_PERSON_EXISTS", "Este documento ya existe en PERSONA de producción. No se creó ni modificó el registro.", {
        status: 409, hint: "Consultá el registro existente antes de decidir cómo continuar con la solicitud.",
      });
    }

    onStage("insercion_oracle");
    const result = await connection.execute(insertSql, {
      ...key, cuil: person.Cuil, apellido: person.Apellido, nombre: person.Nombre,
      fechaNac: person.FechaNac, calle: person.Calle, numeroCalle: person.NumeroCalle,
      piso: person.Piso, dpto: person.Dpto, codigoPostal: person.IdCodigoPostal,
      provincia: person.IdProvincia, telefono: person.Tel1_Numero,
      tipoPersona: PERSON_TYPE_ID, estadoPersona: PERSON_STATUS_ID,
      observacion: person.Observaciones, sexo: person.Sexo, numeroEnte: person.NroEnte,
      prestador: PROVIDER_ID, area: person.Tel1_CodArea,
      remuneracion: person.Remuneracion, mail: person.Mail,
      idPersona: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }, { autoCommit: false });
    const idPersona = result.outBinds?.idPersona?.[0];
    if (!Number.isSafeInteger(idPersona) || idPersona <= 0 || result.rowsAffected !== 1) {
      throw new ImportError("PRODUCTION_ORACLE_OUTPUT_INVALID", "Oracle no devolvió un IDPERSONA válido; se canceló la transacción.");
    }
    onStage("commit_oracle");
    await connection.commit();
    committed = true;

    onStage("verificacion_oracle");
    verificationConnection = await oracledb.getConnection({ user: configuration.user, password: configuration.password,
      connectString: configuration.connectString, connectTimeout: 15 });
    const readback = await verificationConnection.execute(readbackSql, { ...key, idPersona }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const row = readback.rows?.[0];
    if (readback.rows?.length !== 1 || row.idPersona !== idPersona
        || row.nombre !== person.Nombre || row.apellido !== person.Apellido) {
      throw new ImportError("PRODUCTION_ORACLE_READBACK_FAILED", "La escritura pudo haberse confirmado, pero la consulta posterior no encontró la persona con los mismos datos. Revisá PERSONA antes de reintentar.");
    }
    return { confirmed: true, verified: true, idPersona, operacion: "INSERCION",
      database: { databaseName: database.databaseName, serviceName: database.serviceName } };
  } catch (error) {
    if (connection && !committed) {
      try { await connection.rollback(); } catch (rollbackError) { onWarning(rollbackError); }
    }
    throw error;
  } finally {
    for (const openConnection of [verificationConnection, connection]) {
      if (openConnection) try { await openConnection.close(); } catch (closeError) { onWarning(closeError); }
    }
  }
}
