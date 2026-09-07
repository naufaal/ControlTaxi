export type Jornada = {
  id: string;
  fecha: string;
  ingresos: number;
  gastos: number;
  horas: number;
  km: number;
};

const KEY = "taxihoja:jornadas";
const USER_KEY = "taxihoja:usuario";

export function getUsuario(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function setUsuario(nombre: string) {
  window.localStorage.setItem(USER_KEY, nombre);
}

export function cerrarSesion() {
  window.localStorage.removeItem(USER_KEY);
}

export function getJornadas(): Jornada[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Jornada[]) : [];
  } catch {
    return [];
  }
}

export function saveJornadas(list: Jornada[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}
