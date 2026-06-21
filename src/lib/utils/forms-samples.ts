// Sample library for Forms & Templates seed data.
// Used by the "Load sample library" action in /forms.

export type FieldType = "text" | "textarea" | "select" | "checkbox" | "date";
export type FormField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};
export type IntakeKind = "intake" | "consent" | "questionnaire";
export type NoteKind = "soap" | "follow_up" | "couple" | "family" | "general";

export const SAMPLE_INTAKE_FORMS: {
  title: string;
  description: string;
  kind: IntakeKind;
  fields: FormField[];
}[] = [
  {
    title: "Adult new-client intake",
    description: "Standard biopsychosocial intake for adult clients.",
    kind: "intake",
    fields: [
      { key: "full_name", label: "Full legal name", type: "text", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      { key: "pronouns", label: "Pronouns", type: "select", options: ["she/her", "he/him", "they/them", "other"] },
      { key: "phone", label: "Best phone number", type: "text", required: true },
      { key: "emergency_contact", label: "Emergency contact (name & phone)", type: "text", required: true },
      { key: "presenting_concern", label: "What brings you in today?", type: "textarea", required: true },
      { key: "history", label: "Relevant medical / mental-health history", type: "textarea" },
      { key: "medications", label: "Current medications & supplements", type: "textarea" },
      { key: "goals", label: "What would you like to get out of therapy?", type: "textarea" },
      { key: "consent_share", label: "I consent to my information being stored securely", type: "checkbox", required: true },
    ],
  },
  {
    title: "Informed consent to treatment",
    description: "Consent and acknowledgement of practice policies.",
    kind: "consent",
    fields: [
      { key: "client_name", label: "Client name", type: "text", required: true },
      { key: "consent_treatment", label: "I consent to receive treatment", type: "checkbox", required: true },
      { key: "consent_records", label: "I acknowledge the records & privacy policy", type: "checkbox", required: true },
      { key: "consent_cancel", label: "I understand the 24-hour cancellation policy", type: "checkbox", required: true },
      { key: "consent_telehealth", label: "I consent to telehealth sessions when applicable", type: "checkbox" },
      { key: "signature_date", label: "Signature date", type: "date", required: true },
    ],
  },
  {
    title: "PHQ-9 — depression screen",
    description: "Patient Health Questionnaire (9 items).",
    kind: "questionnaire",
    fields: [
      { key: "q1", label: "Little interest or pleasure in doing things", type: "select", required: true, options: ["0 — Not at all", "1 — Several days", "2 — More than half the days", "3 — Nearly every day"] },
      { key: "q2", label: "Feeling down, depressed, or hopeless", type: "select", required: true, options: ["0 — Not at all", "1 — Several days", "2 — More than half the days", "3 — Nearly every day"] },
      { key: "q3", label: "Trouble falling or staying asleep, or sleeping too much", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "q4", label: "Feeling tired or having little energy", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "q5", label: "Poor appetite or overeating", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "q6", label: "Feeling bad about yourself or that you are a failure", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "q7", label: "Trouble concentrating", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "q8", label: "Moving or speaking slowly, or being fidgety/restless", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "q9", label: "Thoughts that you would be better off dead or of self-harm", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "notes", label: "Clinician notes", type: "textarea" },
    ],
  },
  {
    title: "GAD-7 — anxiety screen",
    description: "Generalized Anxiety Disorder 7-item scale.",
    kind: "questionnaire",
    fields: [
      { key: "g1", label: "Feeling nervous, anxious, or on edge", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "g2", label: "Not being able to stop or control worrying", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "g3", label: "Worrying too much about different things", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "g4", label: "Trouble relaxing", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "g5", label: "Being so restless that it is hard to sit still", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "g6", label: "Becoming easily annoyed or irritable", type: "select", required: true, options: ["0", "1", "2", "3"] },
      { key: "g7", label: "Feeling afraid as if something awful might happen", type: "select", required: true, options: ["0", "1", "2", "3"] },
    ],
  },
];

export const SAMPLE_NOTE_TEMPLATES: {
  title: string;
  kind: NoteKind;
  body: Record<string, string>;
}[] = [
  {
    title: "SOAP — standard session",
    kind: "soap",
    body: {
      subjective: "Client reports…",
      objective: "Affect, presentation, observable behaviour…",
      assessment: "Clinical impression, progress towards goals…",
      plan: "Interventions used, homework, next session focus…",
    },
  },
  {
    title: "Follow-up check-in",
    kind: "follow_up",
    body: { body: "Session focus:\n\nProgress since last visit:\n\nHomework review:\n\nPlan for next session:" },
  },
  {
    title: "Couple session note",
    kind: "couple",
    body: { body: "Partners present:\n\nPresenting issue today:\n\nInteraction patterns observed:\n\nInterventions:\n\nAgreements / homework:" },
  },
  {
    title: "Family session note",
    kind: "family",
    body: { body: "Family members present:\n\nSystem dynamics observed:\n\nGoals addressed:\n\nInterventions:\n\nNext steps:" },
  },
  {
    title: "Discharge summary",
    kind: "general",
    body: { body: "Reason for discharge:\n\nProgress summary:\n\nRemaining concerns:\n\nReferrals / recommendations:\n\nFollow-up plan:" },
  },
];
