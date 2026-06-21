import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { IntakeForm } from "./types";

export function FillFormDialog({
  form,
  onClose,
  onSubmit,
  pending,
}: {
  form: IntakeForm;
  onClose: () => void;
  onSubmit: (answers: Record<string, unknown>, signature?: string) => void;
  pending: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [signature, setSignature] = useState("");

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    for (const f of form.schema.fields) {
      if (f.required && !answers[f.key]) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    onSubmit(answers, form.kind === "consent" ? signature : undefined);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          {form.schema.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">
                {f.label}
                {f.required && " *"}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  value={String(answers[f.key] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[70px]"
                />
              ) : f.type === "select" ? (
                <select
                  required={f.required}
                  value={String(answers[f.key] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— choose —</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(answers[f.key])}
                  onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.checked }))}
                  className="h-4 w-4"
                />
              ) : (
                <input
                  type={f.type === "date" ? "date" : "text"}
                  required={f.required}
                  value={String(answers[f.key] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                />
              )}
            </label>
          ))}
          {form.kind === "consent" && (
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Signature (type full name)</span>
              <input
                required
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-handwriting italic"
              />
            </label>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Submit"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
