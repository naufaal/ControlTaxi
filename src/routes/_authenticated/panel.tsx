import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpenCheck,
  CarTaxiFront,
  FileDown,
  ExternalLink,
  LogOut,
  Minus,
  Plane,
  Plus,
  RefreshCw,
  TrainFront,
  Trash2,
} from "lucide-react";
import {
  eur,
  cargarMovimientos,
  guardarMovimiento,
  borrarMovimiento,
  type Movimiento,
} from "@/lib/taxihoja";
import { getLlegadasBarajas, getLlegadasTrenes } from "@/lib/transporte.functions";
import { supabase } from "@/integrations/supabase/client";
import { Documentos } from "@/components/documentos";
import { FacturaCliente } from "@/components/factura";
import { abrirInforme } from "@/lib/informe";
import { Marca, PieMarca } from "@/components/marca";

type Periodo = "dia" | "semana" | "mes";

function fechaLocalInput(fecha: Date): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

function perteneceAlPeriodo(fechaMovimiento: string, periodo: Periodo): boolean {
  const fecha = new Date(fechaMovimiento);
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);

  if (periodo === "dia") {
    return fecha >= inicio && fecha < new Date(inicio.getTime() + 86_400_000);
  }

  if (periodo === "semana") {
    const diasDesdeLunes = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diasDesdeLunes);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return fecha >= inicio && fecha < fin;
  }

  inicio.setDate(1);
  const fin = new Date(inicio);
  fin.setMonth(fin.getMonth() + 1);
  return fecha >= inicio && fecha < fin;
}

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Mi panel — ControlTaxi" },
      {
        name: "description",
        content:
          "Ingresos y gastos del día, llegadas de Barajas por terminal (T1, T2, T4 y T4S) y trenes de alta velocidad a Atocha y Chamartín.",
      },
      { property: "og:title", content: "Mi panel — ControlTaxi" },
      {
        property: "og:description",
        content: "Cuentas del día, llegadas de Barajas y AVE de Atocha y Chamartín.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

function Panel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [correo, setCorreo] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<"ingreso" | "gasto" | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("dia");

  // Obtener el usuario autenticado al cargar la vista
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

  // Consulta de movimientos gestionada por React Query (se actualiza sola al enfocar la app o invalidar)
  const movimientosQuery = useQuery({
    queryKey: ["movimientos", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      void supabase.rpc("registrar_uso", { p_event: "panel_view", p_path: "/panel" });
      return await cargarMovimientos(currentUserId);
    },
    enabled: !!currentUserId,
    refetchOnWindowFocus: true,
  });

  const movs = movimientosQuery.data ?? [];

  const vuelosFn = useServerFn(getLlegadasBarajas);
  const trenesFn = useServerFn(getLlegadasTrenes);

  const vuelos = useQuery({
    queryKey: ["llegadas-barajas"],
    queryFn: () => vuelosFn(),
    refetchInterval: 120_000,
  });
  const trenes = useQuery({
    queryKey: ["llegadas-trenes"],
    queryFn: () => trenesFn(),
    refetchInterval: 180_000,
  });

  function actualizarTransportes() {
    void Promise.all([vuelos.refetch(), trenes.refetch()]);
  }

  const movsFiltrados = useMemo(
    () => movs.filter((movimiento) => perteneceAlPeriodo(movimiento.fecha, periodo)),
    [movs, periodo],
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

  const periodoLabel = periodo === "dia" ? "del día" : periodo === "semana" ? "de la semana" : "del mes";

  async function guardar(m: Movimiento) {
    if (currentUserId) {
      try {
        await guardarMovimiento(currentUserId, m);
        // Fuerza la recarga inmediata de la lista desde Supabase
        await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
        setForm(null);
      } catch (error) {
        console.error("Error al guardar:", error);
        alert("No se pudo guardar en Supabase. Comprueba las políticas RLS.");
      }
    }
  }

  async function borrar(id: string) {
    if (currentUserId) {
      try {
        await borrarMovimiento(currentUserId, id);
        // Fuerza la recarga inmediata de la lista tras borrar
        await queryClient.invalidateQueries({ queryKey: ["movimientos", currentUserId] });
      } catch (error) {
        console.error("Error al borrar:", error);
        alert("Error al eliminar el registro en Supabase.");
      }
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
              onClick={() => setPeriodo(opcion)}
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
          <p className="text-xs tracking-wide text-white/70 uppercase">Neto acumulado</p>
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
            onClick={() => setForm("ingreso")}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.97]"
          >
            <Plus className="h-5 w-5" /> Ingreso
          </button>
          <button
            onClick={() => setForm("gasto")}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-base font-semibold text-white transition-transform active:scale-[0.97]"
          >
            <Minus className="h-5 w-5" /> Gasto
          </button>
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
              {movs.length === 0
                ? "Todavía no has apuntado ningún ingreso ni gasto."
                : "No hay movimientos en este periodo."}
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
                  {m.tipo === "ingreso" ? (
                    <Plus className="h-5 w-5" />
                  ) : (
                    <Minus className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {m.concepto || (m.tipo === "ingreso" ? "Carrera" : "Gasto")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.fecha).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    {new Date(m.fecha).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {/* Si tiene forma de pago guardada en el concepto o adicional */}
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

      <Documentos />

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Llegadas a Barajas
          </h2>
          <button
            onClick={actualizarTransportes}
            disabled={vuelos.isFetching || trenes.isFetching}
            aria-label="Actualizar vuelos"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Próximas 5 horas, según Aena. T4 incluye T4S.
        </p>

        {vuelos.isLoading ? (
          <Cargando texto="Consultando vuelos…" />
        ) : (
          <div className="mt-3 space-y-3">
            {(vuelos.data ?? []).map((t) => (
              <div
                key={t.terminal}
                className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                      <Plane className="h-4 w-4" />
                    </span>
                    <span className="font-display text-base font-bold text-foreground">
                      {t.etiqueta}
                    </span>
                  </div>
                </div>
                {t.vuelos.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sin llegadas próximas.
                  </p>
                ) : (
                  <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {t.vuelos.map((v) => (
                      <li key={v.id} className="flex items-center gap-3 text-sm">
                        <span className="w-11 shrink-0 font-display font-bold text-foreground">
                          {v.horaEstimada}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {v.origen}
                        </span>

                        {v.retrasoMin > 0 && (
                          <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            +{v.retrasoMin}′
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-5 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Alta velocidad
          </h2>
          <button
            onClick={actualizarTransportes}
            disabled={vuelos.isFetching || trenes.isFetching}
            aria-label="Actualizar trenes"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${vuelos.isFetching || trenes.isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Llegadas de larga distancia de hoy a Atocha y Chamartín. Desliza para verlas todas.
        </p>

        {trenes.isLoading ? (
          <Cargando texto="Consultando trenes…" />
        ) : (
          <div className="mt-3 space-y-3">
            {(trenes.data ?? []).map((e) => (
              <div
                key={e.nombre}
                className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
                      <TrainFront className="h-4 w-4" />
                    </span>
                    <span className="font-display text-base font-bold text-foreground">
                      {e.nombre}
                    </span>
                  </div>
                </div>
                {e.trenes.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sin llegadas próximas.
                  </p>
                ) : (
                  <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {e.trenes.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 text-sm">
                        <span className="w-11 shrink-0 font-display font-bold text-foreground">
                          {t.horaEstado || t.hora}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {t.origen}
                        </span>
                        {(t.via || t.estado) && (
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            {t.via ? `Vía ${t.via}` : t.estado}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <FacturaCliente />

      <section className="px-5 pt-8">
        <a
          href="https://madrid.es/taxi"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-3xl bg-primary p-5 text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
        >
          <span>
            <BookOpenCheck className="h-5 w-5" />
            <span className="mt-3 block font-semibold">Temario examen taxi</span>
            <span className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
              madrid.es/taxi <ExternalLink className="h-3 w-3" />
            </span>
          </span>
        </a>
      </section>

      {form && (
        <Formulario tipo={form} onCerrar={() => setForm(null)} onGuardar={guardar} />
      )}
      <div className="px-5 pt-8">
        <PieMarca oscuro />
      </div>
    </main>
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

function Formulario({
  tipo,
  onCerrar,
  onGuardar,
}: {
  tipo: "ingreso" | "gasto";
  onCerrar: () => void;
  onGuardar: (m: Movimiento) => void;
}) {
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("");
  const [formaPago, setFormaPago] = useState<"Efectivo" | "Tarjeta" | "Emisora">("Efectivo");
  const [fecha, setFecha] = useState(() => fechaLocalInput(new Date()));

  const sugerenciasConcepto =
    tipo === "ingreso"
      ? ["Carrera", "Aeropuerto", "Estación", "Propina"]
      : ["Combustible", "Lavado", "Taller", "Parking"];

  const formasPago = ["Efectivo", "Tarjeta", "Emisora"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const valor = Number(importe.replace(",", "."));
          if (!valor || valor <= 0) return;
          const hora = new Date();
          const fechaMovimiento = new Date(
            `${fecha}T${String(hora.getHours()).padStart(2, "0")}:${String(hora.getMinutes()).padStart(2, "0")}:${String(hora.getSeconds()).padStart(2, "0")}`,
          );

          // Si es ingreso, adjuntamos la forma de pago al concepto para reflejarla con claridad
          let conceptoFinal = concepto.trim();
          if (tipo === "ingreso") {
            const baseConcepto = conceptoFinal || "Carrera";
            conceptoFinal = `${baseConcepto} (${formaPago})`;
          }

          onGuardar({
            id: crypto.randomUUID(),
            fecha: fechaMovimiento.toISOString(),
            tipo,
            concepto: conceptoFinal,
            importe: valor,
          });
        }}
        className="w-full rounded-t-[2rem] bg-card p-6 pb-8"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <h3 className="mt-5 font-display text-xl font-bold text-foreground">
          {tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto"}
        </h3>

        <label className="mt-5 block">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Importe €
          </span>
          <input
            autoFocus
            inputMode="decimal"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="0,00"
            className="mt-1.5 h-14 w-full rounded-2xl border border-input bg-secondary px-4 font-display text-2xl font-bold text-foreground outline-none focus:border-primary"
          />
        </label>

        {/* Sección exclusiva de Forma de Pago para Ingresos */}
        {tipo === "ingreso" && (
          <div className="mt-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Forma de pago
            </span>
            <div className="mt-1.5 flex gap-2">
              {formasPago.map((fp) => (
                <button
                  key={fp}
                  type="button"
                  onClick={() => setFormaPago(fp)}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors ${
                    formaPago === fp
                      ? "bg-primary text-primary-foreground shadow"
                      : "border border-border bg-secondary text-foreground"
                  }`}
                >
                  {fp}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Fecha
          </span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Concepto
          </span>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder={tipo === "ingreso" ? "Carrera" : "Combustible"}
            className="mt-1.5 h-12 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {sugerenciasConcepto.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setConcepto(s)}
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-[0.98]"
        >
          Guardar {tipo}
        </button>
      </form>
    </div>
  );
}
