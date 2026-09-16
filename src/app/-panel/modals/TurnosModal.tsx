"use client";
import { ModalBase } from "./ModalBase";
import type { TurnoGuardado } from "@/lib/taxihoja"; 
import { eur } from "@/lib/utils"; // Asumiendo que pusiste eur() en tu archivo utils.ts
interface Props {
  totalesGenerales: { ingresos: number; gastos: number; neto: number };
  turnosCerrados: TurnoGuardado[];
  onCerrar: () => void;
  onCerrarTurno: () => Promise<void>;
}

export function TurnosModal({ totalesGenerales, turnosCerrados, onCerrar, onCerrarTurno }: Props) {
  return (
    <ModalBase titulo="Control de Turno" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-secondary p-4 text-center">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Neto Turno Actual</p>
          <p className="font-display text-3xl font-bold text-foreground mt-1">{eur(totalesGenerales.neto)}</p>
        </div>
        <button
          onClick={onCerrarTurno}
          className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-bold text-base shadow-md active:scale-[0.98] transition-transform"
        >
          Cerrar Turno Actual
        </button>
        <div className="pt-2">
          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Historial de Turnos</h4>
          {turnosCerrados.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay turnos anteriores registrados.</p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {turnosCerrados.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-background border border-border">
                  <span>{new Date(t.fechaFin).toLocaleDateString("es-ES")}</span>
                  <span className="font-bold text-foreground">{eur(t.neto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModalBase>
  );
}