import { eur, type Movimiento } from "./taxihoja";

export function abrirInforme(
  movs: Movimiento[],
  correo: string,
  periodoLabel: string,
) {
  const ingresos = movs.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.importe, 0);
  const gastos = movs.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.importe, 0);
  const neto = ingresos - gastos;

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  const filas = [...movs]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(
      (m) => `<tr>
        <td>${fecha(m.fecha)}</td>
        <td>${(m.concepto || (m.tipo === "ingreso" ? "Carrera" : "Gasto")).replace(/[<>]/g, "")}</td>
        <td>${m.tipo === "ingreso" ? "Ingreso" : "Gasto"}</td>
        <td class="num ${m.tipo}">${m.tipo === "gasto" ? "−" : "+"}${eur(m.importe)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>ControlTaxi — Informe ${periodoLabel}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:28px;color:#111}
  h1{font-size:20px;margin:0}
  h1 span{color:#f5b301}
  .sub{font-size:11px;color:#666;margin-top:4px;line-height:1.5}
  .cards{display:flex;gap:10px;margin:22px 0}
  .card{flex:1;border:1px solid #ddd;border-radius:10px;padding:12px}
  .card p{margin:0}
  .lbl{font-size:10px;letter-spacing:.08em;color:#666;text-transform:uppercase}
  .val{font-size:17px;font-weight:700;margin-top:4px}
  .in{color:#12894f}.ex{color:#c0392b}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;border-bottom:1.5px solid #111;padding:6px 4px;font-size:11px}
  td{border-bottom:1px solid #eee;padding:7px 4px}
  .num{text-align:right;font-weight:600;white-space:nowrap}
  .ingreso{color:#12894f}.gasto{color:#c0392b}
  @media print{body{margin:14mm}}
</style></head><body>
<h1>Control<span>Taxi</span></h1>
<p class="sub">Informe ${periodoLabel}${correo ? ` · ${correo}` : ""}<br>Generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
<div class="cards">
  <div class="card"><p class="lbl">Ingresos</p><p class="val in">${eur(ingresos)}</p></div>
  <div class="card"><p class="lbl">Gastos</p><p class="val ex">${eur(gastos)}</p></div>
  <div class="card"><p class="lbl">Neto</p><p class="val">${eur(neto)}</p></div>
</div>
<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th class="num">Importe</th></tr></thead>
<tbody>${filas || `<tr><td colspan="4" style="color:#666;padding:14px 4px">Sin movimientos en este periodo.</td></tr>`}</tbody></table>
<script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
