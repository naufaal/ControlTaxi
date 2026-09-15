-- documentos: columna url usada por el panel
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS url text;

-- ROLES
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario ve sus roles" ON public.user_roles;
CREATE POLICY "Usuario ve sus roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;

-- MOVIMIENTOS
CREATE TABLE IF NOT EXISTS public.movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  importe numeric(12,2) NOT NULL DEFAULT 0,
  concepto text NOT NULL DEFAULT '',
  fecha timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos TO authenticated;
GRANT ALL ON public.movimientos TO service_role;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Movimientos propios" ON public.movimientos;
CREATE POLICY "Movimientos propios" ON public.movimientos
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- TURNOS
CREATE TABLE IF NOT EXISTS public.turnos_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  ingresos numeric(12,2) NOT NULL DEFAULT 0,
  gastos numeric(12,2) NOT NULL DEFAULT 0,
  neto numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turnos_historial TO authenticated;
GRANT ALL ON public.turnos_historial TO service_role;
ALTER TABLE public.turnos_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Turnos propios" ON public.turnos_historial;
CREATE POLICY "Turnos propios" ON public.turnos_historial
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CONFIGURACION
CREATE TABLE IF NOT EXISTS public.configuracion_usuario (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dia_laboral_activo timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_usuario TO authenticated;
GRANT ALL ON public.configuracion_usuario TO service_role;
ALTER TABLE public.configuracion_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Config propia" ON public.configuracion_usuario;
CREATE POLICY "Config propia" ON public.configuracion_usuario
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- FACTURAS
CREATE TABLE IF NOT EXISTS public.facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero text NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  emisor jsonb NOT NULL DEFAULT '{}'::jsonb,
  cliente jsonb NOT NULL DEFAULT '{}'::jsonb,
  concepto text NOT NULL DEFAULT '',
  base numeric(12,2) NOT NULL DEFAULT 0,
  iva numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas TO authenticated;
GRANT ALL ON public.facturas TO service_role;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Facturas propias" ON public.facturas;
CREATE POLICY "Facturas propias" ON public.facturas
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE SEQUENCE IF NOT EXISTS public.factura_numero_seq;
CREATE OR REPLACE FUNCTION public.siguiente_numero_factura()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'INV' || lpad(nextval('public.factura_numero_seq')::text, 4, '0');
$$;
GRANT EXECUTE ON FUNCTION public.siguiente_numero_factura() TO authenticated;

-- EVENTOS DE USO
CREATE TABLE IF NOT EXISTS public.eventos_uso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.eventos_uso TO authenticated;
GRANT ALL ON public.eventos_uso TO service_role;
ALTER TABLE public.eventos_uso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Eventos propios" ON public.eventos_uso;
CREATE POLICY "Eventos propios" ON public.eventos_uso
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.es_admin());
DROP POLICY IF EXISTS "Insertar eventos propios" ON public.eventos_uso;
CREATE POLICY "Insertar eventos propios" ON public.eventos_uso
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.registrar_uso(p_event text, p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.eventos_uso (user_id, event, path) VALUES (auth.uid(), p_event, coalesce(p_path,''));
END;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_uso(text, text) TO authenticated;

-- METRICAS ADMIN
CREATE OR REPLACE FUNCTION public.metricas_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE resultado jsonb;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT jsonb_build_object(
    'usuarios', (SELECT count(*) FROM auth.users),
    'usuarios_verificados', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'visitas_24h', (SELECT count(*) FROM public.eventos_uso WHERE created_at > now() - interval '24 hours'),
    'visitas_7d', (SELECT count(*) FROM public.eventos_uso WHERE created_at > now() - interval '7 days'),
    'facturas', (SELECT count(*) FROM public.facturas),
    'ultimos_eventos', coalesce((
      SELECT jsonb_agg(e) FROM (
        SELECT ev.event, ev.path, ev.created_at, u.email
        FROM public.eventos_uso ev LEFT JOIN auth.users u ON u.id = ev.user_id
        ORDER BY ev.created_at DESC LIMIT 25
      ) e), '[]'::jsonb)
  ) INTO resultado;
  RETURN resultado;
END;
$$;
GRANT EXECUTE ON FUNCTION public.metricas_admin() TO authenticated;

-- BORRADO DE CUENTA
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  DELETE FROM public.movimientos WHERE user_id = uid;
  DELETE FROM public.turnos_historial WHERE user_id = uid;
  DELETE FROM public.configuracion_usuario WHERE user_id = uid;
  DELETE FROM public.facturas WHERE user_id = uid;
  DELETE FROM public.documentos WHERE user_id = uid;
  DELETE FROM public.eventos_uso WHERE user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;