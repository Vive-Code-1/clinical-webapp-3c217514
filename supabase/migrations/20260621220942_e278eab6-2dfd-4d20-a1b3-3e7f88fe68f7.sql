-- Re-apply fixes for current security scan findings in an idempotent way.

-- 1) Remove unscoped owner policies; scoped owner policies already exist.
DROP POLICY IF EXISTS "Owners can read analytics events" ON public.home_analytics_events;
DROP POLICY IF EXISTS "Owners can read leads" ON public.home_leads;

-- 2) Fix client-facing appointment policies so client_id maps through clinic_clients.id.
DROP POLICY IF EXISTS "Clients view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients cancel own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients create own appointments" ON public.appointments;

CREATE POLICY "Clients view own appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id
        AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients cancel own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id
        AND cc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id
        AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients create own appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id
        AND cc.user_id = auth.uid()
        AND cc.clinic_id = appointments.clinic_id
    )
  );

-- 3) Enforce column-level public reads for availability overrides.
-- Public booking needs only time-window fields. Internal notes/timestamps must stay private.
REVOKE SELECT ON public.availability_overrides FROM anon, authenticated;
REVOKE SELECT (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed, note, created_at)
  ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed)
  ON public.availability_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

-- 4) Enforce column-level public reads for clinic members.
-- Public booking needs only active practitioner/member display fields.
REVOKE SELECT ON public.clinic_members FROM anon, authenticated;
REVOKE SELECT (id, clinic_id, user_id, role, title, bio, is_active, created_at)
  ON public.clinic_members FROM anon, authenticated;
GRANT SELECT (id, clinic_id, user_id, role, title, is_active)
  ON public.clinic_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;