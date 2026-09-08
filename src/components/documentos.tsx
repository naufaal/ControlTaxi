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
  if (!bytes) return "0 B";
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
    try {
      setCargando(true);
      const { data: sesion } = await supabase.auth.getUser();
      const uid = sesion.user?.id;

      if (!uid) {
        setCargando(false);
        return;
      }

      const { data, error } = await supabase
        .from("documentos")
        .select("id, nombre, categoria, ruta, tamano, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar lista:", error);
      } else {
        setDocs((data as Documento[]) ?? []);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function subir(archivo: File) {
    setAviso("");
    setSubiendo(true);

    try {
      const { data: sesion, error: userError } = await supabase.auth.getUser();
      const uid = sesion.user?.id;

      if (userError || !uid) {
        setAviso("Vuelve a entrar en tu cuenta para guardar archivos.");
        return;
      }

      // Nombre y ruta limpia para evitar caracteres extraños en Supabase Storage
      const limpio = archivo.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const ruta = `${uid}/${Date.now()}_${limpio}`;

      // 1. Subir al Bucket 'documentos'
      const { error: errSubida } = await supabase.storage
        .from("documentos")
        .upload(ruta, archivo, {
          contentType: archivo.type || "application/octet-stream",
          upsert: false,
        });

      if (errSubida) {
        console.error("Error en Storage:", errSubida);
        setAviso(`Error al subir archivo: ${errSubida.message}`);
        return;
      }

      // 2. Guardar en la tabla 'documentos'
      const { error: errFila } = await supabase.from("documentos").insert({
        user_id: uid,
        nombre: archivo.name,
        categoria,
        ruta,
        tamano: archivo.size,
        tipo: archivo.type || null,
      });

      if (errFila) {
        console.error("Error en BD:", errFila);
        // Si la BD falla, revertimos el Storage para no dejar archivos huérfanos
        await supabase.storage.from("documentos").remove([ruta]);
        setAviso(`Error al guardar datos: ${errFila.message}`);
        return;
      }

      await cargar();
    } catch (err: any) {
      console.error("Error general:", err);
      setAviso("No hemos podido guardar el archivo. Inténtalo otra vez.");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  }

  async function abrir(doc: Documento) {
    try {
      // Intenta obtener una URL firmada de 2 minutos
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(doc.ruta, 120);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } else if (error) {
        // Fallback por si el bucket es público
        const { data: pubData } = supabase.storage
          .from("documentos")
          .getPublicUrl(doc.ruta);
        if (pubData?.publicUrl) {
          window.open(pubData.publicUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (e) {
      console.error("Error al abrir archivo:", e);
    }
  }

  async function borrar(doc: Documento) {
    // Actualización optimista de la interfaz
    setDocs((d) => d.filter((x) => x.id !== doc.id));

    try {
      await supabase.storage.from("documentos").remove([doc.ruta]);
      await supabase.from("documentos").delete().eq("id", doc.id);
    } catch (e) {
      console.error("Error al borrar archivo:", e);
    }
  }

  return (
    <section className="px-5 pt-8">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Documentación
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Guarda aquí el permiso del vehículo, el seguro o la licencia. Solo tú los ves.
      </p>

      <div className="mt-3 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setCategoria(c.valor)}
              className={`h-9 rounded-xl px-3 text-sm font-semibold transition-colors ${
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
          type="button"
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {subiendo ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {subiendo ? "Subiendo…" : "Adjuntar"}
        </button>

        {aviso && (
          <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
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
                type="button"
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
                type="button"
                onClick={() => borrar(d)}
                aria-label="Borrar documento"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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