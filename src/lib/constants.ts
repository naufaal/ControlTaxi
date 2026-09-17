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
  CircleDollarSign,
  Gift,
  Tag,
} from "lucide-react";

export const FORMAS_PAGO = [
  { id: "efectivo", nombre: "Efectivo", icon: Banknote },
  { id: "tarjeta", nombre: "Tarjeta", icon: CreditCard },
  { id: "emisora", nombre: "Emisora", icon: Radio },
  { id: "bizum", nombre: "Bizum", icon: Send },
];

export const CATEGORIAS_INGRESOS = [
  { id: "carrera", nombre: "Carrera", icon: CircleDollarSign },
  { id: "aeropuerto", nombre: "Aeropuerto", icon: CircleDollarSign },
  { id: "estacion", nombre: "Estación", icon: CircleDollarSign },
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

export function getIconoMovimiento(categoriaOrTexto?: string, formaPago?: string) {
  // 1. Si se proporciona la forma de pago, tiene prioridad para mostrar su icono específico
  if (formaPago) {
    const p = formaPago.toLowerCase();
    if (p.includes("efectivo")) return Banknote;
    if (p.includes("tarjeta")) return CreditCard;
    if (p.includes("emisora")) return Radio;
    if (p.includes("bizum")) return Send;
  }

  if (!categoriaOrTexto) return Tag;
  const k = categoriaOrTexto.toLowerCase();

  // 2. Comprobaciones en el texto (concepto o categoría)
  if (k.includes("efectivo")) return Banknote;
  if (k.includes("tarjeta")) return CreditCard;
  if (k.includes("emisora")) return Radio;
  if (k.includes("bizum")) return Send;
  if (k.includes("combustible")) return Fuel;
  if (k.includes("lavado")) return Sparkles;
  if (k.includes("taller")) return Wrench;
  if (k.includes("parking")) return ParkingMeter;
  if (k.includes("peaje")) return Receipt;
  if (k.includes("otros")) return MoreHorizontal;
  if (k.includes("propina")) return Gift;

  return CircleDollarSign;
}