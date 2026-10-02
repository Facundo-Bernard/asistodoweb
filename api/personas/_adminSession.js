import { ImportError } from "./_diagnostics.js";

function candidatesUrl(env) {
  try {
    const url = new URL(env.COOPYA_CANDIDATES_API_URL || env.VITE_API_BASE_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    return url.href.replace(/\/$/, "");
  } catch {
    throw new ImportError("INVALID_API_URL", "VITE_API_BASE_URL (o COOPYA_CANDIDATES_API_URL) debe ser la URL HTTPS de solicitudes y autenticación.", { status: 503 });
  }
}

export async function verifyAdminSession(authorization, { env, fetchImpl = fetch }) {
  if (!/^Bearer\s+\S+$/i.test(authorization || "")) {
    throw new ImportError("ADMIN_SESSION_REQUIRED", "Sesión de administrador requerida.", { status: 401 });
  }
  let response;
  let session;
  try {
    response = await fetchImpl(`${candidatesUrl(env)}/api/v1/auth/me`, {
      headers: { Authorization: authorization, Accept: "application/json" },
      signal: AbortSignal.timeout(15000), redirect: "error",
    });
    session = await response.json();
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("ADMIN_SESSION_UNAVAILABLE", "No se pudo verificar la sesión de administrador.", { cause: error });
  }
  if (!response.ok || session?.rol !== "admin") {
    throw new ImportError("ADMIN_SESSION_REJECTED", "La sesión no es válida o no tiene permisos de administrador.", {
      status: response.status === 401 ? 401 : 403, upstreamStatus: response.status,
    });
  }
  return session;
}
