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

function trenPendiente(hora: string): boolean {
  return aMinutos(hora) >= minutosMadridAhora();
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

type AdifHorario = {
  hora?: string;
  horaEstado?: string;
  estacion?: string;
  estacionEstado?: string;
  trenDatosOp?: string;
  tren?: string;
  via?: string;
};

async function leerEstacionAdif(
  pagina: string,
  codigo: string,
  nombre: string,
): Promise<EstacionResumen> {
  const vacia: EstacionResumen = { nombre, total: 0, trenes: [] };
  try {
    const res = await fetch(`${pagina}?actualizado=${Date.now()}`, {
      cache: "no-store",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return vacia;
    const html = await res.text();
    const endpointConfig = html.match(/url:\s*"([^"]+consultarHorario[^"]+)"/)?.[1] ?? "";
    const assetEntryId = endpointConfig.match(/assetEntryId=(\d+)/)?.[1];
    const auth = endpointConfig.match(/p_p_auth=([A-Za-z0-9]+)/)?.[1];
    if (!assetEntryId || !auth) return vacia;

    const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
    const trenes: TrenLlegada[] = [];
    const vistos = new Set<string>();

    for (let paginaActual = 0; paginaActual < 50; paginaActual += 1) {
      const params = new URLSearchParams({
        p_p_id: "servicios_estacion_ServiciosEstacionPortlet",
        p_p_lifecycle: "2",
        p_p_state: "normal",
        p_p_mode: "view",
        p_p_resource_id: "/consultarHorario",
        p_p_cacheability: "cacheLevelPage",
        assetEntryId,
        p_p_auth: auth,
        _servicios_estacion_ServiciosEstacionPortlet_searchType: "proximasLlegadas",
        _servicios_estacion_ServiciosEstacionPortlet_trafficType: "avldmd",
        _servicios_estacion_ServiciosEstacionPortlet_numPage: String(paginaActual),
        _servicios_estacion_ServiciosEstacionPortlet_commuterNetwork: "",
        _servicios_estacion_ServiciosEstacionPortlet_stationCode: codigo,
      });
      const datos = await fetch(`${pagina}?${params}`, {
        cache: "no-store",
        headers: {
          "User-Agent": UA,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Referer: pagina,
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });
      if (!datos.ok) break;
      const json = (await datos.json()) as { horarios?: AdifHorario[] };
      const horarios = json.horarios ?? [];
      if (horarios.length === 0) break;

      for (const horario of horarios) {
        const hora = horario.hora ?? "";
        const horaEstado = horario.horaEstado ?? "";
        const origen = horario.estacion ?? "";
        if (!hora || !origen || !trenPendiente(horaEstado || hora)) continue;

        const numero = horario.tren ?? "";
        const huella = `${hora}|${numero}|${normalizaCiudad(origen)}`;
        if (vistos.has(huella)) continue;
        vistos.add(huella);
        trenes.push({
          id: `${codigo}-${huella}`,
          tipo: (horario.trenDatosOp ?? "").toUpperCase(),
          numero,
          origen,
          hora,
          horaEstado,
          via: horario.via ?? "",
          estado: horario.estacionEstado ?? "",
        });
      }
    }

    trenes.sort((a, b) => aMinutos(a.horaEstado || a.hora) - aMinutos(b.horaEstado || b.hora));
    return { nombre, total: trenes.length, trenes };
  } catch {
    return vacia;
  }
}

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const [atocha, chamartin] = await Promise.all([
      leerEstacionAdif("https://www.adif.es/w/60000-madrid-pta-de-atocha", "60000", "Atocha"),
      leerEstacionAdif("https://www.adif.es/w/17000-madrid-chamartin", "17000", "Chamartín"),
    ]);
    return [atocha, chamartin];
  },
);
