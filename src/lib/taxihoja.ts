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

export async function guardarMovimiento(arg1: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any, arg6?: any) {
  const { data: { user } } = await supabase.auth.getUser();

  let tipoVal = "ingreso";
  let importeVal = 0;
  let conceptoVal = "Sin concepto";
  let categoriaVal = null;
  let formaPagoVal = null;
  let fechaVal = new Date().toISOString();
  let idVal = crypto.randomUUID();
  let userIdVal = user?.id || null;

  // CASO 1: Si pasan un Evento de Formulario (onSubmit)
  if (arg1 && (arg1.nativeEvent || arg1 instanceof Event || arg1?.target?.tagName === "FORM")) {
    const form = arg1.target?.tagName === "FORM" ? arg1.target : arg1.currentTarget;
    if (form) {
      const formData = new FormData(form);
      const obj = Object.fromEntries(formData.entries());
      importeVal = obj.importe ?? obj.monto ?? obj.amount ?? obj.valor ?? 0;
      conceptoVal = obj.concepto ?? obj.descripcion ?? obj.title ?? obj.nombre ?? "Sin concepto";
      tipoVal = obj.tipo ?? obj.type ?? "ingreso";
      categoriaVal = obj.categoria ?? obj.category ?? null;
      formaPagoVal = obj.formaPago ?? obj.forma_pago ?? obj.metodoPago ?? null;
      fechaVal = obj.fecha ?? obj.date ?? new Date().toISOString();
      if (obj.id) idVal = obj.id;
      if (obj.user_id) userIdVal = obj.user_id;
    }
  } 
  // CASO 2: Si pasan un Objeto único (ej: guardarMovimiento({ importe: 10, concepto: 'Gasolina' }))
  else if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
    const obj = arg1;
    importeVal = obj.importe ?? obj.monto ?? obj.amount ?? obj.valor ?? 0;
    conceptoVal = obj.concepto ?? obj.descripcion ?? obj.title ?? obj.nombre ?? "Sin concepto";
    tipoVal = obj.tipo ?? obj.type ?? "ingreso";
    categoriaVal = obj.categoria ?? obj.category ?? null;
    formaPagoVal = obj.formaPago ?? obj.forma_pago ?? obj.metodoPago ?? null;
    fechaVal = obj.fecha ?? obj.date ?? new Date().toISOString();
    if (obj.id) idVal = obj.id;
    if (obj.user_id) userIdVal = obj.user_id;
  } 
  // CASO 3: Si pasan argumentos separados por comas (ej: guardarMovimiento('ingreso', 25, 'Carrera'))
  else if (arg1 !== undefined || arg2 !== undefined) {
    if (typeof arg1 === "string" && (arg1 === "ingreso" || arg1 === "gasto")) {
      tipoVal = arg1;
      importeVal = arg2 ?? 0;
      conceptoVal = arg3 ?? "Sin concepto";
      categoriaVal = arg4 ?? null;
      formaPagoVal = arg5 ?? null;
      fechaVal = arg6 ?? new Date().toISOString();
    } else {
      importeVal = arg1 ?? 0;
      conceptoVal = arg2 ?? "Sin concepto";
      tipoVal = arg3 ?? "ingreso";
      categoriaVal = arg4 ?? null;
      formaPagoVal = arg5 ?? null;
      fechaVal = arg6 ?? new Date().toISOString();
    }
  }

  const payload = {
    id: idVal,
    user_id: userIdVal,
    tipo: tipoVal,
    importe: Number(importeVal) || 0,
    concepto: String(conceptoVal).trim() || "Sin concepto",
    categoria: categoriaVal,
    forma_pago: formaPagoVal,
    fecha: fechaVal,
  };

  console.log("🔥 [PAYLOAD DEFINITIVO] Enviando a Supabase:", payload);

  const { data, error } = await supabase
    .from("movimientos")
    .upsert(payload)
    .select();

  if (error) {
    console.error("❌ Error de Supabase:", error);
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