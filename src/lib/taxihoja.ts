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

// Función auxiliar para extraer texto o valores si el formulario pasa objetos
function extractPrimitive(val: any, fallback: any = ""): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    // Busca propiedades comunes en objetos de selección (label, name, concepto, value, id)
    return (
      val.label ??
      val.name ??
      val.concepto ??
      val.descripcion ??
      val.value ??
      val.id ??
      fallback
    );
  }
  return val;
}

// Función para limpiar y convertir el importe de forma segura
function parseImporte(val: any): number {
  const raw = extractPrimitive(val, 0);
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
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

  let datos: any = {};

  // Analizamos cómo vienen los datos (Evento de formulario, Objeto único o Argumentos separados)
  if (arg1 && (arg1.nativeEvent || arg1 instanceof Event || arg1?.target?.tagName === "FORM")) {
    const form = arg1.target?.tagName === "FORM" ? arg1.target : arg1.currentTarget;
    if (form) {
      const formData = new FormData(form);
      datos = Object.fromEntries(formData.entries());
    }
  } else if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
    datos = arg1;
  } else if (arg1 !== undefined || arg2 !== undefined) {
    if (typeof arg1 === "string" && (arg1 === "ingreso" || arg1 === "gasto")) {
      datos = { tipo: arg1, importe: arg2, concepto: arg3, categoria: arg4, formaPago: arg5, fecha: arg6 };
    } else {
      datos = { importe: arg1, concepto: arg2, tipo: arg3, categoria: arg4, formaPago: arg5, fecha: arg6 };
    }
  }

  // Extraemos y limpiamos cada campo de forma segura (desempaquetando objetos si los hubiera)
  const importeVal = parseImporte(datos.importe ?? datos.monto ?? datos.amount ?? datos.valor);
  const conceptoRaw = extractPrimitive(datos.concepto ?? datos.descripcion ?? datos.title ?? datos.nombre, "Sin concepto");
  const tipoRaw = extractPrimitive(datos.tipo ?? datos.type, "ingreso");
  const categoriaRaw = extractPrimitive(datos.categoria ?? datos.category, null);
  const formaPagoRaw = extractPrimitive(datos.formaPago ?? datos.forma_pago ?? datos.metodoPago, null);
  const fechaRaw = extractPrimitive(datos.fecha ?? datos.date, new Date().toISOString());

  const payload = {
    id: extractPrimitive(datos.id, crypto.randomUUID()),
    user_id: user?.id || extractPrimitive(datos.user_id, null),
    tipo: tipoRaw === "gasto" ? "gasto" : "ingreso",
    importe: importeVal > 0 ? importeVal : 0,
    concepto: String(conceptoRaw).trim() || "Sin concepto",
    categoria: categoriaRaw ? String(categoriaRaw) : null,
    forma_pago: formaPagoRaw ? String(formaPagoRaw) : null,
    fecha: fechaRaw,
  };

  console.log("🚀 [PAYLOAD LIMPIO] Enviando a Supabase:", payload);

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

// 🟢 FUNCIÓN REGISTRAR MOVIMIENTO AÑADIDA AQUÍ ABAJO
export async function registrarMovimiento(turnoId: string, monto: number, tipo: "ingreso" | "gasto", concepto = "Turno") {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    id: crypto.randomUUID(),
    user_id: user?.id,
    shift_id: turnoId, 
    importe: monto,
    tipo: tipo,
    concepto: concepto,
    fecha: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("movimientos")
    .insert([payload])
    .select();

  if (error) {
    console.error("Error al registrar movimiento:", error);
    alert("Error al guardar. Comprueba tu conexión o si el turno sigue abierto.");
    throw error;
  }

  return data;
}