import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CarTaxiFront,
  FileDown,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  Lock,
  Search,
  ExternalLink,
  Paperclip,
  FileText,
  BookOpen,
  Banknote,
  CreditCard,
  Smartphone,
  Fuel,
  Wrench,
  ShieldCheck,
  Sparkles,
  Receipt,
  Tag,
} from "lucide-react";
import { eur } from "@/lib/taxihoja";
import { supabase } from "@/integrations/supabase/client";
import { abrirInforme } from "@/lib/informe";
import { Marca, PieMarca } from "@/components/marca";

import type { FiltroTipo, ModalType, Periodo } from "./-panel/types";
import { perteneceAlPeriodo } from "./-panel/lib/periodo";
import { usePanelData } from "./-panel/hooks/usePanelData";
import { useTransporteData } from "./-panel/hooks/useTransporteData";
import { Cargando } from "./-panel/components/Cargando";
import {
  EstacionCard,
  TerminalCard,
  seleccionarTransportes,
} from "./-panel/components/TransporteCards";
import { IngresoModal } from "./-panel/modals/IngresoModal";
import { GastoModal } from "./-panel/modals/GastoModal";
import { FacturaModal } from "./-panel/modals/FacturaModal";
import { FiltrosModal } from "./-panel/modals/FiltrosModal";
import { TurnosModal } from "./-panel/modals/TurnosModal";
import { DocumentosModal } from "./-panel/modals/DocumentosModal";

export const Route = createFileRoute("/_authenticated/panel")({
  validateSearch: (search: Record<string, unknown>) => ({
    modal: (search.modal as ModalType | undefined) ?? null,
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

function getConceptBadge(concept: string, tipo: "ingreso" | "gasto") {
  const lower = (concept || "").toLowerCase();

  if (tipo === "ingreso") {
    if (lower.includes("app") || lower.includes("freenow") || lower.includes("bolt") || lower.includes("uber")) {
      return {
        icon: <Smartphone className="h-3.5 w-3.5 text-sky-400" />,
        bg: "bg-sky-500/15 border-sky-500/30 text-sky-300",
        label: concept || "App / Digital",
      };
    }
    if (lower.includes("tarjeta") || lower.includes("tpv") || lower.includes("fono")) {
      return {
        icon: <CreditCard className="h-3.5 w-3.5 text-emerald-400" />,
        bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
        label: concept || "Tarjeta",
      };
    }
    if (lower.includes("efectivo") || lower.includes("carrera") || lower.includes("taximetro") || lower.includes("propina")) {
      return {
        icon: <Banknote className="h-3.5 w-3.5 text-amber-400" />,
        bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        label: concept || "Efectivo",
      };
    }
    return {
      icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,
      bg: "bg-primary/15 border-primary/30 text-primary",
      label: concept || "Ingreso",
    };
  } else {
    if (lower.includes("gasolina") || lower.includes("combustible") || lower.includes("gasoil") || lower.includes("carburante")) {
      return {
        icon: <Fuel className="h-3.5 w-3.5 text-orange-400" />,
        bg: "bg-orange-500/15 border-orange-500/30 text-orange-300",
        label: concept || "Combustible",
      };
    }
    if (lower.includes("taller") || lower.includes("mantenimiento") || lower.includes("reparacion") || lower.includes("ruedas") || lower.includes("aceite")) {
      return {
        icon: <Wrench className="h-3.5 w-3.5 text-rose-400" />,
        bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        label: concept || "Mantenimiento",
      };
    }
    if (lower.includes("seguro") || lower.includes("impuesto") || lower.includes("mutua") || lower.includes("gestoria")) {
      return {
        icon: <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />,
        bg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
        label: concept || "Seguro / Impuestos",
      };
    }
    return {
      icon: <Receipt className="h-3.5 w-3.5 text-rose-400" />,
      bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
      label: concept || "Gasto",
    };
  }
}

function Panel() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [rangoFechas, setRangoFechas] = useState({ inicio: "", fin: "" });
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  const abrirModal = (tipo: ModalType) => navigate({ search: { modal: tipo } });
  const cerrarModal = () => navigate({ search: { modal: null } });

  const {
    currentUserId,
    currentCorreo,
    ultimoCorte,
    movs,
    turnosCerrados,
    movimientosQuery,
    guardar,
    borrar,
    cerrarTurno,
  } = usePanelData();

  const { vuelos, trenes, actualizar: actualizarTransportes } = useTransporteData();

  const movsDelTurnoActual = useMemo(
    () => movs.filter((m) => !ultimoCorte || m.fecha > ultimoCorte),
    [movs, ultimoCorte]
  );

  const totalesGeneralesTurno = useMemo(() => {
    const ingresos = movsDelTurnoActual
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.importe, 0);
    const gastos = movsDelTurnoActual
      .filter((m) => m.tipo === "gasto")
      .reduce((s, m) => s + m.importe, 0);
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
    const ingresos = movsFiltrados
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.importe, 0);
    const gastos = movsFiltrados
      .filter((m) => m.tipo === "gasto")
      .reduce((s, m) => s + m.importe, 0);
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
    periodo === "dia"
      ? "del turno"
      : periodo === "semana"
        ? "de la semana"
        : periodo === "mes"
          ? "del mes"
          : "filtrado";

  async function handleGuardar(m: Parameters<typeof guardar>[0]) {
    await guardar(m);
    cerrarModal();
  }

  async function handleCerrarTurno() {
    const ok = await cerrarTurno(movsDelTurnoActual, totalesGeneralesTurno);
    if (ok) cerrarModal();
  }

  async function salir() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { modo: "acceso" }, replace: true });
  }

  const { t1, t2t3, t4t4s, atocha, chamartin } = seleccionarTransportes(
    vuelos.data ?? [],
    trenes.data ?? []
  );

  return (
    <main className="min-h-dvh bg-background pb-28">
      {/* HEADER SUPERIOR ADAPTADO */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 max-w-2xl mx-auto w-full">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[image:var(--gradient-night)] p-4 sm:p-5 shadow-xl">
          <div className="min-w-0">
            <Marca oscuro />
            <h1 className="mt-1 truncate font-display text-lg sm:text-xl font-bold text-white">
              {currentCorreo || "Tu cuenta"}
            </h1>
          </div>
          <button
            onClick={salir}
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>
      </div>

      {/* CUADRO DE INGRESOS Y GASTOS AMPLIADO Y ADAPTADO A WEBVIEW/MÓVIL */}
      <div className="mt-4 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[image:var(--gradient-night)] p-6 sm:p-8 shadow-xl">
          <div className="pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />

          <div className="relative flex justify-center gap-2" role="group">
            {(["dia", "semana", "mes"] as const).map((opcion) => (
              <button
                key={opcion}
                onClick={() => {
                  setPeriodo(opcion);
                  setRangoFechas({ inicio: "", fin: "" });
                  setFiltroTipo("todos");
                }}
                className={`h-10 min-w-20 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  periodo === opcion && periodo !== "personalizado"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {opcion === "dia" ? "Día" : opcion === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>

          <div className="relative mx-auto mt-6 max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 sm:p-7 text-center backdrop-blur">
            <p className="text-xs sm:text-sm tracking-wide text-white/70 uppercase">
              Neto acumulado {periodo === "personalizado" ? "filtrado" : periodoLabel}
            </p>
            <p className="mt-2 font-display text-5xl sm:text-6xl font-bold tracking-tight text-white">
              {eur(totales.neto)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-black/25 py-3 px-4">
                <p className="text-[11px] tracking-wide text-white/60 uppercase">Ingresos</p>
                <p className="text-base sm:text-lg font-semibold text-white mt-0.5">{eur(totales.ingresos)}</p>
              </div>
              <div className="rounded-2xl bg-black/25 py-3 px-4">
                <p className="text-[11px] tracking-wide text-white/60 uppercase">Gastos</p>
                <p className="text-base sm:text-lg font-semibold text-white mt-0.5">{eur(totales.gastos)}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => abrirModal("ingreso")}
                className="flex h-14 sm:h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-base sm:text-lg font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.97]"
              >
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" /> Ingreso
              </button>
              <button
                onClick={() => abrirModal("gasto")}
                className="flex h-14 sm:h-16 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-base sm:text-lg font-semibold text-white shadow-md transition-transform active:scale-[0.97]"
              >
                <Minus className="h-5 w-5 sm:h-6 sm:w-6" /> Gasto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR GENERAL PARA CENTRAR EL RESTO EN WEBVIEW/TABLETS */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto w-full">
        {/* SECCIÓN MOVIMIENTOS */}
        <section className="pt-7">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Movimientos</h2>
          <button
            onClick={() => abrirInforme(movsFiltrados, currentCorreo, periodoLabel)}
            className="mt-3 flex h-14 w-full items-center gap-3 rounded-2xl bg-foreground px-4 text-left text-base font-semibold text-background transition-transform active:scale-[0.98]"
          >
            <FileDown className="h-5 w-5 shrink-0" /> Exportar a PDF
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
              {movsFiltrados.map((m) => {
                const badge = getConceptBadge(m.concepto, m.tipo);

                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-foreground shadow-inner">
                      {m.tipo === "ingreso" ? <Plus className="h-5 w-5 text-emerald-500" /> : <Minus className="h-5 w-5 text-rose-500" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                          {badge.icon}
                          <span className="truncate">{badge.label}</span>
                        </span>
                      </div>
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
                    <p className={`font-display text-lg font-bold ${m.tipo === "ingreso" ? "text-emerald-500" : "text-rose-500"}`}>
                      {m.tipo === "gasto" ? "−" : "+"}
                      {eur(m.importe)}
                    </p>
                    <button
                      onClick={() => borrar(m.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* SECCIÓN ATAJOS DOCUMENTOS */}
        <div className="pt-7">
          <button
            onClick={() => abrirModal("documentos")}
            className="w-full text-left rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)] flex items-center gap-3 transition-transform active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Paperclip className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-foreground">
                Documentación a almacenar
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Guarda tus permisos, seguros o recibos.
              </p>
            </div>
          </button>
        </div>

        {/* SECCIÓN VUELOS */}
        <section className="pt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Llegadas a Barajas
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Próximas 5 horas, según Aena.</p>
            </div>
            <button
              onClick={actualizarTransportes}
              disabled={vuelos.isFetching || trenes.isFetching}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60 shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`}
              />
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

        {/* SECCIÓN TRENES */}
        <section className="pt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Llegadas de Trenes
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Llegadas oficiales (Adif).</p>
            </div>
            <button
              onClick={actualizarTransportes}
              disabled={vuelos.isFetching || trenes.isFetching}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:opacity-60 shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`}
              />
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

        {/* SECCIÓN ACCIONES SECUNDARIAS */}
        <div className="pt-8">
          <button
            onClick={() => abrirModal("factura")}
            className="w-full text-left rounded-3xl border border-amber-300/50 bg-amber-400 p-4 shadow-sm flex items-center gap-3 transition-transform active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-950">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-amber-950">Factura</h3>
              <p className="text-xs text-amber-900/80 mt-0.5 truncate">
                Crea y descarga una factura con IVA del 10%.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-3">
          <div className="rounded-3xl border border-amber-300/50 bg-amber-400 p-4 shadow-sm flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-950">
              <BookOpen className="h-5 w-5" />
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

        <div className="pt-8">
          <PieMarca oscuro />
        </div>
      </div>

      {/* BOTTOM NAV / ACCIONES RÁPIDAS FLOTANTES */}
      <div className="fixed bottom-5 left-4 right-4 z-40 flex gap-3 max-w-sm mx-auto">
        <button
          onClick={() => abrirModal("filtros")}
          className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl bg-card text-foreground font-semibold text-base shadow-xl border border-border transition-transform active:scale-[0.97]"
        >
          <Search className="h-5 w-5 text-amber-500" /> Filtrar
        </button>
        <button
          onClick={() => abrirModal("turnos")}
          className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl bg-card text-foreground font-semibold text-base shadow-xl border border-border transition-transform active:scale-[0.97]"
        >
          <Lock className="h-5 w-5 text-amber-500" /> Turnos
        </button>
      </div>

      {/* MODALES */}
      {search.modal === "ingreso" && (
        <IngresoModal onCerrar={cerrarModal} onGuardar={handleGuardar} />
      )}
      {search.modal === "gasto" && (
        <GastoModal onCerrar={cerrarModal} onGuardar={handleGuardar} />
      )}
      {search.modal === "factura" && <FacturaModal onCerrar={cerrarModal} />}
      {search.modal === "filtros" && (
        <FiltrosModal
          onCerrar={cerrarModal}
          rangoFechas={rangoFechas}
          setRangoFechas={setRangoFechas}
          setPeriodo={setPeriodo}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
        />
      )}
      {search.modal === "turnos" && (
        <TurnosModal
          totalesGenerales={totalesGeneralesTurno}
          turnosCerrados={turnosCerrados}
          onCerrar={cerrarModal}
          onCerrarTurno={handleCerrarTurno}
        />
      )}
      {search.modal === "documentos" && (
        <DocumentosModal onCerrar={cerrarModal} currentUserId={currentUserId} />
      )}
    </main>
  );
}