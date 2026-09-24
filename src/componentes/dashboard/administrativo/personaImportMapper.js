import { getExternalServicePlanId } from "../../adelanto/datos/productos.js";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const splitFullName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { nombre: parts[0] || "", apellido: "" };

  return {
    nombre: parts.slice(0, -1).join(" ").toUpperCase(),
    apellido: parts.at(-1).toUpperCase(),
  };
};

const splitAddress = (address) => {
  const normalizedAddress = String(address || "").trim();
  const match = normalizedAddress.match(/^(.*\S)\s+(\d+[A-Za-z]?)$/);

  return {
    calle: match ? match[1] : normalizedAddress,
    numero: match ? match[2] : "",
  };
};

const splitPhone = (phone) => {
  let normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (normalizedPhone.startsWith("54")) normalizedPhone = normalizedPhone.slice(2);
  if (normalizedPhone.startsWith("9") && normalizedPhone.length > 10) normalizedPhone = normalizedPhone.slice(1);

  if (normalizedPhone.startsWith("11") && normalizedPhone.length > 8) {
    return { areaCode: "11", number: normalizedPhone.slice(2) };
  }

  return { areaCode: "", number: normalizedPhone };
};

export function buildExternalPerson(candidate) {
  const servicePlanId = getExternalServicePlanId(candidate.productoSeleccionado);
  if (!servicePlanId) throw new Error("No encontramos el ID de tabla del producto seleccionado.");

  const { nombre, apellido } = splitFullName(candidate.nombreCompleto);
  const { calle, numero } = splitAddress(candidate.direccion);
  const { areaCode, number } = splitPhone(candidate.telefono);

  return {
    TipoDoc: 1,
    NumeroDoc: String(candidate.dni || ""),
    NroEnte: null,
    TipoCuit: null,
    Cuil: "",
    Estado: 1,
    Apellido: apellido,
    Nombre: nombre,
    Tipo: 57,
    Organismo: 1146,
    Razon: 1,
    codigoasentamiento: "",
    Calle: calle,
    NumeroCalle: numero,
    Piso: "",
    Dpto: "",
    CP: "",
    Observaciones: null,
    FechaNac: null,
    Sexo: candidate.genero === "female" ? 2 : candidate.genero === "male" ? 1 : null,
    Remuneracion: Number(candidate.ingresoMensual) || 0,
    Mail: String(candidate.email || ""),
    Planid_CuotaSocial: 1,
    PlanId_ServEsp: servicePlanId,
    CapitalSocial: 1,
    fechaalta: todayIsoDate(),
    fechaAsociado: null,
    fechabaja: null,
    Tel1_Tipo: number ? 1 : null,
    Tel1_CodArea: areaCode,
    Tel1_Numero: number,
    Tel2_Tipo: null,
    Tel2_CodArea: null,
    Tel2_Numero: null,
    Medio1_Tipo: null,
    Medio1_Valor: null,
    Medio1_predeterminado: null,
    Medio1_Banco: null,
    Medio2_Tipo: null,
    Medio2_Valor: null,
    Medio2_Predeterminado: null,
    Medio2_Banco: null,
    IdPersona: null,
    NroSocio: null,
  };
}
