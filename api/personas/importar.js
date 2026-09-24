/* global process */

import { getOracleConfigurationError, importPersonIntoOracle } from "./_oraclePersonImport.js";

const DEFAULT_IMPORT_URL = "https://test.coopya.com.ar/Personas/ImportarPersonasApi";

const json = (body, status = 200) => Response.json(body, { status });

const getErrorDetail = (body, fallback) => {
  if (typeof body?.detail === "string") return body.detail;
  if (typeof body?.message === "string") return body.message;
  if (Array.isArray(body?.errores) && body.errores[0]) return String(body.errores[0]);
  return fallback;
};

const getOracleErrorDetail = (error) => {
  const message = String(error?.message || "");
  const oracleError = message.match(/(?:ORA|NJS|DPI)-\d+:[^\r\n]*/i)?.[0];

  return oracleError || message.slice(0, 300) || "Oracle no devolvió un detalle técnico.";
};

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ detail: "Método no permitido." }, 405);
    }

    const authorization = request.headers.get("authorization");
    const candidatesApiUrl = (process.env.COOPYA_CANDIDATES_API_URL || process.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const importToken = process.env.COOPYA_IMPORT_TOKEN;
    const oracleConfigurationError = getOracleConfigurationError();

    if (!authorization) return json({ detail: "Sesión de administrador requerida." }, 401);
    if (!candidatesApiUrl || !importToken) return json({ detail: "La importación aún no está configurada." }, 503);
    if (oracleConfigurationError) {
      return json({
        detail: oracleConfigurationError,
        oracle: { confirmed: false, stage: "configuracion", detail: oracleConfigurationError },
      }, 503);
    }

    try {
      const sessionResponse = await fetch(`${candidatesApiUrl}/api/v1/auth/me`, {
        headers: { Authorization: authorization },
      });
      const session = await sessionResponse.json().catch(() => null);
      if (!sessionResponse.ok || session?.rol !== "admin") {
        return json({ detail: "No tenés permisos para aceptar solicitudes." }, 403);
      }

      const body = await request.json();
      if (!body?.persona || typeof body.persona !== "object" || Array.isArray(body.persona)) {
        return json({ detail: "La persona a importar es inválida." }, 400);
      }

      const importUrl = process.env.COOPYA_PERSONAS_IMPORT_URL || DEFAULT_IMPORT_URL;
      const importResponse = await fetch(importUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: importToken, personas: [body.persona] }),
      });
      const result = await importResponse.json().catch(() => null);

      if (!importResponse.ok || !result?.ok || Number(result.rechazados) > 0) {
        return json({ detail: getErrorDetail(result, "No pudimos importar la persona.") }, importResponse.status || 502);
      }

      try {
        const oracle = await importPersonIntoOracle(body.persona);
        return json({ ...result, oracle: { confirmed: true, ...oracle } }, 200);
      } catch (error) {
        const oracleDetail = getOracleErrorDetail(error);
        console.error("No se pudo sincronizar la persona aceptada en Oracle.", error?.code || error?.name);
        return json({
          detail: `Coopya importó la persona, pero Oracle no la confirmó: ${oracleDetail}`,
          oracle: {
            confirmed: false,
            stage: "sincronizacion",
            code: error?.code || null,
            detail: oracleDetail,
          },
        }, 502);
      }
    } catch {
      return json({ detail: "No pudimos comunicarnos con el servicio de importación." }, 502);
    }
  },
};
