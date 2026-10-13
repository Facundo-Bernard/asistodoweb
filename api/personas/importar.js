/* global process */
import { readOrdsConfiguration, prepareOrdsPerson, importPersonViaOrds } from "./_ordsPersonImport.js";
import { readProductionOracleConfiguration, productionOracleReadiness, importPersonIntoProduction,
  readProductionBridgeConfiguration, productionBridgeReadiness, importPersonViaProductionBridge } from "./_productionOracleImport.js";
import { createDiagnostics, createRedactor, errorHint, ImportError, technicalError } from "./_diagnostics.js";
import { verifyAdminSession } from "./_adminSession.js";
import { IMPORT_SERVICE, IMPORT_VERSION, isOracleConfirmed } from "../../shared/personImportContract.js";

export function createImportHandler({ env = process.env, fetchImpl = fetch, oracleImport = importPersonViaOrds,
  productionImport = importPersonIntoProduction, bridgeImport = importPersonViaProductionBridge,
  localExecution = false, logger = console } = {}) {
  const target = env.COOPYA_IMPORT_TARGET === "oracle_prod" ? "oracle_prod" : "ords";
  const hosted = !localExecution && (env.VERCEL === "1" || Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production");
  return async function handle(request) {
    const trace = createDiagnostics(request, env, logger);
    if (request.method === "GET") {
      const readiness = target === "oracle_prod" ? hosted ? productionBridgeReadiness(env) : productionOracleReadiness(env) : null;
      return trace.reply({ service: IMPORT_SERVICE, version: IMPORT_VERSION, transport: target,
        ...(readiness ? { ready: readiness.ready, configurationMessage: readiness.message } : {}),
        message: "Backend de aceptación disponible. Requiere POST y sesión de administrador; este GET no prueba la conexión con Oracle." });
    }
    if (request.method !== "POST") return trace.reply({ ok: false, detail: "Método no permitido." }, 405);

    const authorization = request.headers.get("authorization");
    const redact = createRedactor(env, authorization);
    const progress = { oracle: "no_iniciado" };
    let authenticated = false;
    try {
      trace.stage("autenticacion");
      await verifyAdminSession(authorization, { env, fetchImpl });
      authenticated = true;

      trace.stage("configuracion");
      const configuration = target === "oracle_prod"
        ? hosted ? readProductionBridgeConfiguration(env) : readProductionOracleConfiguration(env)
        : readOrdsConfiguration(env);
      trace.stage("validacion");
      let body;
      try { body = await request.json(); } catch {
        throw new ImportError("INVALID_REQUEST_JSON", "La solicitud no contiene JSON válido.", { status: 400 });
      }
      if (!body?.persona || typeof body.persona !== "object" || Array.isArray(body.persona)) throw new ImportError("INVALID_PERSON", "La persona a importar es inválida.", { status: 400 });
      redact.addPerson(body.persona);
      const persona = prepareOrdsPerson(body.persona);

      progress.oracle = "sin_confirmar";
      const oracle = target === "oracle_prod"
        ? hosted
          ? await bridgeImport(persona, { env, configuration, fetchImpl, onStage: (stage) => trace.stage(stage) })
          : await productionImport(persona, { env, configuration, onStage: (stage) => trace.stage(stage) })
        : await oracleImport(persona, { env, configuration, fetchImpl, onStage: (stage) => trace.stage(stage) });
      if (!isOracleConfirmed(oracle)) throw new ImportError("ORACLE_NOT_CONFIRMED", "Oracle no devolvió una confirmación verificada.");
      progress.oracle = "confirmado";
      trace.stage("completado");
      trace.log("info", "importacion_confirmada", { progress, transport: target });
      return trace.reply({ ok: true, oracle, diagnostics: trace.snapshot({ progress, transport: target, execution: configuration.execution }) });
    } catch (error) {
      const technical = technicalError(error, redact);
      const status = error instanceof ImportError ? error.status : 502;
      const code = technical.codes[0] || "IMPORT_FAILED";
      const stage = trace.snapshot().stage;
      const diagnostics = trace.snapshot({ code, httpStatus: status, upstreamStatus: error.upstreamStatus ?? null,
        progress, transport: target, technical, hint: redact.text(errorHint(error, technical.codes, stage)) });
      trace.log("error", "importacion_fallida", diagnostics);
      const detail = authenticated ? redact.text(error.message || "Falló la importación.")
        : status === 401 || status === 403 ? "Sesión de administrador inválida o sin permisos." : "No se pudo verificar la sesión de administrador.";
      return trace.reply({ ok: false, detail, diagnostics: authenticated ? diagnostics : trace.snapshot({ code, httpStatus: status }), oracle: { confirmed: false } }, status);
    }
  };
}

export default { fetch: createImportHandler() };
