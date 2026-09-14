import { Plane, Train } from "lucide-react";
import type { TerminalVuelos, EstacionTrenes, VueloItem, TrenItem } from "../types";

export function seleccionarTransportes(listaVuelos: TerminalVuelos[], listaEstaciones: EstacionTrenes[]) {
  const t1 = listaVuelos.find((t) => t.terminal?.includes("T1"));
  const t2t3 = listaVuelos.find((t) => t.terminal?.includes("T2") || t.terminal?.includes("T3"));
  const t4t4s = listaVuelos.find((t) => t.terminal?.includes("T4"));

  const atocha = listaEstaciones.find((e) => e.nombre?.toLowerCase().includes("atocha") || e.codigoAdif === "60000");
  const chamartin = listaEstaciones.find(
    (e) =>
      e.nombre?.toLowerCase().includes("atocha") === false &&
      (e.nombre?.toLowerCase().includes("chamartín") || e.nombre?.toLowerCase().includes("chamartin") || e.codigoAdif === "17000")
  );

  return { t1, t2t3, t4t4s, atocha, chamartin };
}

export function TerminalCard({ titulo, vuelos }: { titulo: string; vuelos?: VueloItem[] }) {
  if (!vuelos?.length) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Plane className="h-4 w-4" />
        </span>
        <span className="font-display text-base font-bold text-foreground">{titulo}</span>
      </div>
      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {vuelos.map((v) => (
          <li key={v.id} className="flex items-center gap-3 text-sm">
            <span className="w-11 shrink-0 font-display font-bold text-foreground">{v.horaEstimada}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{v.origen}</span>
            {v.estadoVuelo && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                {v.estadoVuelo}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EstacionCard({ titulo, codigoAdif, trenes }: { titulo: string; codigoAdif: string; trenes?: TrenItem[] }) {
  if (!trenes?.length) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Train className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold text-foreground">{titulo}</span>
        </div>
        <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground font-semibold">
          Adif: {codigoAdif}
        </span>
      </div>
      <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {trenes.map((tr) => (
          <li key={tr.id} className="flex items-center gap-3 text-sm">
            <span className="w-11 shrink-0 font-display font-bold text-foreground">{tr.horaEstado || tr.hora}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              <span className="font-semibold text-xs text-primary mr-1">[{tr.tipo}]</span>
              {tr.origen}
            </span>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">{tr.estado}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}