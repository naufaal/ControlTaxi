export type Periodo = "dia" | "semana" | "mes" | "personalizado";
export type ModalType = "ingreso" | "gasto" | "factura" | "turnos" | "documentos" | "filtros";
export type FiltroTipo = "todos" | "ingresos" | "gastos";

export interface VueloItem {
  id: string;
  horaEstimada: string;
  origen: string;
  estadoVuelo?: string;
}

export interface TerminalVuelos {
  terminal?: string;
  vuelos?: VueloItem[];
}

export interface TrenItem {
  id: string;
  horaEstado?: string;
  hora?: string;
  tipo?: string;
  origen?: string;
  estado?: string;
}

export interface EstacionTrenes {
  nombre?: string;
  codigoAdif?: string;
  trenes?: TrenItem[];
}