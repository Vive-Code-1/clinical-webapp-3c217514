import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Sparkles, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_NOTE_TEMPLATES } from "@/lib/utils/forms-samples";
import { downloadJson, pickJsonFile, NOTE_KIND_LABELS, type NoteKind, type NoteTemplate } from "./types";
import { NoteTemplateDialog } from "./NoteTemplateDialog";

export function NoteTemplatesSection({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoteTemplate | null>(null);

  const templates = useQuery({
    queryKey: ["note-templates", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("note_templates")
        .select("id, title, kind, body")
        .eq("clinic_id", clinicId)
        .order("title");
      if (error) throw error;
      return (data ?? []) as NoteTemplate[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<NoteTemplate> & { title: string; kind: NoteKind; body: Record<string, string> }) => {
      if (p.id) {
        const { error } = await supabase.from("note_templates").update({
          title: p.title, kind: p.kind, body: p.body as never,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("note_templates").insert({
          clinic_id: clinicId, title: p.title, kind: p.kind, body: p.body as never,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-templates", clinicId] });
      setOpen(false);
      setEditing(null);
      toast.success("Template saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("note_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-templates", clinicId] });
      toast.success("Template deleted");
    },
  });

  const duplicate = useMutation({
    mutationFn: async (t: NoteTemplate) => {
      const { error } = await supabase.from("note_templates").insert({
        clinic_id: clinicId, title: `${t.title} (copy)`, kind: t.kind, body: t.body as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-templates", clinicId] });
      toast.success("Template duplicated");
    },
  });

  const seedSamples = useMutation({
    mutationFn: async () => {
      const existing = new Set((templates.data ?? []).map((t) => t.title));
      const rows = SAMPLE_NOTE_TEMPLATES.filter((s) => !existing.has(s.title)).map((s) => ({
        clinic_id: clinicId, title: s.title, kind: s.kind, body: s.body as never,
      }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("note_templates").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["note-templates", clinicId] });
      toast.success(n ? `Loaded ${n} sample template(s)` : "All samples already present");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importTemplates = useMutation({
    mutationFn: async (raw: unknown) => {
      const arr = Array.isArray(raw) ? raw : (raw as { templates?: unknown[] })?.templates;
      if (!Array.isArray(arr)) throw new Error("Invalid file: expected array of templates");
      const existing = new Set((templates.data ?? []).map((t) => t.title));
      const rows = arr
        .filter((s: any) => s && typeof s.title === "string" && s.body && typeof s.body === "object")
        .filter((s: any) => !existing.has(s.title))
        .map((s: any) => ({
          clinic_id: clinicId,
          title: s.title,
          kind: (s.kind ?? "general") as NoteKind,
          body: s.body as never,
        }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("note_templates").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["note-templates", clinicId] });
      toast.success(n ? `Imported ${n} template(s)` : "Nothing new to import");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportTemplates = () => {
    const data = (templates.data ?? []).map(({ id: _id, ...rest }) => rest);
    downloadJson(`note-templates-${new Date().toISOString().slice(0, 10)}.json`, data);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-semibold">Clinical note templates</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportTemplates}
            disabled={(templates.data ?? []).length === 0}
            className="inline-flex items-center gap-2 bg-muted text-foreground rounded-full h-9 px-3 text-xs font-semibold hover:bg-muted/80 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            onClick={async () => {
              try { importTemplates.mutate(await pickJsonFile()); } catch (e: any) { toast.error(e.message ?? "Invalid JSON"); }
            }}
            className="inline-flex items-center gap-2 bg-muted text-foreground rounded-full h-9 px-3 text-xs font-semibold hover:bg-muted/80"
          >
            <Upload className="w-3.5 h-3.5" /> Import JSON
          </button>
          <button
            onClick={() => seedSamples.mutate()}
            disabled={seedSamples.isPending}
            className="inline-flex items-center gap-2 bg-muted text-foreground rounded-full h-9 px-4 text-sm font-semibold hover:bg-muted/80 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> Load sample library
          </button>
          <button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110"
          >
            <Plus className="w-4 h-4" /> New template
          </button>
        </div>
      </div>

      {templates.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (templates.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet. Click "Load sample library" for a starter set.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {(templates.data ?? []).map((t) => (
            <li key={t.id} className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-pill-green/10 text-pill-green">
                    {NOTE_KIND_LABELS[t.kind]}
                  </span>
                  <p className="font-semibold text-sm mt-1">{t.title}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => duplicate.mutate(t)} title="Duplicate" className="text-xs px-2 py-1 hover:bg-background rounded">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => { setEditing(t); setOpen(true); }} className="text-xs px-2 py-1 hover:bg-background rounded">Edit</button>
                  <button onClick={() => confirm(`Delete "${t.title}"?`) && remove.mutate(t.id)} className="text-xs px-2 py-1 hover:bg-destructive/10 text-destructive rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <NoteTemplateDialog
          editing={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSubmit={(p) => save.mutate(p)}
          pending={save.isPending}
        />
      )}
    </>
  );
}

