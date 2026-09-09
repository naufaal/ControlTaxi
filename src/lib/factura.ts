import { eur } from "./taxihoja";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type Emisor = {
  nombre: string;
  apellidos: string;
  dni: string;
  domicilio: string;
  licencia: string;
  telefono: string;
};

export type Cliente = {
  nombre: string;
  cif: string;
  domicilio: string;
};

export type LineaConcepto = {
  descripcion: string;
  importe: number;
};

export type Factura = {
  numero: string;
  fecha: string;
  concepto?: string; // Para mantener compatibilidad con facturas antiguas
  conceptos?: LineaConcepto[]; // Soporte para múltiples líneas
  total: number;
};

const KEY_EMISOR = "taxihoja:emisor";
const KEY_NUM = "taxihoja:factura-num";

export const emisorVacio: Emisor = {
  nombre: "",
  apellidos: "",
  dni: "",
  domicilio: "",
  licencia: "",
  telefono: "",
};

export function getEmisor(): Emisor {
  if (typeof window === "undefined") return emisorVacio;
  try {
    const raw = window.localStorage.getItem(KEY_EMISOR);
    return raw ? { ...emisorVacio, ...(JSON.parse(raw) as Emisor) } : emisorVacio;
  } catch {
    return emisorVacio;
  }
}

export function saveEmisor(e: Emisor) {
  window.localStorage.setItem(KEY_EMISOR, JSON.stringify(e));
}

export function siguienteNumero(): string {
  let n = 0;
  try {
    const guardado = window.localStorage.getItem(KEY_NUM);
    n = guardado === null ? 0 : Number(guardado) + 1;
  } catch {
    n = 0;
  }
  try {
    window.localStorage.setItem(KEY_NUM, String(n));
  } catch {
    /* sin almacenamiento */
  }
  return `INV${String(n).padStart(4, "0")}`;
}

export async function siguienteNumeroCentralizado(): Promise<string> {
  const { data, error } = await supabase.rpc("siguiente_numero_factura");
  if (error || !data) throw error ?? new Error("No se pudo reservar el número de factura");
  return data;
}

export async function guardarFactura(
  emisor: Emisor,
  cliente: Cliente,
  factura: Factura,
): Promise<void> {
  const { base, iva, total } = desglose(factura.total);
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) throw new Error("Usuario no autenticado");

  // Construimos una representación de texto para Supabase
  const conceptoTexto = factura.conceptos && factura.conceptos.length > 0
    ? factura.conceptos.map(c => `${c.descripcion} (${eur(c.importe)})`).join(" / ")
    : (factura.concepto || "Servicio de taxi");

  const { error } = await supabase.from("facturas").insert({
    user_id: usuario.user.id,
    numero: factura.numero,
    fecha: factura.fecha,
    emisor,
    cliente,
    concepto: conceptoTexto,
    base,
    iva,
    total,
  });
  if (error) throw error;
}

/** El importe introducido es el TOTAL con IVA del 10%. */
export function desglose(total: number) {
  const base = Math.round((total / 1.1) * 100) / 100;
  const iva = Math.round((total - base) * 100) / 100;
  return { base, iva, total };
}

export function abrirFactura(emisor: Emisor, cliente: Cliente, factura: Factura) {
  const { base, iva, total } = desglose(factura.total);
  const fecha = new Date(factura.fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const doc = new jsPDF();
  const ancho = 170;
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA", 20, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(factura.numero, 190, y, { align: "right" });
  doc.text(fecha, 190, y + 6, { align: "right" });
  y += 18;

  const escribirBloque = (titulo: string, lineas: string[], x: number, anchoBloque: number) => {
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, anchoBloque, 34, 3, 3);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(titulo.toUpperCase(), x + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(lineas.flatMap((linea) => doc.splitTextToSize(linea || "", anchoBloque - 10)), x + 5, y + 14);
  };

  escribirBloque(
    "Emisor",
    [
      `${emisor.nombre} ${emisor.apellidos}`.trim(),
      emisor.dni ? `DNI/NIF: ${emisor.dni}` : "",
      emisor.domicilio,
      emisor.licencia ? `Licencia: ${emisor.licencia}` : "",
      emisor.telefono,
    ],
    20,
    82,
  );
  escribirBloque(
    "Cliente",
    [cliente.nombre, cliente.cif ? `CIF/DNI: ${cliente.cif}` : "", cliente.domicilio],
    108,
    82,
  );
  y += 48;

  // Cabecera de la tabla
  doc.setFillColor(247, 247, 247);
  doc.rect(20, y, ancho, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONCEPTO", 25, y + 6);
  doc.text("BASE", 135, y + 6, { align: "right" });
  doc.text("TOTAL", 185, y + 6, { align: "right" });
  y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Normalizamos las líneas a pintar (si no hay array de conceptos, usamos el texto clásico)
  const lineasAPintar: LineaConcepto[] = 
    factura.conceptos && factura.conceptos.length > 0
      ? factura.conceptos
      : [{ descripcion: factura.concepto || "Servicio de taxi", importe: factura.total }];

  // Recorremos y pintamos cada fila de la factura por separado
  lineasAPintar.forEach((item) => {
    const itemDesglose = desglose(item.importe);
    const lineasTexto = doc.splitTextToSize(item.descripcion, 95);
    
    doc.text(lineasTexto, 25, y);
    doc.text(eur(itemDesglose.base), 135, y, { align: "right" });
    doc.text(eur(itemDesglose.total), 185, y, { align: "right" });

    // Salto de línea dinámico en función de cuántas líneas ocupe la descripción del servicio
    const alturaFila = Math.max(lineasTexto.length * 6, 8);
    y += alturaFila;
  });

  y += 5;
  doc.line(20, y, 190, y);
  y += 10;
  doc.text("Base imponible", 135, y, { align: "right" });
  doc.text(eur(base), 190, y, { align: "right" });
  y += 7;
  doc.text("IVA (10%)", 135, y, { align: "right" });
  doc.text(eur(iva), 190, y, { align: "right" });
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 135, y, { align: "right" });
  doc.text(eur(total), 190, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Generado con ControlTaxi", 105, 280, { align: "center" });
  doc.save(`${factura.numero}.pdf`);
  return true;
}
