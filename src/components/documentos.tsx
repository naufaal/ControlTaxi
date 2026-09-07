import { useEffect, useRef, useState } from "react";
import { FileText, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Documento = {
  id: string;
  nombre: string;
  categoria: string;
  ruta: string;
  tamano: number;
  created_at: string;
};

const CATEGORIAS = [
  { valor: "vehiculo", etiqueta: "Vehículo" },
  { valor: "seguro", etiqueta: "Seguro" },
  { valor: "licencia", etiqueta: "Licencia" },
  { valor: "otros", etiqueta: "Otros" },
];

function etiqueta(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.etiqueta ?? "Otros";
}

function peso(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Documentos() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [categoria, setCategoria] = useState("vehiculo");
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function cargar() {
    const { data } = await supabase
      .from("documentos")
      .select("id, nombre, categoria, ruta, tamano, created_at")
      .order("created_at", { ascending: false });
    setDocs((data as Documento[]) ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function subir(archivo: File) {
    setAviso("");
    setSubiendo(true);
    try {
      const { data: sesion } = await supabase.auth.getUser();
      const uid = sesion.user?.id;
      if (!uid) {
        setAviso("Vuelve a entrar en tu cuenta para guardar archivos.");
        return;
      }
      const limpio = archivo.name.replace(/[^\w.\-]+/g, "_");
      const ruta = `${uid}/${Date.now()}-${limpio}`;

      const { error: errSubida } = await supabase.storage
        .from("documentos")
        .upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream" });
      if (errSubida) {
        setAviso("No hemos podido guardar el archivo. Inténtalo otra vez.");
        return;
      }

      const { error: errFila } = await supabase.from("documentos").insert({
        user_id: uid,
        nombre: archivo.name,
        categoria,
        ruta,
        tamano: archivo.size,
        tipo: archivo.type || null,
      });
      if (errFila) {
        await supabase.storage.from("documentos").remove([ruta]);
        setAviso("No hemos podido guardar el archivo. Inténtalo otra vez.");
        return;
      }
      await cargar();
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  }

  async function abrir(doc: Documento) {
    const { data } = await supabase.storage
      .from("documentos")
      .createSignedUrl(doc.ruta, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function borrar(doc: Documento) {
    setDocs((d) => d.filter((x) => x.id !== doc.id));
    await supabase.storage.from("documentos").remove([doc.ruta]);
    await supabase.from("documentos").delete().eq("id", doc.id);
  }

  return (
    <section className="px-5 pt-8">
      <h2 className="font-display text-lg font-semibold text-foreground">Documentación</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Guarda aquí el permiso del vehículo, el seguro o la licencia. Solo tú los ves.
      </p>

      <div className="mt-3 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              onClick={() => setCategoria(c.valor)}
              className={`h-9 rounded-xl px-3 text-sm font-semibold ${
                categoria === c.valor
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {c.etiqueta}
            </button>
          ))}
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) subir(archivo);
          }}
        />
        <button
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {subiendo ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {subiendo ? "Subiendo…" : `Adjuntar en ${etiqueta(categoria)}`}
        </button>

        {aviso && (
          <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {aviso}
          </p>
        )}
      </div>

      {cargando ? (
        <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Cargando tus archivos…
        </div>
      ) : docs.length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed border-border p-8 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no has subido ningún documento.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <button
                onClick={() => abrir(d)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {d.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {etiqueta(d.categoria)} · {peso(d.tamano)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => borrar(d)}
                aria-label="Borrar documento"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
