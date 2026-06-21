-- Safe public mirrors for booking-only service and availability data.

CREATE TABLE IF NOT EXISTS public.public_service_types (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  color text NOT NULL DEFAULT '#7A5C3A',
  is_active boolean NOT NULL DEFAULT true,
  online_bookable boolean NOT NULL DEFAULT true,
  is_telehealth boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.public_service_types TO anon, authenticated;
GRANT ALL ON public.public_service_types TO service_role;
ALTER TABLE public.public_service_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view public online-bookable services" ON public.public_service_types;
CREATE POLICY "Anyone can view public online-bookable services"
  ON public.public_service_types
  FOR SELECT
  TO anon, authenticated
  USING (is_active AND online_bookable);

INSERT INTO public.public_service_types (id, clinic_id, name, duration_minutes, price_cents, currency, color, is_active, online_bookable, is_telehealth)
SELECT id, clinic_id, name, duration_minutes, price_cents, currency, color, is_active, online_bookable, is_telehealth
FROM public.service_types
WHERE is_active AND online_bookable
ON CONFLICT (id) DO UPDATE SET
  clinic_id = EXCLUDED.clinic_id,
  name = EXCLUDED.name,
  duration_minutes = EXCLUDED.duration_minutes,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active,
  online_bookable = EXCLUDED.online_bookable,
  is_telehealth = EXCLUDED.is_telehealth;

CREATE OR REPLACE FUNCTION public.sync_public_service_types()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_service_types WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_active AND NEW.online_bookable THEN
    INSERT INTO public.public_service_types (id, clinic_id, name, duration_minutes, price_cents, currency, color, is_active, online_bookable, is_telehealth)
    VALUES (NEW.id, NEW.clinic_id, NEW.name, NEW.duration_minutes, NEW.price_cents, NEW.currency, NEW.color, NEW.is_active, NEW.online_bookable, NEW.is_telehealth)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id,
      name = EXCLUDED.name,
      duration_minutes = EXCLUDED.duration_minutes,
      price_cents = EXCLUDED.price_cents,
      currency = EXCLUDED.currency,
      color = EXCLUDED.color,
      is_active = EXCLUDED.is_active,
      online_bookable = EXCLUDED.online_bookable,
      is_telehealth = EXCLUDED.is_telehealth;
  ELSE
    DELETE FROM public.public_service_types WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_public_service_types() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_public_service_types ON public.service_types;
CREATE TRIGGER trg_sync_public_service_types
AFTER INSERT OR UPDATE OR DELETE ON public.service_types
FOR EACH ROW EXECUTE FUNCTION public.sync_public_service_types();

CREATE TABLE IF NOT EXISTS public.public_availability_rules (
  id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL,
  practitioner_id uuid NOT NULL,
  day_of_week public.weekday NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.public_availability_rules TO anon, authenticated;
GRANT ALL ON public.public_availability_rules TO service_role;
ALTER TABLE public.public_availability_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view public active availability" ON public.public_availability_rules;
CREATE POLICY "Anyone can view public active availability"
  ON public.public_availability_rules
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

INSERT INTO public.public_availability_rules (id, clinic_id, practitioner_id, day_of_week, start_time, end_time, is_active)
SELECT id, clinic_id, practitioner_id, day_of_week, start_time, end_time, is_active
FROM public.availability_rules
WHERE is_active
ON CONFLICT (id) DO UPDATE SET
  clinic_id = EXCLUDED.clinic_id,
  practitioner_id = EXCLUDED.practitioner_id,
  day_of_week = EXCLUDED.day_of_week,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.sync_public_availability_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_availability_rules WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_active THEN
    INSERT INTO public.public_availability_rules (id, clinic_id, practitioner_id, day_of_week, start_time, end_time, is_active)
    VALUES (NEW.id, NEW.clinic_id, NEW.practitioner_id, NEW.day_of_week, NEW.start_time, NEW.end_time, NEW.is_active)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id,
      practitioner_id = EXCLUDED.practitioner_id,
      day_of_week = EXCLUDED.day_of_week,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      is_active = EXCLUDED.is_active;
  ELSE
    DELETE FROM public.public_availability_rules WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_public_availability_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_public_availability_rules ON public.availability_rules;
CREATE TRIGGER trg_sync_public_availability_rules
AFTER INSERT OR UPDATE OR DELETE ON public.availability_rules
FOR EACH ROW EXECUTE FUNCTION public.sync_public_availability_rules();

DROP POLICY IF EXISTS "Public view online bookable services" ON public.service_types;
DROP POLICY IF EXISTS "Public view active availability" ON public.availability_rules;
DROP POLICY IF EXISTS "Public view active rooms" ON public.rooms;
REVOKE SELECT ON public.service_types FROM anon;
REVOKE SELECT ON public.availability_rules FROM anon;
REVOKE SELECT ON public.rooms FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.service_types TO service_role;
GRANT ALL ON public.availability_rules TO service_role;
GRANT ALL ON public.rooms TO service_role;