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

export function buildOraclePerson(candidate) {
  const { nombre, apellido } = splitFullName(candidate.nombreCompleto);
  const { calle, numero } = splitAddress(candidate.direccion);
  const { areaCode, number } = splitPhone(candidate.telefono);

  return {
    TipoDoc: 1,
    NumeroDoc: String(candidate.dni || ""),
    NroEnte: null,
    Cuil: null,
    Apellido: apellido,
    Nombre: nombre,
    Calle: calle,
    NumeroCalle: numero,
    Piso: "",
    Dpto: "",
    IdCodigoPostal: null,
    IdProvincia: null,
    Observaciones: null,
    FechaNac: null,
    Sexo: candidate.genero === "female" ? 2 : candidate.genero === "male" ? 1 : null,
    Remuneracion: Number(candidate.ingresoMensual) || 0,
    Mail: String(candidate.email || ""),
    Tel1_CodArea: areaCode,
    Tel1_Numero: number,
  };
}
