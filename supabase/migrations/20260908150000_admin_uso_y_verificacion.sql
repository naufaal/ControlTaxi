CREATE TABLE public.admin_users (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_created_idx ON public.usage_events (created_at DESC);
CREATE INDEX usage_events_user_idx ON public.usage_events (user_id, created_at DESC);

GRANT INSERT ON public.usage_events TO authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users, public.usage_events TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_select_self" ON public.admin_users
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "usage_events_insert_own" ON public.usage_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.registrar_uso(p_event TEXT, p_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.usage_events (user_id, event, path)
  VALUES (auth.uid(), left(coalesce(p_event, 'page_view'), 80), left(coalesce(p_path, '/'), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.metricas_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado JSON;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Acceso de administrador requerido';
  END IF;

  SELECT json_build_object(
    'usuarios', (SELECT count(*) FROM auth.users),
    'usuarios_verificados', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'visitas_24h', (SELECT count(*) FROM public.usage_events WHERE created_at >= now() - interval '24 hours'),
    'visitas_7d', (SELECT count(*) FROM public.usage_events WHERE created_at >= now() - interval '7 days'),
    'facturas', (SELECT count(*) FROM public.facturas),
    'ultimos_eventos', COALESCE((
      SELECT json_agg(evento ORDER BY evento->>'created_at' DESC)
      FROM (
        SELECT json_build_object(
          'event', e.event,
          'path', e.path,
          'created_at', e.created_at,
          'email', u.email
        ) AS evento
        FROM public.usage_events e
        JOIN auth.users u ON u.id = e.user_id
        ORDER BY e.created_at DESC
        LIMIT 25
      ) recientes
    ), '[]'::json)
  ) INTO resultado;

  RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_uso(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.metricas_admin() TO authenticated;

-- Tras crear tu cuenta, ejecuta en el SQL Editor:
-- INSERT INTO public.admin_users (user_id)
-- SELECT id FROM auth.users WHERE email = 'tu-correo@ejemplo.com';
