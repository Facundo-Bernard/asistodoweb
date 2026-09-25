/* global process */
import { randomUUID } from "node:crypto";
import { IMPORT_SERVICE, IMPORT_VERSION } from "../../shared/personImportContract.js";

export class ImportError extends Error {
  constructor(code, message, { status = 502, hint = "", upstreamStatus, cause } = {}) {
    super(message, { cause });
    this.code = code;
    this.status = status;
    this.hint = hint;
    this.upstreamStatus = upstreamStatus;
  }
}

// Never log an Axios error, a request body, binds, headers or an environment object.
export function createRedactor(env, authorization) {
  const secrets = new Set([env.COOPYA_IMPORT_TOKEN, authorization, authorization?.replace(/^Bearer\s+/i, "")].filter(Boolean));
  try {
    const config = JSON.parse(env.COOPYA_ORACLE_CONFIG || "{}");
    if (typeof config?.password === "string") secrets.add(config.password);
  } catch { /* Configuration validation reports invalid JSON without echoing it. */ }
  return {
    addPerson(persona) {
      for (const value of Object.values(persona || {})) {
        if ((typeof value === "string" || typeof value === "number") && String(value).length >= 3) secrets.add(String(value));
      }
    },
    text(value) {
      let message = String(value ?? "");
      for (const secret of [...secrets].filter(Boolean).sort((a, b) => b.length - a.length)) message = message.split(secret).join("[oculto]");
      return message
        .replace(/Bearer\s+\S+/gi, "Bearer [oculto]")
        .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[mail oculto]")
        .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, "[token oculto]")
        .replace(/((?:password|contrase[nñ]a|token)\s*[=:]\s*)[^\s,;]+/gi, "$1[oculto]")
        .replace(/\b\d{7,}\b/g, "[número oculto]")
        .slice(0, 2000);
    },
  };
}

export function technicalError(error, redact) {
  const messages = [];
  const codes = new Set();
  const seen = new Set();
  let current = error;
  while (current && !seen.has(current) && seen.size < 5) {
    seen.add(current);
    if (typeof current.code === "string" && /^[A-Z][A-Z0-9_-]{1,60}$/.test(current.code)) codes.add(current.code);
    for (const code of String(current.message || "").match(/\b(?:ORA|NJS|DPI|PLS)-\d+\b/g) || []) codes.add(code);
    if (current.message) messages.push(redact.text(current.message));
    current = current.cause;
  }
  return { codes: [...codes], messages: [...new Set(messages)],
    errorNum: Number.isFinite(error?.errorNum) ? error.errorNum : null,
    offset: Number.isFinite(error?.offset) ? error.offset : null };
}

export function errorHint(error, codes, stage) {
  if (error.hint) return error.hint;
  const all = codes.join(" ");
  if (/ORA-20001/.test(all)) return "El procedimiento rechazó el token. Revisá la credencial PERSONAS_IMPORT y ACTIVO en la misma base.";
  if (/ORA-01017/.test(all)) return "Oracle rechazó el usuario o la contraseña de COOPYA_ORACLE_CONFIG.";
  if (/ORA-28000/.test(all)) return "La cuenta Oracle está bloqueada; debe desbloquearla el administrador de la base.";
  if (/ORA-12514|ORA-12505|NJS-518/.test(all)) return "El listener no reconoce el servicio o SID. Copiá la configuración real de Toad.";
  if (/ENOTFOUND|EAI_AGAIN|ORA-12154/.test(all)) return "El servidor no pudo resolver el host o alias de Oracle. Un alias local de Toad no alcanza en Vercel.";
  if (/NJS-138/.test(all)) return "La base no es compatible con Thin. Oracle 11g necesita un servicio con Oracle Client (modo Thick).";
  if (/ORA-06550|PLS-00201|PLS-00905|ORA-04063|ORA-06508/.test(all)) return "Revisá el esquema, los permisos y USER_ERRORS de API_IMPORTAR_PERSONA; el procedimiento puede estar ausente o inválido.";
  if (/ORA-02291/.test(all)) return "Un ID interno no existe en su tabla de referencia. Verificá tipo, estado, prestador, provincia y sexo.";
  if (/ORA-12899|ORA-01400/.test(all)) return "Un campo supera el tamaño permitido o falta un valor requerido. El detalle indica la columna.";
  if (/ORA-00001/.test(all)) return "Hay una clave duplicada. Verificá DNI y la secuencia IDPERSONA antes de reintentar.";
  if (/TIMEOUT|ETIMEDOUT|ECONNREFUSED|NJS-5\d\d|ORA-12170|ORA-12541/.test(all)) return "Revisá host, puerto, listener y acceso de red desde Vercel. Si se cortó durante la escritura, comprobá la tabla antes de reintentar.";
  if (stage === "coopya") return "Revisá el detalle del rechazo de Coopya: token, campos y plan seleccionado. Oracle todavía no fue ejecutado.";
  return "Buscá el identificador del intento en los logs de Vercel para revisar la etapa indicada.";
}

export function createDiagnostics(request, env = process.env, logger = console) {
  const suppliedId = request.headers.get("x-request-id") || "";
  const requestId = /^[0-9a-f-]{36}$/i.test(suppliedId) ? suppliedId : randomUUID();
  const started = Date.now();
  const events = [];
  let stage = "solicitud";
  const base = { requestId, service: IMPORT_SERVICE, version: IMPORT_VERSION, deployment: (env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 12) };
  return {
    stage(next) {
      stage = next;
      const event = { stage, elapsedMs: Date.now() - started };
      events.push(event);
      logger.info(JSON.stringify({ ...base, event: "etapa", ...event }));
    },
    snapshot(extra = {}) { return { ...base, stage, elapsedMs: Date.now() - started, events: [...events], ...extra }; },
    log(level, event, details = {}) { logger[level](JSON.stringify({ ...base, event, stage, elapsedMs: Date.now() - started, ...details })); },
    reply(body, status = 200) {
      return Response.json(body, { status, headers: {
        "Cache-Control": "no-store", "X-Request-Id": requestId,
        "X-Import-Service": IMPORT_SERVICE, "X-Import-Version": IMPORT_VERSION, "Allow": "GET, POST",
      } });
    },
  };
}
