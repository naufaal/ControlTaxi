"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FormularioAutenticacion() {
  const searchParams = useSearchParams();
  const modo = searchParams.get("modo") || "acceso";
  const esAcceso = modo === "acceso";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl bg-secondary p-8 shadow-lg border border-border">
        <h1 className="text-2xl font-bold text-center text-foreground mb-6">
          {esAcceso ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>
        
        {/* Aquí integraremos tu formulario real de Supabase más adelante */}
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Página de autenticación en construcción.
          </p>
          <button 
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-md transition-transform active:scale-95"
            onClick={() => alert("Falta conectar con Supabase Auth")}
          >
            {esAcceso ? "Entrar" : "Registrarse"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Usamos Suspense porque estamos leyendo los searchParams en un Client Component
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <FormularioAutenticacion />
    </Suspense>
  );
}