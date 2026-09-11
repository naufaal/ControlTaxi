export type TurnoGuardado = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  ingresos: number;
  gastos: number;
  neto: number;
};

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
