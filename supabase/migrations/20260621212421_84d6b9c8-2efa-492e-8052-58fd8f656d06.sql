
-- 1) availability_overrides: hide internal `note` from anon/authenticated read
DROP POLICY IF EXISTS "Public view availability overrides" ON public.availability_overrides;
CREATE POLICY "Public view availability override times"
  ON public.availability_overrides
  FOR SELECT
  TO anon, authenticated
  USING (true);
REVOKE SELECT ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT (id, clinic_id, practitioner_id, override_date, is_closed, start_time, end_time)
  ON public.availability_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

-- 2) clinic_members: restrict public-readable columns to booking essentials
DROP POLICY IF EXISTS "Public can view active members" ON public.clinic_members;
CREATE POLICY "Public can view active members (limited cols)"
  ON public.clinic_members
  FOR SELECT
  TO anon, authenticated
  USING (is_active);
REVOKE SELECT ON public.clinic_members FROM anon, authenticated;
GRANT SELECT (id, clinic_id, user_id, role, title, is_active)
  ON public.clinic_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;

-- 3) home_leads: only owners can read; insert remains public
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.home_leads;
CREATE POLICY "Owners can read leads"
  ON public.home_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

-- 4) home_analytics_events: only owners can read
DROP POLICY IF EXISTS "Authenticated users can read analytics events" ON public.home_analytics_events;
CREATE POLICY "Owners can read analytics events"
  ON public.home_analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

-- 5) brand-assets storage: scope by path prefix
--    paths: clinic/{clinicId}/...  OR  user/{userId}/...
DROP POLICY IF EXISTS "auth read brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "auth insert brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "auth update brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "auth delete brand-assets" ON storage.objects;

-- Public read so logos/avatars can be displayed via signed urls or public reads
CREATE POLICY "brand-assets public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'brand-assets');

-- INSERT: clinic owners for clinic/<id>/* and the user themself for user/<uid>/*
CREATE POLICY "brand-assets owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'clinic'
        AND public.is_clinic_owner(((storage.foldername(name))[2])::uuid, auth.uid())
      )
      OR (
        (storage.foldername(name))[1] = 'user'
        AND ((storage.foldername(name))[2])::uuid = auth.uid()
      )
    )
  );

CREATE POLICY "brand-assets owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'clinic'
        AND public.is_clinic_owner(((storage.foldername(name))[2])::uuid, auth.uid())
      )
      OR (
        (storage.foldername(name))[1] = 'user'
        AND ((storage.foldername(name))[2])::uuid = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'clinic'
        AND public.is_clinic_owner(((storage.foldername(name))[2])::uuid, auth.uid())
      )
      OR (
        (storage.foldername(name))[1] = 'user'
        AND ((storage.foldername(name))[2])::uuid = auth.uid()
      )
    )
  );

CREATE POLICY "brand-assets owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'clinic'
        AND public.is_clinic_owner(((storage.foldername(name))[2])::uuid, auth.uid())
      )
      OR (
        (storage.foldername(name))[1] = 'user'
        AND ((storage.foldername(name))[2])::uuid = auth.uid()
      )
    )
  );

-- 6) Realtime authorization: only allow subscribing to conversation topics the user can access
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read conversation realtime" ON realtime.messages;
CREATE POLICY "Authenticated can read conversation realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_conversation(
      (regexp_replace(realtime.topic(), '^conversation:', ''))::uuid,
      auth.uid()
    )
  );
