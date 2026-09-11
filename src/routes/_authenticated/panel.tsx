        <button
          onClick={onCerrarTurno}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] hover:bg-emerald-700 mb-6"
        >
          <Lock className="h-5 w-5" /> Cerrar turno actual
        </button>

        <div className="border-t border-border pt-4">
          <h4 className="font-display text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" /> Historial de Turnos
          </h4>

          {turnosCerrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Aún no hay turnos cerrados guardados en Supabase.
            </div>
          ) : (
            <ul className="space-y-3">
              {turnosCerrados.map((turno) => (
                <li
                  key={turno.id}
                  className="rounded-2xl border border-border bg-secondary/50 p-3 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-1.5">
                    <span>Inicio: {new Date(turno.fechaInicio).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span>Fin: {new Date(turno.fechaFin).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Neto</p>
                      <p className="font-display text-base font-bold text-foreground">{eur(turno.neto)}</p>
                    </div>
                    <div className="text-right flex gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Ingresos</p>
                        <p className="text-xs font-semibold text-primary">+{eur(turno.ingresos)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Gastos</p>
                        <p className="text-xs font-semibold text-destructive">-{eur(turno.gastos)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FormularioIngreso({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
  const [importe, setImporte] = useState("");
  const [metodo, setMetodo] = useState<"Efectivo" | "Tarjeta" | "Emisora" | "Bizum">("Efectivo");
  const [concepto, setConcepto] = useState("Carrera");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Introduce un importe válido");
      return;
    }

    const fechaFinal = fecha ? new Date(`${fecha}T${new Date().toTimeString().slice(0, 8)}`).toISOString() : new Date().toISOString();

    onGuardar({
      id: crypto.randomUUID(),
      tipo: "ingreso",
      importe: num,
      concepto: `${concepto.trim() || "Carrera"} (${metodo})`,
      fecha: fechaFinal,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 text-foreground max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Nuevo ingreso</h3>
          <button onClick={onCerrar} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Importe €</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-lg font-bold text-foreground mt-1 focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1">Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Efectivo", "Tarjeta", "Emisora", "Bizum"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMetodo(m)}
                  className={`h-11 rounded-2xl text-xs font-semibold border transition-colors ${
                    metodo === m
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary text-foreground border-input hover:bg-secondary/80"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {["Carrera", "Aeropuerto", "Estación", "Propina"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setConcepto(c)}
                  className="h-9 px-3 rounded-2xl bg-secondary border border-input text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] mt-2"
          >
            Guardar ingreso
          </button>
        </form>
      </div>
    </div>
  );
}

function FormularioGasto({ onCerrar, onGuardar }: { onCerrar: () => void; onGuardar: (m: Movimiento) => void }) {
  const [importe, setImporte] = useState("");
  const [concepto, setConcepto] = useState("Combustible");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(importe.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Introduce un importe válido");
      return;
    }

    const fechaFinal = fecha ? new Date(`${fecha}T${new Date().toTimeString().slice(0, 8)}`).toISOString() : new Date().toISOString();

    onGuardar({
      id: crypto.randomUUID(),
      tipo: "gasto",
      importe: num,
      concepto: concepto.trim() || "Gasto",
      fecha: fechaFinal,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 text-foreground max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Nuevo gasto</h3>
          <button onClick={onCerrar} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Importe €</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-lg font-bold text-foreground mt-1 focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full h-12 rounded-2xl bg-secondary border border-input px-3 text-sm text-foreground mt-1"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {["Combustible", "Lavado", "Taller", "Parking", "Peaje", "Seguro"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setConcepto(c)}
                  className="h-9 px-3 rounded-2xl bg-secondary border border-input text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg transition-transform active:scale-[0.98] mt-2"
          >
            Guardar gasto
          </button>
        </form>
      </div>
    </div>
  );
}

function Cargando({ texto }: { texto: string }) {
  return (
    <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-black/20 py-2.5">
      <p className="text-[10px] tracking-wide text-white/60 uppercase">{label}</p>
      <p className="text-sm font-semibold text-white">{valor}</p>
    </div>
  );
}
