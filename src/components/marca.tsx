import { CarTaxiFront } from "lucide-react";

export function Marca({ oscuro }: { oscuro?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${oscuro ? "text-white" : "text-foreground"}`}>
      <CarTaxiFront className="h-6 w-6 text-amber-500" />
      <span className="font-display text-lg font-bold tracking-tight">
        ControlTaxi
      </span>
    </div>
  );
}

export function PieMarca({ oscuro }: { oscuro?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-1 text-xs font-medium ${
        oscuro ? "text-white/50" : "text-muted-foreground"
      }`}
    >
      <span>Desarrollado para</span>
      <CarTaxiFront className="h-4 w-4 mx-1" />
      <span>Taxistas</span>
    </div>
  );
}