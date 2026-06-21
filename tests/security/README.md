# Security E2E Tests

Two complementary test suites cover RLS, column-level grants, audit logging, and cross-clinic isolation.

## 1. SQL-based suite (fast, full coverage)

Runs each test in its own transaction with `SET LOCAL ROLE` + JWT claim spoofing, then `ROLLBACK`. Safe to run against any environment.

```bash
psql "$SUPABASE_DB_URL" -f tests/security/rls_e2e.sql
```

Covers:
1. anon blocked from `availability_overrides.note`
2. anon can read public schedule columns
3. anon blocked from `clinic_members.bio`
4. anon blocked from `clinical_notes`
5. anon blocked from all PHI tables (medical info, documents, invoices, payments)
6. anon blocked from privileged security-definer functions
7. Cross-clinic isolation on `home_leads`
8. `security_audit_log` is append-only (no direct insert)
9. Audit trigger fires on `user_roles` changes

## 2. Vitest suite (realistic client)

Uses the actual `@supabase/supabase-js` anon client — matches what a malicious frontend would do.

```bash
bunx vitest run tests/security/rls.test.ts
```

Requires env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (already in `.env`).

## What's protected

| Surface | Mechanism |
|---|---|
| PHI tables (`clinical_notes`, `client_medical_info`, `client_documents`) | RLS scoped by `is_clinic_member()` / client ownership |
| Sensitive columns (`note`, `bio`) | Column-level GRANTs to `anon`/`authenticated` |
| Cross-clinic data (`home_leads`, `home_analytics_events`) | `clinic_id` FK + `is_clinic_owner()` policy |
| Internal SECURITY DEFINER fns | `REVOKE EXECUTE FROM anon` |
| Audit log | Append-only; `SELECT` only for clinic owners |

## Audit log & alerts

Triggers on `user_roles`, `clinic_members`, `clinical_notes`, `client_medical_info`, `client_documents`, `invoices`, `payments`, `clinics` insert into `security_audit_log`. Severity `warn`/`critical` events also raise a row in `security_alerts` for the in-app dashboard.

Email alerts: once an email domain is provisioned, a periodic worker reads `security_alerts WHERE emailed_at IS NULL AND severity = 'critical'` and notifies the clinic owner.
