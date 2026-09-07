import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setUsuario } from "@/lib/taxihoja";
import { CarTaxiFront, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaxiHoja — Tu hoja de ruta diaria en el móvil" },
      {
        name: "description",
        content:
          "TaxiHoja: controla tus jornadas, ingresos, gastos y documentación de taxi desde el móvil. Incluye el temario del examen del taxi de Madrid.",
      },
      { property: "og:title", content: "TaxiHoja — Tu hoja de ruta diaria en el móvil" },
      {
        property: "og:description",
        content:
          "Controla jornadas, ingresos, gastos y documentación de taxi desde el móvil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [pass, setPass] = useState("");

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    setUsuario(nombre.trim() || "Taxista");
    navigate({ to: "/panel" });
  }

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
          Tu hoja de ruta diaria: jornadas, ingresos, gastos y papeles, siempre en el
          bolsillo.
        </p>
      </header>

      <form
        onSubmit={entrar}
        className="relative mt-9 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
      >
        <label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Usuario
        </label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre o licencia"
          className="mt-2 h-13 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />

        <label className="mt-5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Contraseña
        </label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="••••••••"
          className="mt-2 h-13 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />

        <button
          type="submit"
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          Iniciar sesión
          <ArrowRight className="h-5 w-5" />
        </button>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Tus datos se guardan en este dispositivo.
        </p>
      </form>

      <div className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Hecho para taxistas de Madrid
      </div>
    </main>
  );
}
