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
  estado: string;
};

export type EstacionResumen = {
  nombre: string;
  total: number;
  trenes: TrenLlegada[];
  error: boolean;
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

function normalizaCiudad(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export const getLlegadasBarajas = createServerFn({ method: "GET" }).handler(
  async (): Promise<TerminalResumen[]> => {
    const base: Record<"T1" | "T2" | "T4", TerminalResumen> = {
      T1: { terminal: "T1", etiqueta: "T1", total: 0, vuelos: [] },
      T2: { terminal: "T2", etiqueta: "T2 · T3", total: 0, vuelos: [] },
      T4: { terminal: "T4", etiqueta: "T4 · T4S", total: 0, vuelos: [] },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(
        "https://www.aena.es/sites/Satellite?pagename=AENA_ConsultarVuelos&airport=MAD&flightType=L&l=es_ES",
        {
          headers: {
            "User-Agent": UA,
            Accept: "application/json, text/plain, */*",
            Referer: "https://www.aena.es/es/infovuelos.html",
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (!res.ok) return Object.values(base);
      const datos = (await res.json()) as Array<Record<string, string>>;
      const ahora = minutosMadridAhora();
      const vistos = new Set<string>();

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

        const origen = v["ciudadIataOtro"] ?? v["iataOtro"] ?? "";
        if (!origen) continue;
        const huella = `${clave}|${estimada}|${normalizaCiudad(origen)}`;
        if (vistos.has(huella)) continue;
        vistos.add(huella);

        base[clave].total += 1;
        base[clave].vuelos.push({
          id: huella,
          numero: `${v["iataCompania"] ?? ""}${(v["numVuelo"] ?? "").replace(/^0+/, "")}`,
          compania: v["nombreCompania"] ?? "",
          origen,
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
      t.vuelos = t.vuelos.slice(0, 20);
    }
    return Object.values(base);
  },
);

function decodificaHtml(texto: string): string {
  return texto
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function leerEstacionTreneamos(
  urlEstacion: string,
  nombre: string,
): Promise<EstacionResumen> {
  const vacia: EstacionResumen = { nombre, total: 0, trenes: [], error: true };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Codificamos la URL para manejar correctamente caracteres especiales como tildes (ej. Chamartín)
    const urlSegura = encodeURI(`${urlEstacion}?tab=llegadas&actualizado=${Date.now()}`);

    const res = await fetch(urlSegura, {
      cache: "no-store",
      headers: { 
        "User-Agent": UA, 
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9"
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return vacia;
    const html = await res.text();

    const trenes: TrenLlegada[] = [];
    const regexAria = /aria-label="([^"]*Tren[^"]*)"/g;
    let match;

    while ((match = regexAria.exec(html)) !== null) {
      const etiqueta = match[1] ?? "";
      const coincidencia = etiqueta.match(/Tren\s+(.+?)\s+·\s+(.+?)\s+(\d{2}:\d{2})/i);
      if (!coincidencia) continue;

      const [, tipoNumero, origen, hora] = coincidencia;
      if (!tipoNumero || !origen || !hora) continue;

      const partesTipo = tipoNumero.trim().split(/\s+/);
      const numero = partesTipo.pop() ?? "";
      const tipo = partesTipo.join(" ").toUpperCase() || "AVE";

      const idUnico = `${nombre}-${hora}-${numero}-${normalizaCiudad(origen)}`;
      if (trenes.some((t) => t.id === idUnico)) continue;

      trenes.push({
        id: idUnico,
        tipo,
        numero,
        origen: decodificaHtml(origen),
        hora,
        horaEstado: hora,
        via: "",
        estado: "En hora",
      });
    }

    if (trenes.length === 0) {
      return vacia;
    }

    trenes.sort((a, b) => aMinutos(a.horaEstado || a.hora) - aMinutos(b.horaEstado || b.hora));
    return { nombre, total: trenes.length, trenes, error: false };
  } catch {
    return vacia;
  }
}

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const [atocha, chamartin] = await Promise.all([
      leerEstacionTreneamos("https://treneamos.com/estaciones/madrid-atocha/", "Atocha"),
      leerEstacionTreneamos("https://treneamos.com/estaciones/madrid-chamartín/", "Chamartín"),
    ]);
    return [atocha, chamartin];
  },
);
