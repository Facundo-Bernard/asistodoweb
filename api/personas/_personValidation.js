import { ImportError } from "./_diagnostics.js";

export function validateOraclePerson(persona) {
  const problems = [];
  for (const key of ["TipoDoc", "NumeroDoc"]) {
    const value = persona[key];
    if (!["number", "string"].includes(typeof value) || !/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) problems.push(`${key} debe ser un entero positivo`);
  }
  for (const [key, limit] of Object.entries({ Apellido: 50, Nombre: 50, Calle: 50, NumeroCalle: 20, Piso: 5, Dpto: 5, Tel1_Numero: 40, Tel1_CodArea: 5, Observaciones: 100, Sexo: 1, NroEnte: 20, Mail: 50 })) {
    const value = persona[key];
    if (value != null && !["string", "number"].includes(typeof value)) problems.push(`${key} tiene un tipo inválido`);
    else if (value != null && new TextEncoder().encode(String(value).trim()).length > limit) problems.push(`${key} supera ${limit} bytes permitidos por Oracle`);
  }
  for (const key of ["FechaNac"]) {
    const value = persona[key];
    if (value == null || value === "") continue;
    const date = new Date(`${value}T00:00:00Z`);
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) problems.push(`${key} debe ser una fecha válida YYYY-MM-DD`);
  }
  if (problems.length) throw new ImportError("PERSON_VALIDATION", `Revisá los campos antes de importar: ${problems.join("; ")}.`, { status: 422 });
}
