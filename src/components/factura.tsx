'use client';

import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { eur } from "@/lib/utils";

// Funciones auxiliares de cálculo y generación de factura
function desglose(importeTotal: number) {
  const base = importeTotal / 1.10;
  const iva = importeTotal - base;
  return { base, iva, total: importeTotal };
}

function abrirFactura({
  nombreCliente,
  nifCliente,
  direccionCliente,
  importeTotal,
  concepto,
}: {
  nombreCliente: string;
  nifCliente: string;
  direccionCliente: string;
  importeTotal: number;
  concepto: string;
}) {
  const calc = desglose(importeTotal);
  
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert("Por favor, permite las ventanas emergentes para generar la factura.");
    return;
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Factura - ${nombreCliente}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .title { font-size: 24px; font-weight: bold; color: #111; }
          .details { margin-bottom: 30px; font-size: 14px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-size: 14px; }
          th { background: #f9f9f9; }
          .totals { width: 300px; margin-left: auto; }
          .totals td { padding: 8px; font-size: 14px; }
          .print-btn { background: #000; color: #fff; border: none; padding: 12px 24px; font-size: 16px; cursor: pointer; border-radius: 8px; margin-top: 20px; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">FACTURA</div>
            <div style="color: #666; font-size: 14px; margin-top: 4px;">Fecha: ${new Date().toLocaleDateString()}</div>
          </div>
          <div style="text-align: right;">
            <strong>Servicio de Taxi</strong>
          </div>
        </div>

        <div class="details">
          <strong>Cliente:</strong> ${nombreCliente}<br/>
          <strong>NIF/CIF:</strong> ${nifCliente}<br/>
          <strong>Dirección:</strong> ${direccionCliente}
        </div>

        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Base Imponible</th>
              <th>IVA (10%)</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${concepto}</td>
              <td>${eur(calc.base)}</td>
              <td>${eur(calc.iva)}</td>
              <td>${eur(calc.total)}</td>
            </tr>
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td><strong>Base Imponible:</strong></td>
            <td style="text-align: right;">${eur(calc.base)}</td>
          </tr>
          <tr>
            <td><strong>IVA 10%:</strong></td>
            <td style="text-align: right;">${eur(calc.iva)}</td>
          </tr>
          <tr>
            <td><strong>Total a Pagar:</strong></td>
            <td style="text-align: right;"><strong>${eur(calc.total)}</strong></td>
          </tr>
        </table>

        <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
      </body>
    </html>
  `);
  ventana.document.close();
}

export function VentanaFacturaModal({ onCerrar }: { onCerrar: () => void }) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [importeBase, setImporteBase] = useState("");
  const [concepto, setConcepto] = useState("Servicio de taxi / Carrera");

  const importeNum = parseFloat(importeBase) || 0;
  const calculo = desglose(importeNum);

  const handleGenerar = (e: React.FormEvent) => {
    e.preventDefault();
    if (importeNum <= 0) {
      alert("Introduce un importe válido para la factura.");
      return;
    }

    abrirFactura({
      nombreCliente: clienteNombre || "Cliente General",
      nifCliente: clienteNif || "B00000000",
      direccionCliente: clienteDireccion || "Madrid",
      importeTotal: importeNum,
      concepto,
    });
  };

  return (
    <form onSubmit={handleGenerar} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">Nombre / Razón Social del Cliente</label>
        <input
          type="text"
          value={clienteNombre}
          onChange={(e) => setClienteNombre(e.target.value)}
          placeholder="Ej: Empresa S.L. o Particular"
          className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1 focus:border-primary outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">NIF / CIF</label>
          <input
            type="text"
            value={clienteNif}
            onChange={(e) => setClienteNif(e.target.value)}
            placeholder="A12345678"
            className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1 focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Importe Total (€)</label>
          <input
            type="number"
            step="0.01"
            required
            value={importeBase}
            onChange={(e) => setImporteBase(e.target.value)}
            placeholder="0.00"
            className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-lg font-bold text-foreground mt-1 focus:border-primary outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">Dirección (Opcional)</label>
        <input
          type="text"
          value={clienteDireccion}
          onChange={(e) => setClienteDireccion(e.target.value)}
          placeholder="Calle Mayor 1, Madrid"
          className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1 focus:border-primary outline-none"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">Concepto</label>
        <input
          type="text"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className="w-full h-12 rounded-2xl bg-secondary border border-input px-4 text-sm text-foreground mt-1 focus:border-primary outline-none"
        />
      </div>

      {importeNum > 0 && (
        <div className="rounded-2xl border border-border bg-secondary/40 p-3.5 text-xs space-y-1">
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
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <Download className="h-5 w-5" /> Generar y Descargar Factura PDF
      </button>
    </form>
  );
}