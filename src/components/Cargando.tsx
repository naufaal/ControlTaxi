import { Loader2 } from "lucide-react";

export function Cargando({ texto = "Cargando..." }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
      <p className="text-sm font-medium">{texto}</p>
    </div>
  );
}