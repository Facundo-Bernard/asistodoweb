/* global process */
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalPersonMiddleware } from "./localPersonImport.js";
import { productionOracleReadiness } from "../api/personas/_productionOracleImport.js";

export function createOfficePersonApiServer({ env = process.env, readiness = productionOracleReadiness } = {}) {
  if (env.COOPYA_IMPORT_TARGET !== "oracle_prod") {
    throw new Error("La API de la oficina requiere COOPYA_IMPORT_TARGET=oracle_prod.");
  }
  if (env.VERCEL === "1" || env.VERCEL_ENV) {
    throw new Error("La API de la oficina no puede ejecutarse en Vercel.");
  }
  const status = readiness(env);
  if (!status.ready) throw new Error(status.message);

  const middleware = createLocalPersonMiddleware(env);
  return createServer((req, res) => middleware(req, res, () => {
    res.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: false, detail: "Ruta no encontrada." }));
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createOfficePersonApiServer().listen(8788, "127.0.0.1", () => {
    console.info("API de personas de la oficina activa en 127.0.0.1:8788");
  });
}
