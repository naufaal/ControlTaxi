import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { eur } from "@/lib/taxihoja";
import {
  abrirFactura,
  desglose,
  emisorVacio,
  getEmisor,
  saveEmisor,
  guardarFactura,
  siguienteNumero,
  siguienteNumeroCentralizado,
  type Emisor,
} from "@/lib/factura";

// Componente para mostrar solo el tarjetón/botón en el panel
export function FacturaClienteBoton({ onClick }: { onClick: () => void }) {
  return (
    <section className="px-5 pt-8">
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/15 text-primary-foreground">
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-base font-bold">Factura</span>
          <span className="mt-0.5 block text-xs opacity-80">
            Crea y descarga una factura con IVA del 10%.
          </span>
        </span>
      </button>
    </section>
  );
}

// Ventana modal de la factura controlada limpiamente por el router
export function VentanaFacturaModal({ onCerrar }: { onCerrar: () => void }) {
  const [emisor, setEmisor] = useState<Emisor>(emisorVacio);
  const [cliente, setCliente] = useState({ nombre: "", cif: "", domicilio: "" });
  const [concepto, setConcepto] = useState("Servicio de taxi");
  const [importe, setImporte] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmisor(getEmisor());
  }, []);

  const total = Number(importe.replace(",", ".")) || 0;
  const d = desglose(total);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onCerrar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (total <= 0) return;
          setGenerando(true);
          setError("");
          saveEmisor(emisor);
          const numero = await siguienteNumeroCentralizado().catch(() => siguienteNumero());
          const factura = {
            numero,
            fecha: new Date().toISOString(),
            concepto: concepto.trim(),
            total,
          };
          try {
            await guardarFactura(emisor, cliente, factura);
          } catch {
            setError("No se pudo guardar en Supabase. La factura se descargará igualmente.");
          }
          abrirFactura(emisor, cliente, factura);
          setGenerando(false);
          onCerrar();
        }}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <h3 className="mt-5 font-display text-xl font-bold text-foreground">Nueva factura</h3>

        <Grupo titulo="Datos del emisor">
          <Campo label="Nombre" valor={emisor.nombre} set={(v) => setEmisor({ ...emisor, nombre: v })} />
          <Campo
            label="Apellidos"
            valor={emisor.apellidos}
            set={(v) => setEmisor({ ...emisor, apellidos: v })}
          />
          <Campo label="DNI / NIF" valor={emisor.dni} set={(v) => setEmisor({ ...emisor, dni: v })} />
          <Campo
            label="Domicilio fiscal"
            valor={emisor.domicilio}
            set={(v) => setEmisor({ ...emisor, domicilio: v })}
            area
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Licencia"
              valor={emisor.licencia}
              set={(v) => setEmisor({ ...emisor, licencia: v })}
            />
            <Campo
              label="Teléfono"
              valor={emisor.telefono}
              set={(v) => setEmisor({ ...emisor, telefono: v })}
            />
          </div>
        </Grupo>

        <Grupo titulo="Datos del cliente">
          <Campo
            label="Nombre o razón social"
            valor={cliente.nombre}
            set={(v) => setCliente({ ...cliente, nombre: v })}
          />
          <Campo label="CIF o DNI" valor={cliente.cif} set={(v) => setCliente({ ...cliente, cif: v })} />
          <Campo
            label="Domicilio fiscal"
            valor={cliente.domicilio}
            set={(v) => setCliente({ ...cliente, domicilio: v })}
            area
          />
        </Grupo>

        <Grupo titulo="Servicio">
          <Campo label="Concepto" valor={concepto} set={setConcepto} />
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Importe total € (IVA incluido)
            </span>
            <input
              inputMode="decimal"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="0,00"
              className="mt-1.5 h-14 w-full rounded-2xl border border-input bg-secondary px-4 font-display text-2xl font-bold text-foreground outline-none focus:border-primary"
            />
          </label>

          <div className="rounded-2xl bg-secondary p-4 text-sm">
            <Linea label="Base imponible" valor={eur(d.base)} />
            <Linea label="IVA (10%)" valor={eur(d.iva)} />
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold text-foreground">
              <span>Total</span>
              <span>{eur(d.total)}</span>
            </div>
          </div>
        </Grupo>

        <button
          type="submit"
          disabled={generando}
          className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-[0.98]"
        >
          {generando ? "Guardando factura…" : "Generar factura"}
        </button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 space-y-3">
      <p className="font-display text-sm font-bold tracking-wide text-primary uppercase">{titulo}</p>
      {children}
    </div>
  );
}

function Campo({
  label,
  valor,
  set,
  area,
}: {
  label: string;
  valor: string;
  set: (v: string) => void;
  area?: boolean;
}) {
  const clase =
    "mt-1.5 w-full rounded-2xl border border-input bg-secondary px-4 py-3 text-base text-foreground outline-none focus:border-primary";
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {area ? (
        <textarea rows={2} value={valor} onChange={(e) => set(e.target.value)} className={clase} />
      ) : (
        <input value={valor} onChange={(e) => set(e.target.value)} className={`${clase} h-12 py-0`} />
      )}
    </label>
  );
}

function Linea({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{valor}</span>
    </div>
  );
}
