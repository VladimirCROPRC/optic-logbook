-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- installations
CREATE TABLE public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  site_name TEXT,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  service_package TEXT,
  work_order TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  -- client operations / equipment
  cpe_model TEXT,
  cpe_serial TEXT,
  cpe_mac TEXT,
  sfp_installed BOOLEAN NOT NULL DEFAULT false,
  sfp_model TEXT,
  sfp_serial TEXT,
  sfp_wavelength TEXT,
  media_converter_installed BOOLEAN NOT NULL DEFAULT false,
  media_converter_model TEXT,
  media_converter_serial TEXT,
  terminal_box_installed BOOLEAN NOT NULL DEFAULT false,
  terminal_box_type TEXT,
  terminal_box_ports INTEGER,
  rx_power_dbm NUMERIC,
  tx_power_dbm NUMERIC,
  -- site termination
  odf_name TEXT,
  odf_port TEXT,
  switch_name TEXT,
  switch_port TEXT,
  vlan TEXT,
  patch_cord_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installations TO authenticated;
GRANT ALL ON public.installations TO service_role;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own installations" ON public.installations FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX installations_user_idx ON public.installations(user_id, created_at DESC);
CREATE TRIGGER installations_updated BEFORE UPDATE ON public.installations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_installation(_installation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.installations i WHERE i.id = _installation_id AND i.user_id = auth.uid());
$$;

-- speed tests
CREATE TABLE public.speed_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.installations ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  download_mbps NUMERIC,
  upload_mbps NUMERIC,
  latency_ms NUMERIC,
  jitter_ms NUMERIC,
  packet_loss_pct NUMERIC,
  passed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.speed_tests TO authenticated;
GRANT ALL ON public.speed_tests TO service_role;
ALTER TABLE public.speed_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own speed tests" ON public.speed_tests FOR ALL TO authenticated
USING (public.owns_installation(installation_id)) WITH CHECK (public.owns_installation(installation_id));
CREATE INDEX speed_tests_inst_idx ON public.speed_tests(installation_id);

-- fiber routes
CREATE TABLE public.fiber_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.installations ON DELETE CASCADE,
  label TEXT NOT NULL,
  cable_type TEXT,
  fiber_count INTEGER,
  installation_method TEXT,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  length_m NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiber_routes TO authenticated;
GRANT ALL ON public.fiber_routes TO service_role;
ALTER TABLE public.fiber_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fiber routes" ON public.fiber_routes FOR ALL TO authenticated
USING (public.owns_installation(installation_id)) WITH CHECK (public.owns_installation(installation_id));
CREATE INDEX fiber_routes_inst_idx ON public.fiber_routes(installation_id);
CREATE TRIGGER fiber_routes_updated BEFORE UPDATE ON public.fiber_routes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- splice closures
CREATE TABLE public.splice_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES public.installations ON DELETE CASCADE,
  name TEXT NOT NULL,
  closure_type TEXT,
  location_note TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.splice_closures TO authenticated;
GRANT ALL ON public.splice_closures TO service_role;
ALTER TABLE public.splice_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own closures" ON public.splice_closures FOR ALL TO authenticated
USING (public.owns_installation(installation_id)) WITH CHECK (public.owns_installation(installation_id));
CREATE INDEX splice_closures_inst_idx ON public.splice_closures(installation_id);
CREATE TRIGGER splice_closures_updated BEFORE UPDATE ON public.splice_closures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_closure(_closure_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.splice_closures c
    JOIN public.installations i ON i.id = c.installation_id
    WHERE c.id = _closure_id AND i.user_id = auth.uid()
  );
$$;

-- splices
CREATE TABLE public.splices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID NOT NULL REFERENCES public.splice_closures ON DELETE CASCADE,
  tray TEXT,
  position_no INTEGER,
  in_tube_color TEXT,
  in_fiber_color TEXT,
  out_tube_color TEXT,
  out_fiber_color TEXT,
  loss_db NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.splices TO authenticated;
GRANT ALL ON public.splices TO service_role;
ALTER TABLE public.splices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own splices" ON public.splices FOR ALL TO authenticated
USING (public.owns_closure(closure_id)) WITH CHECK (public.owns_closure(closure_id));
CREATE INDEX splices_closure_idx ON public.splices(closure_id);