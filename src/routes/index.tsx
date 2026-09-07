import { createFileRoute, Link } from "@tanstack/react-router";
import { CarTaxiFront, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaxiHoja — Tu hoja de ruta diaria en el móvil" },
      {
        name: "description",
        content:
          "TaxiHoja: controla los ingresos, gastos y el neto de tu jornada de taxi desde el móvil.",
      },
      { property: "og:title", content: "TaxiHoja — Tu hoja de ruta diaria en el móvil" },
      {
        property: "og:description",
        content: "Ingresos, gastos y el neto de tu jornada de taxi, siempre a mano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background px-6 pb-10 pt-14">
      <div className="pointer-events-none absolute -top-28 -right-16 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[image:var(--gradient-taxi)]" />

      <header className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
          <CarTaxiFront className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold tracking-tight text-foreground">
          TaxiHoja
        </h1>
        <p className="mt-3 max-w-xs text-base text-muted-foreground">
          Lleva las cuentas de tu jornada desde el móvil. Entra para ver tu panel.
        </p>
      </header>

      <div className="relative mt-8 space-y-3">
        <Bloque
          icon={<ShieldCheck className="h-5 w-5" />}
          titulo="Tus cuentas al día"
          texto="Ingresos, gastos y el neto de tu jornada, siempre a mano."
        />
      </div>


      <div className="relative mt-8 space-y-3">
        <Link
          to="/auth"
          search={{ modo: "registro" }}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          Crear cuenta
          <ArrowRight className="h-5 w-5" />
        </Link>
        <Link
          to="/auth"
          search={{ modo: "acceso" }}
          className="flex h-14 w-full items-center justify-center rounded-2xl border border-border bg-card text-base font-semibold text-foreground transition-transform active:scale-[0.98]"
        >
          Ya tengo cuenta
        </Link>
        <p className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Solo entran los correos registrados.
        </p>
      </div>

      <div className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Hecho para taxistas de Madrid
      </div>
    </main>
  );
}

function Bloque({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
        {icon}
      </span>
      <span>
        <span className="block font-semibold text-foreground">{titulo}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{texto}</span>
      </span>
    </div>
  );
}
