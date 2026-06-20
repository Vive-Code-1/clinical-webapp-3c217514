
-- ============== ENUMS ==============
DO $$ BEGIN
  CREATE TYPE public.intake_form_kind AS ENUM ('intake', 'consent', 'questionnaire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.clinical_note_kind AS ENUM ('soap', 'follow_up', 'couple', 'family', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== client_contacts ==============
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'emergency',
  full_name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_contacts_client ON public.client_contacts(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners manage contacts"
  ON public.client_contacts FOR ALL TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE TRIGGER trg_client_contacts_updated BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== client_medical_info ==============
CREATE TABLE public.client_medical_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  allergies text,
  medications text,
  conditions text,
  family_history text,
  lifestyle text,
  blood_type text,
  height_cm numeric,
  weight_kg numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_medical_info TO authenticated;
GRANT ALL ON public.client_medical_info TO service_role;
ALTER TABLE public.client_medical_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners manage medical info"
  ON public.client_medical_info FOR ALL TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE TRIGGER trg_client_medical_info_updated BEFORE UPDATE ON public.client_medical_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== intake_forms ==============
CREATE TABLE public.intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind public.intake_form_kind NOT NULL DEFAULT 'intake',
  schema jsonb NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intake_forms_clinic ON public.intake_forms(clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_forms TO authenticated;
GRANT ALL ON public.intake_forms TO service_role;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners manage intake forms"
  ON public.intake_forms FOR ALL TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
-- Clients can view active forms of clinics they have appointments with
CREATE POLICY "Clients can view active intake forms"
  ON public.intake_forms FOR SELECT TO authenticated
  USING (
    is_active AND EXISTS (
      SELECT 1 FROM public.clinic_clients cc
      WHERE cc.clinic_id = intake_forms.clinic_id AND cc.user_id = auth.uid()
    )
  );
CREATE TRIGGER trg_intake_forms_updated BEFORE UPDATE ON public.intake_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== intake_responses ==============
CREATE TABLE public.intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_at timestamptz,
  signature text,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intake_responses_client ON public.intake_responses(client_id);
CREATE INDEX idx_intake_responses_form ON public.intake_responses(form_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_responses TO authenticated;
GRANT ALL ON public.intake_responses TO service_role;
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners manage intake responses"
  ON public.intake_responses FOR ALL TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE POLICY "Clients can view their own intake responses"
  ON public.intake_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clinic_clients cc
    WHERE cc.id = intake_responses.client_id AND cc.user_id = auth.uid()
  ));
CREATE POLICY "Clients can submit their own intake responses"
  ON public.intake_responses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clinic_clients cc
    WHERE cc.id = intake_responses.client_id AND cc.user_id = auth.uid()
  ));
CREATE TRIGGER trg_intake_responses_updated BEFORE UPDATE ON public.intake_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== note_templates ==============
CREATE TABLE public.note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind public.clinical_note_kind NOT NULL DEFAULT 'soap',
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_note_templates_clinic ON public.note_templates(clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_templates TO authenticated;
GRANT ALL ON public.note_templates TO service_role;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners manage note templates"
  ON public.note_templates FOR ALL TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE TRIGGER trg_note_templates_updated BEFORE UPDATE ON public.note_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== clinical_notes ==============
CREATE TABLE public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  practitioner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.clinical_note_kind NOT NULL DEFAULT 'general',
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clinical_notes_client ON public.clinical_notes(client_id);
CREATE INDEX idx_clinical_notes_appointment ON public.clinical_notes(appointment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT ALL ON public.clinical_notes TO service_role;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners view clinical notes"
  ON public.clinical_notes FOR SELECT TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE POLICY "Clinic practitioners insert clinical notes"
  ON public.clinical_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE POLICY "Clinic practitioners update clinical notes"
  ON public.clinical_notes FOR UPDATE TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE POLICY "Clinic owners delete clinical notes"
  ON public.clinical_notes FOR DELETE TO authenticated
  USING (public.is_clinic_owner(clinic_id, auth.uid()));

-- Lock guard: block edits to locked notes (except toggling the lock itself)
CREATE OR REPLACE FUNCTION public.guard_clinical_note_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_locked AND NEW.is_locked THEN
    -- already locked and staying locked → must be no-op besides updated_at
    IF NEW.content IS DISTINCT FROM OLD.content
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.kind IS DISTINCT FROM OLD.kind THEN
      RAISE EXCEPTION 'Locked clinical note cannot be edited. Unlock first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.is_locked AND NOT OLD.is_locked THEN
    NEW.locked_at := now();
  ELSIF NOT NEW.is_locked AND OLD.is_locked THEN
    NEW.locked_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clinical_notes_lock_guard BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_clinical_note_lock();
CREATE TRIGGER trg_clinical_notes_updated BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== client_documents ==============
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  category text NOT NULL DEFAULT 'general',
  description text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_documents_client ON public.client_documents(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic practitioners manage client documents"
  ON public.client_documents FOR ALL TO authenticated
  USING (public.is_clinic_practitioner(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_practitioner(clinic_id, auth.uid()));
CREATE POLICY "Clients can view their own documents"
  ON public.client_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clinic_clients cc
    WHERE cc.id = client_documents.client_id AND cc.user_id = auth.uid()
  ));
CREATE TRIGGER trg_client_documents_updated BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== Storage RLS for client-documents bucket ==============
-- Practitioners can do everything in their clinic folder; clients can read their own.
-- Path convention: {clinic_id}/{client_id}/{file}
CREATE POLICY "Clinic practitioners manage client documents storage"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND public.is_clinic_practitioner((storage.foldername(name))[1]::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND public.is_clinic_practitioner((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Clients can read their own documents storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.clinic_clients cc
      WHERE cc.id = (storage.foldername(name))[2]::uuid
        AND cc.user_id = auth.uid()
    )
  );
