import { eur } from "./taxihoja";

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

export type Factura = {
  numero: string;
  fecha: string;
  concepto: string;
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
  let n = 1;
  try {
    n = Number(window.localStorage.getItem(KEY_NUM) || "0") + 1;
  } catch {
    n = 1;
  }
  try {
    window.localStorage.setItem(KEY_NUM, String(n));
  } catch {
    /* sin almacenamiento */
  }
  return `INV-${String(n).padStart(6, "0")}`;
}

/** El importe introducido es el TOTAL con IVA del 10%. */
export function desglose(total: number) {
  const base = Math.round((total / 1.1) * 100) / 100;
  const iva = Math.round((total - base) * 100) / 100;
  return { base, iva, total };
}

const esc = (s: string) => s.replace(/[<>&]/g, "");

export function abrirFactura(emisor: Emisor, cliente: Cliente, factura: Factura) {
  const { base, iva, total } = desglose(factura.total);
  const fecha = new Date(factura.fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Factura ${esc(factura.numero)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:28px;color:#111;font-size:12px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
  h1{font-size:16px;margin:0;text-transform:uppercase;letter-spacing:.02em}
  .doc{text-align:right}
  .doc b{font-size:22px;display:block;letter-spacing:.04em}
  .doc span{color:#666}
  .em{margin-top:14px;line-height:1.6;color:#333}
  .boxes{display:flex;gap:12px;margin:26px 0 18px}
  .box{flex:1;border:1px solid #ddd;border-radius:10px;padding:12px;line-height:1.6}
  .lbl{font-size:10px;letter-spacing:.08em;color:#666;text-transform:uppercase;margin-bottom:6px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;background:#f7f7f7;padding:8px 6px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid #ddd}
  td{padding:10px 6px;border-bottom:1px solid #eee}
  .r{text-align:right;white-space:nowrap}
  .tot{margin-top:16px;margin-left:auto;width:250px}
  .tot div{display:flex;justify-content:space-between;padding:6px 0}
  .tot .fin{border-top:1.5px solid #111;font-weight:700;font-size:14px;margin-top:4px}
  .pie{margin-top:34px;color:#888;font-size:10px;text-align:center}
  @media print{body{margin:14mm}}
</style></head><body>
<div class="top">
  <div>
    <h1>${esc(`${emisor.nombre} ${emisor.apellidos}`.trim()) || "Emisor"}</h1>
    <div class="em">
      ${esc(emisor.domicilio).replace(/\n/g, "<br>")}<br>
      ${emisor.dni ? `DNI/NIF: ${esc(emisor.dni)}<br>` : ""}
      ${emisor.licencia ? `Licencia: ${esc(emisor.licencia)}<br>` : ""}
      ${emisor.telefono ? esc(emisor.telefono) : ""}
    </div>
  </div>
  <div class="doc"><b>Factura</b><span>${esc(factura.numero)}</span><br><span>${fecha}</span></div>
</div>

<div class="boxes">
  <div class="box">
    <p class="lbl">Facturado a</p>
    ${esc(cliente.nombre)}<br>
    ${cliente.cif ? `CIF/DNI: ${esc(cliente.cif)}<br>` : ""}
    ${esc(cliente.domicilio).replace(/\n/g, "<br>")}
  </div>
  <div class="box">
    <p class="lbl">Fecha de emisión</p>
    ${fecha}
    <p class="lbl" style="margin-top:10px">Nº de factura</p>
    ${esc(factura.numero)}
  </div>
</div>

<table>
  <thead><tr><th>Artículo</th><th class="r">Cantidad</th><th class="r">Base</th><th class="r">Impuesto</th><th class="r">Total</th></tr></thead>
  <tbody><tr>
    <td>${esc(factura.concepto) || "Servicio de taxi"}</td>
    <td class="r">1</td>
    <td class="r">${eur(base)}</td>
    <td class="r">IVA (10%)</td>
    <td class="r">${eur(total)}</td>
  </tr></tbody>
</table>

<div class="tot">
  <div><span>Base imponible</span><span>${eur(base)}</span></div>
  <div><span>IVA (10%)</span><span>${eur(iva)}</span></div>
  <div class="fin"><span>Total</span><span>${eur(total)}</span></div>
</div>

<p class="pie">Generado con TaxiHoja</p>
<script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
