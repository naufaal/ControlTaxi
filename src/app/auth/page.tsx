"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Marca } from "@/components/marca";

function FormularioAutenticacion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const esAcceso = (searchParams.get("modo") || "acceso") === "acceso";

  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [claveRepetida, setClaveRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function cambiarModo(modo: "acceso" | "registro") {
    setError(null);
    router.push(`/auth?modo=${modo}`);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!correo.trim() || !clave) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    if (!esAcceso) {
      if (clave.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (clave !== claveRepetida) {
        setError("Las dos contraseñas no coinciden.");
        return;
      }
    }

    setCargando(true);
    try {
      if (esAcceso) {
        const { error: errorAcceso } = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        });
        if (errorAcceso) {
          setError(
            errorAcceso.message.toLowerCase().includes("invalid")
              ? "Ese correo no está registrado o la contraseña no es correcta."
              : errorAcceso.message,
          );
          return;
        }
      } else {
        const { error: errorRegistro } = await supabase.auth.signUp({
          email: correo.trim(),
          password: clave,
        });
        if (errorRegistro) {
          setError(
            errorRegistro.message.toLowerCase().includes("already")
              ? "Ese correo ya tiene una cuenta. Inicia sesión."
              : errorRegistro.message,
          );
          return;
        }
        const { error: errorAcceso } = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        });
        if (errorAcceso) {
          setError(errorAcceso.message);
          return;
        }
      }
      router.replace("/");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Marca />
          <p className="mt-2 text-sm text-muted-foreground">
            Tus ingresos, gastos y facturas, siempre a mano.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            <button
              type="button"
              onClick={() => cambiarModo("acceso")}
              className={`h-10 rounded-xl text-sm font-semibold transition-colors ${esAcceso ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => cambiarModo("registro")}
              className={`h-10 rounded-xl text-sm font-semibold transition-colors ${!esAcceso ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={enviar} className="space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Correo
              </span>
              <input
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-primary"
                placeholder="tucorreo@ejemplo.com"
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Contraseña
              </span>
              <input
                type="password"
                autoComplete={esAcceso ? "current-password" : "new-password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-primary"
                placeholder="••••••"
              />
            </label>

            {!esAcceso && (
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Repite la contraseña
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={claveRepetida}
                  onChange={(e) => setClaveRepetida(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none focus:border-primary"
                  placeholder="••••••"
                />
              </label>
            )}

            {error && (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
              {esAcceso ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Cargando…</div>
      }
    >
      <FormularioAutenticacion />
    </Suspense>
  );
}
