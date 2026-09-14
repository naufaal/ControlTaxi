import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  cargarMovimientos,
  guardarMovimiento,
  borrarMovimiento,
  cargarTurnos,
  guardarTurnoSupabase,
  type Movimiento,
  type TurnoGuardado,
} from "@/lib/taxihoja";

export function usePanelData() {
  const queryClient = useQueryClient();

  const usuarioQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: Infinity,
  });
  const currentUserId = usuarioQuery.data?.id ?? null;
  const currentCorreo = usuarioQuery.data?.email ?? "";

  const configQuery = useQuery({
    queryKey: ["configuracion_usuario", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from("configuracion_usuario")
        .select("dia_laboral_activo")
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId,
  });
  const ultimoCorte = configQuery.data?.dia_laboral_activo
    ? new Date(configQuery.data.dia_laboral_activo).toISOString()
    : null;

  const movimientosQuery = useQuery({
    queryKey: ["movimientos", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      try {
        await supabase.rpc("registrar_uso", { p_event: "panel_view", p_path: "/panel" });
      } catch {}
      return await cargarMovimientos(currentUserId);
    },
    enabled: !!currentUserId,
    refetchOnWindowFocus: true,
  });
  const movs = movimientosQuery.data ?? [];

  const turnosQuery = useQuery({
    queryKey: ["turnos_historial", currentUserId],
    queryFn: async () => (currentUserId ? await cargarTurnos(currentUserId) : []),
    enabled: !!currentUserId,
  });
  const turnosCerrados = turnosQuery.data ?? [];

  async function guardar(m: Movimiento) {
    if (!currentUserId) return;
    try {
      await guardarMovimiento(currentUserId, m);
      await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("No se pudo guardar en Supabase.");
    }
  }

  async function borrar(id: string) {
    if (!currentUserId) return;
    try {
      await borrarMovimiento(currentUserId, id);
      await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
    } catch (error) {
      console.error("Error al borrar:", error);
      alert("Error al eliminar el registro.");
    }
  }

  async function cerrarTurno(
    movsDelTurnoActual: Movimiento[],
    totalesGeneralesTurno: { ingresos: number; gastos: number; neto: number }
  ) {
    if (
      !window.confirm(
        "¿Está usted seguro de cerrar el turno? Los contadores se pondrán a cero, pero tus movimientos se guardarán."
      )
    )
      return false;
    if (!currentUserId || movsDelTurnoActual.length === 0) {
      alert("No hay movimientos nuevos en este turno para cerrar.");
      return false;
    }

    const ahoraIso = new Date().toISOString();
    const nuevoTurno: TurnoGuardado = {
      id: crypto.randomUUID(),
      fechaInicio: movsDelTurnoActual[movsDelTurnoActual.length - 1].fecha,
      fechaFin: ahoraIso,
      ingresos: totalesGeneralesTurno.ingresos,
      gastos: totalesGeneralesTurno.gastos,
      neto: totalesGeneralesTurno.neto,
    };

    try {
      await guardarTurnoSupabase(currentUserId, nuevoTurno);
      const { error: upsertError } = await supabase.from("configuracion_usuario").upsert(
        { user_id: currentUserId, dia_laboral_activo: ahoraIso, updated_at: ahoraIso },
        { onConflict: "user_id" }
      );
      if (upsertError) throw upsertError;

      await queryClient.resetQueries({ queryKey: ["configuracion_usuario", currentUserId] });
      await queryClient.resetQueries({ queryKey: ["turnos_historial", currentUserId] });
      await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
      alert("Turno cerrado correctamente.");
      return true;
    } catch (error: any) {
      console.error("Error al cerrar turno:", error);
      alert(`Error al guardar el turno: ${error?.message || "Error desconocido"}`);
      return false;
    }
  }

  return {
    currentUserId,
    currentCorreo,
    ultimoCorte,
    movs,
    turnosCerrados,
    movimientosQuery,
    guardar,
    borrar,
    cerrarTurno,
  };
}