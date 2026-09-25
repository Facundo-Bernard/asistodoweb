/* global process */
import { readOracleConfiguration, validateOraclePerson, importPersonIntoOracle } from "./_oraclePersonImport.js";
import { createDiagnostics, createRedactor, errorHint, ImportError, technicalError } from "./_diagnostics.js";
import { IMPORT_SERVICE, IMPORT_VERSION, isOracleConfirmed } from "../../shared/personImportContract.js";

const DEFAULT_IMPORT_URL = "https://test.coopya.com.ar/Personas/ImportarPersonasApi";
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function configuredUrl(value, name) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    return url.href.replace(/\/$/, "");
  } catch {
    throw new ImportError("INVALID_API_URL", `${name} debe contener una URL HTTPS válida.`, { status: 503 });
  }
}

async function fetchJson(fetchImpl, url, options, stage) {
  let response;
  try {
    response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(20000), redirect: "error" });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      throw new ImportError("UPSTREAM_NOT_JSON", `${stage} respondió HTTP ${response.status} con ${contentType || "tipo desconocido"}, no JSON.`, { upstreamStatus: response.status });
    }
    return { response, data: await response.json() };
  } catch (error) {
    if (error instanceof ImportError) throw error;
    const timeout = error.name === "TimeoutError" || error.name === "AbortError";
    throw new ImportError(timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_REQUEST_FAILED", `Falló la comunicación con ${stage}.`, {
      status: timeout ? 504 : 502, upstreamStatus: response?.status, cause: error,
      hint: timeout ? "Se agotó el tiempo de espera. Si ocurrió durante Coopya, verificá el resultado allí antes de reintentar." : "Revisá los códigos técnicos, la URL del servicio y la conectividad desde Vercel.",
    });
  }
}

function rejectionDetail(result) {
  const messages = [result?.detail, result?.message];
  for (const item of Array.isArray(result?.errores) ? result.errores : []) {
    messages.push(typeof item === "string" ? item : item?.message || item?.mensaje || item?.motivo || item?.detail);
  }
  for (const item of Array.isArray(result?.resultados) ? result.resultados : []) {
    if (item?.motivo) messages.push(item.motivo);
  }
  return messages.filter((value) => typeof value === "string" && value.trim()).slice(0, 5).join(" | ");
}

export function createImportHandler({ env = process.env, fetchImpl = fetch, oracleImport = importPersonIntoOracle, logger = console } = {}) {
  return async function handle(request) {
    const trace = createDiagnostics(request, env, logger);
    if (request.method === "GET") {
      return trace.reply({ service: IMPORT_SERVICE, version: IMPORT_VERSION, message: "Endpoint de aceptación disponible. Requiere POST y sesión de administrador; esto no prueba la conexión Oracle." });
    }
    if (request.method !== "POST") return trace.reply({ ok: false, detail: "Método no permitido." }, 405);

    const authorization = request.headers.get("authorization");
    const redact = createRedactor(env, authorization);
    const progress = { coopya: "no_iniciado", oracle: "no_iniciado" };
    let database;
    let authenticated = false;
    try {
      trace.stage("autenticacion");
      if (!/^Bearer\s+\S+$/i.test(authorization || "")) {
        throw new ImportError("ADMIN_SESSION_REQUIRED", "Sesión de administrador requerida.", { status: 401 });
      }
      const candidatesUrl = configuredUrl(env.COOPYA_CANDIDATES_API_URL || env.VITE_API_BASE_URL, "COOPYA_CANDIDATES_API_URL o VITE_API_BASE_URL");
      const { response: sessionResponse, data: session } = await fetchJson(fetchImpl, `${candidatesUrl}/api/v1/auth/me`, {
        headers: { Authorization: authorization, Accept: "application/json" },
      }, "autenticación");
      if (!sessionResponse.ok || session?.rol !== "admin") {
        throw new ImportError("ADMIN_SESSION_REJECTED", "La sesión no es válida o no tiene permisos de administrador.", { status: sessionResponse.status === 401 ? 401 : 403, upstreamStatus: sessionResponse.status });
      }
      authenticated = true;

      trace.stage("configuracion");
      const configuration = readOracleConfiguration(env);
      const importUrl = configuredUrl(env.COOPYA_PERSONAS_IMPORT_URL || DEFAULT_IMPORT_URL, "COOPYA_PERSONAS_IMPORT_URL");

      trace.stage("validacion");
      let body;
      try { body = await request.json(); } catch {
        throw new ImportError("INVALID_REQUEST_JSON", "La solicitud no contiene JSON válido.", { status: 400 });
      }
      if (!isObject(body?.persona)) throw new ImportError("INVALID_PERSON", "La persona a importar es inválida.", { status: 400 });
      redact.addPerson(body.persona);
      validateOraclePerson(body.persona);

      trace.stage("coopya");
      progress.coopya = "sin_confirmar";
      const { response: importResponse, data: result } = await fetchJson(fetchImpl, importUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ token: env.COOPYA_IMPORT_TOKEN, personas: [body.persona] }),
      }, "Coopya");
      const hasErrors = Array.isArray(result?.errores) && result.errores.length > 0;
      const hasRejections = Number(result?.rechazados) > 0 || (Array.isArray(result?.resultados) && result.resultados.some((item) => item?.operacion === "RECHAZADO"));
      if (!importResponse.ok || !isObject(result) || result.ok !== true || hasErrors || hasRejections) {
        progress.coopya = "rechazado";
        throw new ImportError("COOPYA_REJECTED", `Coopya no confirmó la importación (HTTP ${importResponse.status}). ${rejectionDetail(result) || "La respuesta indica error o tiene un formato inesperado."}`, {
          status: 502, upstreamStatus: importResponse.status,
          hint: "Oracle no fue ejecutado. Revisá el rechazo de Coopya, incluido el token y los IDs de servicio/plan. HTTP 200 por sí solo no significa aceptación.",
        });
      }
      const confirmedCount = [result.insertados, result.actualizados, result.sinCambios]
        .reduce((sum, count) => sum + (Number.isSafeInteger(count) && count > 0 ? count : 0), 0);
      const confirmedResult = Array.isArray(result.resultados) && result.resultados.some((item) =>
        ["INSERCION", "ACTUALIZACION", "SIN_CAMBIOS", "SIN CAMBIOS"].includes(item?.operacion));
      if (!confirmedCount && !confirmedResult) {
        throw new ImportError("COOPYA_RESPONSE_INCOMPLETE", "Coopya devolvió ok, pero no confirmó ninguna persona insertada, actualizada o sin cambios.", {
          upstreamStatus: importResponse.status, hint: "La importación en Coopya quedó sin confirmar. Revisá la respuesta del servicio antes de reintentar. Oracle no fue ejecutado.",
        });
      }
      progress.coopya = "confirmado";

      trace.stage("conexion_oracle");
      progress.oracle = "sin_confirmar";
      const oracle = await oracleImport(body.persona, {
        env, configuration,
        onStage: (stage) => trace.stage(stage),
        onDatabase: (value) => { database = value; },
        onWarning: (error) => trace.log("warn", "cierre_oracle", { technical: technicalError(error, redact) }),
      });
      if (!isOracleConfirmed(oracle)) throw new ImportError("ORACLE_NOT_CONFIRMED", "Oracle no devolvió una confirmación verificada.");
      progress.oracle = "confirmado";
      trace.stage("completado");
      trace.log("info", "importacion_confirmada", { progress });
      return trace.reply({ ok: true, oracle, diagnostics: trace.snapshot({ progress, database }) });
    } catch (error) {
      const technical = technicalError(error, redact);
      const status = error instanceof ImportError ? error.status : 502;
      const code = technical.codes[0] || "IMPORT_FAILED";
      const stage = trace.snapshot().stage;
      const diagnostics = trace.snapshot({ code, httpStatus: status, upstreamStatus: error.upstreamStatus ?? null,
        progress, database, technical, hint: redact.text(errorHint(error, technical.codes, stage)) });
      trace.log("error", "importacion_fallida", diagnostics);
      const detail = authenticated
        ? `${progress.coopya === "confirmado" ? "Coopya confirmó la importación. " : ""}${redact.text(error.message || "Falló la importación.")}`
        : (status === 401 || status === 403 ? "Sesión de administrador inválida o sin permisos." : "No se pudo verificar la sesión de administrador.");
      return trace.reply({ ok: false, detail, diagnostics: authenticated ? diagnostics : trace.snapshot({ code, httpStatus: status }),
        oracle: { confirmed: false } }, status);
    }
  };
}

export default { fetch: createImportHandler() };
