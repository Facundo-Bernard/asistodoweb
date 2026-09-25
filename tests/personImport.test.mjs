import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createImportHandler } from "../api/personas/importar.js";
import { readOrdsConfiguration, prepareOrdsPerson, importPersonViaOrds } from "../api/personas/_ordsPersonImport.js";
import { sendPersonImport } from "../src/componentes/dashboard/administrativo/personImportDiagnostics.js";
import { buildOraclePerson } from "../src/componentes/dashboard/administrativo/personaImportMapper.js";
import { localPersonImportPlugin } from "../scripts/localPersonImport.js";
import { IMPORT_SERVICE, IMPORT_VERSION } from "../shared/personImportContract.js";

const env = { COOPYA_IMPORT_TOKEN: "private-import-token", COOPYA_ORDS_URL: "http://172.17.1.4:8080/ords/prestaprod/asistodo/personas", VITE_API_BASE_URL: "https://candidates.example.test" };
const persona = { TipoDoc: 1, NumeroDoc: "12345678", Nombre: "PRUEBA", Apellido: "FICTICIA", Mail: "fixture@example.test", Remuneracion: 500000, Sexo: 2, PlanId_ServEsp: 1310 };
const verified = { confirmed: true, verified: true, idPersona: 42, operacion: "INSERCION" };

function captureLogger() {
  const logs = [];
  const logger = Object.fromEntries(["info", "warn", "error", "log", "table", "groupCollapsed", "groupEnd"].map((level) => [level, (...args) => logs.push({ level, args })]));
  return { logger, logs };
}

function setup({ overrides = {}, result = { ok: true, oracle: verified }, status = 200, auth = { rol: "admin" }, upstream } = {}) {
  const { logger, logs } = captureLogger();
  const calls = [];
  const handle = createImportHandler({ env: { ...env, ...overrides }, logger, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/me")) return Response.json(auth);
    return upstream ? upstream() : Response.json(result, { status });
  } });
  const post = (body = { persona }, authorization = "Bearer private-session-token") => handle(new Request("https://app.example.test/api/personas/importar", {
    method: "POST", headers: { authorization, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  return { handle, post, calls, logs };
}

test("local HTTP works only for private hosts; production needs public HTTPS", () => {
  assert.equal(readOrdsConfiguration(env).execution, "local");
  assert.equal(readOrdsConfiguration({ ...env, VERCEL: "1", COOPYA_ORDS_URL: "https://ords.example.test/ords/prestaprod/asistodo/personas" }).execution, "desplegado");
  for (const extra of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }, { NODE_ENV: "production" }]) {
    assert.throws(() => readOrdsConfiguration({ ...env, ...extra }), { code: "ORDS_PRIVATE_NETWORK" });
  }
  for (const host of ["localhost", "127.0.0.1", "10.0.0.1", "172.31.0.1", "192.168.1.4", "[::1]", "[fd00::1]", "[fe80::1]"]) {
    assert.throws(() => readOrdsConfiguration({ ...env, VERCEL: "1", COOPYA_ORDS_URL: `https://${host}/personas` }), { code: "ORDS_PRIVATE_NETWORK" });
  }
  assert.throws(() => readOrdsConfiguration({ ...env, COOPYA_ORDS_URL: "http://public.example.test/personas" }), { code: "ORDS_HTTPS_REQUIRED" });
});

test("invalid URL, missing token and legacy configuration do not fall back to direct Oracle", () => {
  for (const url of ["invalid", "ftp://ords.example.test/personas", "https://user:password@ords.example.test/personas", "https://ords.example.test/personas?token=x", "https://ords.example.test/personas#token", "https://ords.example.test/ords/_/landing"]) {
    assert.throws(() => readOrdsConfiguration({ ...env, COOPYA_ORDS_URL: url }), { code: "ORDS_URL_INVALID" });
  }
  assert.throws(() => readOrdsConfiguration({ ...env, COOPYA_IMPORT_TOKEN: "" }), { code: "IMPORT_TOKEN_MISSING" });
  assert.throws(() => readOrdsConfiguration({ ...env, COOPYA_ORDS_URL: "", COOPYA_ORACLE_CONFIG: "{}" }), { code: "ORDS_URL_MISSING" });
});

test("authenticated acceptance sends a single raw person to ORDS, no Coopya and no leaked credentials", async () => {
  const fixture = setup();
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.oracle, verified);
  assert.equal(body.diagnostics.transport, "ords");
  assert.equal(body.diagnostics.stage, "completado");
  assert.equal(response.headers.get("x-import-service"), IMPORT_SERVICE);
  assert.equal(response.headers.get("x-import-version"), IMPORT_VERSION);
  assert.equal(fixture.calls.length, 2);
  const call = fixture.calls[1];
  assert.equal(call.url, env.COOPYA_ORDS_URL);
  assert.equal(call.options.headers["X-Import-Token"], env.COOPYA_IMPORT_TOKEN);
  assert.equal(call.options.headers.Authorization, undefined);
  assert.equal(call.options.redirect, "error");
  const payload = JSON.parse(call.options.body);
  assert.equal(payload.NumeroDoc, persona.NumeroDoc);
  assert.equal(payload.Sexo, "2");
  assert.equal(payload.Cuil, null);
  for (const key of ["persona", "personas", "token", "PlanId_ServEsp", "Tipo", "IdPersona"]) assert.equal(payload[key], undefined);
  const output = JSON.stringify([body, fixture.logs]);
  for (const secret of [env.COOPYA_IMPORT_TOKEN, "private-session-token", persona.NumeroDoc, persona.Mail]) assert.equal(output.includes(secret), false);
});

test("no credentials or non-admin session never sends a person or reveals configuration", async () => {
  const noAuth = setup();
  assert.equal((await noAuth.post({ persona }, "")).status, 401);
  assert.equal(noAuth.calls.length, 0);
  const nonAdmin = setup({ auth: { rol: "user" }, overrides: { COOPYA_ORDS_URL: "" } });
  const response = await nonAdmin.post();
  assert.equal(response.status, 403);
  assert.equal((await response.json()).diagnostics.technical, undefined);
  assert.equal(nonAdmin.calls.length, 1);
});

test("private Vercel target fails before importing and explains the local network boundary", async () => {
  const fixture = setup({ overrides: { VERCEL: "1" } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.diagnostics.code, "ORDS_PRIVATE_NETWORK");
  assert.match(body.diagnostics.hint, /npm run dev/);
  assert.equal(fixture.calls.length, 1);
  assert.equal(body.diagnostics.progress.oracle, "no_iniciado");
});

test("bad fields, byte overflow, dates and numbers are rejected before any write", async () => {
  for (const invalid of [{ Mail: "a".repeat(51) }, { Apellido: "ñ".repeat(26) }, { NumeroDoc: "invalid" }, { FechaNac: "2020-02-30" }, { Cuil: "abc" }, { IdProvincia: -1 }, { Remuneracion: true }, { Sexo: 3 }, { Apellido: "" }]) {
    const fixture = setup();
    assert.equal((await fixture.post({ persona: { ...persona, ...invalid } })).status, 422, JSON.stringify(invalid));
    assert.equal(fixture.calls.length, 1);
  }
  assert.equal(prepareOrdsPerson({ ...persona, Cuil: "", IdProvincia: null }).Cuil, null);
});

test("malformed request JSON and invalid person shapes do not call ORDS", async () => {
  for (const body of [{}, { persona: [] }, { persona: null }]) {
    const fixture = setup();
    assert.equal((await fixture.post(body)).status, 400);
    assert.equal(fixture.calls.length, 1);
  }
  const fixture = setup();
  const response = await fixture.handle(new Request("http://localhost/api/personas/importar", { method: "POST", headers: { authorization: "Bearer abc" }, body: "{" }));
  assert.equal(response.status, 400);
  assert.equal(fixture.calls.length, 1);
});

test("HTTP 200, duplicate document, unverified IDs and invalid operations are not acceptance", async () => {
  for (const result of [{ ok: true }, { ok: false, message: "Documento ya existente" }, { ok: true, oracle: { ...verified, verified: false } }, { ok: true, oracle: { ...verified, idPersona: "42" } }, { ok: true, oracle: { ...verified, idPersona: 0 } }, { ok: true, oracle: { ...verified, operacion: "RECHAZADO" } }]) {
    const fixture = setup({ result });
    const response = await fixture.post();
    assert.equal(response.status, 502);
    assert.equal((await response.json()).oracle.confirmed, false);
    assert.equal(fixture.calls.length, 2);
  }
});

test("Oracle errors retain codes, stage and HTTP status but redact token and personal data", async () => {
  const fixture = setup({ status: 500, result: { ok: false, oracleCode: -2291,
    message: `Invalid reference ${env.COOPYA_IMPORT_TOKEN} private-session-token ${persona.NumeroDoc} ${persona.Mail} ${persona.Nombre}` } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(body.diagnostics.upstreamStatus, 500);
  assert.equal(body.diagnostics.stage, "respuesta_ords");
  assert.deepEqual(body.diagnostics.technical.codes, ["ORDS_REJECTED", "ORA-02291"]);
  const output = JSON.stringify([body, fixture.logs]);
  for (const secret of [env.COOPYA_IMPORT_TOKEN, "private-session-token", persona.NumeroDoc, persona.Mail, persona.Nombre]) assert.equal(output.includes(secret), false);
});

for (const status of [401, 403, 404, 409, 500]) test(`ORDS HTTP ${status} cannot mark accepted`, async () => {
  const fixture = setup({ status, result: { ok: false, oracleCode: -20001, message: "Rechazado" } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(body.diagnostics.upstreamStatus, status);
  assert.equal(body.oracle.confirmed, false);
  assert.equal(fixture.calls.length, 2);
});

for (const [mode, code] of [["html", "ORDS_NOT_JSON"], ["json", "ORDS_INVALID_JSON"], ["timeout", "ORDS_TIMEOUT"], ["network", "ORDS_CONNECTION_FAILED"]]) test(`${mode} failure is actionable and never retried`, async () => {
  const fixture = setup({ upstream: () => {
    if (mode === "html") return new Response("<html>secret</html>", { status: 502, headers: { "Content-Type": "text/html" } });
    if (mode === "json") return new Response("bad secret", { headers: { "Content-Type": "application/json" } });
    if (mode === "timeout") throw new DOMException("timeout", "TimeoutError");
    throw new TypeError("fetch failed", { cause: Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }) });
  } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(body.diagnostics.code, code);
  assert.equal(body.diagnostics.progress.oracle, "sin_confirmar");
  assert.equal(fixture.calls.length, 2);
  assert.equal(body.oracle.confirmed, false);
  assert.equal(JSON.stringify(body).includes("secret"), false);
});

test("GET exposes only service/version and never calls external APIs", async () => {
  const fixture = setup();
  const response = await fixture.handle(new Request("http://localhost/api/personas/importar"));
  const body = await response.json();
  assert.equal(body.version, IMPORT_VERSION);
  assert.equal(body.transport, "ords");
  assert.equal(fixture.calls.length, 0);
  assert.equal(JSON.stringify(body).includes(env.COOPYA_ORDS_URL), false);
  assert.equal((await fixture.handle(new Request("http://localhost/api/personas/importar", { method: "DELETE" }))).status, 405);
});

test("only confirmed fields are forwarded from ORDS", async () => {
  const oracle = await importPersonViaOrds(persona, { env, fetchImpl: async () => Response.json({ ok: true, token: "secret", oracle: { ...verified, operacion: "ACTUALIZACION", token: "secret", database: { password: "secret" } } }) });
  assert.deepEqual(oracle, { ...verified, operacion: "ACTUALIZACION" });
});

test("person mapping no longer requires a Coopya product plan", () => {
  const mapped = buildOraclePerson({ nombreCompleto: "Persona Prueba", dni: "12345678", direccion: "Calle 123", telefono: "1123456789", genero: "female", ingresoMensual: 400000 });
  assert.equal(prepareOrdsPerson(mapped).Nombre, "PERSONA");
  assert.equal(prepareOrdsPerson(mapped).Apellido, "PRUEBA");
  assert.equal(prepareOrdsPerson(mapped).NumeroCalle, "123");
});

test("browser consumes the real backend confirmation and displays ORDS failures", async () => {
  for (const rejected of [true, false]) {
    const fixture = setup({ result: rejected ? { ok: false, message: "Token rechazado", oracleCode: -20001 } : { ok: true, oracle: verified } });
    const client = { post: async (_url, body) => {
      const response = await fixture.post(body);
      const mapped = { data: await response.json(), status: response.status, headers: Object.fromEntries(response.headers) };
      if (!response.ok) throw { response: mapped };
      return mapped;
    } };
    const { logger } = captureLogger();
    if (rejected) await assert.rejects(sendPersonImport(client, "/api/personas/importar", persona, { logger }), (e) => e.diagnostic.code === "ORDS_REJECTED" && e.diagnostic.transport === "ords");
    else assert.deepEqual((await sendPersonImport(client, "/api/personas/importar", persona, { logger })).oracle, verified);
  }
});

test("browser rejects HTML/old contracts and never logs Axios secrets", async () => {
  for (const data of ["<html>private-import-token</html>", { ok: true, persona }]) {
    const { logs, logger } = captureLogger();
    const client = { post: async () => ({ data, status: 200, headers: { "content-type": typeof data === "string" ? "text/html" : "application/json" } }) };
    await assert.rejects(sendPersonImport(client, "/api/personas/importar", persona, { logger }), (error) => error.diagnostic.code === "IMPORT_CONTRACT_MISMATCH");
    assert.equal(JSON.stringify(logs).includes("private-import-token"), false);
    assert.equal(JSON.stringify(logs).includes(persona.NumeroDoc), false);
  }
  const { logs, logger } = captureLogger();
  const client = { post: async () => { throw { code: "ERR_NETWORK", message: "private-password", config: { headers: { authorization: "private-session-token" }, data: persona } }; } };
  await assert.rejects(sendPersonImport(client, "/api/personas/importar", persona, { logger }), (e) => e.diagnostic.code === "NETWORK_ERROR");
  assert.equal(JSON.stringify(logs).includes("private-password"), false);
});

test("local dev middleware serves backend JSON, enforces auth, and leaves other routes alone", async (t) => {
  let middleware;
  localPersonImportPlugin(env).configureServer({ middlewares: { use: (value) => { middleware = value; } } });
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/personas/importar`);
  assert.equal((await response.json()).transport, "ords");
  assert.equal((await fetch(`${base}/api/personas/importar`, { method: "POST", body: "{}" })).status, 401);
  assert.equal((await fetch(`${base}/other`)).status, 404);
  assert.equal((await fetch(`${base}/api/personas/importar`, { method: "POST", body: "x".repeat(129 * 1024) })).status, 413);
});
