import { createServerFn } from "@tanstack/react-start";

export type VueloLlegada = {
  id: string;
  numero: string;
  compania: string;
  origen: string;
  horaProgramada: string;
  horaEstimada: string;
  retrasoMin: number;
  terminal: "T1" | "T2" | "T4";
};

export type TerminalResumen = {
  terminal: "T1" | "T2" | "T4";
  etiqueta: string;
  total: number;
  vuelos: VueloLlegada[];
};

export type TrenLlegada = {
  id: string;
  tipo: string;
  numero: string;
  origen: string;
  hora: string;
  horaEstado: string;
  via: string;
};

export type EstacionResumen = {
  nombre: string;
  total: number;
  trenes: TrenLlegada[];
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

function minutosMadridAhora(): number {
  const partes = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = partes.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function recortaHora(hora: string): string {
  return hora.slice(0, 5);
}

export const getLlegadasBarajas = createServerFn({ method: "GET" }).handler(
  async (): Promise<TerminalResumen[]> => {
    const base: Record<"T1" | "T2" | "T4", TerminalResumen> = {
      T1: { terminal: "T1", etiqueta: "T1", total: 0, vuelos: [] },
      T2: { terminal: "T2", etiqueta: "T2 · T3", total: 0, vuelos: [] },
      T4: { terminal: "T4", etiqueta: "T4 · T4S", total: 0, vuelos: [] },
    };

    try {
      const res = await fetch(
        "https://www.aena.es/sites/Satellite?pagename=AENA_ConsultarVuelos&airport=MAD&flightType=L&l=es_ES",
        {
          headers: {
            "User-Agent": UA,
            Accept: "application/json, text/plain, */*",
            Referer: "https://www.aena.es/es/infovuelos.html",
          },
        },
      );
      if (!res.ok) return Object.values(base);
      const datos = (await res.json()) as Array<Record<string, string>>;
      const ahora = minutosMadridAhora();

      for (const v of datos) {
        const term = (v["terminal"] ?? "").toUpperCase();
        const clave: "T1" | "T2" | "T4" | null = term.startsWith("T4")
          ? "T4"
          : term.startsWith("T2") || term.startsWith("T3")
            ? "T2"
            : term.startsWith("T1")
              ? "T1"
              : null;
        if (!clave) continue;

        const programada = recortaHora(v["horaProgramada"] ?? "");
        const estimada = recortaHora(v["horaEstimada"] ?? programada) || programada;
        if (!programada) continue;

        const min = aMinutos(estimada);
        if (min < ahora - 20 || min > ahora + 300) continue;

        base[clave].total += 1;
        base[clave].vuelos.push({
          id: `${v["numVuelo"]}-${v["iataCompania"]}-${programada}`,
          numero: `${v["iataCompania"] ?? ""}${(v["numVuelo"] ?? "").replace(/^0+/, "")}`,
          compania: v["nombreCompania"] ?? "",
          origen: v["ciudadIataOtro"] ?? v["iataOtro"] ?? "",
          horaProgramada: programada,
          horaEstimada: estimada,
          retrasoMin: Math.max(0, aMinutos(estimada) - aMinutos(programada)),
          terminal: clave,
        });
      }
    } catch {
      return Object.values(base);
    }

    for (const t of Object.values(base)) {
      t.vuelos.sort((a, b) => aMinutos(a.horaEstimada) - aMinutos(b.horaEstimada));
      t.vuelos = t.vuelos.slice(0, 6);
    }
    return Object.values(base);
  },
);

const ALTA_VELOCIDAD = ["AVE", "AVLO", "OUIGO", "IRYO", "AVANT", "ALVIA"];

function limpia(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function leerEstacion(slug: string, nombre: string): Promise<EstacionResumen> {
  const vacia: EstacionResumen = { nombre, total: 0, trenes: [] };
  try {
    const res = await fetch(`https://www.adif.es/w/${slug}`, {
      headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
    });
    if (!res.ok) return vacia;
    const html = await res.text();

    const inicio = html.indexOf('id="horas-trenes-estacion-llegadas"');
    if (inicio === -1) return vacia;
    const bloque = html.slice(inicio, html.indexOf("</table>", inicio));

    const filas = bloque.match(/<tr class=['"]horario-row[\s\S]*?<\/tr>/g) ?? [];
    const trenes: TrenLlegada[] = [];

    for (const fila of filas) {
      const horas = [...fila.matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((m) =>
        limpia(m[1] ?? ""),
      );
      const hora = horas.find((h) => /^\d{1,2}:\d{2}$/.test(h)) ?? "";
      const estado = horas.filter((h) => h && h !== hora)[0] ?? "";

      const origenMatch = fila.match(/col-destino"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
      const origen = limpia(origenMatch?.[1] ?? "");

      const trenMatch = fila.match(/col-tren"[\s\S]*?<div>([\s\S]*?)<\/div>/);
      const trenTexto = limpia(trenMatch?.[1] ?? "");
      const tipo = (trenTexto.split("-").pop() ?? "").trim().split(" ")[0] ?? "";
      const numero = (trenTexto.match(/(\d{4,5})\s*$/)?.[1] ?? "").trim();

      const viaMatch = fila.match(/col-via"[\s\S]*?<span[^>]*>([^<]*)<\/span>/);
      const via = limpia(viaMatch?.[1] ?? "");

      if (!hora || !origen) continue;
      if (!ALTA_VELOCIDAD.includes(tipo.toUpperCase())) continue;

      trenes.push({
        id: `${slug}-${numero}-${hora}`,
        tipo: tipo.toUpperCase(),
        numero,
        origen,
        hora,
        horaEstado: /^\d{1,2}:\d{2}$/.test(estado) ? estado : "",
        via,
      });
    }

    const ahora = minutosMadridAhora();
    const proximos = trenes
      .filter((t) => aMinutos(t.hora) >= ahora - 20)
      .sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));

    return { nombre, total: proximos.length, trenes: proximos.slice(0, 6) };
  } catch {
    return vacia;
  }
}

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const [atocha, chamartin] = await Promise.all([
      leerEstacion("60000-madrid-pta-de-atocha", "Atocha"),
      leerEstacion("17000-madrid-chamartin", "Chamartín"),
    ]);
    return [atocha, chamartin];
  },
);
