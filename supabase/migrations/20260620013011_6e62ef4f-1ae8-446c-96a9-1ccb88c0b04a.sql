
-- Clinic role enum (for clinic_members)
CREATE TYPE public.clinic_role AS ENUM ('owner', 'practitioner', 'receptionist');

CREATE TYPE public.appointment_status AS ENUM (
  'scheduled', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled'
);

CREATE TYPE public.booking_source AS ENUM ('staff', 'client_portal', 'public');

CREATE TYPE public.weekday AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

-- ============ Clinics ============
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  currency TEXT NOT NULL DEFAULT 'CAD',
  brand_color TEXT NOT NULL DEFAULT '#7A5C3A',
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clinics_owner ON public.clinics(owner_id);
CREATE INDEX idx_clinics_slug ON public.clinics(slug) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT SELECT ON public.clinics TO anon;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- ============ Clinic members ============
CREATE TABLE public.clinic_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.clinic_role NOT NULL,
  title TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);
CREATE INDEX idx_clinic_members_clinic ON public.clinic_members(clinic_id);
CREATE INDEX idx_clinic_members_user ON public.clinic_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT SELECT ON public.clinic_members TO anon;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- ============ Security-definer helpers (recursion-safe) ============
CREATE OR REPLACE FUNCTION public.is_clinic_member(_clinic_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = _user_id AND is_active
  ) OR EXISTS (
    SELECT 1 FROM public.clinics WHERE id = _clinic_id AND owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_owner(_clinic_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinics WHERE id = _clinic_id AND owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_practitioner(_clinic_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = _user_id
      AND role IN ('owner', 'practitioner') AND is_active
  ) OR EXISTS (
    SELECT 1 FROM public.clinics WHERE id = _clinic_id AND owner_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_practitioner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_practitioner(uuid, uuid) TO authenticated;

-- ============ Clinics policies ============
CREATE POLICY "Public can view active clinics"
  ON public.clinics FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Owners can insert clinics"
  ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their clinics"
  ON public.clinics FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their clinics"
  ON public.clinics FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ============ Clinic_members policies ============
CREATE POLICY "Public can view active members"
  ON public.clinic_members FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Owners manage members"
  ON public.clinic_members FOR ALL TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ Locations ============
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'CA',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_clinic ON public.locations(clinic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT SELECT ON public.locations TO anon;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active locations"
  ON public.locations FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Owners manage locations"
  ON public.locations FOR ALL TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ Rooms ============
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rooms_location ON public.rooms(location_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active rooms"
  ON public.rooms FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Clinic owners manage rooms"
  ON public.rooms FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = rooms.location_id
      AND public.is_clinic_owner(l.clinic_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = rooms.location_id
      AND public.is_clinic_owner(l.clinic_id, auth.uid())
  ));

-- ============ Resources ============
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resources_clinic ON public.resources(clinic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view resources"
  ON public.resources FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Owners manage resources"
  ON public.resources FOR ALL TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ Service types ============
CREATE TABLE public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 720),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  color TEXT NOT NULL DEFAULT '#7A5C3A',
  is_active BOOLEAN NOT NULL DEFAULT true,
  online_bookable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_types_clinic ON public.service_types(clinic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_types TO authenticated;
GRANT SELECT ON public.service_types TO anon;
GRANT ALL ON public.service_types TO service_role;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view online bookable services"
  ON public.service_types FOR SELECT TO anon, authenticated
  USING (is_active AND online_bookable);

CREATE POLICY "Members view all services"
  ON public.service_types FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Owners manage services"
  ON public.service_types FOR ALL TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ Practitioner services (many-to-many) ============
CREATE TABLE public.practitioner_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, service_type_id)
);
CREATE INDEX idx_pract_services_practitioner ON public.practitioner_services(practitioner_id);
CREATE INDEX idx_pract_services_service ON public.practitioner_services(service_type_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_services TO authenticated;
GRANT SELECT ON public.practitioner_services TO anon;
GRANT ALL ON public.practitioner_services TO service_role;
ALTER TABLE public.practitioner_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view practitioner services"
  ON public.practitioner_services FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Owners manage practitioner services"
  ON public.practitioner_services FOR ALL TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ Availability rules (weekly recurring) ============
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  day_of_week public.weekday NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX idx_avail_rules_pract ON public.availability_rules(practitioner_id, day_of_week);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT SELECT ON public.availability_rules TO anon;
GRANT ALL ON public.availability_rules TO service_role;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active availability"
  ON public.availability_rules FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Practitioners manage own availability"
  ON public.availability_rules FOR ALL TO authenticated
  USING (
    practitioner_id = auth.uid()
    OR public.is_clinic_owner(clinic_id, auth.uid())
  )
  WITH CHECK (
    practitioner_id = auth.uid()
    OR public.is_clinic_owner(clinic_id, auth.uid())
  );

-- ============ Availability overrides ============
CREATE TABLE public.availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (is_closed OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time))
);
CREATE INDEX idx_avail_over_pract_date ON public.availability_overrides(practitioner_id, override_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT SELECT ON public.availability_overrides TO anon;
GRANT ALL ON public.availability_overrides TO service_role;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view availability overrides"
  ON public.availability_overrides FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Practitioners manage own overrides"
  ON public.availability_overrides FOR ALL TO authenticated
  USING (
    practitioner_id = auth.uid()
    OR public.is_clinic_owner(clinic_id, auth.uid())
  )
  WITH CHECK (
    practitioner_id = auth.uid()
    OR public.is_clinic_owner(clinic_id, auth.uid())
  );

-- ============ Appointments ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  booking_source public.booking_source NOT NULL DEFAULT 'staff',
  notes TEXT,
  internal_notes TEXT,
  color TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_appts_clinic_time ON public.appointments(clinic_id, starts_at);
CREATE INDEX idx_appts_pract_time ON public.appointments(practitioner_id, starts_at);
CREATE INDEX idx_appts_client ON public.appointments(client_id);
CREATE INDEX idx_appts_room_time ON public.appointments(room_id, starts_at) WHERE room_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view clinic appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clients view own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Members create appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clients create own appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND booking_source IN ('client_portal', 'public'));

CREATE POLICY "Practitioners update own appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    practitioner_id = auth.uid()
    OR public.is_clinic_owner(clinic_id, auth.uid())
  );

CREATE POLICY "Clients cancel own appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Owners delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()));

-- ============ Conflict prevention: exclude overlapping appointments per practitioner ============
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT no_practitioner_overlap
  EXCLUDE USING gist (
    practitioner_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status NOT IN ('cancelled', 'no_show'));

ALTER TABLE public.appointments
  ADD CONSTRAINT no_room_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (room_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'));

-- ============ updated_at triggers ============
CREATE TRIGGER set_clinics_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_service_types_updated_at BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Auto-add owner as clinic_member on clinic create ============
CREATE OR REPLACE FUNCTION public.handle_new_clinic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clinic_members (clinic_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (clinic_id, user_id) DO NOTHING;

  -- Promote owner to practitioner role globally too (so they can be booked)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_id, 'owner'), (NEW.owner_id, 'practitioner')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_clinic() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_clinic_created
  AFTER INSERT ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_clinic();
