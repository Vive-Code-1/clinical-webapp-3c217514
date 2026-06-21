export type IntakeFormKind = "intake" | "consent" | "questionnaire";
export type FieldType = "text" | "textarea" | "select" | "checkbox" | "date";
export type FormField = { key: string; label: string; type: FieldType; required?: boolean; options?: string[] };
export type IntakeForm = {
  id: string;
  title: string;
  description: string | null;
  kind: IntakeFormKind;
  schema: { fields: FormField[] };
  is_active: boolean;
};

export type NoteKind = "soap" | "follow_up" | "couple" | "family" | "general";
export type NoteTemplate = { id: string; title: string; kind: NoteKind; body: Record<string, string> };

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  soap: "SOAP",
  follow_up: "Follow-up",
  couple: "Couple",
  family: "Family",
  general: "General",
};

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error("No file"));
      try {
        resolve(JSON.parse(await f.text()));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
