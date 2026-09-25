// Revision estatica del entregable, NO compilacion ni ejecucion Oracle/ORDS.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../docs/oracle19c/${name}`, import.meta.url), 'utf8');
const install = read('publicar-persona-ords.sql');
const configure = read('configurar-persona-ords.sql');
const activate = read('activar-persona-ords.sql');
const smoke = read('probar-sin-insertar.sql');
const columns = 'IDPERSONA IDDOCUMENTO_TIPO DOCUMENTO_NRO CUIL APELLIDO NOMBRE FECHANACIMIENTO CALLE CALLE_NRO PISO DEPTO IDCODIGOPOSTAL IDPROVINCIA TELEFONO_NRO IDTIPOPERSONA IDESTADOPERSONA FECHAALTA FECHABAJA OBSERVACION IDSEXO NUMEROENTE IDPRESTADOR IDREGISTRO IDUSUARIO TELEFONO_AREA TELEFONO_OBSERVACION REMUNERACION MAIL'.split(' ');

test('INSERT de API cubre las 28 columnas verificadas y asigna todos sus valores', () => {
  const [, names, values] = install.match(/INSERT INTO PRESTAPROD\.PERSONA\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/);
  assert.deepEqual(names.split(',').map(s => s.trim()), columns);
  assert.equal(values.split(',').length, columns.length);
  for (const column of columns) assert.match(install, new RegExp(`L_ROW\\.${column} :=`));
});

test('dos rutas POST explicitas, ambas protegidas por cabecera', () => {
  assert.equal((install.match(/ORDS\.DEFINE_HANDLER\(/g) || []).length, 2);
  assert.equal((install.match(/p_name => 'X-Import-Token'/g) || []).length, 2);
  assert.equal((install.match(/IF P_TOKEN IS NULL OR P_TOKEN <> L_CONFIG.TOKEN THEN/g) || []).length, 3);
  assert.equal((install.match(/:body_text/g) || []).length, 1);
  assert.ok(install.includes('ASISTODO_WEB_COMPROBAR(:import_token'));
  assert.ok(install.includes('ASISTODO_WEB_INSERTAR(:import_token'));
});

test('comprobacion no realiza DML, commit ni consume secuencias', () => {
  const checker = install.split('CREATE OR REPLACE PROCEDURE PRESTAPROD.ASISTODO_WEB_COMPROBAR')[1].split('\n/')[0];
  assert.doesNotMatch(checker, /\b(?:INSERT INTO|UPDATE PRESTAPROD|DELETE FROM|COMMIT|ROLLBACK|NEXTVAL)\b/);
  assert.match(checker, /'insertEnabled'/);
  assert.match(checker, /WHERE 1 = 0/);
});

test('instalar y configurar no activan inserciones ni modifican objetos previos', () => {
  assert.doesNotMatch(install, /SET ACTIVO = 1/);
  assert.match(configure, /C\.ACTIVO = 0/);
  assert.match(configure, /L_TOKEN VARCHAR2\(200\) := :token/);
  assert.match(activate, /IF L_STATUS <> 200 THEN/);
  assert.match(activate, /SET ACTIVO = 1/);
  for (const text of [install, configure, activate]) {
    assert.doesNotMatch(text, /\bGRANT\b[\s\S]*?\bTO PUBLIC\b/i);
    assert.doesNotMatch(text, /ORDS\.ENABLE_OBJECT|\bDROP TABLE\b/i);
    assert.doesNotMatch(text, /CREATE OR REPLACE PROCEDURE\s+(?:PRESTAPROD\.)?API_IMPORTAR_PERSONA/);
    assert.doesNotMatch(text, /[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i);
  }
});

test('validacion y duplicados preceden a NEXTVAL y COMMIT precede al exito', () => {
  const insert = install.indexOf('INSERT INTO PRESTAPROD.PERSONA');
  assert.ok(install.indexOf("'DOCUMENT_EXISTS'") < insert);
  assert.ok(install.indexOf('IS JSON STRICT WITH UNIQUE KEYS') < insert);
  assert.ok(install.indexOf('LENGTHB(V_TEXT)') < insert);
  assert.match(install, /COMMIT;\s*O_STATUS := 201;/);
  assert.match(install, /EXCEPTION WHEN OTHERS THEN\s*L_SQLCODE := SQLCODE;\s*ROLLBACK;/);
});

test('pruebas entregadas nunca contienen un documento valido para insertar', () => {
  assert.match(smoke, /ASSERT_STATUS\(401, 'insertar sin token'\)/);
  assert.match(smoke, /ASSERT_STATUS\(400, 'propiedades JSON duplicadas'\)/);
  assert.doesNotMatch(smoke, /INSERT INTO PRESTAPROD\.PERSONA|NEXTVAL|'Nombre'|'Apellido'/);
});
