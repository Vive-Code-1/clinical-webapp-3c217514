ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ical_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_ical_token_key ON public.profiles(ical_token);

-- Also update handle_new_user to keep default token (already covered by DEFAULT)