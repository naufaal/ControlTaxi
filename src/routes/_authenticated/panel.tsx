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
  ArrowLeft,
  Lock,
  Search,
  History,
  Clock,
  X,
  Calendar,
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
import { FacturaClienteBoton, VentanaFacturaModal } from "@/components/factura";
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
    modal: (search.modal as "ingreso" | "gasto" | "factura" | "turnos" | undefined) ?? null,
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
  const [mostrarFiltroAvanzado, setMostrarFiltroAvanzado] = useState(false);
  const [rangoFechas, setRangoFechas] = useState({ inicio: "", fin: "" });
  
  const ultimoCorte = obtenerUltimoCorteTurno();

  const abrirModal = (tipo: "ingreso" | "gasto" | "factura" | "turnos") => {
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
    <main className="min-h-dvh bg-background pb-10">
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
                setMostrarFiltroAvanzado(false);
              }}
              className={`h-10 min-w-20 rounded-xl px-4 text-sm font-semibold transition-colors ${
                periodo === opcion && !mostrarFiltroAvanzado
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
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Mini label="Ingresos" valor={eur(totales.ingresos)} />
            <Mini label="Gastos" valor={eur(totales.gastos)} />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => abrirModal("ingreso")}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.97]"
          >
            <Plus className="h-5 w-5" /> Ingreso
          </button>
          <button
            onClick={() => abrirModal("gasto")}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-base font-semibold text-white transition-transform active:scale-[0.97]"
          >
            <Minus className="h-5 w-5" /> Gasto
          </button>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-10 flex items-center justify-between gap-3">
        <button
          onClick={() => setMostrarFiltroAvanzado(!mostrarFiltroAvanzado)}
          className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] active:scale-[0.97]"
        >
          <Search className="h-4 w-4 text-primary" /> Filtrar / Historial
        </button>

        <button
          onClick={() => abrirModal("turnos")}
          className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] active:scale-[0.97]"
        >
          <Lock className="h-4 w-4 text-primary" /> Turnos
        </button>
      </div>

      {mostrarFiltroAvanzado && (
        <div className="px-5 mt-3 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-md text-foreground">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" /> Histórico y Filtro por Fechas
              </p>
              {periodo === "personalizado" && (
                <button 
                  onClick={() => { setPeriodo("dia"); setRangoFechas({ inicio: "", fin: "" }); }}
                  className="text-[10px] text-primary underline font-semibold"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="text-[10px] text-muted-foreground">Desde / Día</span>
                <input
                  type="date"
                  value={rangoFechas.inicio}
                  onChange={(e) => {
                    setRangoFechas({ ...rangoFechas, inicio: e.target.value });
                    setPeriodo("personalizado");
                  }}
                  className="w-full h-9 rounded-lg bg-secondary border border-input px-2 text-xs text-foreground"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Hasta (opcional)</span>
                <input
                  type="date"
                  value={rangoFechas.fin}
                  onChange={(e) => {
                    setRangoFechas({ ...rangoFechas, fin: e.target.value });
                    setPeriodo("personalizado");
                  }}
                  className="w-full h-9 rounded-lg bg-secondary border border-input px-2 text-xs text-foreground"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Mostrando {movsFiltrados.length} registros correspondientes al criterio seleccionado.
            </p>
          </div>
        </div>
      )}

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

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Llegadas a Barajas</h2>
          <button
            onClick={actualizarTransportes}
            disabled={vuelos.isFetching || trenes.isFetching}
            aria-label="Actualizar vuelos"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {vuelos.isLoading ? (
          <Cargando texto="Consultando vuelos…" />
        ) : (
          <div className="mt-3 space-y-3">
            {(vuelos.data ?? []).map((t: any) => (
              <div key={t.terminal} className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <Plane className="h-4 w-4" />
                  </span>
                  <span className="font-display text-base font-bold text-foreground">{t.etiqueta}</span>
                </div>
                <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {t.vuelos.map((v: any) => (
                    <li key={v.id} className="flex items-center gap-3 text-sm">
                      <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <FacturaClienteBoton onClick={() => abrirModal("factura")} />

      {search.modal === "ingreso" && <FormularioIngreso onCerrar={cerrarModal} onGuardar={guardar} />}
      {search.modal === "gasto" && <FormularioGaseoso onCerrar={cerrarModal} onGuardar={guardar} />}
      {search.modal === "factura" && <VentanaFacturaModal onCerrar={cerrarModal} />}
      {search.modal === "turnos" && (
        <VentanaTurnosModal 
          totalesGenerales={totalesGenerales} 
          turnosCerrados={turnosCerrados}
          onCerrar={cerrarModal} 
          onCerrarTurno={cerrarTurnoCompleto} 
        />
      )}

      <div className="px-5 pt-8">
        <PieMarca oscuro />
      </div>
    </main>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCerrar}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" /> Volver atrás
          </button>
          <h3 className="font-display text-lg font-bold text-foreground">Turnos</h3>
          <div className="w-12" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 text-foreground max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Nuevo ingreso</h3>
          <button onClick={onCerrar} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
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
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-lg font-bold text-foreground mt-1 focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1">Forma de pago</label>
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
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {["Carrera", "Aeropuerto", "Estación", "Propina"].map((c) => (
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

function FormularioGaseoso({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 text-foreground max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Nuevo gasto</h3>
          <button onClick={onCerrar} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
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
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-lg font-bold text-foreground mt-1 focus:ring-2 focus:ring-primary"
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
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {["Combustible", "Lavado", "Taller", "Parking", "Peaje", "Seguro"].map((c) => (
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

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-black/20 py-2.5">
      <p className="text-[10px] tracking-wide text-white/60 uppercase">{label}</p>
      <p className="text-sm font-semibold text-white">{valor}</p>
    </div>
  );
}
