import { useState } from "react";
import { X, Calendar } from "lucide-react";
import type { Movimiento } from "@/lib/taxihoja";

interface IngresoModalProps {
  onCerrar: () => void;
  onGuardar: (m: Movimiento) => void;
}

const FORMAS_PAGO = ["Efectivo", "Tarjeta", "Emisora", "Bizum"];
const SUGERENCIAS = ["Carrera", "Aeropuerto", "Estación"];

export function IngresoModal({ onCerrar, onGuardar }: IngresoModalProps) {
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [concepto, setConcepto] = useState("Carrera");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) return;

    onGuardar({
      id: crypto.randomUUID(), // <-- Generamos el ID único aquí
      tipo: "ingreso",
      importe: num,
      concepto: `${concepto} (${formaPago})`,
      fecha: new Date(fecha).toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-t-[2.5rem] sm:rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        
        {/* Header separado */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <h2 className="font-display text-2xl font-bold text-gray-900">Nuevo ingreso</h2>
          <button
            onClick={onCerrar}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Importe */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
              Importe €
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              autoFocus
              className="w-full h-14 rounded-2xl bg-[#F7F5F0] px-4 text-lg font-semibold text-gray-900 border border-transparent focus:border-amber-400 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Forma de pago */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
              Forma de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGO.map((forma) => (
                <button
                  type="button"
                  key={forma}
                  onClick={() => setFormaPago(forma)}
                  className={`h-12 rounded-xl text-sm font-semibold transition-all ${
                    formaPago === forma
                      ? "bg-amber-400 text-amber-950 shadow-sm"
                      : "bg-[#F7F5F0] text-gray-600 hover:bg-gray-200/60"
                  }`}
                >
                  {forma}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-500" /> Fecha
            </label>
            <div className="relative">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-14 rounded-2xl bg-[#F7F5F0] px-4 text-base font-medium text-gray-900 border border-transparent focus:border-amber-400 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
              Concepto
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-14 rounded-2xl bg-[#F7F5F0] px-4 text-base font-medium text-gray-900 border border-transparent focus:border-amber-400 focus:bg-white outline-none transition-all mb-3"
            />
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setConcepto(sug)}
                  className="rounded-full border border-gray-200 bg-[#F7F5F0] px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            className="w-full h-14 rounded-full bg-amber-400 text-amber-950 font-bold text-base shadow-md hover:bg-amber-500 transition-transform active:scale-[0.98] mt-4"
          >
            Guardar ingreso
          </button>
        </form>
      </div>
    </div>
  );
}