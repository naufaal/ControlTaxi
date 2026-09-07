export type Movimiento = {
  id: string;
  fecha: string;
  tipo: "ingreso" | "gasto";
  concepto: string;
  importe: number;
};

const KEY = "taxihoja:movimientos";

export function getMovimientos(): Movimiento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Movimiento[]) : [];
  } catch {
    return [];
  }
}

export function saveMovimientos(list: Movimiento[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}
