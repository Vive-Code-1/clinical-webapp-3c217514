-- 1. CREATE TABLE
CREATE TABLE public.clinic_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX clinic_clients_clinic_email_uniq
  ON public.clinic_clients (clinic_id, lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX clinic_clients_clinic_user_uniq
  ON public.clinic_clients (clinic_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX clinic_clients_clinic_idx ON public.clinic_clients (clinic_id);
CREATE INDEX clinic_clients_name_idx ON public.clinic_clients (clinic_id, lower(full_name));

-- 2. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_clients TO authenticated;
GRANT ALL ON public.clinic_clients TO service_role;

-- 3. RLS
ALTER TABLE public.clinic_clients ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (clinic members manage their clinic's client list)
CREATE POLICY "Clinic members can view clinic clients"
  ON public.clinic_clients
  FOR SELECT
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clinic members can insert clinic clients"
  ON public.clinic_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clinic members can update clinic clients"
  ON public.clinic_clients
  FOR UPDATE
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clinic members can delete clinic clients"
  ON public.clinic_clients
  FOR DELETE
  TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()));

-- updated_at trigger
CREATE TRIGGER clinic_clients_set_updated_at
  BEFORE UPDATE ON public.clinic_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();