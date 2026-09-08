import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Marca, PieMarca } from "@/components/marca";

type Modo = "acceso" | "registro";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    modo: (search["modo"] === "registro" ? "registro" : "acceso") as Modo,
  }),
  head: () => ({
    meta: [
      { title: "Acceder o crear cuenta — ControlTaxi" },
      {
        name: "description",
        content:
          "Entra en ControlTaxi con tu correo registrado o crea una cuenta nueva para llevar tus cuentas de taxi.",
      },
      { property: "og:title", content: "Acceder o crear cuenta — ControlTaxi" },
      {
        property: "og:description",
        content: "Entra con tu correo registrado o crea tu cuenta de ControlTaxi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { modo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const registro = modo === "registro";

  // Redirigir inmediatamente al panel si el usuario ya está autenticado
  useEffect(() => {
    const comprobarSesion = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/panel" });
      }
    };
    comprobarSesion();
  }, [navigate]);

  function cambiar(nuevo: Modo) {
    setError("");
    navigate({ to: "/auth", search: { modo: nuevo } });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const correo = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      setError("Escribe un correo válido.");
      return;
    }
    if (pass.length < 6) {
      setError("La contraseña necesita al menos 6 caracteres.");
      return;
    }
    if (registro && pass !== pass2) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      if (registro) {
        const { data, error: err } = await supabase.auth.signUp({
          email: correo,
          password: pass,
          options: { emailRedirectTo: `${window.location.origin}/panel` },
        });
        if (err) {
          setError(
            err.message.toLowerCase().includes("already")
              ? "Ese correo ya está registrado. Entra con tu contraseña."
              : "No hemos podido crear la cuenta. Inténtalo de nuevo.",
          );
          return;
        }
        if (!data.session) {
          setError("La cuenta se creó, pero Supabase todavía exige confirmación de correo.");
          return;
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: correo,
          password: pass,
        });
        if (err) {
          setError("Ese correo no está registrado o la contraseña no es correcta.");
          return;
        }
      }
      navigate({ to: "/panel" });
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background pb-10">
      {/* Encabezado Oscuro Nocturno */}
      <header className="relative overflow-hidden rounded-b-[2.5rem] bg-[image:var(--gradient-night)] px-6 pt-12 pb-8 shadow-md">
        <div className="pointer-events-none absolute -top-28 -right-16 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[image:var(--gradient-taxi)]" />

        <div className="relative">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="mt-5">
            <Marca oscuro />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white">
            {registro ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {registro
              ? "Registra tu correo para guardar tus cuentas."
              : "Entra con el correo que registraste."}
          </p>
        </div>
      </header>

      {/* Selector de Entrar / Registrarme */}
      <div className="relative mt-6 px-6">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          <button
            type="button"
            onClick={() => cambiar("acceso")}
            className={`h-11 rounded-xl text-sm font-semibold transition-colors ${
              registro ? "text-muted-foreground" : "bg-card text-foreground shadow-sm"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => cambiar("registro")}
            className={`h-11 rounded-xl text-sm font-semibold transition-colors ${
              registro ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Registrarme
          </button>
        </div>
      </div>

      {/* Formulario */}
      <div className="px-6">
        <form
          onSubmit={enviar}
          className="relative mt-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <Etiqueta>Correo</Etiqueta>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="mt-2 h-13 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />

          <div className="mt-5">
            <Etiqueta>Contraseña</Etiqueta>
          </div>
          <input
            type="password"
            autoComplete={registro ? "new-password" : "current-password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            className="mt-2 h-13 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />

          {registro && (
            <>
              <div className="mt-5">
                <Etiqueta>Repite la contraseña</Etiqueta>
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="••••••••"
                className="mt-2 h-13 w-full rounded-2xl border border-input bg-secondary px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {cargando ? "Un momento…" : registro ? "Crear mi cuenta" : "Entrar"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>

      <PieMarca />
    </main>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </span>
  );
}
