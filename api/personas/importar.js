/* global process */
import { readOrdsConfiguration, prepareOrdsPerson, importPersonViaOrds } from "./_ordsPersonImport.js";
import { createDiagnostics, createRedactor, errorHint, ImportError, technicalError } from "./_diagnostics.js";
import { IMPORT_SERVICE, IMPORT_VERSION, isOracleConfirmed } from "../../shared/personImportContract.js";

function candidatesUrl(env) {
  try {
    const url = new URL(env.COOPYA_CANDIDATES_API_URL || env.VITE_API_BASE_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    return url.href.replace(/\/$/, "");
  } catch {
    throw new ImportError("INVALID_API_URL", "VITE_API_BASE_URL (o COOPYA_CANDIDATES_API_URL) debe ser la URL HTTPS de solicitudes y autenticación.", { status: 503 });
  }
}

export function createImportHandler({ env = process.env, fetchImpl = fetch, oracleImport = importPersonViaOrds, logger = console } = {}) {
  return async function handle(request) {
    const trace = createDiagnostics(request, env, logger);
    if (request.method === "GET") return trace.reply({ service: IMPORT_SERVICE, version: IMPORT_VERSION, transport: "ords",
      message: "Backend de aceptación ORDS disponible. Requiere POST y sesión de administrador; este GET no prueba la conexión con Oracle." });
    if (request.method !== "POST") return trace.reply({ ok: false, detail: "Método no permitido." }, 405);

    const authorization = request.headers.get("authorization");
    const redact = createRedactor(env, authorization);
    const progress = { oracle: "no_iniciado" };
    let authenticated = false;
    try {
      trace.stage("autenticacion");
      if (!/^Bearer\s+\S+$/i.test(authorization || "")) throw new ImportError("ADMIN_SESSION_REQUIRED", "Sesión de administrador requerida.", { status: 401 });
      let sessionResponse;
      let session;
      try {
        sessionResponse = await fetchImpl(`${candidatesUrl(env)}/api/v1/auth/me`, {
          headers: { Authorization: authorization, Accept: "application/json" },
          signal: AbortSignal.timeout(15000), redirect: "error",
        });
        session = await sessionResponse.json();
      } catch (error) {
        if (error instanceof ImportError) throw error;
        throw new ImportError("ADMIN_SESSION_UNAVAILABLE", "No se pudo verificar la sesión de administrador.", { cause: error });
      }
      if (!sessionResponse.ok || session?.rol !== "admin") throw new ImportError("ADMIN_SESSION_REJECTED", "La sesión no es válida o no tiene permisos de administrador.", {
        status: sessionResponse.status === 401 ? 401 : 403, upstreamStatus: sessionResponse.status,
      });
      authenticated = true;

      trace.stage("configuracion");
      const configuration = readOrdsConfiguration(env);
      trace.stage("validacion");
      let body;
      try { body = await request.json(); } catch {
        throw new ImportError("INVALID_REQUEST_JSON", "La solicitud no contiene JSON válido.", { status: 400 });
      }
      if (!body?.persona || typeof body.persona !== "object" || Array.isArray(body.persona)) throw new ImportError("INVALID_PERSON", "La persona a importar es inválida.", { status: 400 });
      redact.addPerson(body.persona);
      const persona = prepareOrdsPerson(body.persona);

      progress.oracle = "sin_confirmar";
      const oracle = await oracleImport(persona, { env, configuration, fetchImpl, onStage: (stage) => trace.stage(stage) });
      if (!isOracleConfirmed(oracle)) throw new ImportError("ORACLE_NOT_CONFIRMED", "Oracle no devolvió una confirmación verificada.");
      progress.oracle = "confirmado";
      trace.stage("completado");
      trace.log("info", "importacion_confirmada", { progress, transport: "ords" });
      return trace.reply({ ok: true, oracle, diagnostics: trace.snapshot({ progress, transport: "ords", execution: configuration.execution }) });
    } catch (error) {
      const technical = technicalError(error, redact);
      const status = error instanceof ImportError ? error.status : 502;
      const code = technical.codes[0] || "IMPORT_FAILED";
      const stage = trace.snapshot().stage;
      const diagnostics = trace.snapshot({ code, httpStatus: status, upstreamStatus: error.upstreamStatus ?? null,
        progress, transport: "ords", technical, hint: redact.text(errorHint(error, technical.codes, stage)) });
      trace.log("error", "importacion_fallida", diagnostics);
      const detail = authenticated ? redact.text(error.message || "Falló la importación.")
        : status === 401 || status === 403 ? "Sesión de administrador inválida o sin permisos." : "No se pudo verificar la sesión de administrador.";
      return trace.reply({ ok: false, detail, diagnostics: authenticated ? diagnostics : trace.snapshot({ code, httpStatus: status }), oracle: { confirmed: false } }, status);
    }
  };
}

export default { fetch: createImportHandler() };
