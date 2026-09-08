import { CarTaxiFront } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Marca({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="ControlTaxi">
      <span
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)] ${
          oscuro ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        <span className="absolute top-2 h-1 w-5 rounded-full bg-current opacity-40" />
        <CarTaxiFront className="h-6 w-6" />
      </span>
      <span
        className={`font-display text-2xl font-extrabold tracking-tight ${
          oscuro ? "text-white" : "text-foreground"
        }`}
      >
        Control<span className={oscuro ? "text-primary" : "text-primary"}>Taxi</span>
      </span>
    </div>
  );
}

export function PieMarca({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <footer
      className={`mt-auto border-t pt-5 text-center text-xs ${
        oscuro ? "border-white/10 text-white/60" : "border-border text-muted-foreground"
      }`}
    >
      Hecho por un taxista (Naufal) para los taxistas 2027®
      <span className="mt-2 flex justify-center gap-3">
        <Link to="/privacidad" className="underline underline-offset-2">
          Privacidad
        </Link>
        <Link to="/cookies" className="underline underline-offset-2">
          Cookies
        </Link>
      </span>
    </footer>
  );
}
