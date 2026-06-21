
CREATE POLICY "Public can view availability override times"
  ON public.availability_overrides
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view active clinic members"
  ON public.clinic_members
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

REVOKE SELECT ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT
  (id, practitioner_id, clinic_id, override_date, start_time, end_time, is_closed, created_at)
  ON public.availability_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;

REVOKE SELECT ON public.clinic_members FROM anon, authenticated;
GRANT SELECT
  (id, clinic_id, user_id, role, title, is_active, created_at)
  ON public.clinic_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
