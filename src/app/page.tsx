'use client';

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
export const dynamic = 'force-dynamic';
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
  BookOpen,
} from "lucide-react";
import {
  cargarMovimientos,
  guardarMovimiento,
  borrarMovimiento,
  cargarTurnos,
  guardarTurnoSupabase,
  type Movimiento,
  type TurnoGuardado,
} from "@/lib/taxihoja";
import type { TerminalResumen, EstacionResumen } from "@/lib/transporte.functions";
import { supabase } from "@/integrations/supabase/client";
import { VentanaFacturaModal } from "@/components/factura";
import { abrirInforme } from "@/lib/informe";
import { Marca, PieMarca } from "@/components/marca";
import { eur } from "@/lib/utils";

// --- TIPOS ---
type Periodo = "dia" | "semana" | "mes" | "personalizado";
type ModalType = "ingreso" | "gasto" | "factura" | "turnos" | "documentos" | "filtros";

interface VueloItem {
  id: string;
  horaEstimada: string;
  origen: string;
  estadoVuelo?: string;
  terminal?: string;
}

interface TrenItem {
  id: string;
  horaEstado?: string;
  hora?: string;
  tipo?: string;
  origen?: string;
  estado?: string;
  nombre?: string;
  codigoAdif?: string;
}

// --- UTILIDADES ---
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
    const fFin = rangoFechas.fin || rangoFechas.inicio;
    return diaLaboralMov >= rangoFechas.inicio && diaLaboralMov <= fFin;
  }

  if (periodo === "dia") return diaLaboralMov === hoyStr;

  const fecha = new Date(fechaMovimiento);
  const hoy = new Date();

  if (periodo === "semana") {
    const inicio = new Date(hoy);
    inicio.setHours(0, 0, 0, 0);
    const diasDesdeLunes = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diasDesdeLunes);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return fecha >= inicio && fecha < fin;
  }

  return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
}

// --- COMPONENTE PRINCIPAL ---
export default function PanelPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const modalActual = searchParams.get("modal") as ModalType | null;

  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [rangoFechas, setRangoFechas] = useState({ inicio: "", fin: "" });
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingresos" | "gastos">("todos");

  const abrirModal = (tipo: ModalType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("modal", tipo);
    router.push(`${pathname}?${params.toString()}`);
  };

  const cerrarModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modal");
    const stringParams = params.toString();
    router.push(stringParams ? `${pathname}?${stringParams}` : pathname);
  };

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

    const transportesQuery = useQuery({
    queryKey: ["transporte"],
    queryFn: async () => {
      const res = await fetch("/api/transporte", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al cargar transportes");
      return (await res.json()) as {
        vuelos: TerminalResumen[];
        trenes: EstacionResumen[];
      };
    },
    refetchInterval: 120_000,
  });

  const vuelos = {
    data: transportesQuery.data?.vuelos ?? [],
    isLoading: transportesQuery.isLoading,
    isFetching: transportesQuery.isFetching,
    refetch: transportesQuery.refetch,
  };

  const trenes = {
    data: transportesQuery.data?.trenes ?? [],
    isLoading: transportesQuery.isLoading,
    isFetching: transportesQuery.isFetching,
    refetch: transportesQuery.refetch,
  };

  function actualizarTransportes() {
    void Promise.all([vuelos.refetch(), trenes.refetch()]);
  }

  const movsDelTurnoActual = useMemo(
    () => movs.filter((m) => !ultimoCorte || m.fecha > ultimoCorte),
    [movs, ultimoCorte]
  );

  const totalesGeneralesTurno = useMemo(() => {
    const ingresos = movsDelTurnoActual.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.importe, 0);
    const gastos = movsDelTurnoActual.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.importe, 0);
    return { ingresos, gastos, neto: ingresos };
  }, [movsDelTurnoActual]);

  const movsFiltrados = useMemo(
    () =>
      movs.filter((mov) => {
        if (periodo === "dia") {
          if (ultimoCorte && mov.fecha <= ultimoCorte) return false;
          return perteneceAlPeriodo(mov.fecha, periodo, rangoFechas);
        }
        if (filtroTipo === "ingresos" && mov.tipo !== "ingreso") return false;
        if (filtroTipo === "gastos" && mov.tipo !== "gasto") return false;
        return perteneceAlPeriodo(mov.fecha, periodo, rangoFechas);
      }),
    [movs, periodo, rangoFechas, ultimoCorte, filtroTipo]
  );

  const totales = useMemo(() => {
    const ingresos = movsFiltrados.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.importe, 0);
    const gastos = movsFiltrados.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.importe, 0);
    const filtroActivo = periodo === "personalizado" || filtroTipo !== "todos";

    if (filtroActivo) {
      if (filtroTipo === "gastos") return { ingresos: 0, gastos, neto: Math.abs(gastos) };
      if (filtroTipo === "ingresos") return { ingresos, gastos: 0, neto: ingresos };
      return { ingresos, gastos, neto: ingresos - gastos };
    }
    return {
      ingresos: periodo === "dia" ? totalesGeneralesTurno.ingresos : ingresos,
      gastos,
      neto: periodo === "dia" ? totalesGeneralesTurno.ingresos : ingresos,
    };
  }, [movsFiltrados, periodo, totalesGeneralesTurno, filtroTipo]);

  const periodoLabel =
    periodo === "dia" ? "del turno"
      : periodo === "semana" ? "de la semana"
      : periodo === "mes" ? "del mes"
      : "filtrado";

 async function guardar(m: Movimiento) {
    if (!currentUserId) {
      alert("⚠️ No se ha detectado tu usuario. Por favor, recarga la página.");
      return;
    }
    try {
      await guardarMovimiento(currentUserId, m);
      await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
      cerrarModal();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("No se pudo guardar en Supabase. Revisa tu conexión.");
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

  async function cerrarTurnoCompleto() {
    if (!window.confirm("¿Está usted seguro de cerrar el turno? Los contadores se pondrán a cero, pero tus movimientos se guardarán.")) return;
    if (!currentUserId || movsDelTurnoActual.length === 0) {
      alert("No hay movimientos nuevos en este turno para cerrar.");
      return;
    }

    const ahoraIso = new Date().toISOString();
    const nuevoTurno: TurnoGuardado = {
      id: crypto.randomUUID(),
      fechaInicio: movsDelTurnoActual[movsDelTurnoActual.length - 1]?.fecha ?? ahoraIso,
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
      cerrarModal();
      alert("Turno cerrado correctamente.");
    } catch (error: any) {
      console.error("Error al cerrar turno:", error);
      alert(`Error al guardar el turno: ${error?.message || "Error desconocido"}`);
    }
  }

  async function salir() {
    await supabase.auth.signOut();
    router.push("/auth?modo=acceso");
  }

  const listaVuelos = vuelos.data ?? [];
  const t1 = listaVuelos.find((t) => t.terminal?.includes("T1"));
  const t2t3 = listaVuelos.find((t) => t.terminal?.includes("T2") || t.terminal?.includes("T3"));
  const t4t4s = listaVuelos.find((t) => t.terminal?.includes("T4"));

  const listaEstaciones = trenes.data ?? [];
  const atocha = listaEstaciones.find((e) => e.nombre?.toLowerCase().includes("atocha") || e.codigoAdif === "60000");
  const chamartin = listaEstaciones.find((e) =>
    e.nombre?.toLowerCase().includes("atocha") === false &&
    (e.nombre?.toLowerCase().includes("chamartín") || e.nombre?.toLowerCase().includes("chamartin") || e.codigoAdif === "17000")
  );

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
          <button onClick={salir} aria-label="Cerrar sesión" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-7 flex justify-center gap-2" role="group">
          {(["dia", "semana", "mes"] as const).map((opcion) => (
            <button
              key={opcion}
              onClick={() => { setPeriodo(opcion); setRangoFechas({ inicio: "", fin: "" }); setFiltroTipo("todos"); }}
              className={`h-10 min-w-20 rounded-xl px-4 text-sm font-semibold transition-colors ${
                periodo === opcion
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
          <p className="mt-1 font-display text-4xl font-bold text-white">{eur(totales.neto)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/20 py-2.5 px-3">
              <p className="text-[10px] tracking-wide text-white/60 uppercase">Ingresos</p>
              <p className="text-sm font-semibold text-white mt-0.5">{eur(totales.ingresos)}</p>
            </div>
            <div className="rounded-2xl bg-black/20 py-2.5 px-3">
              <p className="text-[10px] tracking-wide text-white/60 uppercase">Gastos</p>
              <p className="text-sm font-semibold text-white mt-0.5">{eur(totales.gastos)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => abrirModal("ingreso")} className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.97]">
              <Plus className="h-5 w-5" /> Ingreso
            </button>
            <button onClick={() => abrirModal("gasto")} className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-base font-semibold text-white shadow-md transition-transform active:scale-[0.97]">
              <Minus className="h-5 w-5" /> Gasto
            </button>
          </div>
        </div>
      </div>

      <section className="px-5 pt-7">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">Movimientos</h2>
        <button onClick={() => abrirInforme(movsFiltrados, currentCorreo, periodoLabel)} className="mt-3 flex h-14 w-full items-center gap-3 rounded-2xl bg-foreground px-4 text-left text-base font-semibold text-background transition-transform active:scale-[0.98]">
          <FileDown className="h-5 w-5 shrink-0" /> Exportar a PDF
        </button>

        {movimientosQuery.isLoading ? (
          <Cargando texto="Cargando movimientos..." />
        ) : movsFiltrados.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center">
            <CarTaxiFront className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No hay movimientos en este periodo o filtro.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {movsFiltrados.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.tipo === "ingreso" ? "bg-primary/20 text-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {m.tipo === "ingreso" ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{m.concepto || (m.tipo === "ingreso" ? "Carrera" : "Gasto")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })} · {new Date(m.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p className="font-display text-lg font-bold text-foreground">
                  {m.tipo === "gasto" ? "−" : "+"}{eur(m.importe)}
                </p>
                <button onClick={() => borrar(m.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="px-5 pt-7">
        <button onClick={() => abrirModal("documentos")} className="w-full text-left rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] flex items-center gap-3 transition-transform active:scale-[0.98]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Paperclip className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-foreground">Documentación a almacenar</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Guarda tus permisos, seguros o recibos.</p>
          </div>
        </button>
      </div>

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Llegadas a Barajas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Próximas 5 horas, según Aena.</p>
          </div>
          <button onClick={actualizarTransportes} disabled={vuelos.isFetching || trenes.isFetching} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60 shrink-0">
            <RefreshCw className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {vuelos.isLoading ? (
          <Cargando texto="Consultando vuelos…" />
        ) : (
          <div className="mt-3 space-y-3">
            <TerminalCard titulo="T1" vuelos={t1?.vuelos} />
            <TerminalCard titulo="T2 · T3" vuelos={t2t3?.vuelos} />
            <TerminalCard titulo="T4 · T4S" vuelos={t4t4s?.vuelos} />
          </div>
        )}
      </section>

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Llegadas de Trenes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Llegadas oficiales (Adif).</p>
          </div>
          <button onClick={actualizarTransportes} disabled={vuelos.isFetching || trenes.isFetching} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60 shrink-0">
            <RefreshCw className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {trenes.isLoading ? (
          <Cargando texto="Consultando trenes…" />
        ) : (
          <div className="mt-3 space-y-3">
            <EstacionCard titulo="Atocha" codigoAdif="60000" trenes={atocha?.trenes} />
            <EstacionCard titulo="Chamartín" codigoAdif="17000" trenes={chamartin?.trenes} />
          </div>
        )}
      </section>

      <div className="px-5 pt-8">
        <button onClick={() => abrirModal("factura")} className="w-full text-left rounded-3xl border border-amber-300/50 bg-amber-400 p-4 shadow-sm flex items-center gap-3 transition-transform active:scale-[0.98]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-950">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-amber-950">Factura</h3>
            <p className="text-xs text-amber-900/80 mt-0.5 truncate">Crea y descarga una factura con IVA del 10%.</p>
          </div>
        </button>
      </div>

      <div className="px-5 mt-3">
        <div className="rounded-3xl border border-amber-300/50 bg-amber-400 p-4 shadow-sm flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-950">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-amber-950">Temario examen taxi</h3>
            <a href="https://madrid.es/taxi" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-950 underline font-semibold mt-0.5 inline-flex items-center gap-1 hover:opacity-80">
              madrid.es/taxi <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="fixed bottom-5 left-5 right-5 z-40 flex gap-3 max-w-sm mx-auto">
        <button onClick={() => abrirModal("filtros")} className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl bg-card text-foreground font-semibold text-base shadow-xl border border-border transition-transform active:scale-[0.97]">
          <Search className="h-5 w-5 text-amber-500" /> Filtrar
        </button>
        <button onClick={() => abrirModal("turnos")} className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl bg-card text-foreground font-semibold text-base shadow-xl border border-border transition-transform active:scale-[0.97]">
          <Lock className="h-5 w-5 text-amber-500" /> Turnos
        </button>
      </div>

      {modalActual === "ingreso" && <FormularioIngreso onCerrar={cerrarModal} onGuardar={guardar} />}
      {modalActual === "gasto" && <FormularioGasto onCerrar={cerrarModal} onGuardar={guardar} />}
      {modalActual === "factura" && <VentanaFacturaModalPersonalizada onCerrar={cerrarModal} />}
      {modalActual === "filtros" && (
        <VentanaFiltrosModal
          onCerrar={cerrarModal}
          rangoFechas={rangoFechas}
          setRangoFechas={setRangoFechas}
          setPeriodo={setPeriodo}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
        />
      )}
      {modalActual === "turnos" && (
        <VentanaTurnosModal
          totalesGenerales={totalesGeneralesTurno}
          turnosCerrados={turnosCerrados}
          onCerrar={cerrarModal}
          onCerrarTurno={cerrarTurnoCompleto}
        />
      )}
      {modalActual === "documentos" && <VentanaDocumentosModal onCerrar={cerrarModal} currentUserId={currentUserId} />}

      <div className="px-5 pt-8">
        <PieMarca oscuro />
      </div>
    </main>
  );
}

function Cargando({ texto }: { texto: string }) {
  return <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{texto}</div>;
}

function TerminalCard({ titulo, vuelos }: { titulo: string; vuelos?: VueloItem[] | undefined }) {
  if (!vuelos?.length) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground"><Plane className="h-4 w-4" /></span>
        <span className="font-display text-base font-bold text-foreground">{titulo}</span>
      </div>
      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {vuelos.map((v) => (
          <li key={v.id} className="flex items-center gap-3 text-sm">
            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
            {v.estadoVuelo && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">{v.estadoVuelo}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EstacionCard({ titulo, codigoAdif, trenes }: { titulo: string; codigoAdif: string; trenes?: TrenItem[] | undefined }) {
  if (!trenes?.length) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground"><Train className="h-4 w-4" /></span>
          <span className="font-display text-base font-bold text-foreground">{titulo}</span>
        </div>
        <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground font-semibold">Adif: {codigoAdif}</span>
      </div>
      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {trenes.map((tr) => (
          <li key={tr.id} className="flex items-center gap-3 text-sm">
            <span className="w-11 shrink-0 font-display font-bold text-foreground">{tr.horaEstado || tr.hora}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              <span className="font-semibold text-xs text-primary mr-1">[{tr.tipo}]</span>{tr.origen}
            </span>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">{tr.estado}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModalBase({ onCerrar, children }: { onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ titulo, icono: Icon, onCerrar }: { titulo: string; icono?: React.ElementType; onCerrar: () => void }) {
  return (
    <div className="flex items-center justify-between pb-2 mb-2">
      <h3 className="font-display text-xl font-bold flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        {titulo}
      </h3>
      <button onClick={onCerrar} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function VentanaFacturaModalPersonalizada({ onCerrar }: { onCerrar: () => void }) {
  return (
    <ModalBase onCerrar={onCerrar}>
      <ModalHeader titulo="Factura" icono={FileText} onCerrar={onCerrar} />
      <p className="text-xs text-muted-foreground mb-4">Genera y descarga tu factura oficial con el desglose de IVA (10%).</p>
      <VentanaFacturaModal onCerrar={onCerrar} />
    </ModalBase>
  );
}

function VentanaFiltrosModal({ onCerrar, rangoFechas, setRangoFechas, setPeriodo, filtroTipo, setFiltroTipo }: any) {
  const [inicioTemp, setInicioTemp] = useState(rangoFechas.inicio);
  const [finTemp, setFinTemp] = useState(rangoFechas.fin);
  const [tipoTemp, setTipoTemp] = useState(filtroTipo);
  const hoyMax = new Date().toISOString().slice(0, 10);

  function aplicarFiltro(e: React.FormEvent) {
    e.preventDefault();
    setRangoFechas({ inicio: inicioTemp, fin: finTemp });
    setFiltroTipo(tipoTemp);
    setPeriodo("personalizado");
    onCerrar();
  }

  function limpiarFiltro() {
    setRangoFechas({ inicio: "", fin: "" });
    setTipoTemp("todos");
    setFiltroTipo("todos");
    setPeriodo("dia");
    onCerrar();
  }

  return (
    <ModalBase onCerrar={onCerrar}>
      <ModalHeader titulo="Filtrar movimientos" icono={History} onCerrar={onCerrar} />
      <form onSubmit={aplicarFiltro} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1.5">Tipo de movimiento</label>
          <div className="grid grid-cols-3 gap-2">
            {(["todos", "ingresos", "gastos"] as const).map((t) => (
              <button
                type="button" key={t} onClick={() => setTipoTemp(t)}
                className={`h-11 rounded-xl text-xs font-semibold border transition-colors ${tipoTemp === t ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-secondary text-foreground border-input hover:bg-secondary/80"}`}
              >
                {t === "todos" ? "Neto" : t === "ingresos" ? "Ingresos" : "Gastos"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold">Desde / Fecha inicial</label>
          <input type="date" max={hoyMax} value={inicioTemp} onChange={(e) => setInicioTemp(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold">Hasta / Fecha final</label>
          <input type="date" max={hoyMax} value={finTemp} onChange={(e) => setFinTemp(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 focus:border-primary outline-none" />
        </div>
        <div className="pt-2 space-y-2">
          <button type="submit" className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98]">Aplicar filtros</button>
          <button type="button" onClick={limpiarFiltro} className="w-full h-12 rounded-2xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">Limpiar filtro</button>
        </div>
      </form>
    </ModalBase>
  );
}

function VentanaDocumentosModal({ onCerrar, currentUserId }: { onCerrar: () => void; currentUserId: string | null }) {
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const documentosQuery = useQuery({
    queryKey: ["documentos", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase.from("documentos").select("*").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!currentUserId,
  });

  async function subirDocumento(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo || !currentUserId) return alert("Por favor, selecciona un archivo.");
    setSubiendo(true);
    try {
      const fileExt = archivo.name.split(".").pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(fileName, archivo);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("documentos").getPublicUrl(fileName);
      const nombreFinal = nombrePersonalizado.trim() || archivo.name;

      const { error: dbError } = await supabase.from("documentos").insert({
        user_id: currentUserId, nombre: nombreFinal, ruta: fileName, url: publicUrlData.publicUrl, tipo: archivo.type, tamano: archivo.size,
      });

      if (dbError) throw dbError;
      setArchivo(null);
      setNombrePersonalizado("");
      if (inputFileRef.current) inputFileRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["documentos", currentUserId] });
    } catch (err) {
      console.error(err);
      alert("Error al subir el archivo.");
      if (inputFileRef.current) inputFileRef.current.value = "";
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarDocumento(id: string, rutaArchivo?: string) {
    if (!currentUserId) return;
    if (rutaArchivo) await supabase.storage.from("documentos").remove([rutaArchivo]).catch(() => {});
    const { error } = await supabase.from("documentos").delete().eq("id", id).eq("user_id", currentUserId);
    if (error) return alert("No se pudo eliminar el documento.");
    await queryClient.invalidateQueries({ queryKey: ["documentos", currentUserId] });
  }

  function abrirArchivo(doc: any) {
    const esPdf = doc.tipo === "application/pdf" || doc.url?.toLowerCase().endsWith(".pdf");
    const urlFinal = esPdf
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(doc.url)}&embedded=true`
      : doc.url;
    window.open(urlFinal, "_blank");
  }

  return (
    <ModalBase onCerrar={onCerrar}>
      <ModalHeader titulo="Documentos y Archivos" icono={Paperclip} onCerrar={onCerrar} />
      <p className="text-xs text-muted-foreground mb-4">Sube tus permisos, seguros o recibos de forma sincronizada.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); subirDocumento(e); }}
        className="rounded-3xl border border-dashed border-border bg-secondary/30 p-4 mb-5 space-y-3"
      >
        <div>
          <label className="text-[11px] text-muted-foreground font-semibold uppercase block mb-1">Nombre personalizado (opcional)</label>
          <input type="text" placeholder="Ej: Seguro del coche, ITV..." value={nombrePersonalizado} onChange={(e) => setNombrePersonalizado(e.target.value)} className="w-full h-11 rounded-xl bg-secondary border border-input px-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-semibold uppercase block mb-1">Archivo del dispositivo</label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="input-documento"
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-input bg-secondary px-4 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary/80 transition-colors truncate"
            >
              <Paperclip className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{archivo ? archivo.name : "Seleccionar PDF o imagen..."}</span>
            </label>
            <input
              ref={inputFileRef}
              id="input-documento"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); subirDocumento(e as any); }}
              disabled={subiendo || !archivo}
              className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow disabled:opacity-50 shrink-0"
            >
              {subiendo ? "Subiendo..." : "Adjuntar"}
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tus archivos guardados</h4>
        {documentosQuery.isLoading ? (
          <Cargando texto="Cargando tus documentos..." />
        ) : documentosQuery.data?.length === 0 ? (
          <Cargando texto="No tienes documentos subidos todavía." />
        ) : (
          documentosQuery.data?.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{doc.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("es-ES")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => abrirArchivo(doc)} className="h-8 px-2.5 rounded-xl bg-secondary text-foreground text-xs flex items-center gap-1 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" title="Ver archivo">
                  Ver <ExternalLink className="h-3 w-3" />
                </button>
                <button onClick={() => borrarDocumento(doc.id, doc.ruta)} className="h-8 w-8 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </ModalBase>
  );
}

function VentanaTurnosModal({ totalesGenerales, turnosCerrados, onCerrar, onCerrarTurno }: any) {
  return (
    <ModalBase onCerrar={onCerrar}>
      <ModalHeader titulo="Turnos" onCerrar={onCerrar} />
      <div className="rounded-2xl bg-secondary p-4 mb-4 space-y-2 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Importe Facturado (Neto del turno)</p>
        <p className="font-display text-3xl font-bold text-foreground">{eur(totalesGenerales.neto)}</p>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Ingresos informativos</p>
            <p className="text-sm font-semibold text-primary">{eur(totalesGenerales.ingresos)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Gastos informativos</p>
            <p className="text-sm font-semibold text-destructive">{eur(totalesGenerales.gastos)}</p>
          </div>
        </div>
      </div>
      <button onClick={onCerrarTurno} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] hover:bg-emerald-700 mb-6">
        <Lock className="h-5 w-5" /> Cerrar turno actual
      </button>

      <div className="border-t border-border pt-4">
        <h4 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" /> Historial de Turnos
        </h4>
        {turnosCerrados.length === 0 ? (
          <Cargando texto="Aún no hay turnos cerrados guardados en Supabase." />
        ) : (
          <ul className="space-y-3">
            {turnosCerrados.map((turno: TurnoGuardado) => (
              <li key={turno.id} className="rounded-2xl border border-border bg-secondary/50 p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-1.5">
                  <span>Inicio: {new Date(turno.fechaInicio).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span>Fin: {new Date(turno.fechaFin).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Importe Facturado</p>
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
    </ModalBase>
  );
}

// Función auxiliar para generar IDs sin que rompa en móviles por red local
function generarUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function FormularioIngreso({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
  const [importe, setImporte] = useState("");
  const [metodo, setMetodo] = useState<"Efectivo" | "Tarjeta" | "Emisora" | "Bizum">("Efectivo");
  const [concepto, setConcepto] = useState("Carrera");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const hoyMax = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) return alert("Introduce un importe válido");
    if (fecha > hoyMax) return alert("No se permiten fechas futuras.");

    const fechaFinal = fecha ? new Date(`${fecha}T${new Date().toTimeString().slice(0, 8)}`).toISOString() : new Date().toISOString();
    
    onGuardar({ 
      id: generarUUID(), 
      tipo: "ingreso", 
      importe: num, 
      concepto: `${concepto.trim() || "Carrera"} (${metodo})`, 
      fecha: fechaFinal 
    });
  }

  return (
    <ModalBase onCerrar={onCerrar}>
      <ModalHeader titulo="Nuevo ingreso" onCerrar={onCerrar} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold">Importe €</label>
          <input type="text" inputMode="decimal" placeholder="0,00" autoFocus value={importe} onChange={(e) => setImporte(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-lg font-bold text-foreground mt-1.5 focus:border-primary outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1.5">Forma de pago</label>
          <div className="grid grid-cols-2 gap-2">
            {(["Efectivo", "Tarjeta", "Emisora", "Bizum"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMetodo(m)} className={`h-11 rounded-2xl text-xs font-semibold border transition-colors ${metodo === m ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-secondary text-foreground border-input hover:bg-secondary/80"}`}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha
          </label>
          <input type="date" max={hoyMax} value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
          <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-primary" />
          <div className="flex flex-wrap gap-2 mt-2">
            {["Carrera", "Aeropuerto", "Estación"].map((c) => (
              <button type="button" key={c} onClick={() => setConcepto(c)} className="h-9 px-3 rounded-2xl bg-secondary border border-input text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary transition-colors">{c}</button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] mt-2">Guardar ingreso</button>
      </form>
    </ModalBase>
  );
}

function FormularioGasto({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("Combustible");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const hoyMax = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) return alert("Introduce un importe válido");
    if (fecha > hoyMax) return alert("No se permiten fechas futuras.");

    const fechaFinal = fecha ? new Date(`${fecha}T${new Date().toTimeString().slice(0, 8)}`).toISOString() : new Date().toISOString();
    
    onGuardar({ 
      id: generarUUID(), 
      tipo: "gasto", 
      importe: num, 
      concepto: concepto.trim() || "Gasto", 
      fecha: fechaFinal 
    });
  }

  return (
    <ModalBase onCerrar={onCerrar}>
      <ModalHeader titulo="Nuevo gasto" onCerrar={onCerrar} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold">Importe €</label>
          <input type="text" inputMode="decimal" placeholder="0,00" autoFocus value={importe} onChange={(e) => setImporte(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-lg font-bold text-foreground mt-1.5 focus:border-red-500 outline-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-red-500" /> Fecha
          </label>
          <input type="date" max={hoyMax} value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-red-500" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
          <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1.5 outline-none focus:border-red-500" />
          <div className="flex flex-wrap gap-2 mt-2">
            {["Combustible", "Lavado", "Taller", "Parking", "Peaje"].map((c) => (
              <button type="button" key={c} onClick={() => setConcepto(c)} className="h-9 px-3 rounded-2xl bg-secondary border border-input text-xs font-medium text-foreground hover:bg-red-500/10 hover:border-red-500 transition-colors">{c}</button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full h-14 rounded-2xl bg-red-600 text-white font-semibold text-base shadow-lg transition-transform active:scale-[0.98] mt-2">Guardar gasto</button>
      </form>
    </ModalBase>
  );
}