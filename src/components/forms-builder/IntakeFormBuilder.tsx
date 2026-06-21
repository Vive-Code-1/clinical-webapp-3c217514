import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { FieldType, FormField, IntakeForm, IntakeFormKind } from "./types";

export function IntakeFormBuilder({
  editing,
  onClose,
  onSubmit,
  pending,
}: {
  editing: IntakeForm | null;
  onClose: () => void;
  onSubmit: (p: Partial<IntakeForm> & { title: string; kind: IntakeFormKind; schema: { fields: FormField[] } }) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [kind, setKind] = useState<IntakeFormKind>(editing?.kind ?? "intake");
  const [active, setActive] = useState(editing?.is_active ?? true);
  const [fields, setFields] = useState<FormField[]>(editing?.schema?.fields ?? []);

  const addField = () => {
    const idx = fields.length + 1;
    setFields([...fields, { key: `field_${idx}`, label: `Field ${idx}`, type: "text", required: false }]);
  };
  const updateField = (i: number, patch: Partial<FormField>) => {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const moveField = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setFields(next);
  };

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    if (fields.length === 0) return toast.error("Add at least one field");
    onSubmit({
      id: editing?.id,
      title: title.trim(),
      description: description.trim() || null,
      kind,
      is_active: active,
      schema: { fields },
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit form" : "New form"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" required />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Type</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as IntakeFormKind)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="intake">Intake</option>
                <option value="consent">Consent (with signature)</option>
                <option value="questionnaire">Questionnaire</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Status</span>
              <select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="block text-xs font-semibold text-muted-foreground mb-1">Description (optional)</span>
            <textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[50px]" />
          </label>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Fields</h4>
              <button type="button" onClick={addField} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add field
              </button>
            </div>
            {fields.length === 0 && <p className="text-xs text-muted-foreground">No fields yet.</p>}
            <ul className="space-y-2">
              {fields.map((f, i) => (
                <li key={i} className="bg-muted/40 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1 pt-1 text-muted-foreground">
                      <button type="button" onClick={() => moveField(i, -1)} className="text-[10px] hover:text-foreground">▲</button>
                      <GripVertical className="w-3 h-3" />
                      <button type="button" onClick={() => moveField(i, 1)} className="text-[10px] hover:text-foreground">▼</button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        value={f.label}
                        onChange={(e) => updateField(i, { label: e.target.value })}
                        placeholder="Label"
                        className="sm:col-span-5 bg-background border border-border rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        value={f.key}
                        onChange={(e) => updateField(i, { key: e.target.value.replace(/[^a-z0-9_]/gi, "_") })}
                        placeholder="key"
                        className="sm:col-span-3 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                        className="sm:col-span-2 bg-background border border-border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Long text</option>
                        <option value="select">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="date">Date</option>
                      </select>
                      <label className="sm:col-span-2 inline-flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                        Required
                      </label>
                      {f.type === "select" && (
                        <input
                          value={(f.options ?? []).join(", ")}
                          onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="Options (comma separated)"
                          className="sm:col-span-12 bg-background border border-border rounded px-2 py-1.5 text-xs"
                        />
                      )}
                    </div>
                    <button type="button" onClick={() => removeField(i)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground hover:text-foreground px-3">Cancel</button>
            <button type="submit" disabled={pending} className="bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50">
              {pending ? "Saving…" : "Save form"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
