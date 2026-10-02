/* global process */
import { verifyAdminSession } from "../api/personas/_adminSession.js";
import { createDiagnostics, createRedactor, ImportError, technicalError } from "../api/personas/_diagnostics.js";
import { findPersonInProductionByDni, readProductionOracleConfiguration } from "../api/personas/_productionOracleImport.js";

// Exposed only by Vite's local middleware, never as a Vercel function.
export function createLocalPersonLookupHandler({ env = process.env, fetchImpl = fetch,
  findPerson = findPersonInProductionByDni, logger = console } = {}) {
  return async (request) => {
    const trace = createDiagnostics(request, env, logger);
    if (request.method !== "GET") return trace.reply({ ok: false, detail: "Método no permitido." }, 405);
    const authorization = request.headers.get("authorization");
    const redact = createRedactor(env, authorization);
    let authenticated = false;
    try {
      trace.stage("autenticacion");
      await verifyAdminSession(authorization, { env, fetchImpl });
      authenticated = true;
      const dni = new URL(request.url).searchParams.get("dni");
      if (dni) redact.addPerson({ NumeroDoc: dni });
      trace.stage("configuracion");
      const configuration = readProductionOracleConfiguration(env);
      const persona = await findPerson(dni, { env, configuration, onStage: (stage) => trace.stage(stage) });
      trace.stage("completado");
      return trace.reply({ ok: true, found: Boolean(persona), persona });
    } catch (error) {
      const technical = technicalError(error, redact);
      const status = error instanceof ImportError ? error.status : 502;
      const code = technical.codes[0] || "LOOKUP_FAILED";
      trace.log("error", "consulta_persona_fallida", { code, status, technical });
      return trace.reply({ ok: false,
        detail: authenticated ? redact.text(error.message || "Falló la consulta a Oracle.") : "Sesión de administrador inválida o no disponible.",
        code }, status);
    }
  };
}
