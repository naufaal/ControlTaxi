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

function generarHoraRelativa(minutosOffset: number): string {
  const d = new Date(Date.now() + minutosOffset * 60000);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    // Definimos una lista amplia de trenes simulados distribuidos en el tiempo
    const todosAtocha: TrenLlegada[] = [
      { id: "at-60000-1", tipo: "", numero: "03181", origen: "Barcelona-Sants", hora: generarHoraRelativa(-10), horaEstado: generarHoraRelativa(-10), via: "1", estado: "Realizado" },
      { id: "at-60000-2", tipo: "", numero: "6042", origen: "Sevilla-Santa Justa", hora: generarHoraRelativa(15), horaEstado: generarHoraRelativa(19), via: "2", estado: "Con retraso (+4')" },
      { id: "at-60000-3", tipo: "", numero: "04251", origen: "Valencia Joaquín Sorolla", hora: generarHoraRelativa(45), horaEstado: generarHoraRelativa(45), via: "3", estado: "En hora" },
      { id: "at-60000-4", tipo: "", numero: "08172", origen: "Toledo", hora: generarHoraRelativa(90), horaEstado: generarHoraRelativa(90), via: "4", estado: "En hora" },
      { id: "at-60000-5", tipo: "", numero: "02188", origen: "Málaga María Zambrano", hora: generarHoraRelativa(140), horaEstado: generarHoraRelativa(148), via: "1", estado: "Con retraso (+8')" },
      { id: "at-60000-6", tipo: "", numero: "6512", origen: "Barcelona-Sants", hora: generarHoraRelativa(185), horaEstado: generarHoraRelativa(185), via: "2", estado: "En hora" },
      { id: "at-60000-7", tipo: "", numero: "18032", origen: "Jaén", hora: generarHoraRelativa(240), horaEstado: generarHoraRelativa(240), via: "5", estado: "En hora" },
      { id: "at-60000-8", tipo: "", numero: "03421", origen: "Granada", hora: generarHoraRelativa(280), horaEstado: generarHoraRelativa(280), via: "3", estado: "En hora" },
      { id: "at-60000-9", tipo: "", numero: "08210", origen: "Ciudad Real", hora: generarHoraRelativa(320), horaEstado: generarHoraRelativa(320), via: "4", estado: "En hora" },
    ];

    const todosChamartin: TrenLlegada[] = [
      { id: "ch-17000-1", tipo: "", numero: "04050", origen: "Valladolid-Campo Grande", hora: generarHoraRelativa(-5), horaEstado: generarHoraRelativa(-5), via: "12", estado: "Realizado" },
      { id: "ch-17000-2", tipo: "", numero: "05122", origen: "Valencia Joaquín Sorolla", hora: generarHoraRelativa(30), horaEstado: generarHoraRelativa(30), via: "14", estado: "En hora" },
      { id: "ch-17000-3", tipo: "", numero: "06210", origen: "Alicante", hora: generarHoraRelativa(75), horaEstado: generarHoraRelativa(82), via: "15", estado: "Con retraso (+7')" },
      { id: "ch-17000-4", tipo: "", numero: "17054", origen: "Segovia", hora: generarHoraRelativa(110), horaEstado: generarHoraRelativa(110), via: "10", estado: "En hora" },
      { id: "ch-17000-5", tipo: "", numero: "04120", origen: "Burgos Rosa Manzano", hora: generarHoraRelativa(160), horaEstado: generarHoraRelativa(160), via: "11", estado: "En hora" },
      { id: "ch-17000-6", tipo: "", numero: "04322", origen: "León", hora: generarHoraRelativa(210), horaEstado: generarHoraRelativa(210), via: "16", estado: "En hora" },
      { id: "ch-17000-7", tipo: "", numero: "6248", origen: "Alicante", hora: generarHoraRelativa(250), horaEstado: generarHoraRelativa(250), via: "14", estado: "En hora" },
      { id: "ch-17000-8", tipo: "", numero: "04182", origen: "Santander", hora: generarHoraRelativa(295), horaEstado: generarHoraRelativa(303), via: "12", estado: "Con retraso (+8')" },
    ];

    const ahoraMinutos = minutosMadridAhora();

    // Filtramos dinámicamente: desde 20 minutos antes (para ver los recién llegados o en curso) hasta un rango de 5 horas (300 min)
    const filtrarYLimitar = (trenes: TrenLlegada[]) => {
      return trenes
        .filter((t) => {
          const minEst = aMinutos(t.horaEstado);
          return minEst >= ahoraMinutos - 20 && minEst <= ahoraMinutos + 300;
        })
        .sort((a, b) => aMinutos(a.horaEstado) - aMinutos(b.horaEstado))
        .slice(0, 20);
    };

    const atochaFiltrados = filtrarYLimitar(todosAtocha);
    const chamartinFiltrados = filtrarYLimitar(todosChamartin);

    return [
      {
        nombre: "Atocha",
        codigoAdif: "60000",
        total: atochaFiltrados.length,
        trenes: atochaFiltrados,
        error: false,
      },
      {
        nombre: "Chamartín",
        codigoAdif: "17000",
        total: chamartinFiltrados.length,
        trenes: chamartinFiltrados,
        error: false,
      },
    ];
  },
);
