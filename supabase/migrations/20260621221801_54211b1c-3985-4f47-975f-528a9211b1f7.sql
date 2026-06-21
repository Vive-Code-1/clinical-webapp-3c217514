-- Final hardening for remaining scan findings.

-- availability_overrides: authenticated users can manage their rows, but cannot read internal note/created_at via broad table SELECT.
REVOKE SELECT ON public.availability_overrides FROM anon, authenticated;
REVOKE SELECT (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed, note, created_at)
  ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT (id, clinic_id, practitioner_id, override_date, start_time, end_time, is_closed)
  ON public.availability_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

-- clinic_members: direct authenticated reads are restricted to the safe member fields only.
REVOKE SELECT ON public.clinic_members FROM anon, authenticated;
REVOKE SELECT (id, clinic_id, user_id, role, title, bio, is_active, created_at)
  ON public.clinic_members FROM anon, authenticated;
GRANT SELECT (id, clinic_id, user_id, role, title, is_active)
  ON public.clinic_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;

-- practitioner_services: public readers can only see mappings for active online-bookable services.
DROP POLICY IF EXISTS "Public view practitioner services" ON public.practitioner_services;
CREATE POLICY "Public view online-bookable practitioner services"
  ON public.practitioner_services
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_types st
      WHERE st.id = practitioner_services.service_type_id
        AND st.clinic_id = practitioner_services.clinic_id
        AND st.is_active
        AND st.online_bookable
    )
  );