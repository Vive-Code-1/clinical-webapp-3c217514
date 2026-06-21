
-- ============ EXERCISES LIBRARY ============
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  video_url TEXT,
  image_url TEXT,
  instructions TEXT,
  default_sets INTEGER,
  default_reps INTEGER,
  default_duration_seconds INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage exercises"
  ON public.exercises FOR ALL
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE TRIGGER tr_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exercises_clinic ON public.exercises(clinic_id);

-- ============ EXERCISE ASSIGNMENTS (home program) ============
CREATE TYPE assignment_status AS ENUM ('active', 'completed', 'paused');

CREATE TABLE public.exercise_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id),
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER,
  frequency TEXT,
  notes TEXT,
  status assignment_status NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_assignments TO authenticated;
GRANT ALL ON public.exercise_assignments TO service_role;
ALTER TABLE public.exercise_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage assignments"
  ON public.exercise_assignments FOR ALL
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clients view own assignments"
  ON public.exercise_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clinic_clients cc
    WHERE cc.id = exercise_assignments.client_id AND cc.user_id = auth.uid()
  ));

CREATE TRIGGER tr_exercise_assignments_updated_at
  BEFORE UPDATE ON public.exercise_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exercise_assignments_client ON public.exercise_assignments(client_id);
CREATE INDEX idx_exercise_assignments_clinic ON public.exercise_assignments(clinic_id);

-- ============ SAVED PAYMENT METHODS (Stripe) ============
CREATE TABLE public.saved_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, stripe_payment_method_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_payment_methods TO authenticated;
GRANT ALL ON public.saved_payment_methods TO service_role;
ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage saved cards"
  ON public.saved_payment_methods FOR ALL
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clients view own saved cards"
  ON public.saved_payment_methods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clinic_clients cc
    WHERE cc.id = saved_payment_methods.client_id AND cc.user_id = auth.uid()
  ));

CREATE TRIGGER tr_saved_payment_methods_updated_at
  BEFORE UPDATE ON public.saved_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_payment_methods_client ON public.saved_payment_methods(client_id);
