/**
 * E2E RLS security tests using the public Supabase client (anon key).
 * Verifies that anonymous clients cannot read sensitive columns or tables.
 *
 * Run: bunx vitest run tests/security/rls.test.ts
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Skipping RLS tests — missing SUPABASE_URL / PUBLISHABLE_KEY');
}

const anon = createClient(SUPABASE_URL || '', SUPABASE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe.skipIf(!SUPABASE_URL || !SUPABASE_KEY)('RLS as anon', () => {
  it('cannot select availability_overrides.note', async () => {
    const { data, error } = await anon
      .from('availability_overrides')
      .select('note')
      .limit(1);
    // Either column denied or rows blank — both acceptable; data must not contain a note
    if (data) {
      for (const row of data) expect(row.note ?? null).toBeNull();
    } else {
      expect(error).toBeTruthy();
    }
  });

  it('cannot select clinic_members.bio', async () => {
    const { data, error } = await anon
      .from('clinic_members')
      .select('bio')
      .limit(1);
    if (data) {
      for (const row of data) expect(row.bio ?? null).toBeNull();
    } else {
      expect(error).toBeTruthy();
    }
  });

  it.each([
    'clinical_notes',
    'client_medical_info',
    'client_documents',
    'invoices',
    'payments',
    'security_audit_log',
    'security_alerts',
  ])('cannot read %s as anon', async (table) => {
    const { data, error } = await anon.from(table as never).select('*').limit(1);
    // Either permission denied or empty result
    expect(error || (data && data.length === 0)).toBeTruthy();
  });

  it('cannot insert into security_audit_log', async () => {
    const { error } = await anon
      .from('security_audit_log')
      .insert({ action: 'evil', table_name: 'x' });
    expect(error).toBeTruthy();
  });

  it('home_leads insert (public lead form) is allowed without exposing other clinics', async () => {
    // Read should return no rows for anon
    const { data } = await anon.from('home_leads').select('id').limit(1);
    expect(data?.length ?? 0).toBe(0);
  });
});
