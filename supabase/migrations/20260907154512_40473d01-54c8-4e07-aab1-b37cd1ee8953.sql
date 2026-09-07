CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'otros',
  ruta TEXT NOT NULL,
  tamano BIGINT NOT NULL DEFAULT 0,
  tipo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_select_own" ON public.documentos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "documentos_insert_own" ON public.documentos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documentos_update_own" ON public.documentos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documentos_delete_own" ON public.documentos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX documentos_user_idx ON public.documentos (user_id, created_at DESC);

CREATE POLICY "documentos_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documentos_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documentos_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);