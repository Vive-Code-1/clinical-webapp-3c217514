-- Restrict payment/exercise policies to authenticated users only.

DROP POLICY IF EXISTS "Clients view own saved cards" ON public.saved_payment_methods;
DROP POLICY IF EXISTS "Clinic members manage saved cards" ON public.saved_payment_methods;
CREATE POLICY "Clients view own saved cards"
  ON public.saved_payment_methods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_clients cc
      WHERE cc.id = saved_payment_methods.client_id
        AND cc.user_id = auth.uid()
    )
  );
CREATE POLICY "Clinic members manage saved cards"
  ON public.saved_payment_methods
  FOR ALL
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

DROP POLICY IF EXISTS "Clinic members manage exercises" ON public.exercises;
CREATE POLICY "Clinic members manage exercises"
  ON public.exercises
  FOR ALL
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

DROP POLICY IF EXISTS "Clients view own assignments" ON public.exercise_assignments;
DROP POLICY IF EXISTS "Clinic members manage assignments" ON public.exercise_assignments;
CREATE POLICY "Clients view own assignments"
  ON public.exercise_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinic_clients cc
      WHERE cc.id = exercise_assignments.client_id
        AND cc.user_id = auth.uid()
    )
  );
CREATE POLICY "Clinic members manage assignments"
  ON public.exercise_assignments
  FOR ALL
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

-- Defense in depth: private locations table is staff-only; public reads use public_locations.
REVOKE ALL ON public.locations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;