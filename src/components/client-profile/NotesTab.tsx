import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KIND_LABELS, type ClinicalNote } from "./types";

export function NotesTab({ clinicId, clientId }: { clinicId: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalNote | null>(null);

  const notes = useQuery({
    queryKey: ["clinical-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select("id, kind, title, content, is_locked, locked_at, created_at, appointment_id")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClinicalNote[];
    },
  });

  const templates = useQuery({
    queryKey: ["note-templates", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("note_templates")
        .select("id, title, kind, body")
        .eq("clinic_id", clinicId)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: { id?: string; kind: ClinicalNote["kind"]; title: string; content: Record<string, string> }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (payload.id) {
        const { error } = await supabase.from("clinical_notes").update({
          kind: payload.kind,
          title: payload.title,
          content: payload.content as never,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinical_notes").insert({
          clinic_id: clinicId,
          client_id: clientId,
          practitioner_id: userData.user?.id ?? null,
          kind: payload.kind,
          title: payload.title,
          content: payload.content as never,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes", clientId] });
      setOpen(false);
      setEditing(null);
      toast.success("Note saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, lock }: { id: string; lock: boolean }) => {
      const { error } = await supabase.from("clinical_notes").update({ is_locked: lock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinical_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-notes", clientId] });
      toast.success("Note removed");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Clinical notes</h3>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110"
        >
          <Plus className="w-4 h-4" /> New note
        </button>
      </div>

      {notes.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (notes.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No clinical notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {(notes.data ?? []).map((n) => (
            <li key={n.id} className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-pill-green/10 text-pill-green">
                      {KIND_LABELS[n.kind]}
                    </span>
                    {n.is_locked && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {n.title && <p className="font-semibold text-sm mt-1">{n.title}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.is_locked && (
                    <button
                      onClick={() => {
                        setEditing(n);
                        setOpen(true);
                      }}
                      className="text-xs px-2 py-1 hover:bg-background rounded"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => toggleLock.mutate({ id: n.id, lock: !n.is_locked })}
                    className="text-xs px-2 py-1 hover:bg-background rounded inline-flex items-center gap-1"
                  >
                    {n.is_locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  </button>
                  {!n.is_locked && (
                    <button
                      onClick={() => confirm("Delete this note?") && remove.mutate(n.id)}
                      className="text-xs px-2 py-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <NoteContentView kind={n.kind} content={n.content} />
            </li>
          ))}
        </ul>
      )}

      <NoteDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        templates={(templates.data ?? []) as Array<{ id: string; title: string; kind: ClinicalNote["kind"]; body: Record<string, string> }>}
        onSubmit={(p) => save.mutate(p)}
        pending={save.isPending}
      />
    </div>
  );
}

function NoteContentView({ kind, content }: { kind: ClinicalNote["kind"]; content: Record<string, string> }) {
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

function NoteDialog({
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

          {(() => {
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
            if (fields) {
              return (
                <>
                  {fields.map((f) => (
                    <label key={f.key} className="block">
                      <span className="block text-xs font-semibold text-muted-foreground mb-1">{f.label}</span>
                      <textarea
                        value={content[f.key] ?? ""}
                        onChange={(e) => setContent((c) => ({ ...c, [f.key]: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[70px]"
                      />
                    </label>
                  ))}
                </>
              );
            }
            return (
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground mb-1">Content</span>
                <textarea
                  value={content.body ?? ""}
                  onChange={(e) => setContent({ body: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[160px]"
                />
              </label>
            );
          })()}

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
