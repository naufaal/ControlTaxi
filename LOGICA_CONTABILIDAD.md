# Lógica de facturación y filtros de ControlTaxi

- **Facturado = Ingresos**. El importe facturado siempre representa la suma de los movimientos de tipo `ingreso`.
- **Gastos en el panel: informativos**. Los gastos se muestran aparte y NO reducen el importe facturado del panel ni del turno.
- **Neto solo en filtros**. Cuando el usuario filtra por día, varios días, semana, mes o rango personalizado y selecciona el cálculo Neto, se calcula:
  `Neto = Facturado (Ingresos) - Gastos`.
- **Filtro Ingresos/Facturado** muestra únicamente la suma de ingresos.
- **Filtro Gastos** muestra únicamente la suma de gastos.
- **Turnos** se cierran manualmente. Cambiar de día o pasar medianoche no debe poner a cero el turno.
- El historial de turnos muestra por separado Facturado/Ingresos y Gastos.
