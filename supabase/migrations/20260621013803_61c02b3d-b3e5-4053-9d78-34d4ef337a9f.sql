
-- Telehealth columns
ALTER TABLE public.service_types ADD COLUMN IF NOT EXISTS is_telehealth boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS meeting_url text;

-- Stripe columns on payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_id_uq ON public.payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Auto-generate Jitsi meeting URL for telehealth appointments
CREATE OR REPLACE FUNCTION public.set_telehealth_meeting_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _is_th boolean;
BEGIN
  IF NEW.meeting_url IS NOT NULL AND NEW.meeting_url <> '' THEN
    RETURN NEW;
  END IF;
  IF NEW.service_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT is_telehealth INTO _is_th FROM public.service_types WHERE id = NEW.service_type_id;
  IF _is_th THEN
    NEW.meeting_url := 'https://meet.jit.si/helanthus-' || replace(NEW.id::text, '-', '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_telehealth_url ON public.appointments;
CREATE TRIGGER trg_set_telehealth_url
BEFORE INSERT OR UPDATE OF service_type_id, meeting_url ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_telehealth_meeting_url();

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clinic_clients(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_clinic_idx ON public.conversations(clinic_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_client_idx ON public.conversations(client_id, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members manage conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id, auth.uid()))
  WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE POLICY "Clients see and reply to their own conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clinic_clients cc WHERE cc.id = conversations.client_id AND cc.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_clients cc WHERE cc.id = conversations.client_id AND cc.user_id = auth.uid()));

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conv_idx ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Membership check function for messages
CREATE OR REPLACE FUNCTION public.can_access_conversation(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conv_id
      AND (
        public.is_clinic_member(c.clinic_id, _user_id)
        OR EXISTS (SELECT 1 FROM public.clinic_clients cc WHERE cc.id = c.client_id AND cc.user_id = _user_id)
      )
  )
$$;

CREATE POLICY "Participants read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.can_access_conversation(conversation_id, auth.uid()));

CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_conversation(conversation_id, auth.uid()));

CREATE POLICY "Participants update own messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.can_access_conversation(conversation_id, auth.uid()))
  WITH CHECK (public.can_access_conversation(conversation_id, auth.uid()));

-- Bump last_message_at on insert
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_conv_last_msg ON public.messages;
CREATE TRIGGER trg_bump_conv_last_msg AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
