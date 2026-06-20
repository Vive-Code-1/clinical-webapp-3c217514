
-- Ensure (clinic_id, user_id) is unique for upsert
CREATE UNIQUE INDEX IF NOT EXISTS clinic_clients_clinic_user_uidx
  ON public.clinic_clients(clinic_id, user_id)
  WHERE user_id IS NOT NULL;

-- Security definer: a signed-in client books → ensure their clinic_clients row exists.
-- Only allows _user_id = auth.uid() so a user cannot create rows for someone else.
CREATE OR REPLACE FUNCTION public.ensure_self_client_record(
  _clinic_id uuid,
  _full_name text DEFAULT NULL,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _name text;
  _mail text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO _id FROM public.clinic_clients
    WHERE clinic_id = _clinic_id AND user_id = _uid;

  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  -- Pull fallback name/email from profile + auth.users
  SELECT COALESCE(_full_name, p.full_name, '')
    INTO _name
    FROM public.profiles p WHERE p.id = _uid;

  SELECT COALESCE(_email, u.email)
    INTO _mail
    FROM auth.users u WHERE u.id = _uid;

  INSERT INTO public.clinic_clients (clinic_id, user_id, full_name, email, phone, created_by)
    VALUES (_clinic_id, _uid, COALESCE(_name, ''), _mail, _phone, _uid)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_self_client_record(uuid, text, text, text) TO authenticated;
