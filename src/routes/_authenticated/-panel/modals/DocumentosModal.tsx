import { ModalBase } from "./ModalBase";

export function DocumentosModal({ onCerrar, currentUserId }: { onCerrar: () => void; currentUserId: string | null }) {
  return (
    <ModalBase titulo="Documentación" onCerrar={onCerrar}>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Almacenamiento de licencias, seguros y documentación técnica del vehículo.</p>
        <button
          onClick={onCerrar}
          className="w-full h-12 rounded-2xl bg-secondary text-foreground font-semibold mt-4 transition-colors"
        >
          Entendido
        </button>
      </div>
    </ModalBase>
  );
}