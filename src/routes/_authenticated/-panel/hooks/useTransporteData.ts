import { useQuery } from "@tanstack/react-query";
import { getLlegadasBarajas, getLlegadasTrenes } from "@/lib/transporte.functions";

export function useTransporteData() {
  const vuelos = useQuery({
    queryKey: ["llegadas-barajas"],
    queryFn: async () => {
      try { return await getLlegadasBarajas(); } catch { return []; }
    },
    refetchInterval: 120_000,
  });

  const trenes = useQuery({
    queryKey: ["llegadas-trenes"],
    queryFn: async () => {
      try { return await getLlegadasTrenes(); } catch { return []; }
    },
    refetchInterval: 180_000,
  });

  function actualizar() {
    void Promise.all([vuelos.refetch(), trenes.refetch()]);
  }

  return { vuelos, trenes, actualizar };
}