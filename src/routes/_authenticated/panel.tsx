Import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  obtenerUltimoCorteTurno,
  guardarUltimoCorteTurno,
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
  const hora = fecha.getHours();
  if (hora < 6) {
    fecha.setDate(fecha.getDate() - 1);
  }
  return fecha.toISOString().slice(0, 10);
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
  
  const ultimoCorte = obtenerUltimoCorteTurno();

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

  const movimientosQuery = useQuery({
    queryKey: ["movimientos", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      try {
        await supabase.rpc("registrar_uso", { p_event: "panel_view", p_path: "/panel" });
      } catch (e) {
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

  const movsFiltrados = useMemo(
    () =>
      movs.filter((movimiento) => {
        if (periodo === "dia" && ultimoCorte && movimiento.fecha <= ultimoCorte) {
          return false;
        }
        return perteneceAlPeriodo(movimiento.fecha, periodo, rangoFechas);
      }),
    [movs, periodo, rangoFechas, ultimoCorte]
  );

  const totales = useMemo(() => {
    const ingresos = movsFiltrados
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.importe, 0);
    const gastos = movsFiltrados
      .filter((m) => m.tipo === "gasto")
      .reduce((s, m) => s + m.importe, 0);
    return { ingresos, gastos, neto: ingresos - gastos };
  }, [movsFiltrados]);

  const movsDelTurnoActual = useMemo(
    () => movs.filter((m) => !ultimoCorte || m.fecha > ultimoCorte),
    [movs, ultimoCorte]
  );

  const totalesGenerales = useMemo(() => {
    const ingresos = movsDelTurnoActual.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.importe, 0);
    const gastos = movsDelTurnoActual.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.importe, 0);
    return { ingresos, gastos, neto: ingresos - gastos };
  }, [movsDelTurnoActual]);

  const periodoLabel = periodo === "dia" ? "del día" : periodo === "semana" ? "de la semana" : periodo === "mes" ? "del mes" : "filtrado";

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
      "¿Está usted seguro de cerrar el turno? Los contadores del día se pondrán a cero, pero tus movimientos se mantendrán guardados en Supabase para las estadísticas."
    );
    if (!seguro) return;

    if (currentUserId && movsDelTurnoActual.length > 0) {
      const ahoraIso = new Date().toISOString();
      const fechaInicioTurno = movsDelTurnoActual[movsDelTurnoActual.length - 1].fecha;

      const nuevoTurno: TurnoGuardado = {
        id: crypto.randomUUID(),
        fechaInicio: fechaInicioTurno,
        fechaFin: ahoraIso,
        ingresos: totalesGenerales.ingresos,
        gastos: totalesGenerales.gastos,
        neto: totalesGenerales.neto,
      };

      try {
        await guardarTurnoSupabase(currentUserId, nuevoTurno);
        guardarUltimoCorteTurno(ahoraIso);
        await queryClient.invalidateQueries({ queryKey: ["turnos_historial", currentUserId] });
        cerrarModal();
        alert("Turno cerrado correctamente. Los contadores se han puesto a cero sin borrar tus datos.");
      } catch (error) {
        console.error("Error al cerrar turno:", error);
        alert("Hubo un error al guardar el turno.");
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
    <main className="min-h-dvh bg-background pb-16">
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

          {/* BOTONES DE INGRESO Y GASTO */}
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

          {/* BOTONES FILTRAR Y TURNOS */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => abrirModal("filtros")}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-base font-semibold text-slate-950 shadow-md border border-slate-200 transition-transform active:scale-[0.97]"
            >
              <Search className="h-5 w-5 text-amber-500" /> Filtrar
            </button>
            <button
              onClick={() => abrirModal("turnos")}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-base font-semibold text-slate-950 shadow-md border border-slate-200 transition-transform active:scale-[0.97]"
            >
              <Lock className="h-5 w-5 text-amber-500" /> Turnos
            </button>
          </div>
        </div>
      </div>

      <section className="px-5 pt-7">
        <h2 className="font-display text-lg font-semibold text-foreground">Movimientos</h2>

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

      {/* DOCUMENTACIÓN APORTAR */}
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

      {/* INFORMACIÓN DE TERMINALES DE BARAJAS */}
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
              const t1 = listaVuelos.find((t: any) => t.terminal?.includes("T1"));
              const t2t3 = listaVuelos.find((t: any) => t.terminal?.includes("T2") || t.terminal?.includes("T3"));
              const t4t4s = listaVuelos.find((t: any) => t.terminal?.includes("T4"));

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
                        {(t1.vuelos ?? []).map((v: any) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
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
                        {(t2t3.vuelos ?? []).map((v: any) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.retraso && (
                              <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-md shrink-0 font-semibold">
                                {v.retraso}
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
                        {(t4t4s.vuelos ?? []).map((v: any) => (
                          <li key={v.id} className="flex items-center gap-3 text-sm">
                            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                            {v.retraso && (
                              <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-md shrink-0 font-semibold">
                                {v.retraso}
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

      {/* INFORMACIÓN DE ESTACIONES DE TREN (ADIF: ATOCHA 60000, CHAMARTÍN 17000) */}
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
              const atocha = listaEstaciones.find((e: any) => e.nombre?.toLowerCase().includes("atocha") || e.codigoAdif === "60000");
              const chamartin = listaEstaciones.find((e: any) => e.nombre?.toLowerCase().includes("chamartín") || e.nombre?.toLowerCase().includes("chamartin") || e.codigoAdif === "17000");

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
                        {(atocha.trenes ?? []).map((tr: any) => (
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
                        {(chamartin.trenes ?? []).map((tr: any) => (
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

      {/* BOTÓN AMARILLO: FACTURA */}
      <div className="px-5 mt-8">
        <button
          onClick={() => abrirModal("factura")}
          className="w-full text-left rounded-3xl border border-amber-300/50 bg-amber-400 p-4 text-amber-950 shadow-sm flex items-center justify-between gap-3 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-950">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-amber-950">
                Factura
              </h3>
              <p className="text-xs text-amber-900/80 mt-0.5 truncate">
                Crea y descarga una factura con IVA del 10%.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* BOTÓN AMARILLO: TEMARIO EXAMEN TAXI */}
      <div className="px-5 mt-3">
        <div className="rounded-3xl border border-amber-300/50 bg-amber-400 p-4 text-amber-950 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-950">
              <BookOpenIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-amber-950">
                Temario examen taxi
              </h3>
              <a
                href="https://madrid.es/taxi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-950 underline font-semibold mt-0.5 inline-flex items-center gap-1 hover:opacity-80"
              >
                madrid.es/taxi <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {search.modal === "ingreso" && <FormularioIngreso onCerrar={cerrarModal} onGuardar={guardar} />}
      {search.modal === "gasto" && <FormularioGasto onCerrar={cerrarModal} onGuardar={guardar} />}
      {search.modal === "factura" && <VentanaFacturaModalPersonalizada onCerrar={cerrarModal} />}
      {search.modal === "filtros" && (
        <VentanaFiltrosModal 
          onCerrar={cerrarModal} 
          rangoFechas={rangoFechas}
          setRangoFechas={setRangoFechas}
          setPeriodo={setPeriodo}
        />
      )}
      {search.modal === "turnos" && (
        <VentanaTurnosModal 
          totalesGenerales={totalesGenerales} 
          turnosCerrados={turnosCerrados}
          onCerrar={cerrarModal} 
          onCerrarTurno={cerrarTurnoCompleto} 
        />
      )}
      {search.modal === "documentos" && <VentanaDocumentosModal onCerrar={cerrarModal} />}

      <div className="px-5 pt-8">
        <PieMarca oscuro />
      </div>
    </main>
  );
}

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function VentanaFacturaModalPersonalizada({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground"
      >
        <div className="flex items-center justify-between pb-2">
          <h3 className="font-display text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Factura
          </h3>
          <button
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Genera y descarga tu factura oficial con el desglose de IVA (10%).
        </p>
        <VentanaFacturaModal onCerrar={onCerrar} />
      </div>
    </div>
  );
}

function VentanaFiltrosModal({ 
  onCerrar, 
  rangoFechas, 
  setRangoFechas, 
  setPeriodo 
}: { 
  onCerrar: () => void;
  rangoFechas: { inicio: string; fin: string };
  setRangoFechas: React.Dispatch<React.SetStateAction<{ inicio: string; fin: string }>>;
  setPeriodo: (p: Periodo) => void;
}) {
  const [inicioTemp, setInicioTemp] = useState(rangoFechas.inicio);
  const [finTemp, setFinTemp] = useState(rangoFechas.fin);

  function aplicarFiltro(e: React.FormEvent) {
    e.preventDefault();
    setRangoFechas({ inicio: inicioTemp, fin: finTemp });
    setPeriodo("personalizado");
    onCerrar();
  }

  function limpiarFiltro() {
    setRangoFechas({ inicio: "", fin: "" });
    setPeriodo("dia");
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground"
      >
        <div className="flex items-center justify-between pb-2 mb-2">
          <h3 className="font-display text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Filtrar por fechas
          </h3>
          <button
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={aplicarFiltro} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Desde / Día inicial</label>
            <input
              type="date"
              value={inicioTemp}
              onChange={(e) => setInicioTemp(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Hasta (opcional)</label>
            <input
              type="date"
              value={finTemp}
              onChange={(e) => setFinTemp(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 focus:border-primary outline-none"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98]"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={limpiarFiltro}
              className="w-full h-12 rounded-2xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
            >
              Limpiar filtro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VentanaDocumentosModal({ onCerrar }: { onCerrar: () => void }) {
  const [documentos, setDocumentos] = useState<Array<{ id: string; nombre: string; fecha: string }>>([
    { id: "1", nombre: "ITS_2024-10-2469.pdf", fecha: "08 sept 2026" },
    { id: "2", nombre: "ITS_2024-12-1201.pdf", fecha: "08 sept 2026" },
  ]);
  const [nuevoNombre, setNuevoNombre] = useState("");

  function agregarDocumento(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setDocumentos([
      ...documentos,
      { id: crypto.randomUUID(), nombre: nuevoNombre.trim(), fecha: "08 sept 2026" },
    ]);
    setNuevoNombre("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground"
      >
        <div className="flex items-center justify-between pb-2 mb-2">
          <h3 className="font-display text-xl font-bold flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" /> Documentos y Archivos
          </h3>
          <button
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Guarda tus permisos, seguros o recibos de forma sincronizada.
        </p>

        <form onSubmit={agregarDocumento} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Ej: Seguro coche, ITV, Permiso..."
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            className="flex-1 h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow"
          >
            Adjuntar
          </button>
        </form>

        <div className="space-y-2">
          {documentos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No hay documentos registrados.
            </div>
          ) : (
            documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-border bg-secondary/50 p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{doc.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.fecha}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDocumentos(documentos.filter((d) => d.id !== doc.id))}
                  className="h-8 w-8 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Borrar documento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function VentanaTurnosModal({
  totalesGenerales,
  turnosCerrados,
  onCerrar,
  onCerrarTurno,
}: {
  totalesGenerales: { ingresos: number; gastos: number; neto: number };
  turnosCerrados: TurnoGuardado[];
  onCerrar: () => void;
  onCerrarTurno: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground"
      >
        <div className="flex items-center justify-between pb-2 mb-2">
          <h3 className="font-display text-xl font-bold text-foreground">Turnos</h3>
          <button
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-secondary p-4 mb-4 space-y-2 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Acumulado turno actual</p>
          <p className="font-display text-3xl font-bold text-foreground">{eur(totalesGenerales.neto)}</p>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Ingresos</p>
              <p className="text-sm font-semibold text-primary">{eur(totalesGenerales.ingresos)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Gastos</p>
              <p className="text-sm font-semibold text-destructive">{eur(totalesGenerales.gastos)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onCerrarTurno}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] hover:bg-emerald-700 mb-6"
        >
          <Lock className="h-5 w-5" /> Cerrar turno actual
        </button>

        <div className="border-t border-border pt-4">
          <h4 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" /> Historial de Turnos
          </h4>

          {turnosCerrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Aún no hay turnos cerrados guardados en Supabase.
            </div>
          ) : (
            <ul className="space-y-3">
              {turnosCerrados.map((turno) => (
                <li
                  key={turno.id}
                  className="rounded-2xl border border-border bg-secondary/50 p-3 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-1.5">
                    <span>Inicio: {new Date(turno.fechaInicio).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span>Fin: {new Date(turno.fechaFin).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Neto</p>
                      <p className="font-display text-base font-bold text-foreground">{eur(turno.neto)}</p>
                    </div>
                    <div className="text-right flex gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Ingresos</p>
                        <p className="text-xs font-semibold text-primary">+{eur(turno.ingresos)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Gastos</p>
                        <p className="text-xs font-semibold text-destructive">-{eur(turno.gastos)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FormularioIngreso({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
  const [importe, setImporte] = useState("");
  const [metodo, setMetodo] = useState<"Efectivo" | "Tarjeta" | "Emisora" | "Bizum">("Efectivo");
  const [concepto, setConcepto] = useState("Carrera");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Introduce un importe válido");
      return;
    }

    const fechaFinal = fecha ? new Date(`${fecha}T${new Date().toTimeString().slice(0, 8)}`).toISOString() : new Date().toISOString();

    onGuardar({
      id: crypto.randomUUID(),
      tipo: "ingreso",
      importe: num,
      concepto: `${concepto.trim() || "Carrera"} (${metodo})`,
      fecha: fechaFinal,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground"
      >
        <div className="flex items-center justify-between pb-2 mb-2">
          <h3 className="font-display text-xl font-bold">Nuevo ingreso</h3>
          <button
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Importe €</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-lg font-bold text-foreground mt-1.5 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1.5">Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Efectivo", "Tarjeta", "Emisora", "Bizum"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMetodo(m)}
                  className={`h-11 rounded-2xl text-xs font-semibold border transition-colors ${
                    metodo === m
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary text-foreground border-input hover:bg-secondary/80"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {["Carrera", "Aeropuerto", "Estación"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setConcepto(c)}
                  className="h-9 px-3 rounded-2xl bg-secondary border border-input text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] mt-2"
          >
            Guardar ingreso
          </button>
        </form>
      </div>
    </div>
  );
}

function FormularioGasto({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("Combustible");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Introduce un importe válido");
      return;
    }

    const fechaFinal = fecha ? new Date(`${fecha}T${new Date().toTimeString().slice(0, 8)}`).toISOString() : new Date().toISOString();

    onGuardar({
      id: crypto.randomUUID(),
      tipo: "gasto",
      importe: num,
      concepto: concepto.trim() || "Gasto",
      fecha: fechaFinal,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground"
      >
        <div className="flex items-center justify-between pb-2 mb-2">
          <h3 className="font-display text-xl font-bold">Nuevo gasto</h3>
          <button
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Importe €</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-lg font-bold text-foreground mt-1.5 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {["Combustible", "Lavado", "Taller", "Parking", "Peaje"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setConcepto(c)}
                  className="h-9 px-3 rounded-2xl bg-secondary border border-input text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] mt-2"
          >
            Guardar gasto
          </button>
        </form>
      </div>
    </div>
  );
}

function Cargando({ texto }: { texto: string }) {
  return (
    <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
