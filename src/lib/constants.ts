import {
  Banknote,
  CreditCard,
  Radio,
  Send,
  Fuel,
  Wrench,
  Sparkles,
  ParkingMeter,
  Receipt,
  MoreHorizontal,
  Car,
  Plane,
  Train,
  Gift,
} from "lucide-react";

export const FORMAS_PAGO = [
  { id: "efectivo", nombre: "Efectivo", icon: Banknote },
  { id: "tarjeta", nombre: "Tarjeta", icon: CreditCard },
  { id: "emisora", nombre: "Emisora", icon: Radio },
  { id: "bizum", nombre: "Bizum", icon: Send },
];

export const CATEGORIAS_INGRESOS = [
  { id: "carrera", nombre: "Carrera", icon: Car },
  { id: "aeropuerto", nombre: "Aeropuerto", icon: Plane },
  { id: "estacion", nombre: "Estación", icon: Train },
  { id: "propina", nombre: "Propina", icon: Gift },
];

export const CATEGORIAS_GASTOS = [
  { id: "combustible", nombre: "Combustible", icon: Fuel },
  { id: "lavado", nombre: "Lavado", icon: Sparkles },
  { id: "taller", nombre: "Taller", icon: Wrench },
  { id: "parking", nombre: "Parking", icon: ParkingMeter },
  { id: "peaje", nombre: "Peaje", icon: Receipt },
  { id: "otros", nombre: "Otros", icon: MoreHorizontal },
];

// Función enfocada exclusivamente en el concepto/categoría para el icono principal de la izquierda
export function getIconoMovimiento(key?: string) {
  if (!key) return Car;
  const k = key.toLowerCase();

  if (k.includes("aeropuerto")) return Plane;
  if (k.includes("estacion") || k.includes("estación") || k.includes("tren")) return Train;
  if (k.includes("propina")) return Gift;
  if (k.includes("combustible") || k.includes("gasolina")) return Fuel;
  if (k.includes("lavado")) return Sparkles;
  if (k.includes("taller") || k.includes("reparación")) return Wrench;
  if (k.includes("parking")) return ParkingMeter;
  if (k.includes("peaje")) return Receipt;
  if (k.includes("otros")) return MoreHorizontal;
  if (k.includes("carrera")) return Car;

  return Car; // Icono por defecto (coche) para cualquier otro concepto personalizado
}