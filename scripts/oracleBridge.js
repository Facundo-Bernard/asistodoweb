/* global process, Buffer */
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { ImportError, createRedactor, technicalError } from "../api/personas/_diagnostics.js";
import { importPersonIntoProduction, readProductionOracleConfiguration,
  productionOracleReadiness } from "../api/personas/_productionOracleImport.js";

const MAX_BODY_BYTES = 128 * 1024;

function validToken(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createBridgeHandler({ env = process.env, productionImport = importPersonIntoProduction,
  logger = console } = {}) {
  return async (request) => {
    const pathname = new URL(request.url).pathname;
    if (request.method === "GET" && pathname === "/health") {
      return Response.json({ service: "asistodo-oracle-bridge", ...productionOracleReadiness(env) },
        { headers: { "Cache-Control": "no-store" } });
    }
    if (request.method !== "POST" || pathname !== "/personas") {
      return Response.json({ ok: false, detail: "Ruta no encontrada." }, { status: 404 });
    }
    if (!validToken(request.headers.get("x-import-token"), env.COOPYA_IMPORT_TOKEN)) {
      return Response.json({ ok: false, detail: "Acceso no autorizado." }, { status: 401 });
    }
    const redact = createRedactor(env, null);
    try {
      const configuration = readProductionOracleConfiguration(env);
      let persona;
      try { persona = await request.json(); } catch {
        throw new ImportError("INVALID_REQUEST_JSON", "La solicitud no contiene JSON válido.", { status: 400 });
      }
      if (!persona || typeof persona !== "object" || Array.isArray(persona)) {
        throw new ImportError("INVALID_PERSON", "La persona a importar es inválida.", { status: 400 });
      }
      redact.addPerson(persona);
      const oracle = await productionImport(persona, { env, configuration });
      logger.info(JSON.stringify({ event: "persona_confirmada", idPersona: oracle.idPersona, operacion: oracle.operacion }));
      return Response.json({ ok: true, oracle }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const technical = technicalError(error, redact);
      const status = error instanceof ImportError ? error.status : 502;
      logger.error(JSON.stringify({ event: "importacion_fallida", code: technical.codes[0] || "IMPORT_FAILED",
        status, technical }));
      return Response.json({ ok: false, detail: redact.text(error.message || "Falló la importación."),
        code: technical.codes[0] || "IMPORT_FAILED" }, { status, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export function createBridgeServer(options = {}) {
  const handle = createBridgeHandler(options);
  return createServer(async (req, res) => {
    try {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) {
          res.writeHead(413, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify({ ok: false, detail: "Solicitud demasiado grande." }));
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request(`http://127.0.0.1:8787${req.url || "/"}`, {
        method: req.method, headers: req.headers,
        ...(!["GET", "HEAD"].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch {
      res.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: false, detail: "Falló el puente local de Oracle." }));
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
  if (!env.COOPYA_IMPORT_TOKEN?.trim()) throw new Error("Falta COOPYA_IMPORT_TOKEN en .env");
  readProductionOracleConfiguration(env);
  createBridgeServer({ env }).listen(8787, "127.0.0.1", () => {
    console.info("Puente Oracle activo en 127.0.0.1:8787");
  });
}
