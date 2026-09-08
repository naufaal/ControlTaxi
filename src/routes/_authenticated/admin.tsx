import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, FileText, MailCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Evento = {
  event: string;
  path: string;
  created_at: string;
  email: string | null;
};

type Metricas = {
  usuarios: number;
  usuarios_verificados: number;
  visitas_24h: number;
  visitas_7d: number;
  facturas: number;
  ultimos_eventos: Evento[];
};

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.rpc("es_admin");
    if (error || !data) throw redirect({ to: "/panel" });
  },
  component: Admin,
});

function Admin() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    supabase.rpc("metricas_admin").then(({ data, error: err }) => {
      if (!activo) return;
      if (err) {
        setError("No se han podido cargar las métricas.");
        return;
      }
      setMetricas(data as unknown as Metricas);
    });
    void supabase.rpc("registrar_uso", { p_event: "admin_view", p_path: "/admin" });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-background px-5 pb-10 pt-8">
      <header className="flex items-center gap-3">
        <a
          href="/panel"
          aria-label="Volver al panel"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">ControlTaxi</p>
          <h1 className="font-display text-2xl font-bold text-foreground">Panel administrador</h1>
        </div>
      </header>

      {error ? (
        <p className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      ) : !metricas ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Cargando métricas…
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Metrica icon={<Users />} label="Usuarios" value={metricas.usuarios} />
            <Metrica icon={<MailCheck />} label="Verificados" value={metricas.usuarios_verificados} />
            <Metrica icon={<Activity />} label="Visitas 24 h" value={metricas.visitas_24h} />
            <Metrica icon={<FileText />} label="Facturas" value={metricas.facturas} />
          </div>

          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Actividad reciente</h2>
              <span className="text-xs text-muted-foreground">{metricas.visitas_7d} eventos en 7 días</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
              {metricas.ultimos_eventos.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {metricas.ultimos_eventos.map((evento, indice) => (
                    <li key={`${evento.created_at}-${indice}`} className="flex items-center gap-3 p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                        <Activity className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{evento.email || "Usuario"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {evento.event} · {evento.path}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {new Date(evento.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Metrica({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-foreground">{icon}</span>
      <p className="mt-4 font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
