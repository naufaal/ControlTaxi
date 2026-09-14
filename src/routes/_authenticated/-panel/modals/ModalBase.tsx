import { X } from "lucide-react";
import React from "react";

interface ModalBaseProps {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}

export function ModalBase({ titulo, onCerrar, children }: ModalBaseProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-[2rem] sm:rounded-3xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <h2 className="font-display text-xl font-bold text-foreground">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="rounded-xl p-2 bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}