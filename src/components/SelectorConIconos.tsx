import React from "react";

interface Option {
  id: string;
  nombre: string;
  icon: React.ElementType;
}

interface Props {
  opciones: Option[];
  seleccionado: string;
  onSelect: (id: string) => void;
  label?: string;
}

export function SelectorConIconos({ opciones, seleccionado, onSelect, label }: Props) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {opciones.map((item) => {
          const Icono = item.icon;
          const esActivo = seleccionado === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex items-center justify-center gap-2 h-11 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                esActivo
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-secondary/70 text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <Icono className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.nombre}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}