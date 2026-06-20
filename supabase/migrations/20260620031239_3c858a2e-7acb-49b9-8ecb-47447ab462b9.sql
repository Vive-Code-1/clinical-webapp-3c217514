CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- skip checks for cancelled/no_show
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  -- practitioner conflict
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.practitioner_id = NEW.practitioner_id
      AND a.clinic_id = NEW.clinic_id
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.status NOT IN ('cancelled', 'no_show')
      AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Practitioner already has an appointment in this time range'
      USING ERRCODE = 'check_violation';
  END IF;

  -- room conflict (only if room set)
  IF NEW.room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.room_id = NEW.room_id
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.status NOT IN ('cancelled', 'no_show')
      AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Room is already booked in this time range'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_prevent_overlap ON public.appointments;
CREATE TRIGGER appointments_prevent_overlap
  BEFORE INSERT OR UPDATE OF starts_at, ends_at, practitioner_id, room_id, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_appointment_overlap();