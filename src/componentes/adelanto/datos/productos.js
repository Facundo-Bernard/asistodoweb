export const BANKS = [
  { id: "nacion", name: "Banco Nación" },
  { id: "provincia", name: "Banco Provincia (BAPRO)" },
  { id: "galicia", name: "Banco Galicia" },
  { id: "santander", name: "Banco Santander" },
  { id: "macro", name: "Banco Macro" },
];

export const ELIGIBLE_BANK_IDS = new Set(["nacion", "provincia"]);

const SERVICE_PLAN_IDS = Object.freeze({
  "ANSES Signature:100000": 1306,
  "ANSES Signature:150000": 1307,
  "ANSES Signature:200000": 1301,
  "ANSES Signature:240000": 1302,
  "ANSES Signature:300000": 1308,
  "Asistodo:100000": 1310,
  "Asistodo:150000": 1311,
  "Asistodo:200000": 1312,
  "Asistodo:250000": 1313,
  "Asistodo:300000": 1314,
  "Asistodo:350000": 1315,
  "Asistodo:400000": 1316,
  "Asistodo:450000": 1317,
  "Asistodo:500000": 1318,
  "Asistodo:550000": 1319,
  "Asistodo:600000": 1320,
  "Asistodo:650000": 1321,
  "Asistodo:700000": 1322,
  "Asistodo:750000": 1323,
  "Asistodo:800000": 1324,
  "Asistodo:850000": 1325,
  "Asistodo:900000": 1326,
  "Asistodo:950000": 1327,
  "Asistodo:1000000": 1328,
});

const ANSES_SIGNATURE_PRODUCTS = [
  { id: "signature-100", amount: 100000, installments: [{ months: 18, payment: 17129 }] },
  { id: "signature-150", amount: 150000, installments: [{ months: 18, payment: 25750 }] },
  { id: "signature-200", amount: 200000, installments: [{ months: 24, payment: 30985 }] },
  { id: "signature-240", amount: 240000, installments: [{ months: 24, payment: 37183 }] },
  { id: "signature-300", amount: 300000, installments: [{ months: 30, payment: 40365 }] },
];

const ASISTODO_PRODUCTS = [
  { id: "classic-100", plan: "Classic", amount: 100000, installments: [{ months: 9, payment: 36695 }, { months: 12, payment: 34260 }] },
  { id: "classic-150", plan: "Classic", amount: 150000, installments: [{ months: 9, payment: 55045 }, { months: 12, payment: 52220 }] },
  { id: "classic-200", plan: "Classic", amount: 200000, installments: [{ months: 9, payment: 73390 }, { months: 12, payment: 70000 }] },
  { id: "classic-250", plan: "Classic", amount: 250000, installments: [{ months: 9, payment: 91740 }, { months: 12, payment: 85645 }] },
  { id: "classic-300", plan: "Classic", amount: 300000, installments: [{ months: 9, payment: 110085 }, { months: 12, payment: 102770 }] },
  { id: "classic-350", plan: "Classic", amount: 350000, installments: [{ months: 9, payment: 128435 }, { months: 12, payment: 119900 }] },
  { id: "classic-400", plan: "Classic", amount: 400000, installments: [{ months: 9, payment: 146780 }, { months: 12, payment: 137030 }] },
  { id: "classic-450", plan: "Classic", amount: 450000, installments: [{ months: 9, payment: 165115 }, { months: 12, payment: 154160 }] },
  { id: "premium-500", plan: "Premium Transfer", amount: 500000, installments: [{ months: 9, payment: 183475 }, { months: 12, payment: 171285 }, { months: 15, payment: 163105 }] },
  { id: "premium-550", plan: "Premium Transfer", amount: 550000, installments: [{ months: 9, payment: 201825 }, { months: 12, payment: 188415 }, { months: 15, payment: 179415 }] },
  { id: "premium-600", plan: "Premium Transfer", amount: 600000, installments: [{ months: 9, payment: 220170 }, { months: 12, payment: 205545 }, { months: 15, payment: 195125 }] },
  { id: "premium-650", plan: "Premium Transfer", amount: 650000, installments: [{ months: 9, payment: 238520 }, { months: 12, payment: 222670 }, { months: 15, payment: 211990 }] },
  { id: "premium-700", plan: "Premium Transfer", amount: 700000, installments: [{ months: 9, payment: 256865 }, { months: 12, payment: 239800 }, { months: 15, payment: 228340 }] },
  { id: "premium-750", plan: "Premium Transfer", amount: 750000, installments: [{ months: 9, payment: 275215 }, { months: 12, payment: 256930 }, { months: 15, payment: 244660 }] },
  { id: "gold-800", plan: "Gold", amount: 800000, installments: [{ months: 9, payment: 293560 }, { months: 12, payment: 274060 }, { months: 15, payment: 260970 }] },
  { id: "gold-850", plan: "Gold", amount: 850000, installments: [{ months: 9, payment: 312180 }, { months: 12, payment: 291185 }, { months: 15, payment: 277270 }] },
  { id: "gold-900", plan: "Gold", amount: 900000, installments: [{ months: 9, payment: 330255 }, { months: 12, payment: 308310 }, { months: 15, payment: 293580 }] },
  { id: "gold-950", plan: "Gold", amount: 950000, installments: [{ months: 9, payment: 348605 }, { months: 12, payment: 325440 }, { months: 15, payment: 309890 }] },
  { id: "gold-1000", plan: "Gold", amount: 1000000, installments: [{ months: 9, payment: 366950 }, { months: 12, payment: 342570 }, { months: 15, payment: 326210 }] },
];

export const formatCurrency = (amount) => new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
}).format(amount);

export function getExternalServicePlanId(product) {
  if (!product?.familia || !product?.monto) return null;
  return SERVICE_PLAN_IDS[`${product.familia}:${Number(product.monto)}`] || null;
}

export function getAvailableProductGroups({ employment, income }) {
  const productsWithAffordableInstallments = (products) => products
    .map((product) => ({
      ...product,
      installments: product.installments.filter((installment) => installment.payment <= income * 0.35),
    }))
    .filter((product) => product.installments.length > 0);

  if (employment === "retired") {
    return [
      {
        title: "ANSES Signature",
        description: "Opciones disponibles hasta $300.000.",
        products: productsWithAffordableInstallments(
          ANSES_SIGNATURE_PRODUCTS.filter((product) => product.amount <= Math.min(income, 300000)),
        ),
      },
      {
        title: "Asistodo",
        description: "Opciones desde $350.000 para jubilados con ingresos mayores a $300.000.",
        products: income > 300000
          ? productsWithAffordableInstallments(ASISTODO_PRODUCTS.filter((product) => product.amount > 300000 && product.amount <= income))
          : [],
      },
    ].filter((group) => group.products.length > 0);
  }

  if (employment === "graciable") {
    return [{
      title: "Asistodo",
      description: "Las pensiones graciables no acceden a productos ANSES.",
      products: productsWithAffordableInstallments(ASISTODO_PRODUCTS.filter((product) => product.amount <= income)),
    }].filter((group) => group.products.length > 0);
  }

  return [{
    title: "Asistodo",
    description: "Opciones disponibles para cobrar por Banco Nación o BAPRO.",
    products: productsWithAffordableInstallments(ASISTODO_PRODUCTS.filter((product) => product.amount <= income)),
  }].filter((group) => group.products.length > 0);
}
