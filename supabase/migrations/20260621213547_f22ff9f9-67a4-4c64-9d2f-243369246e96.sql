
-- Revoke anon execute on remaining SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.ensure_self_client_record(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_clinic() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_paid() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_seed_note_templates() FROM anon, authenticated, PUBLIC;

-- Also tighten the trigger-only fns we created
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC;

-- Cleanup: drop overly permissive "Audit log is append-only" (with check false) — replace with no INSERT policy (already blocked)
DROP POLICY IF EXISTS "Audit log is append-only" ON public.security_audit_log;
