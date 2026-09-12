  const movsFiltrados = useMemo(
    () =>
      movs.filter((movimiento) => {
        if (periodo === "dia") {
          if (ultimoCorte && movimiento.fecha <= ultimoCorte) {
            return false;
          }
          return perteneceAlPeriodo(movimiento.fecha, periodo, rangoFechas);
        }

        if (filtroTipo === "ingresos" && movimiento.tipo !== "ingreso") return false;
        if (filtroTipo === "gastos" && movimiento.tipo !== "gasto") return false;

        return perteneceAlPeriodo(movimiento.fecha, periodo, rangoFechas);
      }),
    [movs, periodo, rangoFechas, ultimoCorte, filtroTipo]
  );

  const totales = useMemo(() => {
    const ingresos = movsFiltrados
      .filter((m) => m.tipo === "ingreso")
      .reduce((s, m) => s + m.importe, 0);

    const gastos = movsFiltrados
      .filter((m) => m.tipo === "gasto")
      .reduce((s, m) => s + m.importe, 0);

    const neto = periodo === "dia" ? totalesGenerales.ingresos : ingresos - gastos;

    return {
      ingresos: periodo === "dia" ? totalesGenerales.ingresos : ingresos,
      gastos,
      neto,
    };
  }, [movsFiltrados, periodo, totalesGenerales]);
