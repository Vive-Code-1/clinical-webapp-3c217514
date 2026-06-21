
-- Re-apply strict column-level grants for public read on availability_overrides
REVOKE ALL ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT (id, clinic_id, practitioner_id, override_date, is_closed, start_time, end_time)
  ON public.availability_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

-- Re-apply strict column-level grants for public read on clinic_members
REVOKE ALL ON public.clinic_members FROM anon, authenticated;
GRANT SELECT (id, clinic_id, user_id, role, title, is_active)
  ON public.clinic_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
