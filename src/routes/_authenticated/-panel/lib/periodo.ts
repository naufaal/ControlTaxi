import type { Periodo } from "../types";

export function obtenerDiaLaboral(fechaStr: string): string {
  const fecha = new Date(fechaStr);
  const horaLocal = parseInt(
    fecha.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }),
    10
  );
  if (horaLocal < 6) {
    fecha.setDate(fecha.getDate() - 1);
  }
  return fecha.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
}

export function perteneceAlPeriodo(
  fechaMovimiento: string,
  periodo: Periodo,
  rangoFechas: { inicio: string; fin: string }
): boolean {
  const diaLaboralMov = obtenerDiaLaboral(fechaMovimiento);
  const hoyStr = obtenerDiaLaboral(new Date().toISOString());

  if (periodo === "personalizado") {
    if (!rangoFechas.inicio) return true;
    const fFin = rangoFechas.fin || rangoFechas.inicio;
    return diaLaboralMov >= rangoFechas.inicio && diaLaboralMov <= fFin;
  }

  if (periodo === "dia") return diaLaboralMov === hoyStr;

  const fecha = new Date(fechaMovimiento);
  const hoy = new Date();

  if (periodo === "semana") {
    const inicio = new Date(hoy);
    inicio.setHours(0, 0, 0, 0);
    const diasDesdeLunes = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diasDesdeLunes);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return fecha >= inicio && fecha < fin;
  }

  return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
}