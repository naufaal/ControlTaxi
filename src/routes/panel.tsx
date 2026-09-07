import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CarTaxiFront,
  ExternalLink,
  FileText,
  LogOut,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  cerrarSesion,
  eur,
  getJornadas,
  getUsuario,
  saveJornadas,
  type Jornada,
} from "@/lib/taxihoja";

export const Route = createFileRoute("/panel")({
  head: () => ({
    meta: [
      { title: "Mi panel — TaxiHoja" },
      {
        name: "description",
        content:
          "Resumen de tus jornadas de taxi: ingresos, gastos, kilómetros y acceso al temario del examen del taxi de Madrid.",
      },
      { property: "og:title", content: "Mi panel — TaxiHoja" },
      {
        property: "og:description",
        content: "Resumen de jornadas, ingresos y gastos de tu día de taxi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

function Panel() {
  const navigate = useNavigate();
  const [usuario, setUser] = useState<string | null>(null);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    setUser(getUsuario() ?? "Taxista");
    setJornadas(getJornadas());
  }, []);

  const totales = useMemo(() => {
    const ingresos = jornadas.reduce((s, j) => s + j.ingresos, 0);
    const gastos = jornadas.reduce((s, j) => s + j.gastos, 0);
    const km = jornadas.reduce((s, j) => s + j.km, 0);
    const horas = jornadas.reduce((s, j) => s + j.horas, 0);
    return { ingresos, gastos, neto: ingresos - gastos, km, horas };
  }, [jornadas]);

  function añadir(j: Jornada) {
    const list = [j, ...jornadas];
    setJornadas(list);
    saveJornadas(list);
    setAbierto(false);
  }

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="relative overflow-hidden rounded-b-[2rem] bg-[image:var(--gradient-night)] px-6 pt-12 pb-8">
        <div className="pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              TaxiHoja
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">
              Hola, {usuario}
            </h1>
          </div>
          <button
            onClick={() => {
              cerrarSesion();
              navigate({ to: "/" });
            }}
            aria-label="Cerrar sesión"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-7 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <p className="text-xs tracking-wide text-white/70 uppercase">Neto acumulado</p>
          <p className="mt-1 font-display text-4xl font-bold text-white">
            {eur(totales.neto)}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Mini label="Ingresos" valor={eur(totales.ingresos)} />
            <Mini label="Gastos" valor={eur(totales.gastos)} />
            <Mini label="Km" valor={`${totales.km}`} />
          </div>
        </div>
      </div>

      <section className="px-5 pt-7">
        <h2 className="font-display text-lg font-semibold text-foreground">Accesos</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tarjeta
            icon={<TrendingUp className="h-5 w-5" />}
            titulo="Jornadas"
            sub={`${jornadas.length} registradas`}
            onClick={() => setAbierto(true)}
          />
          <Tarjeta
            icon={<Wallet className="h-5 w-5" />}
            titulo="Gastos"
            sub={eur(totales.gastos)}
            onClick={() => setAbierto(true)}
          />
          <Tarjeta
            icon={<FileText className="h-5 w-5" />}
            titulo="Documentación"
            sub="Licencia y seguro"
          />
          <a
            href="https://madrid.es/taxi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col justify-between rounded-3xl bg-primary p-4 text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
          >
            <BookOpenCheck className="h-5 w-5" />
            <div className="mt-6">
              <p className="font-semibold">Temario examen taxi</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                madrid.es/taxi <ExternalLink className="h-3 w-3" />
              </p>
            </div>
          </a>
        </div>
      </section>

      <section className="px-5 pt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Últimas jornadas
        </h2>
        {jornadas.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center">
            <CarTaxiFront className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aún no has registrado ninguna jornada.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {jornadas.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {new Date(j.fecha).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {j.horas} h · {j.km} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-foreground">
                    {eur(j.ingresos - j.gastos)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eur(j.ingresos)} − {eur(j.gastos)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => setAbierto(true)}
        className="fixed inset-x-5 bottom-5 mx-auto flex h-14 max-w-md items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-semibold text-background shadow-lg transition-transform active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" /> Nueva jornada
      </button>

      {abierto && <Formulario onCerrar={() => setAbierto(false)} onGuardar={añadir} />}
    </main>
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

function Tarjeta({
  icon,
  titulo,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  titulo: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col justify-between rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
        {icon}
      </span>
      <span className="mt-6 block">
        <span className="block font-semibold text-foreground">{titulo}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function Formulario({
  onCerrar,
  onGuardar,
}: {
  onCerrar: () => void;
  onGuardar: (j: Jornada) => void;
}) {
  const [ingresos, setIngresos] = useState("");
  const [gastos, setGastos] = useState("");
  const [horas, setHoras] = useState("");
  const [km, setKm] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0" onClick={onCerrar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar({
            id: crypto.randomUUID(),
            fecha: new Date().toISOString(),
            ingresos: Number(ingresos) || 0,
            gastos: Number(gastos) || 0,
            horas: Number(horas) || 0,
            km: Number(km) || 0,
          });
        }}
        className="w-full rounded-t-[2rem] bg-card p-6 pb-8"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <h3 className="mt-5 font-display text-xl font-bold text-foreground">
          Nueva jornada
        </h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Campo label="Ingresos €" value={ingresos} onChange={setIngresos} />
          <Campo label="Gastos €" value={gastos} onChange={setGastos} />
          <Campo label="Horas" value={horas} onChange={setHoras} />
          <Campo label="Km" value={km} onChange={setKm} />
        </div>
        <button
          type="submit"
          className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-[0.98]"
        >
          Guardar jornada
        </button>
      </form>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1.5 h-12 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
