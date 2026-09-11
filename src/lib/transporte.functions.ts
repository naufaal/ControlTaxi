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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

let listadoDiarioTrenes: { fechaDia: string; data: EstacionResumen[] } | null = null;

function minutosMadridAhora(): number {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function obtenerFechaActualYMD(): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).split("/").reverse().join("-");
}

function aMinutos(hhmm: string): number {
  if (!hhmm || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function recortaHora(hora: string): string {
  return hora ? hora.slice(0, 5) : "00:00";
}

function normalizaCiudad(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// VUELOS BARAJAS
// ---------------------------------------------------------------------------
export const getLlegadasBarajas = createServerFn({ method: "GET" }).handler(
  async (): Promise<TerminalResumen[]> => {
    const base: Record<"T1" | "T2" | "T4", TerminalResumen> = {
      T1: { terminal: "T1", etiqueta: "T1", total: 0, vuelos: [] },
      T2: { terminal: "T2", etiqueta: "T2 · T3", total: 0, vuelos: [] },
      T4: { terminal: "T4", etiqueta: "T4 · T4S", total: 0, vuelos: [] },
    };

    const endpointsAena = [
      "https://www.aena.es/sites/Satellite?pagename=AENA_ConsultarVuelos&airport=MAD&flightType=L&l=es_ES",
      "https://www.aena.es/destinos/es/madrid-barajas/infovuelos.json",
      "https://aeropuertomadrid-barajas.com/api/vuelos-llegadas.json",
    ];

    let datos: Array<Record<string, string>> | null = null;

    for (const url of endpointsAena) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          headers: {
            "User-Agent": UA,
            Accept: "application/json, text/plain, */*",
            Referer: "https://www.aena.es/es/infovuelos.html",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            datos = json;
            break;
          }
        }
      } catch {
        // Siguiente endpoint
      }
    }

    if (!datos) return Object.values(base);

    try {
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

        const programada = recortaHora(v["horaProgramada"] ?? v["hora"] ?? "");
        const estimada = recortaHora(v["horaEstimada"] ?? programada) || programada;
        if (!programada) continue;

        const minProg = aMinutos(programada);
        const minEst = aMinutos(estimada);
        const retrasoMin = Math.max(0, minEst - minProg);
        const diffMin = minEst - ahora;

        if (diffMin > 60 || diffMin < -30) continue;

        const origen = v["ciudadIataOtro"] ?? v["iataOtro"] ?? v["origen"] ?? "";
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
        } else if (diffMin < -5 && diffMin >= -30) {
          estadoVuelo = "Entrega de equipaje";
        } else {
          continue;
        }

        base[clave].total += 1;
        base[clave].vuelos.push({
          id: huella,
          numero: `${v["iataCompania"] ?? ""}${(v["numVuelo"] ?? v["numero"] ?? "").replace(/^0+/, "")}`,
          compania: v["nombreCompania"] ?? v["compania"] ?? "",
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

// ---------------------------------------------------------------------------
// TRENES CON CACHÉ DIARIA Y FILTRADO EXACTO (+5 MIN)
// ---------------------------------------------------------------------------
export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const hoyYMD = obtenerFechaActualYMD();

    // Si ya tenemos la caché cargada de hoy con datos, la reutilizamos para evitar bloqueos
    if (listadoDiarioTrenes && listadoDiarioTrenes.fechaDia === hoyYMD) {
      const ahoraMinutos = minutosMadridAhora();
      return listadoDiarioTrenes.data.map((estacion) => {
        const trenesEnCurso = estacion.trenes.filter((t) => {
          const minTren = aMinutos(t.horaEstado);
          // Muestra desde 2 horas antes hasta exactamente 5 minutos después de su hora estimada
          return minTren >= ahoraMinutos - 120 && minTren <= ahoraMinutos + 5;
        });

        return {
          ...estacion,
          total: trenesEnCurso.length,
          trenes: trenesEnCurso,
        };
      });
    }

    const consultarEstacionOficial = async (
      codigoAdif: string,
      nombre: string,
      enlace: string
    ): Promise<EstacionResumen> => {
      let listaTrenes: TrenLlegada[] = [];
      let conError = true;

      const fuentesTrenes = [
        // 1. Radar de Trenes (API abierta alternativa muy estable)
        async () => {
          const res = await fetch(`https://radardetrenes.com/api/v1/stations/${codigoAdif}`, {
            headers: { "User-Agent": UA, Accept: "application/json" },
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          const items = data.arrivals || data.llegadas || [];
          return items.map((t: any, index: number) => ({
            id: `${codigoAdif}-${t.trainNumber || index}`,
            tipo: t.serviceType || t.tipo || "AVE",
            numero: String(t.trainNumber || t.numero || ""),
            origen: t.origin || t.origen || "Origen desconocido",
            hora: recortaHora(t.scheduledTime || t.hora || "00:00"),
            horaEstado: recortaHora(t.estimatedTime || t.horaEstado || t.scheduledTime || "00:00"),
            via: String(t.track || t.via || "-"),
            estado: (t.delayMinutes || t.retraso || 0) > 0 ? `Con retraso (+${t.delayMinutes || t.retraso}')` : (t.status || "En hora"),
          }));
        },
        // 2. Renfe Flota LD como respaldo secundario
        async () => {
          const timestamp = Date.now();
          const res = await fetch(`https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json?v=${timestamp}`, {
            headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://tiempo-real.largorecorrido.renfe.com/" },
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.trenes || data.items || []);
          const filtrados: TrenLlegada[] = [];

          items.forEach((t: any, index: number) => {
            const descEstacion = (t.desEstacion || t.destination || t.estacionDestino || "").toUpperCase();
            const codDestino = String(t.codEstacionDestino || t.destStationCode || "");

            if (codDestino === codigoAdif || descEstacion.includes(nombre.toUpperCase())) {
              const horaProg = recortaHora(t.fecLlegadaProg || t.scheduledTime || "00:00");
              const horaEst = recortaHora(t.fecLlegadaEst || t.estimatedTime || horaProg);
              const retraso = Number(t.retraso || t.delayMinutes || 0);

              filtrados.push({
                id: `${codigoAdif}-renfe-${index}`,
                tipo: t.tipoTren || t.serviceType || "AVE",
                numero: String(t.numTren || t.trainNumber || ""),
                origen: t.desOrigen || t.origin || "Desconocido",
                hora: horaProg,
                horaEstado: horaEst,
                via: String(t.via || "-"),
                estado: retraso > 0 ? `Con retraso (+${retraso}')` : "En hora",
              });
            }
          });
          return filtrados;
        },
        // 3. Endpoint directo oficial de Adif
        async () => {
          const res = await fetch(`https://info.adif.es/api/v1/stations/${codigoAdif}/arrivals`, {
            headers: { 
              "User-Agent": UA, 
              "Accept": "application/json, text/plain, */*", 
              "Referer": "https://info.adif.es/" 
            },
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.llegadas || data.arrivals || []);
          
          return items.map((t: any, index: number) => {
            const horaProg = recortaHora(t.hora || t.scheduledTime || t.horaProgramada || "00:00");
            const horaEst = recortaHora(t.horaEstimada || t.estimatedTime || horaProg);
            const retrasoMin = Number(t.retraso || t.delayMinutes || 0);

            let estadoTexto = "En hora";
            if (retrasoMin > 0) {
              estadoTexto = `Retrasado (+${retrasoMin}')`;
            } else if (t.estado) {
              estadoTexto = t.estado;
            }

            return {
              id: `${codigoAdif}-adif-${index}-${t.numero || t.trainNumber || "gen"}`,
              tipo: t.tipo || t.serviceType || "AVE",
              numero: String(t.numero || t.trainNumber || ""),
              origen: t.origen || t.origin || "Origen desconocido",
              hora: horaProg,
              horaEstado: horaEst,
              via: String(t.via || t.track || "-"),
              estado: estadoTexto,
            };
          });
        }
      ];

      for (const fuente of fuentesTrenes) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          
          const resultado = await fuente();
          clearTimeout(timeoutId);

          if (resultado && resultado.length > 0) {
            listaTrenes = resultado;
            conError = false;
            break;
          }
        } catch {
          // Siguiente fuente
        }
      }

      return {
        nombre,
        codigoAdif,
        enlaceOficial: enlace,
        total: listaTrenes.length,
        trenes: listaTrenes.sort((a, b) => aMinutos(a.horaEstado) - aMinutos(b.horaEstado)),
        error: conError && listaTrenes.length === 0,
      };
    };

    const [atocha, chamartin] = await Promise.all([
      consultarEstacionOficial("60000", "Atocha", "https://info.adif.es/?s=60000&v=al"),
      consultarEstacionOficial("17000", "Chamartín", "https://info.adif.es/?s=17000&v=al"),
    ]);

    const baseTrenesDiarios = [atocha, chamartin];

    // Guardamos en caché global del día solo si se obtuvieron datos con éxito
    if (baseTrenesDiarios.some((e) => e.trenes.length > 0)) {
      listadoDiarioTrenes = {
        fechaDia: hoyYMD,
        data: baseTrenesDiarios,
      };
    }

    const ahoraMinutos = minutosMadridAhora();

    return baseTrenesDiarios.map((estacion) => {
      const trenesEnCurso = estacion.trenes.filter((t) => {
        const minTren = aMinutos(t.horaEstado);
        return minTren >= ahoraMinutos - 120 && minTren <= ahoraMinutos + 5;
      });

      return {
        ...estacion,
        total: trenesEnCurso.length,
        trenes: trenesEnCurso,
      };
    });
  },
);
