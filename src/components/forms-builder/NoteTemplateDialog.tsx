import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { NOTE_KIND_LABELS, type NoteKind, type NoteTemplate } from "./types";

export function NoteTemplateDialog({
  editing,
  onClose,
  onSubmit,
  pending,
}: {
  editing: NoteTemplate | null;
  onClose: () => void;
  onSubmit: (p: Partial<NoteTemplate> & { title: string; kind: NoteKind; body: Record<string, string> }) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [kind, setKind] = useState<NoteKind>(editing?.kind ?? "soap");
  const [body, setBody] = useState<Record<string, string>>(editing?.body ?? {});

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    onSubmit({ id: editing?.id, title: title.trim(), kind, body });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" required />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Type</span>
              <select value={kind} onChange={(e) => { setKind(e.target.value as NoteKind); setBody({}); }} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {Object.entries(NOTE_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>

          {kind === "soap" ? (
            (["subjective", "objective", "assessment", "plan"] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-xs font-semibold text-muted-foreground mb-1 capitalize">{k}</span>
                <textarea
                  value={body[k] ?? ""}
                  onChange={(e) => setBody((b) => ({ ...b, [k]: e.target.value }))}
                  placeholder={`Default ${k} prompt or text…`}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[60px]"
                />
              </label>
            ))
          ) : (
            <label className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1">Body</span>
              <textarea
                value={body.body ?? ""}
                onChange={(e) => setBody({ body: e.target.value })}
                placeholder="Default body content…"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[160px]"
              />
            </label>
          )}

          <DialogFooter>
            <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground hover:text-foreground px-3">Cancel</button>
            <button type="submit" disabled={pending} className="bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50">
              {pending ? "Saving…" : "Save template"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
