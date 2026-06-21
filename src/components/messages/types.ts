export type Conv = {
  id: string;
  subject: string | null;
  last_message_at: string;
  clinic_id: string;
  client_id: string;
  practitioner_id: string;
  client: { full_name: string | null } | null;
  practitioner: { full_name: string | null } | null;
};

export type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
