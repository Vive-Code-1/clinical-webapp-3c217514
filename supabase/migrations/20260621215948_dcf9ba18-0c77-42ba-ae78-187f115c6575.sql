
-- 1) Drop over-broad public SELECT policies on base tables
DROP POLICY IF EXISTS "Public view availability override times" ON public.availability_overrides;
DROP POLICY IF EXISTS "Public can view active members (limited cols)" ON public.clinic_members;

-- 2) Create safe public views exposing only non-sensitive columns.
-- Views are owned by postgres and bypass RLS, so they need their own GRANTs.
CREATE OR REPLACE VIEW public.public_clinic_members_v
WITH (security_invoker = off) AS
SELECT id, clinic_id, user_id, role, title, is_active
FROM public.clinic_members
WHERE is_active = true;

CREATE OR REPLACE VIEW public.public_availability_overrides_v
WITH (security_invoker = off) AS
SELECT id, practitioner_id, clinic_id, override_date, start_time, end_time, is_closed
FROM public.availability_overrides;

REVOKE ALL ON public.public_clinic_members_v FROM PUBLIC;
REVOKE ALL ON public.public_availability_overrides_v FROM PUBLIC;
GRANT SELECT ON public.public_clinic_members_v TO anon, authenticated;
GRANT SELECT ON public.public_availability_overrides_v TO anon, authenticated;

-- 3) Lock down SECURITY DEFINER functions: revoke PUBLIC EXECUTE on
-- functions that should never be callable directly.
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_totals(uuid) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_note_templates(uuid) FROM PUBLIC;

-- Trigger / internal-only definer functions: keep service_role/postgres only.
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_clinic() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_paid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_seed_note_templates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._log_audit(text, text, uuid, uuid, jsonb, jsonb, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._raise_alert(uuid, uuid, text, text, text, jsonb) FROM PUBLIC;

-- Note: has_role, is_clinic_owner, is_clinic_member, is_clinic_practitioner,
-- and ensure_self_client_record intentionally remain executable by
-- 'authenticated' because RLS policies and client RPCs depend on them.
