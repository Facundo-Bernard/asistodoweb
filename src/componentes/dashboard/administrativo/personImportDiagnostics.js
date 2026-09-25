import { IMPORT_SERVICE, IMPORT_VERSION, isOracleConfirmed } from "../../../../shared/personImportContract.js";

function responseDiagnostic(response, requestId) {
  const data = response?.data;
  const fromImportService = response?.headers?.["x-import-service"] === IMPORT_SERVICE
    && data?.diagnostics?.service === IMPORT_SERVICE;
  const trace = fromImportService ? data.diagnostics : {};
  return {
    requestId: trace.requestId || requestId,
    endpoint: "/api/personas/importar",
    httpStatus: response?.status ?? null,
    contentType: response?.headers?.["content-type"] || "sin respuesta",
    vercelRequestId: response?.headers?.["x-vercel-id"] || null,
    service: response?.headers?.["x-import-service"] || null,
    responseShape: {
      jsonObject: data !== null && typeof data === "object" && !Array.isArray(data),
      ok: typeof data?.ok === "boolean" ? data.ok : null,
      hasOracle: Boolean(data?.oracle),
      hasErrors: Array.isArray(data?.errores) && data.errores.length > 0,
      hasDetail: typeof data?.detail === "string",
    },
    expectedVersion: IMPORT_VERSION,
    serverVersion: response?.headers?.["x-import-version"] || null,
    deployment: trace.deployment || null,
    stage: trace.stage || "respuesta_http",
    code: trace.code || "INVALID_IMPORT_RESPONSE",
    upstreamStatus: trace.upstreamStatus ?? null,
    progress: trace.progress || null,
    database: trace.database || null,
    technical: trace.technical || null,
    hint: trace.hint || "Revisá que /api/personas/importar se ejecute como función en el mismo dominio del panel.",
    events: trace.events || [],
    // Only our authenticated server is allowed to supply error text for display/logging.
    detail: fromImportService && typeof data.detail === "string" ? data.detail : null,
  };
}

export function logImportDiagnostic(diagnostic, logger = console) {
  logger.groupCollapsed(`[Aceptación ${diagnostic.requestId}] ${diagnostic.code} · ${diagnostic.stage}`);
  logger.error(diagnostic.detail || "Falló la aceptación.");
  logger.table([{
    intento: diagnostic.requestId, etapa: diagnostic.stage, codigo: diagnostic.code,
    http: diagnostic.httpStatus, httpExterno: diagnostic.upstreamStatus,
    servidor: diagnostic.serverVersion, versionEsperada: diagnostic.expectedVersion,
    deploy: diagnostic.deployment, tipoRespuesta: diagnostic.contentType,
  }]);
  logger.log("Diagnóstico para soporte:", JSON.stringify(diagnostic, null, 2));
  if (diagnostic.events.length) logger.table(diagnostic.events);
  logger.info("Qué revisar:", diagnostic.hint);
  logger.groupEnd();
}

export function preparationDiagnostic(error, stage, requestId) {
  const diagnostic = responseDiagnostic(error.response, requestId);
  diagnostic.stage = stage;
  diagnostic.code = stage === "cargar_solicitud" ? "CANDIDATE_READ_FAILED" : "PERSON_MAPPING_FAILED";
  diagnostic.detail = stage === "cargar_solicitud"
    ? "No se pudieron cargar los datos completos de la solicitud. La importación no fue enviada."
    : "No se pudieron preparar los datos o identificar el plan de la solicitud. La importación no fue enviada.";
  diagnostic.hint = stage === "cargar_solicitud"
    ? "Revisá la sesión y el estado HTTP de la API de solicitudes."
    : "Revisá productoSeleccionado y su correspondencia con los planes configurados.";
  return diagnostic;
}

export async function sendPersonImport(client, endpoint, persona, { logger = console, requestId = crypto.randomUUID() } = {}) {
  logger.info(`[Aceptación ${requestId}] Iniciando POST ${endpoint}. Versión ${IMPORT_VERSION}.`);
  let response;
  try {
    response = await client.post(endpoint, { persona }, {
      headers: { "X-Request-Id": requestId }, timeout: 115000,
    });
  } catch (error) {
    const diagnostic = responseDiagnostic(error.response, requestId);
    if (!error.response) {
      diagnostic.code = error.code === "ECONNABORTED" ? "BROWSER_TIMEOUT" : "NETWORK_ERROR";
      diagnostic.stage = "red_navegador";
      diagnostic.detail = "No se recibió respuesta del servidor. El resultado de la importación es desconocido.";
      diagnostic.hint = "Revisá Network y los logs de Vercel con este identificador. No reintentes sin comprobar si hubo una escritura.";
    } else if (!diagnostic.detail) {
      diagnostic.detail = `La ruta de aceptación respondió HTTP ${error.response.status} sin un diagnóstico del servicio de importación.`;
    }
    return fail(diagnostic, logger);
  }

  const diagnostic = responseDiagnostic(response, requestId);
  const data = response.data;
  if (diagnostic.service !== IMPORT_SERVICE || diagnostic.serverVersion !== IMPORT_VERSION || data?.diagnostics?.service !== IMPORT_SERVICE) {
    diagnostic.code = "IMPORT_CONTRACT_MISMATCH";
    diagnostic.detail = `La ruta de aceptación respondió HTTP ${response.status} (${diagnostic.contentType}) sin el contrato esperado de importación.`;
    diagnostic.hint = "Comprobá la función publicada y su versión. Si recibiste HTML, la ruta está devolviendo la web; si recibiste otro JSON, revisá el endpoint o el deploy. Esto no confirma una escritura Oracle.";
    return fail(diagnostic, logger);
  }
  if (data.ok !== true || !isOracleConfirmed(data.oracle)) {
    diagnostic.code = data.ok === false ? diagnostic.code : "ORACLE_NOT_CONFIRMED";
    diagnostic.detail ||= "El servidor no confirmó que la persona exista en PERSONA. La solicitud sigue pendiente.";
    return fail(diagnostic, logger);
  }
  logger.info(`[Aceptación ${requestId}] Confirmada y verificada en PERSONA.`, {
    idPersona: data.oracle.idPersona, operacion: data.oracle.operacion, database: data.oracle.database,
  });
  return data;
}

function fail(diagnostic, logger) {
  logImportDiagnostic(diagnostic, logger);
  const error = new Error(`${diagnostic.detail} [${diagnostic.code}; etapa: ${diagnostic.stage}; intento: ${diagnostic.requestId}]`);
  error.diagnostic = diagnostic;
  throw error;
}
