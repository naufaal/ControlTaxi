import { ModalBase } from "./ModalBase";

export function FacturaModal({ onCerrar }: { onCerrar: () => void }) {
  return (
    <ModalBase titulo="Generar Factura" onCerrar={onCerrar}>
      <div className="space-y-4 text-sm text-foreground">
        <p className="text-muted-foreground">Emisión de factura simplificada con IVA del 10%.</p>
        <button
          onClick={onCerrar}
          className="w-full h-12 rounded-2xl bg-secondary text-foreground font-semibold transition-colors"
        >
          Cerrar
        </button>
      </div>
    </ModalBase>
  );
}