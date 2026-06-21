
-- 1) Remove unscoped owner SELECT policies (the clinic-scoped ones remain)
DROP POLICY IF EXISTS "Owners can read analytics events" ON public.home_analytics_events;
DROP POLICY IF EXISTS "Owners can read leads" ON public.home_leads;

-- 2) Fix appointments client policies: client_id refers to clinic_clients.id
DROP POLICY IF EXISTS "Clients view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients cancel own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients create own appointments" ON public.appointments;

CREATE POLICY "Clients view own appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients cancel own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id AND cc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients create own appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_clients cc
      WHERE cc.id = appointments.client_id AND cc.user_id = auth.uid()
    )
  );

-- 3) Re-apply column-level GRANTs (idempotent) to enforce safe column subsets
REVOKE SELECT ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT
  (id, practitioner_id, clinic_id, override_date, start_time, end_time, is_closed, created_at)
  ON public.availability_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;

REVOKE SELECT ON public.clinic_members FROM anon, authenticated;
GRANT SELECT (id, clinic_id, user_id, role, title, is_active)
  ON public.clinic_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
