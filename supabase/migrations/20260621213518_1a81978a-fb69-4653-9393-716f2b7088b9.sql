
-- 1. SECURITY AUDIT LOG
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  clinic_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred ON public.security_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_clinic ON public.security_audit_log(clinic_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.security_audit_log(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.security_audit_log(severity, occurred_at DESC) WHERE severity <> 'info';

GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owners view their audit log"
  ON public.security_audit_log FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND public.is_clinic_owner(clinic_id, auth.uid()));

CREATE POLICY "Audit log is append-only"
  ON public.security_audit_log FOR INSERT TO authenticated
  WITH CHECK (false);

-- 2. SECURITY ALERTS
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_log_id uuid REFERENCES public.security_audit_log(id) ON DELETE SET NULL,
  clinic_id uuid,
  severity text NOT NULL CHECK (severity IN ('warn','critical')),
  title text NOT NULL,
  message text NOT NULL,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  emailed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_alerts_unack ON public.security_alerts(clinic_id, created_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_pending_email ON public.security_alerts(created_at) WHERE emailed_at IS NULL;

GRANT SELECT, UPDATE ON public.security_alerts TO authenticated;
GRANT ALL ON public.security_alerts TO service_role;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their alerts"
  ON public.security_alerts FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND public.is_clinic_owner(clinic_id, auth.uid()));

CREATE POLICY "Owners acknowledge their alerts"
  ON public.security_alerts FOR UPDATE TO authenticated
  USING (clinic_id IS NOT NULL AND public.is_clinic_owner(clinic_id, auth.uid()))
  WITH CHECK (clinic_id IS NOT NULL AND public.is_clinic_owner(clinic_id, auth.uid()));

-- 3. AUDIT FUNCTIONS
CREATE OR REPLACE FUNCTION public._log_audit(
  _action text, _table text, _record_id uuid, _clinic_id uuid,
  _old jsonb, _new jsonb, _severity text DEFAULT 'info', _meta jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.security_audit_log(actor_id, actor_email, clinic_id, action, table_name, record_id, severity, old_data, new_data, metadata)
  VALUES (auth.uid(), _email, _clinic_id, _action, _table, _record_id, _severity, _old, _new, _meta)
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public._log_audit(text,text,uuid,uuid,jsonb,jsonb,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._raise_alert(
  _audit_id uuid, _clinic_id uuid, _severity text, _title text, _message text, _meta jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.security_alerts(audit_log_id, clinic_id, severity, title, message, metadata)
  VALUES (_audit_id, _clinic_id, _severity, _title, _message, _meta);
$$;
REVOKE EXECUTE ON FUNCTION public._raise_alert(uuid,uuid,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_trigger_fn() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _clinic uuid; _rec_id uuid; _old jsonb; _new jsonb;
  _action text; _severity text := 'info'; _audit_id uuid;
  _table text := TG_TABLE_NAME;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD); _action := 'delete';
    _rec_id := (_old->>'id')::uuid;
    _clinic := NULLIF(_old->>'clinic_id','')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    _new := to_jsonb(NEW); _action := 'insert';
    _rec_id := (_new->>'id')::uuid;
    _clinic := NULLIF(_new->>'clinic_id','')::uuid;
  ELSE
    _old := to_jsonb(OLD); _new := to_jsonb(NEW); _action := 'update';
    _rec_id := (_new->>'id')::uuid;
    _clinic := NULLIF(_new->>'clinic_id','')::uuid;
  END IF;

  IF _table = 'user_roles' THEN _severity := 'critical';
  ELSIF _table = 'clinic_members' AND _action IN ('insert','delete') THEN _severity := 'warn';
  ELSIF _table IN ('clinical_notes','client_medical_info','client_documents') AND _action = 'delete' THEN _severity := 'warn';
  ELSIF _table = 'invoices' AND _action = 'delete' THEN _severity := 'warn';
  ELSIF _table = 'payments' AND _action = 'delete' THEN _severity := 'critical';
  END IF;

  _audit_id := public._log_audit(_action, _table, _rec_id, _clinic, _old, _new, _severity);

  IF _severity IN ('warn','critical') THEN
    PERFORM public._raise_alert(
      _audit_id, _clinic, _severity,
      format('%s on %s', _action, _table),
      format('Record %s was %sd by user %s', _rec_id, _action, COALESCE(auth.uid()::text,'system'))
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_roles','clinic_members','clinical_notes','client_medical_info','client_documents','invoices','payments','clinics']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()', t, t);
  END LOOP;
END $$;

-- 4. FIX availability_overrides.note
REVOKE ALL ON public.availability_overrides FROM anon, authenticated;
GRANT SELECT (id, clinic_id, practitioner_id, override_date, is_closed, start_time, end_time) ON public.availability_overrides TO anon;
GRANT SELECT (id, clinic_id, practitioner_id, override_date, is_closed, start_time, end_time) ON public.availability_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

-- 5. FIX clinic_members.bio
REVOKE ALL ON public.clinic_members FROM anon, authenticated;
GRANT SELECT (id, clinic_id, user_id, role, title, is_active) ON public.clinic_members TO anon;
GRANT SELECT ON public.clinic_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;

-- 6. FIX home_leads & home_analytics cross-clinic
ALTER TABLE public.home_leads ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.home_analytics_events ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_home_leads_clinic ON public.home_leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_home_analytics_clinic ON public.home_analytics_events(clinic_id);

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT polname, polrelid::regclass::text AS tbl
    FROM pg_policy
    WHERE polrelid::regclass::text IN ('public.home_leads','public.home_analytics_events')
      AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p.polname, p.tbl);
  END LOOP;
END $$;

CREATE POLICY "Owning clinic sees home_leads"
  ON public.home_leads FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND public.is_clinic_owner(clinic_id, auth.uid()));

CREATE POLICY "Owning clinic sees home_analytics"
  ON public.home_analytics_events FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND public.is_clinic_owner(clinic_id, auth.uid()));

-- 7. REVOKE anon EXECUTE on internal fns
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_practitioner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_conversation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_totals(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_note_templates(uuid) FROM anon, authenticated;
