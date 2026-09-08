CREATE TABLE public.movimientos (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  concepto TEXT NOT NULL DEFAULT '',
  importe NUMERIC(12, 2) NOT NULL CHECK (importe > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX movimientos_user_fecha_idx ON public.movimientos (user_id, fecha DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos TO authenticated;
GRANT ALL ON public.movimientos TO service_role;

ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimientos_select_own" ON public.movimientos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "movimientos_insert_own" ON public.movimientos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "movimientos_update_own" ON public.movimientos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "movimientos_delete_own" ON public.movimientos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);