-- Replace public base-table reads with safe public mirror tables.
-- This avoids exposing sensitive/future columns through broad public RLS policies.

DROP VIEW IF EXISTS public.public_clinic_members_v CASCADE;
DROP VIEW IF EXISTS public.public_availability_overrides_v CASCADE;

CREATE TABLE IF NOT EXISTS public.public_availability_overrides (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  practitioner_id uuid NOT NULL,
  override_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  is_closed boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.public_availability_overrides TO anon, authenticated;
GRANT ALL ON public.public_availability_overrides TO service_role;
ALTER TABLE public.public_availability_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view public availability override times" ON public.public_availability_overrides;
CREATE POLICY "Anyone can view public availability override times"
  ON public.public_availability_overrides
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.public_clinic_members (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  title text,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.public_clinic_members TO anon, authenticated;
GRANT ALL ON public.public_clinic_members TO service_role;
ALTER TABLE public.public_clinic_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view public active clinic members" ON public.public_clinic_members;
CREATE POLICY "Anyone can view public active clinic members"
  ON public.public_clinic_members
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

INSERT INTO public.public_availability_overrides (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed)
SELECT id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed
FROM public.availability_overrides
ON CONFLICT (id) DO UPDATE SET
  clinic_id = EXCLUDED.clinic_id,
  practitioner_id = EXCLUDED.practitioner_id,
  override_date = EXCLUDED.override_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_closed = EXCLUDED.is_closed;

INSERT INTO public.public_clinic_members (id, clinic_id, user_id, role, title, is_active)
SELECT id, clinic_id, user_id, role::text, title, is_active
FROM public.clinic_members
WHERE is_active
ON CONFLICT (id) DO UPDATE SET
  clinic_id = EXCLUDED.clinic_id,
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role,
  title = EXCLUDED.title,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.sync_public_availability_overrides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_availability_overrides WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_availability_overrides (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed)
  VALUES (NEW.id, NEW.clinic_id, NEW.practitioner_id, NEW.override_date, NEW.start_time, NEW.end_time, NEW.is_closed)
  ON CONFLICT (id) DO UPDATE SET
    clinic_id = EXCLUDED.clinic_id,
    practitioner_id = EXCLUDED.practitioner_id,
    override_date = EXCLUDED.override_date,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_closed = EXCLUDED.is_closed;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_public_clinic_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_clinic_members WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_active THEN
    INSERT INTO public.public_clinic_members (id, clinic_id, user_id, role, title, is_active)
    VALUES (NEW.id, NEW.clinic_id, NEW.user_id, NEW.role::text, NEW.title, NEW.is_active)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id,
      user_id = EXCLUDED.user_id,
      role = EXCLUDED.role,
      title = EXCLUDED.title,
      is_active = EXCLUDED.is_active;
  ELSE
    DELETE FROM public.public_clinic_members WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_public_availability_overrides() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_public_clinic_members() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_public_availability_overrides ON public.availability_overrides;
CREATE TRIGGER trg_sync_public_availability_overrides
AFTER INSERT OR UPDATE OR DELETE ON public.availability_overrides
FOR EACH ROW EXECUTE FUNCTION public.sync_public_availability_overrides();

DROP TRIGGER IF EXISTS trg_sync_public_clinic_members ON public.clinic_members;
CREATE TRIGGER trg_sync_public_clinic_members
AFTER INSERT OR UPDATE OR DELETE ON public.clinic_members
FOR EACH ROW EXECUTE FUNCTION public.sync_public_clinic_members();

-- Remove public read policies from sensitive base tables.
DROP POLICY IF EXISTS "Public can view availability override times" ON public.availability_overrides;
DROP POLICY IF EXISTS "Public view availability override times" ON public.availability_overrides;
DROP POLICY IF EXISTS "Public can view active clinic members" ON public.clinic_members;
DROP POLICY IF EXISTS "Public can view active members (limited cols)" ON public.clinic_members;

REVOKE SELECT ON public.availability_overrides FROM anon;
REVOKE SELECT (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed, note, created_at)
  ON public.availability_overrides FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

REVOKE SELECT ON public.clinic_members FROM anon;
REVOKE SELECT (id, clinic_id, user_id, role, title, bio, is_active, created_at)
  ON public.clinic_members FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;