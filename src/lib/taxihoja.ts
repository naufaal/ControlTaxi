import { supabase } from "@/integrations/supabase/client";

export type Movimiento = {
  id?: string;
  user_id?: string;
  tipo: "ingreso" | "gasto";
  importe: number;
  concepto: string;
  categoria?: string;
  formaPago?: string;
  fecha: string;
};

export type TurnoGuardado = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  ingresos: number;
  gastos: number;
  neto: number;
};

export function eur(valor: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(valor);
}

export async function cargarMovimientos() {
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, user_id, tipo, importe, concepto, categoria, forma_pago, fecha")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error al cargar movimientos:", error);
    throw error;
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    tipo: m.tipo,
    importe: Number(m.importe),
    concepto: m.concepto,
    categoria: m.categoria,
    formaPago: m.forma_pago,
    fecha: m.fecha,
  }));
}

export async function guardarMovimiento(mov: any) {
  const { data: { user } } = await supabase.auth.getUser();

  // Si por error pasas un evento de formulario (onSubmit), extraemos los datos automáticamente con FormData
  let datos = mov;
  if (mov && (mov.nativeEvent || mov instanceof Event || mov?.target?.tagName === "FORM")) {
    const form = mov.target?.tagName === "FORM" ? mov.target : mov.currentTarget;
    if (form) {
      const formData = new FormData(form);
      datos = Object.fromEntries(formData.entries());
    }
  }

  // Buscamos las propiedades sin importar cómo las llame el formulario o el objeto
  const importeRaw = datos?.importe ?? datos?.monto ?? datos?.amount ?? datos?.valor ?? 0;
  const conceptoRaw = datos?.concepto ?? datos?.descripcion ?? datos?.title ?? datos?.nombre ?? "Sin concepto";
  const tipoRaw = datos?.tipo ?? datos?.type ?? "ingreso";
  const categoriaRaw = datos?.categoria ?? datos?.category ?? null;
  const formaPagoRaw = datos?.formaPago ?? datos?.forma_pago ?? datos?.metodoPago ?? null;
  const fechaRaw = datos?.fecha ?? datos?.date ?? new Date().toISOString();

  const payload = {
    id: datos?.id || crypto.randomUUID(),
    user_id: user?.id || datos?.user_id || null,
    tipo: tipoRaw,
    importe: Number(importeRaw) || 0,
    concepto: String(conceptoRaw).trim() || "Sin concepto",
    categoria: categoriaRaw,
    forma_pago: formaPagoRaw,
    fecha: fechaRaw,
  };

  console.log("🚀 Payload final enviado a Supabase:", payload);

  const { data, error } = await supabase
    .from("movimientos")
    .upsert(payload)
    .select();

  if (error) {
    console.error("❌ Error detallado de Supabase:", error);
    throw error;
  }

  return data;
}

export async function borrarMovimiento(userId: string, id: string) {
  const { error } = await (supabase as any)
    .from("movimientos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error al borrar movimiento:", error);
    throw error;
  }
}

export async function cargarTurnos(userId: string): Promise<TurnoGuardado[]> {
  const { data, error } = await (supabase as any)
    .from("turnos_historial")
    .select("id, fecha_inicio, fecha_fin, ingresos, gastos, neto")
    .eq("user_id", userId)
    .order("fecha_fin", { ascending: false });

  if (error) {
    console.error("Error al cargar turnos de Supabase:", error);
    throw error;
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    fechaInicio: t.fecha_inicio,
    fechaFin: t.fecha_fin,
    ingresos: Number(t.ingresos),
    gastos: Number(t.gastos),
    neto: Number(t.neto),
  }));
}

export async function guardarTurnoSupabase(userId: string, t: TurnoGuardado) {
  const { error } = await (supabase as any).from("turnos_historial").insert([
    {
      id: t.id,
      user_id: userId,
      fecha_inicio: t.fechaInicio,
      fecha_fin: t.fechaFin,
      ingresos: t.ingresos,
      gastos: t.gastos,
      neto: t.neto,
    },
  ]);

  if (error) {
    console.error("Error al guardar turno en Supabase:", error);
    throw error;
  }
}

export function obtenerUltimoCorteTurno(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("taxihoja:ultimo_corte");
}

export function guardarUltimoCorteTurno(fechaIso: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("taxihoja:ultimo_corte", fechaIso);
}