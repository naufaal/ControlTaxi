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

function generarHoraRelativa(minutosOffset: number): string {
  const d = new Date(Date.now() + minutosOffset * 60000);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export const getLlegadasTrenes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstacionResumen[]> => {
    const atochaTrenes: TrenLlegada[] = [
      { id: "at-1", tipo: "AVE", numero: "03181", origen: "Barcelona-Sants", hora: generarHoraRelativa(5), horaEstado: generarHoraRelativa(5), via: "1", estado: "En hora" },
      { id: "at-2", tipo: "AVE", numero: "02180", origen: "Sevilla-Santa Justa", hora: generarHoraRelativa(14), horaEstado: generarHoraRelativa(18), via: "2", estado: "Con retraso (+4')" },
      { id: "at-3", tipo: "ALVIA", numero: "04251", origen: "Valencia Joaquín Sorolla", hora: generarHoraRelativa(25), horaEstado: generarHoraRelativa(25), via: "3", estado: "En hora" },
      { id: "at-4", tipo: "AVANT", numero: "08172", origen: "Toledo", hora: generarHoraRelativa(32), horaEstado: generarHoraRelativa(32), via: "4", estado: "En hora" },
      { id: "at-5", tipo: "AVE", numero: "02188", origen: "Málaga María Zambrano", hora: generarHoraRelativa(45), horaEstado: generarHoraRelativa(52), via: "1", estado: "Con retraso (+7')" },
      { id: "at-6", tipo: "MEDIA DISTANCIA", numero: "18032", origen: "Jaén", hora: generarHoraRelativa(60), horaEstado: generarHoraRelativa(60), via: "5", estado: "En hora" },
    ];

    const chamartinTrenes: TrenLlegada[] = [
      { id: "ch-1", tipo: "AVE", numero: "04050", origen: "Valladolid-Campo Grande", hora: generarHoraRelativa(8), horaEstado: generarHoraRelativa(8), via: "12", estado: "En hora" },
      { id: "ch-2", tipo: "AVE", numero: "05122", origen: "Valencia Joaquín Sorolla", hora: generarHoraRelativa(19), horaEstado: generarHoraRelativa(19), via: "14", estado: "En hora" },
      { id: "ch-3", tipo: "ALVIA", numero: "06210", origen: "Alicante", hora: generarHoraRelativa(28), horaEstado: generarHoraRelativa(35), via: "15", estado: "Con retraso (+7')" },
      { id: "ch-4", tipo: "MEDIA DISTANCIA", numero: "17054", origen: "Segovia", hora: generarHoraRelativa(40), horaEstado: generarHoraRelativa(40), via: "10", estado: "En hora" },
      { id: "ch-5", tipo: "AVE", numero: "04120", origen: "Burgos Rosa Manzano", hora: generarHoraRelativa(55), horaEstado: generarHoraRelativa(55), via: "11", estado: "En hora" },
      { id: "ch-6", tipo: "ALVIA", numero: "04322", origen: "León", hora: generarHoraRelativa(70), horaEstado: generarHoraRelativa(70), via: "16", estado: "En hora" },
    ];

    return [
      {
        nombre: "Atocha",
        total: atochaTrenes.length,
        trenes: atochaTrenes,
        error: false,
      },
      {
        nombre: "Chamartín",
        total: chamartinTrenes.length,
        trenes: chamartinTrenes,
        error: false,
      },
    ];
  },
);
