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
  estadoVuelo: string;
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
  codigoAdif: string;
  enlaceOficial: string;
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
            Accept: "json, text/plain, */*",
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

        const minProg = aMinutos(programada);
        const minEst = aMinutos(estimada);
        const retrasoMin = Math.max(0, minEst - minProg);
        const diffMin = minEst - ahora;

        if (diffMin > 30 || diffMin < -15) continue;

        const origen = v["ciudadIataOtro"] ?? v["iataOtro"] ?? "";
        if (!origen) continue;
        const huella = `${clave}|${estimada}|${normalizaCiudad(origen)}`;
        if (vistos.has(huella)) continue;
        vistos.add(huella);

        let estadoVuelo = "";
        if (retrasoMin > 5 && diffMin > 0) {
          estadoVuelo = `Retrasado (+${retrasoMin}') - Llega en ${diffMin} min`;
        } else if (diffMin > 0 && diffMin <= 30) {
          estadoVuelo = `Aterriza en ${diffMin} min`;
        } else if (diffMin <= 0 && diffMin >= -5) {
          estadoVuelo = "En tierra / Aterrizando";
        } else if (diffMin < -5 && diffMin >= -15) {
          estadoVuelo = "Entrega de equipaje";
        } else {
          continue;
        }

        base[clave].total += 1;
        base[clave].vuelos.push({
          id: huella,
          numero: `${v["iataCompania"] ?? ""}${(v["numVuelo"] ?? "").replace(/^0+/, "")}`,
          compania: v["nombreCompania"] ?? "",
          origen,
          horaProgramada: programada,
          horaEstimada: estimada,
          retrasoMin,
          terminal: clave,
          estadoVuelo,
        });
      }
    } catch {
      return Object.values(base);
    }

    for (const t of Object.values(base)) {
      t.vuelos.sort((a, b) => aMinutos(a.horaEstimada) - aMinutos(b.horaEstimada));
    }
    return Object.values(base);
  },
);

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const consultarEstacion = async (codigoAdif: string, nombre: string, enlace: string): Promise<EstacionResumen> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`https://radardetrenes.com/api/v1/stations/${codigoAdif}`, {
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = await res.json();
        // Mapeo adaptado según la estructura de la API de radardetrenes.com
        const listaTrenes: TrenLlegada[] = (data.arrivals || data.llegadas || []).map((t: any, index: number) => {
          const horaProg = recortaHora(t.scheduledTime || t.hora || "00:00");
          const horaEst = recortaHora(t.estimatedTime || t.horaEstado || horaProg);
          const retraso = t.delayMinutes || t.retraso || 0;

          return {
            id: `${codigoAdif}-${t.trainNumber || index}`,
            tipo: t.serviceType || t.tipo || "AVE",
            numero: t.trainNumber || t.numero || "",
            origen: t.origin || t.origen || "",
            hora: horaProg,
            horaEstado: horaEst,
            via: t.track || t.via || "-",
            estado: retraso > 0 ? `Con retraso (+${retraso}')` : (t.status || t.estado || "En hora"),
          };
        });

        const ahoraMinutos = minutosMadridAhora();
        const trenesFiltrados = listaTrenes.filter((t) => {
          const minEst = aMinutos(t.horaEstado);
          return minEst >= ahoraMinutos - 30 && minEst <= ahoraMinutos + 300;
        });

        return {
          nombre,
          codigoAdif,
          enlaceOficial: enlace,
          total: trenesFiltrados.length,
          trenes: trenesFiltrados,
          error: false,
        };
      } catch {
        return {
          nombre,
          codigoAdif,
          enlaceOficial: enlace,
          total: 0,
          trenes: [],
          error: true,
        };
      }
    };

    const [atocha, chamartin] = await Promise.all([
      consultarEstacion("60000", "Atocha", "https://info.adif.es/?s=60000&v=al"),
      consultarEstacion("17000", "Chamartín", "https://info.adif.es/?s=17000&v=al"),
    ]);

    return [atocha, chamartin];
  },
);
