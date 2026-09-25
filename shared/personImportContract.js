export const IMPORT_SERVICE = "asistodo-personas";
export const IMPORT_VERSION = "2026-09-24.2";

export function isOracleConfirmed(oracle) {
  return oracle?.confirmed === true
    && oracle.verified === true
    && Number.isSafeInteger(oracle.idPersona)
    && oracle.idPersona > 0
    && ["INSERCION", "ACTUALIZACION"].includes(oracle.operacion);
}
