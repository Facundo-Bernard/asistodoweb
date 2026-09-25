/* global Buffer */
import { createImportHandler } from "../api/personas/importar.js";

// Vite dev only. The same authenticated backend runs on this computer, not in React.
export function localPersonImportPlugin(env) {
  const handle = createImportHandler({ env });
  return {
    name: "local-person-import", apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/personas/importar") return next();
        const reply = (status, message) => {
          res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify({ ok: false, detail: message }));
        };
        try {
          const chunks = [];
          let bytes = 0;
          for await (const chunk of req) {
            bytes += chunk.length;
            if (bytes > 128 * 1024) return reply(413, "La solicitud supera el tamaño permitido.");
            chunks.push(chunk);
          }
          const request = new Request("http://localhost/api/personas/importar", {
            method: req.method, headers: req.headers,
            ...(!["GET", "HEAD"].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
          });
          const response = await handle(request);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch {
          reply(500, "Falló el backend local de aceptación. Revisá la terminal sin compartir credenciales.");
        }
      });
    },
  };
}
