import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CarTaxiFront,
  FileDown,
  LogOut,
  Minus,
  Plane,
  Plus,
  RefreshCw,
  Trash2,
  Lock,
  Search,
  History,
  Clock,
  X,
  Calendar,
  ExternalLink,
  Paperclip,
  FileText,
  Train,
} from "lucide-react";
import {
  eur,
  cargarMovimientos,
  guardarMovimiento,
  borrarMovimiento,
  cargarTurnos,
  guardarTurnoSupabase,
  type Movimiento,
  type TurnoGuardado,
} from "@/lib/taxihoja";
import { getLlegadasBarajas, getLlegadasTrenes } from "@/lib/transporte.functions";
import { supabase } from "@/integrations/supabase/client";
import { VentanaFacturaModal } from "@/components/factura";
import { abrirInforme } from "@/lib/informe";
import { Marca, PieMarca } from "@/components/marca";

type Periodo = "dia" | "semana" | "mes" | "personalizado";

function obtenerDiaLaboral(fechaStr: string): string {
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

function perteneceAlPeriodo(
  fechaMovimiento: string,
  periodo: Periodo,
  rangoFechas: { inicio: string; fin: string }
): boolean {
  const diaLaboralMov = obtenerDiaLaboral(fechaMovimiento);
  const hoyStr = obtenerDiaLaboral(new Date().toISOString());

  if (periodo === "personalizado") {
    if (!rangoFechas.inicio) return true;
    const fInicio = rangoFechas.inicio;
    const fFin = rangoFechas.fin || fInicio;
    return diaLaboralMov >= fInicio && diaLaboralMov <= fFin;
  }

  if (periodo === "dia") {
    return diaLaboralMov === hoyStr;
  }

  if (periodo === "semana") {
    const fecha = new Date(fechaMovimiento);
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setHours(0, 0, 0, 0);
    const diasDesdeLunes = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diasDesdeLunes);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return fecha >= inicio && fecha < fin;
  }

  const fecha = new Date(fechaMovimiento);
  const hoy = new Date();
  return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
}

export const Route = createFileRoute("/_authenticated/panel")({
  validateSearch: (search: Record<string, unknown>) => ({
    modal: (search.modal as "ingreso" | "gasto" | "factura" | "turnos" | "documentos" | "filtros" | undefined) ?? null,
  }),
  head: () => ({
    meta: [
      { title: "Mi panel — ControlTaxi" },
      {
        name: "description",
        content: "Ingresos y gastos del día, llegadas de Barajas y trenes de alta velocidad.",
      },
    ],
  }),
  component: Panel,
});

function Panel() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [rangoFechas, setRangoFechas] = useState({ inicio: "", fin: "" });
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingresos" | "gastos">("todos");

  const abrirModal = (tipo: "ingreso" | "gasto" | "factura" | "turnos" | "documentos" | "filtros") => {
    navigate({ search: { modal: tipo } });
  };

  const cerrarModal = () => {
    navigate({ search: { modal: undefined } });
  };

  const usuarioQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
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
      } catch {
        // Ignorar fallo de RPC
      }
      return await cargarMovimientos(currentUserId);
    },
    enabled: !!currentUserId,
    refetchOnWindowFocus: true,
  });

  const turnosQuery = useQuery({
    queryKey: ["turnos_historial", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      return await cargarTurnos(currentUserId);
    },
    enabled: !!currentUserId,
  });

  const movs = movimientosQuery.data ?? [];
  const turnosCerrados = turnosQuery.data ?? [];

  const vuelos = useQuery({
    queryKey: ["llegadas-barajas"],
    queryFn: async () => {
      try {
        return await getLlegadasBarajas();
      } catch {
        return [];
      }
    },
    refetchInterval: 120_000,
  });

  const trenes = useQuery({
    queryKey: ["llegadas-trenes"],
    queryFn: async () => {
      try {
        return await getLlegadasTrenes();
      } catch {
        return [];
      }
    },
    refetchInterval: 180_000,
  });

  function actualizarTransportes() {
    void Promise.all([vuelos.refetch(), trenes.refetch()]);
  }

  const movsDelTurnoActual = useMemo(
    () => movs.filter((m) => (!ultimoCorte || m.fecha > ultimoCorte)),
    [movs, ultimoCorte]
  );

  const totalesGeneralesTurno = useMemo(() => {
    const ingresos = movsDelTurnoActual
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.importe, 0);
    const gastos = movsDelTurnoActual
      .filter((m) => m.tipo === "gasto")
      .reduce((s, m) => s + m.importe, 0);

    // El neto del turno es solo lo ingresado (lo facturado). Los gastos son informativos.
    const neto = ingresos;
    return { ingresos, gastos, neto };
  }, [movsDelTurnoActual]);

  const movimientosIngresosTurnoActual = useMemo(
    () => movsDelTurnoActual.filter((m) => m.tipo === "ingreso"),
    [movsDelTurnoActual]
  );

  const totalesGenerales = useMemo(() => {
    const ingresos = movimientosIngresosTurnoActual.reduce((s, m) => s + m.importe, 0);
    return { ingresos, gastos: 0, neto: ingresos };
  }, [movimientosIngresosTurnoActual]);

  const movsFiltrados = useMemo(
    () =>
      movs.filter((movimiento) => {
        if (periodo === "dia") {
          if (ultimoCorte && movimiento.fecha <= ultimoCorte) {
            return false;
          }
          return perteneceAlPeriodo(movimiento.fecha, periodo, rangoFechas);
        }

        if (filtroTipo === "ingresos" && movimiento.tipo !== "ingreso") return false;
        if (filtroTipo === "gastos" && movimiento.tipo !== "gasto") return false;

        return perteneceAlPeriodo(movimiento.fecha, periodo, rangoFechas);
      }),
    [movs, periodo, rangoFechas, ultimoCorte, filtroTipo]
  );

  const totales = useMemo(() => {
    const ingresos = movsFiltrados
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.importe, 0);

    const gastos = movsFiltrados
      .filter((m) => m.tipo === "gasto")
      .reduce((s, m) => s + m.importe, 0);

    // ¿Hay filtro activo? (personalizado o tipo distinto de "todos")
    const filtroActivo = periodo === "personalizado" || filtroTipo !== "todos";

    let neto: number;
    let ingresosMostrados: number;
    let gastosMostrados: number;

    if (filtroActivo) {
      if (filtroTipo === "gastos") {
        // Solo gastos: neto en POSITIVO (importe absoluto de los gastos)
        neto = Math.abs(gastos);
        ingresosMostrados = 0;
        gastosMostrados = gastos;
      } else if (filtroTipo === "ingresos") {
        // Solo ingresos: neto = ingresos
        neto = ingresos;
        ingresosMostrados = ingresos;
        gastosMostrados = 0;
      } else {
        // Filtro "Neto" (personalizado con tipo todos): ingresos - gastos
        neto = ingresos - gastos;
        ingresosMostrados = ingresos;
        gastosMostrados = gastos;
      }
    } else {
      // Sin filtro (panel día/semana/mes): neto = solo ingresos (gastos informativos)
      neto = periodo === "dia" ? totalesGenerales.ingresos : ingresos;
      ingresosMostrados = periodo === "dia" ? totalesGenerales.ingresos : ingresos;
      gastosMostrados = gastos;
    }

    return {
      ingresos: ingresosMostrados,
      gastos: gastosMostrados,
      neto,
    };
  }, [movsFiltrados, periodo, totalesGenerales, filtroTipo]);

  const periodoLabel = periodo === "dia" ? "del turno" : periodo === "semana" ? "de la semana" : periodo === "mes" ? "del mes" : "filtrado";

  async function guardar(m: Movimiento) {
    if (currentUserId) {
      try {
        await guardarMovimiento(currentUserId, m);
        await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
        cerrarModal();
      } catch (error) {
        console.error("Error al guardar:", error);
        alert("No se pudo guardar en Supabase.");
      }
    }
  }

  async function borrar(id: string) {
    if (currentUserId) {
      try {
        await borrarMovimiento(currentUserId, id);
        await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
      } catch (error) {
        console.error("Error al borrar:", error);
        alert("Error al eliminar el registro.");
      }
    }
  }

  async function cerrarTurnoCompleto() {
    const seguro = window.confirm(
      "¿Está usted seguro de cerrar el turno? Los contadores del turno se pondrán a cero, pero tus movimientos se mantendrán guardados en Supabase para las estadísticas."
    );
    if (!seguro) return;

    if (currentUserId && movsDelTurnoActual.length > 0) {
      const ahoraIso = new Date().toISOString();
      const fechaInicioTurno = movsDelTurnoActual[movsDelTurnoActual.length - 1].fecha;

      const nuevoTurno: TurnoGuardado = {
        id: crypto.randomUUID(),
        fechaInicio: fechaInicioTurno,
        fechaFin: ahoraIso,
        ingresos: totalesGeneralesTurno.ingresos,
        gastos: totalesGeneralesTurno.gastos,
        neto: totalesGeneralesTurno.neto,
      };

      try {
        await guardarTurnoSupabase(currentUserId, nuevoTurno);

        const { error: upsertError } = await supabase
          .from("configuracion_usuario")
          .upsert(
            { user_id: currentUserId, dia_laboral_activo: ahoraIso, updated_at: ahoraIso },
            { onConflict: "user_id" }
          );

        if (upsertError) throw upsertError;

        await queryClient.resetQueries({ queryKey: ["configuracion_usuario", currentUserId] });
        await queryClient.resetQueries({ queryKey: ["turnos_historial", currentUserId] });
        await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });

        cerrarModal();
        alert("Turno cerrado correctamente. Los contadores se han puesto a cero.");
      } catch (error: unknown) {
        const errObj = error as { message?: string };
        console.error("Error al cerrar turno:", error);
        alert(`Error al guardar el turno: ${errObj?.message || JSON.stringify(error)}`);
      }
    } else {
      alert("No hay movimientos nuevos en este turno para cerrar.");
    }
  }

  async function salir() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { modo: "acceso" }, replace: true });
  }

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="relative overflow-hidden rounded-b-[2rem] bg-[image:var(--gradient-night)] px-6 pt-12 pb-8">
        <div className="pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Marca oscuro />
            <h1 className="mt-1 truncate font-display text-2xl font-bold text-white">
              {currentCorreo || "Tu cuenta"}
            </h1>
          </div>
          <button
            onClick={salir}
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-7 flex justify-center gap-2" role="group" aria-label="Periodo">
          {(["dia", "semana", "mes"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              aria-pressed={periodo === opcion}
              onClick={() => {
                setPeriodo(opcion);
                setRangoFechas({ inicio: "", fin: "" });
                setFiltroTipo("todos");
              }}
              className={`h-10 min-w-20 rounded-xl px-4 text-sm font-semibold transition-colors ${
                periodo === opcion && periodo !== "personalizado"
                  ? "bg-primary text-primary-foreground"
                  : "border border-white/20 bg-white/10 text-white"
              }`}
            >
              {opcion === "dia" ? "Día" : opcion === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-4 max-w-sm rounded-3xl border border-white/10 bg-white/10 p-5 text-center backdrop-blur">
          <p className="text-xs tracking-wide text-white/70 uppercase">
            Neto acumulado {periodo === "personalizado" ? "filtrado" : periodoLabel}
          </p>
          <p className="mt-1 font-display text-4xl font-bold text-white">
            {eur(totales.neto)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/20 py-2.5 px-3 text-center">
              <p className="text-[10px] tracking-wide text-white/60 uppercase">Ingresos</p>
              <p className="text-sm font-semibold text-white mt-0.5">{eur(totales.ingresos)}</p>
            </div>
            <div className="rounded-2xl bg-black/20 py-2.5 px-3 text-center">
              <p className="text-[10px] tracking-wide text-white/60 uppercase">Gastos</p>
              <p className="text-sm font-semibold text-white mt-0.5">{eur(totales.gastos)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => abrirModal("ingreso")}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.97]"
            >
              <Plus className="h-5 w-5" /> Ingreso
            </button>
            <button
              onClick={() => abrirModal("gasto")}
              className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-base font-semibold text-white shadow-md transition-transform active:scale-[0.97]"
            >
              <Minus className="h-5 w-5" /> Gasto
            </button>
          </div>
        </div>
      </div>

      <section className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Movimientos</h2>
        </div>

        <button
          type="button"
          onClick={() => abrirInforme(movsFiltrados, currentCorreo, periodoLabel)}
          className="mt-3 flex h-14 w-full items-center gap-3 rounded-2xl bg-foreground px-4 text-left text-base font-semibold text-background transition-transform active:scale-[0.98]"
        >
          <FileDown className="h-5 w-5 shrink-0" />
          Exportar a PDF (para imprimir)
        </button>

        {movimientosQuery.isLoading ? (
          <Cargando texto="Cargando movimientos..." />
        ) : movsFiltrados.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center">
            <CarTaxiFront className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No hay movimientos en este periodo o filtro.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {movsFiltrados.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    m.tipo === "ingreso"
                      ? "bg-primary/20 text-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {m.tipo === "ingreso" ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {m.concepto || (m.tipo === "ingreso" ? "Carrera" : "Gasto")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.fecha).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    {new Date(m.fecha).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="font-display text-lg font-bold text-foreground">
                  {m.tipo === "gasto" ? "−" : "+"}
                  {eur(m.importe)}
                </p>
                <button
                  onClick={() => borrar(m.id)}
                  aria-label="Borrar movimiento"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-5 pt-7">
        <button
          onClick={() => abrirModal("documentos")}
          className="w-full text-left rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] flex items-center justify-between gap-3 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Paperclip className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-foreground">
                Documentación a aportar
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Guarda tus permisos, seguros o recibos de forma sincronizada.
              </p>
            </div>
          </div>
        </button>
      </div>

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Llegadas a Barajas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Próximas 5 horas, según Aena. T4 incluye T4S.</p>
          </div>
          <button
            onClick={actualizarTransportes}
            disabled={vuelos.isFetching || trenes.isFetching}
            aria-label="Actualizar vuelos"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {vuelos.isLoading ? (
          <Cargando texto="Consultando vuelos…" />
        ) : (
          <div className="mt-3 space-y-3">
            {(() => {
              const listaVuelos = vuelos.data ?? [];
              interface VueloItem {
                id: string;
                horaEstimada: string;
                origen: string;
                estadoVuelo?: string;
              }
              interface TerminalVuelos {
                terminal?: string;
                vuelos?: VueloItem[];
              }
              const t1 = listaVuelos.find((t: TerminalVuelos) => t.terminal?.includes("T1"));
              const t2t3 = listaVuelos.find((t: TerminalVuelos) => t.terminal?.includes("T2") || t.terminal?.includes("T3"));
              const t4t4s = listaVuelos.find((t: TerminalVuelos) => t.terminal?.includes("T4"));

              return (
                <>
                  {t1 && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Plane className="h-4 w-4" />
                        </span>
                        <span className="font-display text-base font-bold text-foreground">T1</span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(t1.vuelos ?? []).map((v: VueloItem) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.estadoVuelo && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                {v.estadoVuelo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t2t3 && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Plane className="h-4 w-4" />
                        </span>
                        <span className="font-display text-base font-bold text-foreground">T2 · T3</span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(t2t3.vuelos ?? []).map((v: VueloItem) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.estadoVuelo && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                {v.estadoVuelo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t4t4s && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                          <Plane className="h-4 w-4" />
                        </span>
                        <span className="font-display text-base font-bold text-foreground">T4 · T4S</span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(t4t4s.vuelos ?? []).map((v: VueloItem) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.estadoVuelo && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                {v.estadoVuelo}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Alta velocidad y Larga Distancia</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Llegadas oficiales (Adif) a Atocha (60000) y Chamartín (17000).</p>
          </div>
          <button
            onClick={actualizarTransportes}
            disabled={vuelos.isFetching || trenes.isFetching}
            aria-label="Actualizar trenes"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {trenes.isLoading ? (
          <Cargando texto="Consultando trenes…" />
        ) : (
          <div className="mt-3 space-y-3">
            {(() => {
              const listaEstaciones = trenes.data ?? [];
              interface TrenItem {
                id: string;
                horaEstado?: string;
                hora?: string;
                tipo?: string;
                origen?: string;
                estado?: string;
              }
              interface EstacionTrenes {
                nombre?: string;
                codigoAdif?: string;
                trenes?: TrenItem[];
              }
              const atocha = listaEstaciones.find((e: EstacionTrenes) => e.nombre?.toLowerCase().includes("atocha") || e.codigoAdif === "60000");
              const chamartin = listaEstaciones.find((e: EstacionTrenes) => e.nombre?.toLowerCase().includes("chamartín") || e.nombre?.toLowerCase().includes("chamartin") || e.codigoAdif === "17000");

              return (
                <>
                  {atocha && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                            <Train className="h-4 w-4" />
                          </span>
                          <span className="font-display text-base font-bold text-foreground">Atocha</span>
                        </div>
                        <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground font-semibold">
                          Adif: 60000
                        </span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(atocha.trenes ?? []).map((tr: TrenItem) => (
                          <li key={tr.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{tr.horaEstado || tr.hora}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              <span className="font-semibold text-xs text-primary mr-1">[{tr.tipo}]</span>
                              {tr.origen}
                            </span>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                              {tr.estado}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {chamartin && (
                    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                            <Train className="h-4 w-4" />
                          </span>
                          <span className="font-display text-base font-bold text-foreground">Chamartín</span>
                        </div>
                        <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground font-semibold">
                          Adif: 17000
                        </span>
                      </div>
                      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {(chamartin.trenes ?? []).map((tr: TrenItem) => (
                          <li key={tr.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{tr.horaEstado || tr.hora}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              <span className="font-semibold text-xs text-primary mr-1">[{tr.tipo}]</span>
                              {tr.origen}
                            </span>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                              {tr.estado}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      <div className="px-5 pt-8">
        <button
          onClick={() => abrirModal("factura")}
          className="w-full text-left rounded-3xl border border-amber-300/50 bg-amber-400 p-4 text-amber-950 shadow-sm flex items-center justify-between gap-3 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0
