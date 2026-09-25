/* global process */
import { ImportError } from "./_diagnostics.js";
import { isOracleConfirmed } from "../../shared/personImportContract.js";
import { validateOraclePerson } from "./_personValidation.js";

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "[::1]"
      || /^\[f[cd]/.test(host) || /^\[fe[89ab]/.test(host)) return true;
  const parts = host.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    && (parts[0] === 10 || parts[0] === 127 || parts[0] === 0
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 169 && parts[1] === 254));
}

export function readOrdsConfiguration(env = process.env) {
  if (!env.COOPYA_IMPORT_TOKEN?.trim()) throw new ImportError("IMPORT_TOKEN_MISSING", "Falta COOPYA_IMPORT_TOKEN en el servidor.", { status: 503 });
  if (!env.COOPYA_ORDS_URL?.trim()) throw new ImportError("ORDS_URL_MISSING", "Falta COOPYA_ORDS_URL. La aceptación ahora utiliza la API ORDS de Linux.", {
    status: 503, hint: "Local: http://172.17.1.4:8080/ords/prestaprod/asistodo/personas. En Vercel: la URL HTTPS publicada de esa API. COOPYA_ORACLE_CONFIG ya no se usa.",
  });
  let url;
  try {
    url = new URL(env.COOPYA_ORDS_URL.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash
        || !url.pathname.endsWith("/personas")) throw new Error();
  } catch {
    throw new ImportError("ORDS_URL_INVALID", "COOPYA_ORDS_URL debe ser la URL completa del endpoint /personas, sin credenciales ni parámetros.", { status: 503 });
  }
  const hosted = env.VERCEL === "1" || Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production";
  const privateHost = isPrivateHost(url.hostname);
  if (hosted && privateHost) throw new ImportError("ORDS_PRIVATE_NETWORK", "El backend desplegado no puede usar la IP privada de Linux en esta configuración.", {
    status: 503, hint: "Estar en la oficina no conecta Vercel a la red local. Probá con npm run dev dentro de la red o publicá exclusivamente la API por HTTPS y actualizá COOPYA_ORDS_URL.",
  });
  if (url.protocol !== "https:" && (hosted || !privateHost)) throw new ImportError("ORDS_HTTPS_REQUIRED", "HTTP solo está permitido para pruebas locales hacia una dirección privada. Vercel requiere HTTPS.", { status: 503 });
  return { url: url.href, execution: hosted ? "desplegado" : "local" };
}

const textFields = ["NumeroDoc", "Apellido", "Nombre", "Calle", "NumeroCalle", "Piso", "Dpto", "Tel1_Numero", "Tel1_CodArea", "Observaciones", "Sexo", "NroEnte", "Mail", "FechaNac"];
const numberFields = ["TipoDoc", "Cuil", "Remuneracion", "IdCodigoPostal", "IdProvincia"];

// Simple ORDS handler contract: person at the root, not { personas: [] }.
export function prepareOrdsPerson(persona) {
  validateOraclePerson(persona);
  const payload = {};
  for (const key of textFields) payload[key] = persona[key] == null || String(persona[key]).trim() === "" ? null : String(persona[key]).trim();
  for (const key of numberFields) {
    const value = persona[key];
    const empty = value == null || value === "" || (typeof value === "string" && !value.trim());
    if (!empty && (!["number", "string"].includes(typeof value) || !Number.isFinite(Number(value)) || Number(value) < 0
      || (key !== "Remuneracion" && (!Number.isSafeInteger(Number(value)) || Number(value) <= 0)))) {
      throw new ImportError("PERSON_VALIDATION", `${key} debe ser un número válido${key === "Remuneracion" ? "" : " entero mayor a cero"}.`, { status: 422 });
    }
    payload[key] = empty ? null : Number(value);
  }
  if (!payload.Nombre || !payload.Apellido) throw new ImportError("PERSON_VALIDATION", "Nombre y apellido son obligatorios para importar en Oracle.", { status: 422 });
  if (payload.Sexo !== null && !["1", "2"].includes(payload.Sexo)) throw new ImportError("PERSON_VALIDATION", "Sexo debe ser 1, 2 o vacío.", { status: 422 });
  return payload;
}

export async function importPersonViaOrds(persona, { env = process.env, configuration = readOrdsConfiguration(env), fetchImpl = fetch, onStage = () => {} } = {}) {
  const payload = prepareOrdsPerson(persona);
  onStage("solicitud_ords");
  let response;
  let data;
  try {
    response = await fetchImpl(configuration.url, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Import-Token": env.COOPYA_IMPORT_TOKEN },
      body: JSON.stringify(payload),
    });
    onStage("respuesta_ords");
    if (!(response.headers.get("content-type") || "").toLowerCase().includes("json")) throw new ImportError("ORDS_NOT_JSON", `ORDS respondió HTTP ${response.status} sin JSON. No se confirmó la importación.`, {
      upstreamStatus: response.status, hint: "Comprobá la ruta /ords/prestaprod/asistodo/personas. No uses landing ni SQL Developer Web. Revisá PERSONA antes de reintentar.",
    });
    try { data = await response.json(); } catch {
      throw new ImportError("ORDS_INVALID_JSON", "ORDS devolvió JSON inválido. El resultado de la escritura es desconocido.", { upstreamStatus: response.status });
    }
  } catch (error) {
    if (error instanceof ImportError) throw error;
    const timeout = ["TimeoutError", "AbortError"].includes(error.name);
    throw new ImportError(timeout ? "ORDS_TIMEOUT" : "ORDS_CONNECTION_FAILED", timeout
      ? "ORDS no respondió a tiempo. La escritura podría haberse realizado." : "No se pudo completar la conexión con ORDS.", {
      status: timeout ? 504 : 502, cause: error,
      hint: "En local, comprobá acceso a la red/VPN y el puerto 8080. En Vercel, comprobá la publicación HTTPS y el certificado. No hay reintentos automáticos: revisá PERSONA antes de volver a aceptar.",
    });
  }
  if (!response.ok || data?.ok !== true) {
    const oracleCode = Number.isInteger(data?.oracleCode) ? data.oracleCode : data?.error?.oracleCode;
    const cause = Number.isInteger(oracleCode) && oracleCode < 0
      ? Object.assign(new Error(`ORA-${String(Math.abs(oracleCode)).padStart(5, "0")}`), { errorNum: Math.abs(oracleCode) }) : undefined;
    const message = typeof data?.message === "string" ? data.message : data?.error?.message;
    throw new ImportError("ORDS_REJECTED", `ORDS no confirmó la persona (HTTP ${response.status}).${typeof message === "string" ? ` ${message.slice(0, 1500)}` : ""}`, {
      upstreamStatus: response.status, cause,
      hint: response.status === 401 || response.status === 403
        ? "ORDS rechazó el acceso. Verificá X-Import-Token, la validación del procedimiento y las restricciones del servidor web. La sesión del panel sí fue validada."
        : response.status === 404 ? "El servidor respondió, pero no encontró la ruta ORDS. Verificá alias prestaprod, módulo asistodo.importacion y plantilla personas." : "Revisá el código Oracle y el procedimiento API_IMPORTAR_PERSONA. No reintentes sin comprobar si ya existe la persona.",
    });
  }
  if (!isOracleConfirmed(data.oracle)) throw new ImportError("ORACLE_NOT_CONFIRMED", "ORDS devolvió una respuesta sin IDPERSONA y verificación válidos. La solicitud no se marcará como aceptada.", {
    upstreamStatus: response.status, hint: "Se requiere ok:true y oracle con confirmed:true, verified:true, idPersona positivo y operacion INSERCION o ACTUALIZACION. HTTP 200 o un documento duplicado no bastan.",
  });
  return { confirmed: true, verified: true, idPersona: data.oracle.idPersona, operacion: data.oracle.operacion };
}
