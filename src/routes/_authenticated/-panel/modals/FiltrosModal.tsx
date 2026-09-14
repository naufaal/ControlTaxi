import { ModalBase } from "./ModalBase";
import type { FiltroTipo, Periodo } from "../types";

interface Props {
  onCerrar: () => void;
  rangoFechas: { inicio: string; fin: string };
  setRangoFechas: React.Dispatch<React.SetStateAction<{ inicio: string; fin: string }>>;
  setPeriodo: (p: Periodo) => void;
  filtroTipo: FiltroTipo;
  setFiltroTipo: (f: FiltroTipo) => void;
}

export function FiltrosModal({
  onCerrar,
  rangoFechas,
  setRangoFechas,
  setPeriodo,
  filtroTipo,
  setFiltroTipo,
}: Props) {
  return (
    <ModalBase titulo="Filtros de Búsqueda" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">Tipo de movimiento</label>
          <div className="grid grid-cols-3 gap-2">
            {(["todos", "ingresos", "gastos"] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`h-10 rounded-xl text-xs font-semibold capitalize transition-colors ${
                  filtroTipo === tipo ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">Rango de Fechas</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={rangoFechas.inicio}
              onChange={(e) => {
                setRangoFechas((prev) => ({ ...prev, inicio: e.target.value }));
                setPeriodo("personalizado");
              }}
              className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="date"
              value={rangoFechas.fin}
              onChange={(e) => {
                setRangoFechas((prev) => ({ ...prev, fin: e.target.value }));
                setPeriodo("personalizado");
              }}
              className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={onCerrar}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm mt-4 active:scale-[0.98] transition-transform"
        >
          Aplicar Filtros
        </button>
      </div>
    </ModalBase>
  );
}