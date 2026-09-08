import { supabase } from "@/integrations/supabase/client";

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

export async function cargarMovimientos(userId: string): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, fecha, tipo, concepto, importe")
    .eq("user_id", userId)
    .order("fecha", { ascending: false });
  if (error) throw error;

  const locales = getMovimientos();
  const remotos = (data ?? []) as Movimiento[];
  const remotosPorId = new Set(remotos.map((movimiento) => movimiento.id));
  const pendientes = locales.filter((movimiento) => !remotosPorId.has(movimiento.id));

  if (pendientes.length > 0) {
    const { error: migracionError } = await supabase.from("movimientos").insert(
      pendientes.map((movimiento) => ({ ...movimiento, user_id: userId })),
    );
    if (migracionError) throw migracionError;
  }

  const resultado = [...remotos, ...pendientes].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  saveMovimientos(resultado);
  return resultado;
}

export async function guardarMovimiento(
  userId: string,
  movimiento: Movimiento,
) {
  const { data, error } = await supabase
    .from("movimientos")
    .insert({
      ...movimiento,
      user_id: userId,
    })
    .select();

  console.log("SUPABASE DATA:", data);
  console.log("SUPABASE ERROR:", error);
  console.log("USER ID:", userId);

  if (error) throw error;

  return data;
}

export async function borrarMovimiento(userId: string, id: string) {
  const { error } = await supabase.from("movimientos").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}
