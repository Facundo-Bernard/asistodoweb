/* global process */

import oracledb from "oracledb";

const nullableText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const nullableNumber = (value) => {
  const text = nullableText(value);
  if (!text) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const configurationFieldLabels = {
  user: "usuario",
  password: "contraseña",
  connectString: "connectString",
  personTypeId: "personTypeId",
  personStatusId: "personStatusId",
};

const readOracleConfiguration = () => {
  const rawConfiguration = nullableText(process.env.COOPYA_ORACLE_CONFIG);
  if (!rawConfiguration) {
    return { error: "Falta configurar COOPYA_ORACLE_CONFIG en Vercel." };
  }

  try {
    const configuration = JSON.parse(rawConfiguration);
    if (!configuration || Array.isArray(configuration)) {
      return { error: "COOPYA_ORACLE_CONFIG debe ser un objeto JSON válido." };
    }

    const requiredKeys = ["user", "password", "connectString", "personTypeId", "personStatusId"];
    const missing = requiredKeys.filter((key) => !nullableText(configuration[key]));
    if (missing.length) {
      return {
        error: `Faltan datos en COOPYA_ORACLE_CONFIG: ${missing.map((key) => configurationFieldLabels[key]).join(", ")}.`,
      };
    }

    return { configuration, error: "" };
  } catch {
    return { error: "COOPYA_ORACLE_CONFIG no contiene JSON válido." };
  }
};

export function getOracleConfigurationError() {
  if (!nullableText(process.env.COOPYA_IMPORT_TOKEN)) {
    return "Falta configurar COOPYA_IMPORT_TOKEN en Vercel.";
  }

  return readOracleConfiguration().error;
}

export async function importPersonIntoOracle(persona) {
  const { configuration, error: configurationError } = readOracleConfiguration();
  if (configurationError) throw new Error(configurationError);
  if (!nullableText(process.env.COOPYA_IMPORT_TOKEN)) throw new Error("Falta configurar COOPYA_IMPORT_TOKEN en Vercel.");

  let connection;

  try {
    connection = await oracledb.getConnection({
      user: configuration.user,
      password: configuration.password,
      connectString: configuration.connectString,
      connectTimeout: 15,
    });

    const result = await connection.execute(
      `BEGIN
        API_IMPORTAR_PERSONA(
          p_token => :p_token,
          p_tipo_doc => :p_tipo_doc,
          p_numero_doc => :p_numero_doc,
          p_cuil => :p_cuil,
          p_apellido => :p_apellido,
          p_nombre => :p_nombre,
          p_fecha_nac => :p_fecha_nac,
          p_calle => :p_calle,
          p_numero_calle => :p_numero_calle,
          p_piso => :p_piso,
          p_depto => :p_depto,
          p_id_codigo_postal => :p_id_codigo_postal,
          p_id_provincia => :p_id_provincia,
          p_telefono_numero => :p_telefono_numero,
          p_telefono_area => :p_telefono_area,
          p_telefono_observacion => :p_telefono_observacion,
          p_id_tipo_persona => :p_id_tipo_persona,
          p_id_estado_persona => :p_id_estado_persona,
          p_fecha_alta => :p_fecha_alta,
          p_fecha_baja => :p_fecha_baja,
          p_observacion => :p_observacion,
          p_sexo => :p_sexo,
          p_numero_ente => :p_numero_ente,
          p_id_prestador => :p_id_prestador,
          p_id_registro => :p_id_registro,
          p_id_usuario => :p_id_usuario,
          p_remuneracion => :p_remuneracion,
          p_mail => :p_mail,
          p_id_persona => :p_id_persona,
          p_operacion => :p_operacion
        );
      END;`,
      {
        p_token: process.env.COOPYA_IMPORT_TOKEN,
        p_tipo_doc: nullableNumber(persona.TipoDoc),
        p_numero_doc: nullableNumber(persona.NumeroDoc),
        p_cuil: nullableNumber(persona.Cuil),
        p_apellido: nullableText(persona.Apellido),
        p_nombre: nullableText(persona.Nombre),
        p_fecha_nac: nullableText(persona.FechaNac),
        p_calle: nullableText(persona.Calle),
        p_numero_calle: nullableText(persona.NumeroCalle),
        p_piso: nullableText(persona.Piso),
        p_depto: nullableText(persona.Dpto),
        p_id_codigo_postal: nullableNumber(persona.CP),
        p_id_provincia: nullableNumber(configuration.provinceId),
        p_telefono_numero: nullableText(persona.Tel1_Numero),
        p_telefono_area: nullableText(persona.Tel1_CodArea),
        p_telefono_observacion: null,
        p_id_tipo_persona: nullableNumber(configuration.personTypeId),
        p_id_estado_persona: nullableNumber(configuration.personStatusId),
        p_fecha_alta: nullableText(persona.fechaalta),
        p_fecha_baja: nullableText(persona.fechabaja),
        p_observacion: nullableText(persona.Observaciones),
        p_sexo: nullableText(persona.Sexo),
        p_numero_ente: nullableText(persona.NroEnte),
        p_id_prestador: nullableNumber(configuration.providerId),
        p_id_registro: nullableNumber(configuration.recordId),
        p_id_usuario: nullableText(configuration.userId),
        p_remuneracion: nullableNumber(persona.Remuneracion),
        p_mail: nullableText(persona.Mail),
        p_id_persona: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        p_operacion: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20 },
      },
    );

    return {
      idPersona: result.outBinds.p_id_persona,
      operacion: result.outBinds.p_operacion,
    };
  } finally {
    if (connection) await connection.close();
  }
}
