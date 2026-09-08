import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "controltaxi:cookies-aceptadas";

export function ConsentimientoCookies() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(KEY) !== "si");
  }, []);

  function aceptar() {
    window.localStorage.setItem(KEY, "si");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-3xl border border-border bg-card p-5 shadow-2xl">
      <p className="font-display text-base font-bold text-foreground">Usamos cookies técnicas</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        Son necesarias para mantener tu sesión y guardar tus preferencias. No usamos cookies publicitarias.
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link to="/cookies" className="text-sm font-semibold text-foreground underline underline-offset-2">
          Ver política de cookies
        </Link>
        <button
          type="button"
          onClick={aceptar}
          className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Aceptar
        </button>
      </div>
    </aside>
  );
}
