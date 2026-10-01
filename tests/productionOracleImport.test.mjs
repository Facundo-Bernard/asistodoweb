import test from "node:test";
import assert from "node:assert/strict";
import { readProductionOracleConfiguration, importPersonIntoProduction,
  readProductionBridgeConfiguration, importPersonViaProductionBridge } from "../api/personas/_productionOracleImport.js";
import { createImportHandler } from "../api/personas/importar.js";
import { createBridgeHandler } from "../scripts/oracleBridge.js";

const env = { COOPYA_IMPORT_TARGET: "oracle_prod",
  COOPYA_ORACLE_PROD_CONFIG: JSON.stringify({ user: "PRESTAPROD", password: "test-only-secret", connectString: "172.17.1.3:1521/orcl" }),
  VITE_API_BASE_URL: "https://candidates.example.test" };
const persona = { TipoDoc: 1, NumeroDoc: "12345678", Nombre: "MARIA", Apellido: "PEREZ",
  Calle: "SAN MARTIN", NumeroCalle: "123", Remuneracion: 400000, Sexo: "2", Mail: "fixture@example.test" };
const config = readProductionOracleConfiguration(env);

function fakeDriver({ duplicate = false, readback = true, databaseName = "orcl" } = {}) {
  const events = [];
  let connections = 0;
  const writer = {
    async execute(sql, binds) {
      if (sql.includes("SYS_CONTEXT")) return { rows: [{ userName: "PRESTAPROD", databaseName, serviceName: "orcl" }] };
      if (sql.includes("ROWNUM <= 2")) { events.push("duplicate-check"); return { rows: duplicate ? [{ idPersona: 42 }] : [] }; }
      if (sql.includes("INSERT INTO PRESTAPROD.PERSONA")) {
        events.push("insert");
        assert.equal(binds.numeroDoc, 12345678);
        assert.equal(binds.tipoPersona, 3);
        assert.equal(binds.estadoPersona, 1);
        assert.equal(binds.prestador, 75);
        assert.equal(binds.fechaNac, null);
        assert.equal(binds.codigoPostal, null);
        return { rowsAffected: 1, outBinds: { idPersona: [99] } };
      }
      throw new Error("SQL inesperado en conexión de escritura");
    },
    async commit() { events.push("commit"); },
    async rollback() { events.push("rollback"); },
    async close() { events.push("close-writer"); },
  };
  const reader = {
    async execute(sql, binds) {
      assert.match(sql, /FROM PRESTAPROD\.PERSONA/);
      assert.equal(binds.idPersona, 99);
      events.push("readback");
      return { rows: readback ? [{ idPersona: 99, nombre: "MARIA", apellido: "PEREZ" }] : [] };
    },
    async close() { events.push("close-reader"); },
  };
  return { events, driver: { thin: false, OUT_FORMAT_OBJECT: 4002, NUMBER: 3002, BIND_OUT: 3003,
    async getConnection() { connections += 1; return connections === 1 ? writer : reader; } } };
}

test("production target requires a different account than the ZIP read-only account", () => {
  assert.throws(() => readProductionOracleConfiguration({ ...env,
    COOPYA_ORACLE_PROD_CONFIG: JSON.stringify({ user: "nmonti", password: "fixture", connectString: "172.17.1.3:1521/orcl" }) }),
  { code: "PRODUCTION_ORACLE_READ_ONLY" });
  assert.throws(() => readProductionOracleConfiguration({ ...env, VERCEL: "1" }),
    { code: "PRODUCTION_ORACLE_LOCAL_ONLY" });
  assert.throws(() => readProductionOracleConfiguration({ ...env, COOPYA_ORACLE_PROD_CONFIG: "" }),
    { code: "PRODUCTION_ORACLE_CONFIG_MISSING" });
});

test("inserts once and checks the committed person in a second connection", async () => {
  const { driver, events } = fakeDriver();
  const result = await importPersonIntoProduction(persona, { configuration: config, driver });
  assert.deepEqual(events.slice(0, 4), ["duplicate-check", "insert", "commit", "readback"]);
  assert.equal(result.idPersona, 99);
  assert.equal(result.verified, true);
  assert.equal(result.operacion, "INSERCION");
});

test("an existing document cannot be inserted and the transaction is rolled back", async () => {
  const { driver, events } = fakeDriver({ duplicate: true });
  await assert.rejects(importPersonIntoProduction(persona, { configuration: config, driver }),
    { code: "PRODUCTION_PERSON_EXISTS", status: 409 });
  assert.deepEqual(events, ["duplicate-check", "rollback", "close-writer"]);
});

test("a different Oracle database is rejected before looking up or inserting a person", async () => {
  const { driver, events } = fakeDriver({ databaseName: "test" });
  await assert.rejects(importPersonIntoProduction(persona, { configuration: config, driver }),
    { code: "PRODUCTION_ORACLE_IDENTITY_MISMATCH" });
  assert.deepEqual(events, ["rollback", "close-writer"]);
});

test("a missing readback cannot mark the application accepted", async () => {
  const { driver, events } = fakeDriver({ readback: false });
  await assert.rejects(importPersonIntoProduction(persona, { configuration: config, driver }),
    { code: "PRODUCTION_ORACLE_READBACK_FAILED" });
  assert.deepEqual(events.slice(0, 4), ["duplicate-check", "insert", "commit", "readback"]);
  assert.equal(events.includes("rollback"), false);
});

test("local acceptance selects production only after admin authentication", async () => {
  const calls = [];
  const handler = createImportHandler({ env, logger: { info() {}, error() {} },
    fetchImpl: async (url) => { calls.push(url); return Response.json({ rol: "admin" }); },
    productionImport: async () => ({ confirmed: true, verified: true, idPersona: 99, operacion: "INSERCION" }) });
  const request = (authorization) => new Request("http://localhost/api/personas/importar", {
    method: "POST", headers: { authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  });
  assert.equal((await handler(request(""))).status, 401);
  assert.equal(calls.length, 0);
  const response = await handler(request("Bearer fixture-session"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.diagnostics.transport, "oracle_prod");
  assert.equal(body.oracle.idPersona, 99);
  assert.deepEqual(calls, ["https://candidates.example.test/api/v1/auth/me"]);
});

test("local status reports missing write account without leaking credentials", async () => {
  const handler = createImportHandler({ env: { ...env, COOPYA_ORACLE_PROD_CONFIG: "" }, logger: { info() {}, error() {} } });
  const response = await handler(new Request("http://localhost/api/personas/importar"));
  const body = await response.json();
  assert.equal(body.transport, "oracle_prod");
  assert.equal(body.ready, false);
  assert.match(body.configurationMessage, /cuenta de escritura/);
  assert.equal(JSON.stringify(body).includes("test-only-secret"), false);
});

test("Vercel requires a public HTTPS bridge, never a private Oracle address", () => {
  const hosted = { ...env, VERCEL: "1", COOPYA_IMPORT_TOKEN: "test-token",
    COOPYA_ORACLE_BRIDGE_URL: "https://bridge.example.test/personas" };
  assert.equal(readProductionBridgeConfiguration(hosted).execution, "desplegado");
  for (const url of ["http://bridge.example.test/personas", "https://172.17.1.3/personas", "https://bridge.example.test/other", "https://bridge.example.test/personas?token=x"]) {
    assert.throws(() => readProductionBridgeConfiguration({ ...hosted, COOPYA_ORACLE_BRIDGE_URL: url }),
      { code: "PRODUCTION_BRIDGE_URL_INVALID" });
  }
});

test("Vercel reports production bridge missing before an admin can accept", async () => {
  const handler = createImportHandler({ env: { ...env, VERCEL: "1", COOPYA_IMPORT_TOKEN: "test-token" },
    logger: { info() {}, error() {} } });
  const status = await handler(new Request("https://app.example.test/api/personas/importar"));
  const body = await status.json();
  assert.equal(body.transport, "oracle_prod");
  assert.equal(body.ready, false);
  assert.match(body.configurationMessage, /COOPYA_ORACLE_BRIDGE_URL/);
});

test("the bridge rejects missing token and delegates only authenticated person imports", async () => {
  const bridgeEnv = { ...env, COOPYA_IMPORT_TOKEN: "bridge-test-token" };
  let imports = 0;
  const handle = createBridgeHandler({ env: bridgeEnv, logger: { info() {}, error() {} },
    productionImport: async () => { imports += 1; return { confirmed: true, verified: true, idPersona: 99, operacion: "INSERCION" }; } });
  const post = (token) => new Request("http://127.0.0.1:8787/personas", {
    method: "POST", headers: { "X-Import-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify(persona),
  });
  assert.equal((await handle(post("incorrect"))).status, 401);
  assert.equal(imports, 0);
  const response = await handle(post("bridge-test-token"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).oracle.idPersona, 99);
  assert.equal(imports, 1);
});

test("hosted admin acceptance uses the HTTPS bridge and checks its Oracle confirmation", async () => {
  const hosted = { ...env, VERCEL: "1", COOPYA_IMPORT_TOKEN: "bridge-test-token",
    COOPYA_ORACLE_BRIDGE_URL: "https://bridge.example.test/personas" };
  const calls = [];
  const verified = { confirmed: true, verified: true, idPersona: 99, operacion: "INSERCION" };
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/auth/me") ? Response.json({ rol: "admin" }) : Response.json({ ok: true, oracle: verified });
  };
  const handler = createImportHandler({ env: hosted, fetchImpl, logger: { info() {}, error() {} } });
  const response = await handler(new Request("https://app.example.test/api/personas/importar", {
    method: "POST", headers: { authorization: "Bearer admin-session", "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).oracle.idPersona, 99);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, hosted.COOPYA_ORACLE_BRIDGE_URL);
  assert.equal(calls[1].options.headers["X-Import-Token"], hosted.COOPYA_IMPORT_TOKEN);
  assert.equal(calls[1].options.headers.Authorization, undefined);
  assert.deepEqual(await importPersonViaProductionBridge(persona, { env: hosted, fetchImpl: async () => Response.json({ ok: true, oracle: verified }) }), verified);
});
