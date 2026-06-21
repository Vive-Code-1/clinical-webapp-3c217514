
CREATE OR REPLACE FUNCTION public.seed_default_note_templates(_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.note_templates (clinic_id, title, kind, body)
  SELECT _clinic_id, v.title, v.kind::public.clinical_note_kind, v.body::jsonb
  FROM (VALUES
    ('Couples session — default', 'couple',
      '{"presenting_concerns":"","partner_a_perspective":"","partner_b_perspective":"","dynamics_observed":"","interventions":"","homework_plan":""}'),
    ('Family session — default', 'family',
      '{"attendees":"","presenting_concerns":"","family_dynamics":"","interventions":"","strengths":"","plan_next_steps":""}'),
    ('Follow-up — default', 'follow_up',
      '{"body":"Progress since last session:\n\nCurrent status:\n\nPlan:"}'),
    ('General note — default', 'general',
      '{"body":""}')
  ) AS v(title, kind, body)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.note_templates t
    WHERE t.clinic_id = _clinic_id AND t.title = v.title
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_note_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_note_templates(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_clinic_seed_note_templates ON public.clinics;
CREATE TRIGGER tr_clinic_seed_note_templates
  AFTER INSERT ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_note_templates();

-- Backfill for existing clinics
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.clinics LOOP
    PERFORM public.seed_default_note_templates(c.id);
  END LOOP;
END $$;
