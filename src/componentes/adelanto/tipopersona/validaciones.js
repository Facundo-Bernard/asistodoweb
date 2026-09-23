const MINIMUM_INCOME = 100000;
const MAXIMUM_INCOME = 3000000;

export const onlyDigits = (value) => value.replace(/\D/g, "");

export const minimumAgeFor = (employment) => (employment === "retired" ? 30 : 18);

export function getDetailsErrors(details) {
  const age = Number(details.age);
  const income = Number(details.income);
  const minimumAge = minimumAgeFor(details.employment);
  const normalizedPhone = details.phone.replace(/\D/g, "");
  const normalizedName = details.fullName.trim().split(/\s+/).filter((part) => part.length >= 2);

  return {
    fullName: normalizedName.length >= 2 ? "" : "Ingresá nombre y apellido.",
    dni: /^\d{7,8}$/.test(details.dni) ? "" : "Ingresá un DNI válido de 7 u 8 dígitos.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim()) ? "" : "Ingresá un mail válido.",
    phone: /^\d{8,15}$/.test(normalizedPhone) ? "" : "Ingresá un teléfono válido.",
    address: /^(?=.*\d).{6,}$/.test(details.address.trim()) ? "" : "Ingresá una dirección con altura.",
    gender: details.gender ? "" : "Elegí una opción.",
    age: Number.isInteger(age) && age >= minimumAge && age <= 100
      ? ""
      : `Ingresá una edad entre ${minimumAge} y 100 años.`,
    employment: details.employment ? "" : "Elegí una situación laboral.",
    income: Number.isInteger(income) && income >= MINIMUM_INCOME && income <= MAXIMUM_INCOME
      ? ""
      : "El ingreso debe estar entre $100.000 y $3.000.000.",
  };
}
