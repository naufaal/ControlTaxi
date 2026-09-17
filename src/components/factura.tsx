'use client';

import { useState, useEffect } from "react";
import { Download, X, Plus, Trash2, Eye, FileText } from "lucide-react";
import { 
  guardarFactura, 
  siguienteNumeroCentralizado, 
  abrirFactura, 
  desglose, 
  getEmisor, 
  saveEmisor, 
  eur,
  type Factura, 
  type Emisor, 
  type Cliente, 
  type LineaConcepto 
} from "@/lib/factura";
import { supabase } from "@/integrations/supabase/client";

interface ConceptoState {
  descripcion: string;
  importe: string;
}

export function VentanaFacturaModal({ onCerrar }: { onCerrar: () => void }) {
  const [pestana, setPestana] = useState<'nueva' | 'historial'>('nueva');
  const [cargando, setCargando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Estados del Formulario
  const [emisor, setEmisor] = useState<Emisor>(getEmisor());
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [conceptos, setConceptos] = useState<ConceptoState[]>([
    { descripcion: "Servicio de taxi", importe: "" }
  ]);

  // Estado del Historial
  const [historial, setHistorial] = useState<Factura[]>([]);

  // Cargar historial desde Supabase (Corregido para evitar error de TypeScript con PromiseLike / .finally)
  useEffect(() => {
    if (pestana === 'historial') {
      const cargarHistorial = async () => {
        setCargandoHistorial(true);
        try {
          const { data, error } = await supabase
            .from("facturas")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            setHistorial(data as unknown as Factura[]);
          }
        } catch (error) {
          console.error("Error al cargar historial:", error);
        } finally {
          setCargandoHistorial(false);
        }
      };

      cargarHistorial();
    }
  }, [pestana]);

  const total = conceptos.reduce((acc, curr) => {
    const num = Number(curr.importe.replace(",", ".")) || 0;
    return acc + num;
  }, 0);

  const calculo = desglose(total);

  const handleGenerar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total <= 0) {
      alert("Introduce un importe válido para al menos un servicio.");
      return;
    }

    setCargando(true);
    try {
      saveEmisor(emisor);

      // Obtener correlativo consecutivo desde la base de datos
      const numeroFactura = await siguienteNumeroCentralizado();

      const cliente: Cliente = {
        nombre: clienteNombre.trim() || "Cliente General",
        cif: clienteNif.trim(),
        domicilio: clienteDireccion.trim(),
      };

      const lineasConceptos: LineaConcepto[] = conceptos.map((c) => ({
        descripcion: c.descripcion.trim() || "Servicio de taxi",
        importe: Number(c.importe.replace(",", ".")) || 0,
      }));

      const nuevaFactura: Factura = {
        numero: numeroFactura,
        fecha: new Date().toISOString(),
        conceptos: lineasConceptos,
        total,
      };

      // Guardar en Supabase y abrir el PDF
      await guardarFactura(emisor, cliente, nuevaFactura);
      abrirFactura(emisor, cliente, nuevaFactura);
      onCerrar();
    } catch (error: any) {
      alert(`Error al procesar la factura: ${error.message || error}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300"
      >
        {/* Cabecera y Selector de Pestañas */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPestana('nueva')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${pestana === 'nueva' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              Nueva Factura
            </button>
            <button
              type="button"
              onClick={() => setPestana('historial')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${pestana === 'historial' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              Historial
            </button>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {pestana === 'nueva' ? (
          <form onSubmit={handleGenerar} className="space-y-4">
            {/* SECCIÓN 1: DATOS EMISOR */}
            <div className="space-y-3">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">Datos del Emisor</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={emisor.nombre}
                  onChange={(e) => setEmisor({ ...emisor, nombre: e.target.value })}
                  placeholder="Nombre"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={emisor.apellidos}
                  onChange={(e) => setEmisor({ ...emisor, apellidos: e.target.value })}
                  placeholder="Apellidos"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={emisor.dni}
                  onChange={(e) => setEmisor({ ...emisor, dni: e.target.value })}
                  placeholder="DNI / NIF"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={emisor.licencia}
                  onChange={(e) => setEmisor({ ...emisor, licencia: e.target.value })}
                  placeholder="Nº Licencia Taxi"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={emisor.domicilio}
                  onChange={(e) => setEmisor({ ...emisor, domicilio: e.target.value })}
                  placeholder="Domicilio fiscal"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={emisor.telefono}
                  onChange={(e) => setEmisor({ ...emisor, telefono: e.target.value })}
                  placeholder="Teléfono"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* SECCIÓN 2: DATOS CLIENTE */}
            <div className="space-y-3 pt-2">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos del Cliente</p>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre o Razón Social"
                className="w-full h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={clienteNif}
                  onChange={(e) => setClienteNif(e.target.value)}
                  placeholder="NIF / CIF del cliente"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={clienteDireccion}
                  onChange={(e) => setClienteDireccion(e.target.value)}
                  placeholder="Dirección del cliente"
                  className="h-11 rounded-xl bg-secondary border border-input px-3.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* SECCIÓN 3: SERVICIOS */}
            <div className="space-y-3 pt-2">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">Servicios y Conceptos</p>
              {conceptos.map((item, index) => (
                <div key={index} className="rounded-2xl border border-border bg-secondary/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase">Servicio {index + 1}</span>
                    {conceptos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setConceptos(conceptos.filter((_, i) => i !== index))}
                        className="flex items-center gap-1 text-xs text-destructive font-semibold hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(e) => setConceptos(conceptos.map((c, i) => i === index ? { ...c, descripcion: e.target.value } : c))}
                    placeholder="Descripción del servicio (ej: Trayecto Aeropuerto)"
                    className="w-full h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.importe}
                    onChange={(e) => setConceptos(conceptos.map((c, i) => i === index ? { ...c, importe: e.target.value } : c))}
                    placeholder="Importe Total € (ej. 25,00)"
                    className="w-full h-11 rounded-xl border border-input bg-card px-3.5 font-display text-base font-bold text-foreground outline-none focus:border-primary"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setConceptos([...conceptos, { descripcion: "", importe: "" }])}
                className="w-full h-11 rounded-xl border border-dashed border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Añadir otro servicio
              </button>
            </div>

            {/* DESGLOSE */}
            {total > 0 && (
              <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base imponible:</span>
                  <span className="font-semibold text-foreground">{eur(calculo.base)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA (10%):</span>
                  <span className="font-semibold text-foreground">{eur(calculo.iva)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold text-foreground text-sm">
                  <span>Total factura:</span>
                  <span>{eur(calculo.total)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              {cargando ? "Guardando en Supabase..." : "Generar y Guardar Factura"}
            </button>
          </form>
        ) : (
          /* VISTA HISTORIAL */
          <div className="space-y-3 min-h-[300px]">
            {cargandoHistorial ? (
              <p className="text-center text-sm text-muted-foreground py-10">Cargando facturas...</p>
            ) : historial.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">No tienes facturas guardadas en la nube.</p>
              </div>
            ) : (
              historial.map((fac) => (
                <div key={fac.numero} className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/70 border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">{fac.numero}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(fac.fecha).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-semibold mt-0.5">{eur(fac.total)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirFactura(emisor, { nombre: "Cliente General", cif: "", domicilio: "" }, fac)}
                    className="flex items-center gap-1.5 bg-card hover:bg-card/80 text-foreground px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm border border-border transition-colors"
                  >
                    <Eye className="h-4 w-4" /> Ver / PDF
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}