CREATE TABLE public.facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  numero TEXT NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,
  emisor JSONB NOT NULL,
  cliente JSONB NOT NULL,
  concepto TEXT NOT NULL,
  base NUMERIC(12, 2) NOT NULL,
  iva NUMERIC(12, 2) NOT NULL,
  total NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, numero)
);

GRANT SELECT, INSERT ON public.facturas TO authenticated;
GRANT ALL ON public.facturas TO service_role;

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facturas_select_own" ON public.facturas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "facturas_insert_own" ON public.facturas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX facturas_user_idx ON public.facturas (user_id, fecha DESC);

CREATE TABLE public.factura_series (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  ultimo_numero INTEGER NOT NULL DEFAULT -1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.factura_series TO service_role;

ALTER TABLE public.factura_series ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.siguiente_numero_factura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  siguiente INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  INSERT INTO public.factura_series (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.factura_series
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING ultimo_numero INTO siguiente;

  RETURN 'INV' || lpad(siguiente::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.siguiente_numero_factura() TO authenticated;
