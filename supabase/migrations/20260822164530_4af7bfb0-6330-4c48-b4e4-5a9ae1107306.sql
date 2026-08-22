CREATE TABLE public.optix_sites (
  id BIGSERIAL PRIMARY KEY,
  region TEXT,
  name TEXT NOT NULL UNIQUE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX optix_sites_lat_lng_idx ON public.optix_sites (latitude, longitude);
CREATE INDEX optix_sites_name_idx ON public.optix_sites (lower(name));
GRANT SELECT ON public.optix_sites TO authenticated;
GRANT ALL ON public.optix_sites TO service_role;
ALTER TABLE public.optix_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read sites" ON public.optix_sites FOR SELECT TO authenticated USING (true);

ALTER TABLE public.fiber_routes
  ADD COLUMN IF NOT EXISTS from_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS from_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS to_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS to_longitude DOUBLE PRECISION;