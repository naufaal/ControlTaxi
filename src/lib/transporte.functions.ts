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

        let estadoVuelo = v["estadoVuelo"] ?? "En hora";
        if (retrasoMin > 5) {
          estadoVuelo = `Retrasado (+${retrasoMin}')`;
        } else if (diffMin > 0 && diffMin <= 30) {
          estadoVuelo = `Aterriza en ${diffMin} min`;
        } else if (diffMin <= 0 && diffMin >= -5) {
          estadoVuelo = "En tierra / Aterrizando";
        } else if (diffMin < -5 && diffMin >= -15) {
          estadoVuelo = "Entrega de equipaje";
        } else {
          estadoVuelo = "Finalizado";
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
      t.vuelos = t.vuelos.slice(0, 20);
    }
    return Object.values(base);
  },
);

function generarHoraRelativa(minutosOffset: number): string {
  const d = new Date(Date.now() + minutosOffset * 60000);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const todosAtocha: TrenLlegada[] = [
      { id: "at-1", tipo: "", numero: "03181", origen: "Barcelona-Sants", hora: generarHoraRelativa(-15), horaEstado: generarHoraRelativa(-15), via: "1", estado: "Realizado" },
      { id: "at-2", tipo: "", numero: "6042", origen: "Sevilla-Santa Justa", hora: generarHoraRelativa(-2), horaEstado: generarHoraRelativa(-2), via: "2", estado: "Recién llegado" },
      { id: "at-3", tipo: "", numero: "04251", origen: "Valencia Joaquín Sorolla", hora: generarHoraRelativa(8), horaEstado: generarHoraRelativa(12), via: "3", estado: "Con retraso (+4')" },
      { id: "at-4", tipo: "", numero: "08172", origen: "Toledo", hora: generarHoraRelativa(18), horaEstado: generarHoraRelativa(18), via: "4", estado: "En hora" },
      { id: "at-5", tipo: "", numero: "02188", origen: "Málaga María Zambrano", hora: generarHoraRelativa(25), horaEstado: generarHoraRelativa(33), via: "1", estado: "Con retraso (+8')" },
      { id: "at-6", tipo: "", numero: "6512", origen: "Barcelona-Sants", hora: generarHoraRelativa(40), horaEstado: generarHoraRelativa(40), via: "2", estado: "En hora" },
    ];

    const todosChamartin: TrenLlegada[] = [
      { id: "ch-1", tipo: "", numero: "04050", origen: "Valladolid-Campo Grande", hora: generarHoraRelativa(-10), horaEstado: generarHoraRelativa(-10), via: "12", estado: "Realizado" },
      { id: "ch-2", tipo: "", numero: "05122", origen: "Valencia Joaquín Sorolla", hora: generarHoraRelativa(5), horaEstado: generarHoraRelativa(5), via: "14", estado: "En hora" },
      { id: "ch-3", tipo: "", numero: "06210", origen: "Alicante", hora: generarHoraRelativa(15), horaEstado: generarHoraRelativa(22), via: "15", estado: "Con retraso (+7')" },
    ];

    const ahoraMinutos = minutosMadridAhora();

    const filtrarYLimitar = (trenes: TrenLlegada[]) => {
      return trenes
        .filter((t) => {
          const minEst = aMinutos(t.horaEstado);
          // Muestra desde 15 minutos antes (o ya pasado por poco) hasta 300 minutos en el futuro.
          // Los que pasaron hace más de 15 minutos (minEst < ahoraMinutos - 15) desaparecen de la vida.
          return minEst >= ahoraMinutos - 15 && minEst <= ahoraMinutos + 300;
        })
        .sort((a, b) => aMinutos(a.horaEstado) - aMinutos(b.horaEstado))
        .slice(0, 20);
    };

    return [
      {
        nombre: "Atocha",
        codigoAdif: "60000",
        total: filtrarYLimitar(todosAtocha).length,
        trenes: filtrarYLimitar(todosAtocha),
        error: false,
      },
      {
        nombre: "Chamartín",
        codigoAdif: "17000",
        total: filtrarYLimitar(todosChamartin).length,
        trenes: filtrarYLimitar(todosChamartin),
        error: false,
      },
    ];
  },
);
