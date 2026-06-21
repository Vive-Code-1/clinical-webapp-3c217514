-- Additional hardening from the latest security scan.

-- 1) Move iCal bearer tokens out of profiles into a dedicated private table.
CREATE TABLE IF NOT EXISTS public.profile_ical_tokens (
  user_id uuid PRIMARY KEY,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_ical_tokens TO authenticated;
GRANT ALL ON public.profile_ical_tokens TO service_role;
ALTER TABLE public.profile_ical_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own iCal token" ON public.profile_ical_tokens;
CREATE POLICY "Users manage own iCal token"
  ON public.profile_ical_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.profile_ical_tokens (user_id, token)
SELECT id, ical_token
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token;

DROP INDEX IF EXISTS profiles_ical_token_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS ical_token;

-- 2) Public locations mirror: expose only safe public display fields.
CREATE TABLE IF NOT EXISTS public.public_locations (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  city text,
  region text,
  country text NOT NULL DEFAULT 'CA',
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.public_locations TO anon, authenticated;
GRANT ALL ON public.public_locations TO service_role;
ALTER TABLE public.public_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view public active locations" ON public.public_locations;
CREATE POLICY "Anyone can view public active locations"
  ON public.public_locations
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

INSERT INTO public.public_locations (id, clinic_id, name, city, region, country, is_active)
SELECT id, clinic_id, name, city, region, country, is_active
FROM public.locations
WHERE is_active
ON CONFLICT (id) DO UPDATE SET
  clinic_id = EXCLUDED.clinic_id,
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.sync_public_locations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_locations WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_active THEN
    INSERT INTO public.public_locations (id, clinic_id, name, city, region, country, is_active)
    VALUES (NEW.id, NEW.clinic_id, NEW.name, NEW.city, NEW.region, NEW.country, NEW.is_active)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id,
      name = EXCLUDED.name,
      city = EXCLUDED.city,
      region = EXCLUDED.region,
      country = EXCLUDED.country,
      is_active = EXCLUDED.is_active;
  ELSE
    DELETE FROM public.public_locations WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_public_locations() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_public_locations ON public.locations;
CREATE TRIGGER trg_sync_public_locations
AFTER INSERT OR UPDATE OR DELETE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.sync_public_locations();

DROP POLICY IF EXISTS "Public view active locations" ON public.locations;
REVOKE SELECT ON public.locations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

-- 3) Column-level defense in depth for sensitive member/profile fields.
REVOKE SELECT (bio, created_at) ON public.clinic_members FROM anon, authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 4) Avoid broad conversation row-change realtime broadcasts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations';
  END IF;
END $$;