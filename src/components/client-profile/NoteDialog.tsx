import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KIND_LABELS, type ClinicalNote } from "./types";

export function NoteContentView({ kind, content }: { kind: ClinicalNote["kind"]; content: Record<string, string> }) {
  if (kind === "soap") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {(["subjective", "objective", "assessment", "plan"] as const).map((k) =>
          content[k] ? (
            <div key={k}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{k}</p>
              <p className="whitespace-pre-wrap">{content[k]}</p>
            </div>
          ) : null,
        )}
      </div>
    );
  }
  return <p className="text-sm whitespace-pre-wrap">{content.body || ""}</p>;
}

export function NoteDialog({
  open,
  onOpenChange,
  editing,
  templates,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClinicalNote | null;
  templates: Array<{ id: string; title: string; kind: ClinicalNote["kind"]; body: Record<string, string> }>;
  onSubmit: (p: { id?: string; kind: ClinicalNote["kind"]; title: string; content: Record<string, string> }) => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState<ClinicalNote["kind"]>(editing?.kind ?? "soap");
  const [content, setContent] = useState<Record<string, string>>(editing?.content ?? {});
  const [title, setTitle] = useState(editing?.title ?? "");

  const handleOpen = (o: boolean) => {
    if (o) {
      setKind(editing?.kind ?? "soap");
      setContent(editing?.content ?? {});
      setTitle(editing?.title ?? "");
    }
    onOpenChange(o);
  };

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setKind(tpl.kind);
    setContent(tpl.body ?? {});
    if (!title) setTitle(tpl.title);
  };

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ id: editing?.id, kind, title, content });
  };

  const FIELDS: Record<string, { key: string; label: string }[]> = {
    soap: [
      { key: "subjective", label: "Subjective" },
      { key: "objective", label: "Objective" },
      { key: "assessment", label: "Assessment" },
      { key: "plan", label: "Plan" },
    ],
    couple: [
      { key: "presenting_concerns", label: "Presenting concerns" },
      { key: "partner_a_perspective", label: "Partner A — perspective" },
      { key: "partner_b_perspective", label: "Partner B — perspective" },
      { key: "dynamics_observed", label: "Dynamics observed" },
      { key: "interventions", label: "Interventions" },
      { key: "homework_plan", label: "Homework / plan" },
    ],
    family: [
      { key: "attendees", label: "Attendees" },
      { key: "presenting_concerns", label: "Presenting concerns" },
      { key: "family_dynamics", label: "Family dynamics" },
      { key: "interventions", label: "Interventions" },
      { key: "strengths", label: "Strengths" },
      { key: "plan_next_steps", label: "Plan / next steps" },
    ],
  };
  const fields = FIELDS[kind];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit note" : "New clinical note"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ClinicalNote["kind"])}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Apply template</span>
              <select
                onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                value=""
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— none —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="block text-xs font-semibold text-muted-foreground mb-1">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            />
          </label>

          {fields ? (
            fields.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-xs font-semibold text-muted-foreground mb-1">{f.label}</span>
                <textarea
                  value={content[f.key] ?? ""}
                  onChange={(e) => setContent((c) => ({ ...c, [f.key]: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[70px]"
                />
              </label>
            ))
          ) : (
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Content</span>
              <textarea
                value={content.body ?? ""}
                onChange={(e) => setContent({ body: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[160px]"
              />
            </label>
          )}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save note"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
