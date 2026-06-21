export type Contact = {
  id: string;
  relationship: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export type ClinicalNote = {
  id: string;
  kind: "soap" | "follow_up" | "couple" | "family" | "general";
  title: string | null;
  content: Record<string, string>;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  appointment_id: string | null;
};

export const KIND_LABELS: Record<ClinicalNote["kind"], string> = {
  soap: "SOAP",
  follow_up: "Follow-up",
  couple: "Couple",
  family: "Family",
  general: "General",
};

export type ClientDocument = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string;
  description: string | null;
  created_at: string;
};

export type IntakeForm = {
  id: string;
  title: string;
  kind: "intake" | "consent" | "questionnaire";
  schema: { fields: Array<{ key: string; label: string; type: string; required?: boolean; options?: string[] }> };
};

export type IntakeResponse = {
  id: string;
  form_id: string;
  answers: Record<string, unknown>;
  signed_at: string | null;
  created_at: string;
};
