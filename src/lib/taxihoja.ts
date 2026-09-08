import { supabase } from "@/integrations/supabase/client";

export type Movimiento = {
  id: string;
  fecha: string;
  tipo: "ingreso" | "gasto";
  concepto: string;
  importe: number;
};

const KEY = "taxihoja:movimientos";

// --- FUNCIONES CONECTADAS A SUPABASE ---

export async function cargarMovimientos(userId: string): Promise<Movimiento[]> {
  const { data, error } = await (supabase as any)
    .from("movimientos")
    .select("id, fecha, tipo, concepto, importe")
    .eq("user_id", userId)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error al cargar de Supabase:", error);
    throw error;
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    fecha: m.fecha,
    tipo: m.tipo as "ingreso" | "gasto",
    concepto: m.concepto,
    importe: Number(m.importe),
  }));
}

export async function guardarMovimiento(userId: string, m: Movimiento) {
  const { error } = await (supabase as any).from("movimientos").insert([
    {
      id: m.id,
      user_id: userId,
      fecha: m.fecha,
      tipo: m.tipo,
      concepto: m.concepto,
      importe: m.importe,
    },
  ]);

  if (error) {
    console.error("Error al guardar en Supabase:", error);
    throw error;
  }
}

export async function borrarMovimiento(userId: string, id: string) {
  const { error } = await (supabase as any)
    .from("movimientos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error al borrar en Supabase:", error);
    throw error;
  }
}

// --- FUNCIONES LOCALES (RESPALDO Y FORMATO) ---

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
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}