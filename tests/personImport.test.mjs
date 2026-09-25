import test from "node:test";
import assert from "node:assert/strict";
import { createImportHandler } from "../api/personas/importar.js";
import { readOracleConfiguration, importPersonIntoOracle } from "../api/personas/_oraclePersonImport.js";
import { sendPersonImport } from "../src/componentes/dashboard/administrativo/personImportDiagnostics.js";
import { IMPORT_SERVICE, IMPORT_VERSION } from "../shared/personImportContract.js";

const configuration = { user: "TEST_SCHEMA", password: "private-password", connectString: "db.example.test:1521/TESTDB", personTypeId: 3, personStatusId: 1 };
const env = { COOPYA_IMPORT_TOKEN: "private-import-token", COOPYA_ORACLE_CONFIG: JSON.stringify(configuration), VITE_API_BASE_URL: "https://candidates.example.test", VERCEL_GIT_COMMIT_SHA: "abcdef123456789" };
const persona = { TipoDoc: 1, NumeroDoc: "12345678", Nombre: "PRUEBA", Apellido: "FICTICIA", Mail: "fixture@example.test", Remuneracion: 500000, PlanId_ServEsp: 1310 };
const success = { ok: true, total: 1, insertados: 1, rechazados: 0, errores: [] };
const verified = { confirmed: true, verified: true, idPersona: 42, operacion: "INSERCION", database: { schema: "TEST_SCHEMA", databaseName: "TESTDB" } };

function captureLogger() {
  const logs = [];
  const logger = Object.fromEntries(["info", "warn", "error", "log", "table", "groupCollapsed", "groupEnd"].map((level) => [level, (...args) => logs.push({ level, args })]));
  return { logger, logs };
}

function setup({ overrides = {}, result = success, status = 200, oracleImport, auth = { rol: "admin" } } = {}) {
  const { logs, logger } = captureLogger();
  const calls = [];
  let oracleCalls = 0;
  const handle = createImportHandler({ env: { ...env, ...overrides }, logger,
    fetchImpl: async (url) => {
      calls.push(url);
      return url.endsWith("/auth/me") ? Response.json(auth) : Response.json(result, { status });
    },
    oracleImport: async (...args) => { oracleCalls++; return oracleImport ? oracleImport(...args) : verified; },
  });
  const post = (body = { persona }, authorization = "Bearer private-session-token") => handle(new Request("https://app.example.test/api/personas/importar", {
    method: "POST", headers: { authorization, "Content-Type": "application/json", "X-Request-Id": "12345678-1234-1234-1234-123456789012" }, body: JSON.stringify(body),
  }));
  return { handle, post, calls, logs, oracleCalls: () => oracleCalls };
}

test("Coopya business rejection with HTTP 200 becomes 502 and never calls Oracle", async () => {
  const fixture = setup({ result: { ok: false, errores: [{ mensaje: "El plan no existe" }] } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(body.diagnostics.upstreamStatus, 200);
  assert.equal(body.diagnostics.code, "COOPYA_REJECTED");
  assert.equal(body.diagnostics.stage, "coopya");
  assert.match(body.detail, /El plan no existe/);
  assert.equal(fixture.oracleCalls(), 0);
});

test("ok=true with rejected people or errors is still a rejection", async () => {
  for (const result of [{ ...success, rechazados: 1 }, { ...success, errores: ["Plan inválido"] }]) {
    const fixture = setup({ result });
    assert.equal((await fixture.post()).status, 502);
    assert.equal(fixture.oracleCalls(), 0);
  }
});

test("ok=true alone does not establish a Coopya import", async () => {
  const fixture = setup({ result: { ok: true } });
  const response = await fixture.post();
  assert.equal(response.status, 502);
  assert.equal((await response.json()).diagnostics.code, "COOPYA_RESPONSE_INCOMPLETE");
  assert.equal(fixture.oracleCalls(), 0);
});

test("placeholder connection fails before any import", async () => {
  const fixture = setup({ overrides: { COOPYA_ORACLE_CONFIG: JSON.stringify({ ...configuration, connectString: "host:1521/servicio" }) } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.diagnostics.code, "ORACLE_CONNECTION_PLACEHOLDER");
  assert.deepEqual(body.diagnostics.progress, { coopya: "no_iniciado", oracle: "no_iniciado" });
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.oracleCalls(), 0);
});

test("configuration rejects malformed JSON, primitives, invalid IDs, and local aliases", () => {
  for (const config of ["{invalid", "42", "null", "[]", JSON.stringify({ ...configuration, personTypeId: "anything" }), JSON.stringify({ ...configuration, personStatusId: true }), JSON.stringify({ ...configuration, connectString: "ORCL19C_PROD" })]) {
    assert.throws(() => readOracleConfiguration({ ...env, COOPYA_ORACLE_CONFIG: config }));
  }
  assert.deepEqual(readOracleConfiguration(env), configuration);
});

test("HTTP errors, invalid JSON and timeouts retain actionable stage and status", async () => {
  const { logger } = captureLogger();
  for (const [mode, expectedCode] of [["html", "UPSTREAM_NOT_JSON"], ["json", "UPSTREAM_REQUEST_FAILED"], ["timeout", "UPSTREAM_TIMEOUT"]]) {
    let oracleCalls = 0;
    const handle = createImportHandler({ env, logger, oracleImport: async () => { oracleCalls++; }, fetchImpl: async (url) => {
      if (url.endsWith("/auth/me")) return Response.json({ rol: "admin" });
      if (mode === "html") return new Response("<html>Error</html>", { status: 503, headers: { "content-type": "text/html" } });
      if (mode === "json") return new Response("not json private-import-token", { headers: { "content-type": "application/json" } });
      throw new DOMException("Tiempo agotado", "TimeoutError");
    } });
    const response = await handle(new Request("https://app.example.test/api/personas/importar", {
      method: "POST", headers: { authorization: "Bearer private-session-token" }, body: JSON.stringify({ persona }),
    }));
    const body = await response.json();
    assert.equal(body.diagnostics.code, expectedCode);
    assert.equal(body.diagnostics.stage, "coopya");
    assert.equal(body.diagnostics.progress.coopya, "sin_confirmar");
    assert.equal(JSON.stringify(body).includes("private-import-token"), false);
    assert.equal(oracleCalls, 0);
  }
});

test("missing auth and non-admin sessions cannot obtain configuration or execute imports", async () => {
  const noAuth = setup();
  assert.equal((await noAuth.post({ persona }, "")).status, 401);
  assert.equal(noAuth.calls.length, 0);
  const nonAdmin = setup({ auth: { rol: "user" }, overrides: { COOPYA_ORACLE_CONFIG: "" } });
  const response = await nonAdmin.post();
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.diagnostics.technical, undefined);
  assert.equal(nonAdmin.calls.length, 1);
});

test("validation does not truncate fields or send bad data to either system", async () => {
  for (const invalid of [{ ...persona, Mail: "a".repeat(51) }, { ...persona, NumeroDoc: "invalid" }, { ...persona, FechaNac: "2020-02-30" }]) {
    const fixture = setup();
    assert.equal((await fixture.post({ persona: invalid })).status, 422);
    assert.equal(fixture.calls.length, 1);
  }
});

test("database error retains stage, causal codes and partial success without exposing secrets", async () => {
  const fixture = setup({ oracleImport: async (_, { onStage, onDatabase }) => {
    onDatabase(verified.database);
    onStage("procedimiento_oracle");
    throw Object.assign(new Error("ORA-20001: private-import-token private-password private-session-token 12345678 fixture@example.test PRUEBA FICTICIA", {
      cause: Object.assign(new Error("causa de red"), { code: "ECONNRESET" }),
    }), { code: "ORA-20001", errorNum: 20001 });
  } });
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(body.diagnostics.stage, "procedimiento_oracle");
  assert.equal(body.diagnostics.progress.coopya, "confirmado");
  assert.equal(body.diagnostics.database.databaseName, "TESTDB");
  assert.deepEqual(body.diagnostics.technical.codes, ["ORA-20001", "ECONNRESET"]);
  assert.match(body.diagnostics.hint, /credencial PERSONAS_IMPORT/);
  const output = JSON.stringify([body, fixture.logs]);
  for (const secret of ["private-import-token", "private-password", "private-session-token", "fixture@example.test", "PRUEBA", "FICTICIA"]) assert.equal(output.includes(secret), false, secret);
  assert.equal(body.oracle.confirmed, false);
});

test("GET identifies the deployment and performs no writes", async () => {
  const fixture = setup();
  const response = await fixture.handle(new Request("https://app.example.test/api/personas/importar"));
  assert.equal((await response.json()).version, IMPORT_VERSION);
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.oracleCalls(), 0);
});

test("success requires a verified Oracle result and returns correlation headers", async () => {
  const fixture = setup();
  const response = await fixture.post();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-import-service"), IMPORT_SERVICE);
  assert.equal(response.headers.get("x-request-id"), body.diagnostics.requestId);
  assert.deepEqual(body.oracle, verified);
  assert.equal(body.diagnostics.stage, "completado");
  const broken = setup({ oracleImport: async () => ({ idPersona: 42, operacion: "INSERCION" }) });
  assert.equal((await broken.post()).status, 502);
});

function fakeDriver({ failProcedure = false, missingRow = false, failClose = false } = {}) {
  const calls = [];
  let closed = false;
  const connection = {
    execute: async (sql, binds) => {
      calls.push({ sql, binds });
      if (sql.includes("FROM DUAL")) return { rows: [verified.database] };
      if (sql.includes("API_IMPORTAR_PERSONA")) {
        if (failProcedure) throw Object.assign(new Error("ORA-20001: token inválido"), { code: "ORA-20001" });
        return { outBinds: { p_id_persona: 42, p_operacion: "INSERCION" } };
      }
      return { rows: missingRow ? [] : [{ idPersona: 42 }] };
    },
    commit: async () => calls.push({ commit: true }),
    close: async () => { closed = true; if (failClose) throw new Error("close failed"); },
  };
  return { driver: { getConnection: async () => connection, BIND_OUT: 3003, NUMBER: 2010, STRING: 2001, OUT_FORMAT_OBJECT: 4002 }, calls, closed: () => closed };
}

test("Oracle performs bound procedure call, commit and read-back before success", async () => {
  const fixture = fakeDriver();
  const result = await importPersonIntoOracle(persona, { env, driver: fixture.driver });
  assert.deepEqual(result, verified);
  assert.equal(fixture.calls[1].binds.p_token, env.COOPYA_IMPORT_TOKEN);
  assert.equal(fixture.calls[1].binds.p_numero_doc, 12345678);
  assert.deepEqual(fixture.calls[2], { commit: true });
  assert.deepEqual(fixture.calls[3].binds, { idPersona: 42, tipoDoc: 1, numeroDoc: 12345678 });
  assert.equal(fixture.closed(), true);
});

test("no success when procedure ID does not match a row", async () => {
  const fixture = fakeDriver({ missingRow: true });
  await assert.rejects(importPersonIntoOracle(persona, { env, driver: fixture.driver }), { code: "ORACLE_READBACK_FAILED" });
  assert.equal(fixture.closed(), true);
});

test("close failure does not mask the real procedure error or a verified success", async () => {
  const fixture = fakeDriver({ failProcedure: true, failClose: true });
  const warnings = [];
  await assert.rejects(importPersonIntoOracle(persona, { env, driver: fixture.driver, onWarning: (e) => warnings.push(e.message) }), { code: "ORA-20001" });
  assert.deepEqual(warnings, ["close failed"]);
  const completed = fakeDriver({ failClose: true });
  assert.equal((await importPersonIntoOracle(persona, { env, driver: completed.driver })).verified, true);
});

test("browser rejects HTML and old JSON and never logs Axios request/response secrets", async () => {
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
  assert.equal(JSON.stringify(logs).includes("private-session-token"), false);
});

test("browser receives actionable diagnostics and confirmed results through the real handler", async () => {
  for (const rejected of [true, false]) {
    const fixture = setup({ result: rejected ? { ok: false, errores: ["Plan inválido"] } : success });
    const client = { post: async (_url, body) => {
      const response = await fixture.post(body);
      const mapped = { data: await response.json(), status: response.status, headers: Object.fromEntries(response.headers) };
      if (!response.ok) throw { response: mapped };
      return mapped;
    } };
    const { logger, logs } = captureLogger();
    if (rejected) {
      await assert.rejects(sendPersonImport(client, "/api/personas/importar", persona, { logger }), (e) => e.diagnostic.code === "COOPYA_REJECTED" && e.diagnostic.upstreamStatus === 200);
      assert.match(JSON.stringify(logs), /Plan inválido/);
    } else {
      assert.deepEqual((await sendPersonImport(client, "/api/personas/importar", persona, { logger })).oracle, verified);
    }
  }
});
