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
  
  // Array de conceptos con su propia descripción e importe independiente
  const [conceptos, setConceptos] = useState([
    { descripcion: "Servicio de taxi", importe: "" }
  ]);

  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmisor(getEmisor());
  }, []);

  // Cálculo total sumando todos los importes del array de conceptos
  const total = conceptos.reduce((acc, curr) => {
    const num = Number(curr.importe.replace(",", ".")) || 0;
    return acc + num;
  }, 0);

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
          
          // Enviamos los conceptos como un array para que el PDF dibuje cada línea por separado
          const factura = {
            numero,
            fecha: new Date().toISOString(),
            conceptos: conceptos.map((c) => ({
              descripcion: c.descripcion.trim() || "Servicio de taxi",
              importe: Number(c.importe.replace(",", ".")) || 0,
            })),
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

        <Grupo titulo="Servicios y Conceptos">
          {conceptos.map((item, index) => (
            <div key={index} className="mb-3 rounded-2xl border border-border bg-secondary p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary uppercase">Concepto {index + 1}</span>
                {conceptos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nuevos = conceptos.filter((_, i) => i !== index);
                      setConceptos(nuevos);
                    }}
                    className="text-xs text-destructive font-semibold hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <input
                value={item.descripcion}
                onChange={(e) => {
                  const valor = e.target.value;
                  setConceptos(conceptos.map((c, i) => (i === index ? { ...c, descripcion: valor } : c)));
                }}
                placeholder="Descripción del servicio"
                className="w-full h-12 rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none focus:border-primary"
              />

              <input
                inputMode="decimal"
                value={item.importe}
                onChange={(e) => {
                  const valor = e.target.value;
                  setConceptos(conceptos.map((c, i) => (i === index ? { ...c, importe: valor } : c)));
                }}
                placeholder="Importe € (ej. 25,00)"
                className="w-full h-12 rounded-xl border border-input bg-card px-4 font-display text-lg font-bold text-foreground outline-none focus:border-primary"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setConceptos([...conceptos, { descripcion: "", importe: "" }])}
            className="w-full h-12 rounded-2xl border border-dashed border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors"
          >
            + Añadir otro servicio
          </button>

          <div className="rounded-2xl bg-secondary p-4 text-sm mt-4">
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
