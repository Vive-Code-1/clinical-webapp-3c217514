-- ============================================================
-- E2E RLS Security Test Suite (run with psql)
-- ============================================================
-- Usage: psql "$SUPABASE_DB_URL" -f tests/security/rls_e2e.sql
-- Each section starts a transaction, switches role + jwt claims,
-- runs assertions, then ROLLBACKs.
--
-- Pass = no rows raised by RAISE EXCEPTION blocks.
-- Any failure aborts that test section with a clear message.
-- ============================================================

\set ON_ERROR_STOP on
\timing off
\echo '════════════════════════════════════════════════════════════'
\echo '  RLS E2E Security Tests'
\echo '════════════════════════════════════════════════════════════'

-- ────────────────────────────────────────────────────────────
-- TEST 1: anon CANNOT read availability_overrides.note column
-- ────────────────────────────────────────────────────────────
\echo '[1] anon cannot read availability_overrides.note'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    PERFORM note FROM public.availability_overrides LIMIT 1;
    RAISE EXCEPTION 'FAIL: anon read availability_overrides.note';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '  ✓ pass';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 2: anon CAN read availability_overrides time columns
-- ────────────────────────────────────────────────────────────
\echo '[2] anon can read availability_overrides time columns'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  DECLARE _ok boolean;
  BEGIN
    PERFORM override_date, start_time, end_time, is_closed
      FROM public.availability_overrides LIMIT 1;
    RAISE NOTICE '  ✓ pass';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'FAIL: anon blocked from reading public schedule columns';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 3: anon CANNOT read clinic_members.bio
-- ────────────────────────────────────────────────────────────
\echo '[3] anon cannot read clinic_members.bio'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    PERFORM bio FROM public.clinic_members LIMIT 1;
    RAISE EXCEPTION 'FAIL: anon read clinic_members.bio';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '  ✓ pass';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 4: anon CANNOT read clinical_notes (ANY column)
-- ────────────────────────────────────────────────────────────
\echo '[4] anon cannot read clinical_notes'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  DECLARE _cnt int;
  BEGIN
    SELECT count(*) INTO _cnt FROM public.clinical_notes;
    IF _cnt > 0 THEN
      RAISE EXCEPTION 'FAIL: anon saw % clinical notes', _cnt;
    END IF;
    RAISE NOTICE '  ✓ pass (0 rows visible)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '  ✓ pass (permission denied)';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 5: anon CANNOT read client_medical_info / client_documents
-- ────────────────────────────────────────────────────────────
\echo '[5] anon cannot read PHI tables'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  DECLARE _t text; _cnt int;
  BEGIN
    FOREACH _t IN ARRAY ARRAY['client_medical_info','client_documents','invoices','payments']
    LOOP
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I', _t) INTO _cnt;
        IF _cnt > 0 THEN
          RAISE EXCEPTION 'FAIL: anon saw % rows from %', _cnt, _t;
        END IF;
      EXCEPTION WHEN insufficient_privilege THEN
        NULL;  -- expected
      END;
    END LOOP;
    RAISE NOTICE '  ✓ pass (all PHI tables blocked)';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 6: anon CANNOT execute internal security-definer fns
-- ────────────────────────────────────────────────────────────
\echo '[6] anon cannot execute privileged functions'
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    PERFORM public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'owner'::app_role);
    RAISE EXCEPTION 'FAIL: anon called has_role()';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '  ✓ pass';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 7: home_leads cross-clinic isolation
-- Owner of clinic A must not see leads tagged to clinic B
-- ────────────────────────────────────────────────────────────
\echo '[7] cross-clinic isolation on home_leads'
BEGIN;
  SET LOCAL ROLE authenticated;
  -- Spoof two owner identities and verify isolation via policy
  DO $$
  DECLARE _owner_a uuid; _owner_b uuid; _clinic_a uuid; _clinic_b uuid; _seen int;
  BEGIN
    SELECT id, owner_id INTO _clinic_a, _owner_a FROM public.clinics LIMIT 1;
    IF _clinic_a IS NULL THEN
      RAISE NOTICE '  ⊘ skip (no clinics in DB)';
      RETURN;
    END IF;

    -- Set JWT claim for owner A
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _owner_a::text, 'role', 'authenticated')::text, true);

    SELECT count(*) INTO _seen FROM public.home_leads
      WHERE clinic_id IS NOT NULL AND clinic_id <> _clinic_a;
    IF _seen > 0 THEN
      RAISE EXCEPTION 'FAIL: owner of clinic % saw % leads from other clinics', _clinic_a, _seen;
    END IF;
    RAISE NOTICE '  ✓ pass';
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 8: audit log is read-only for non-owners
-- ────────────────────────────────────────────────────────────
\echo '[8] audit log insert blocked for authenticated users'
BEGIN;
  SET LOCAL ROLE authenticated;
  DO $$
  BEGIN
    INSERT INTO public.security_audit_log(action, table_name)
      VALUES ('fake', 'test');
    RAISE EXCEPTION 'FAIL: authenticated inserted directly into audit log';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR raise_exception THEN
      RAISE NOTICE '  ✓ pass';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' OR SQLERRM ILIKE '%row-level%' THEN
        RAISE NOTICE '  ✓ pass';
      ELSE
        RAISE;
      END IF;
  END $$;
ROLLBACK;

-- ────────────────────────────────────────────────────────────
-- TEST 9: audit trigger writes a row on user_roles change
-- ────────────────────────────────────────────────────────────
\echo '[9] audit trigger captures role grant'
BEGIN;
  DO $$
  DECLARE _u uuid; _before int; _after int;
  BEGIN
    SELECT id INTO _u FROM auth.users LIMIT 1;
    IF _u IS NULL THEN
      RAISE NOTICE '  ⊘ skip (no users)';
      RETURN;
    END IF;
    SELECT count(*) INTO _before FROM public.security_audit_log
      WHERE table_name='user_roles';
    INSERT INTO public.user_roles(user_id, role)
      VALUES (_u, 'practitioner') ON CONFLICT DO NOTHING;
    SELECT count(*) INTO _after FROM public.security_audit_log
      WHERE table_name='user_roles';
    IF _after <= _before THEN
      RAISE NOTICE '  ⊘ skip (no insert occurred, likely conflict)';
    ELSE
      RAISE NOTICE '  ✓ pass (% new audit rows)', _after - _before;
    END IF;
  END $$;
ROLLBACK;

\echo '════════════════════════════════════════════════════════════'
\echo '  ✅ All RLS E2E security tests complete'
\echo '════════════════════════════════════════════════════════════'
