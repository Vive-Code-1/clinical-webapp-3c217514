import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, ClipboardList, FileText, GripVertical, Pencil, Copy, Sparkles, Power, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SAMPLE_INTAKE_FORMS, SAMPLE_NOTE_TEMPLATES } from "@/lib/forms-samples";

const searchSchema = z.object({
  clinic: z.string().optional(),
  tab: z.enum(["intake", "templates"]).optional(),
});

export const Route = createFileRoute("/_authenticated/forms")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Forms & templates — Helanthus" }] }),
  component: FormsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type IntakeFormKind = "intake" | "consent" | "questionnaire";
type FieldType = "text" | "textarea" | "select" | "checkbox" | "date";
type FormField = { key: string; label: string; type: FieldType; required?: boolean; options?: string[] };
type IntakeForm = {
  id: string;
  title: string;
  description: string | null;
  kind: IntakeFormKind;
  schema: { fields: FormField[] };
  is_active: boolean;
};

type NoteKind = "soap" | "follow_up" | "couple" | "family" | "general";
type NoteTemplate = { id: string; title: string; kind: NoteKind; body: Record<string, string> };

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pickJsonFile(): Promise<unknown> {
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

function FormsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const tab = search.tab ?? "intake";

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1200px] mx-auto">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground">Clinical setup</p>
          <h1 className="text-2xl font-bold tracking-tight">Forms & templates</h1>
        </header>

        <div className="bg-card rounded-2xl ring-1 ring-border card-pop overflow-hidden">
          <div className="border-b border-border px-1 sm:px-2 flex gap-1 overflow-x-auto">
            {[
              { id: "intake" as const, label: "Intake & consent forms", icon: ClipboardList },
              { id: "templates" as const, label: "Clinical note templates", icon: FileText },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ search: { clinic: activeClinicId, tab: t.id === "intake" ? undefined : t.id } })}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="p-4 sm:p-6">
            {tab === "intake" ? <IntakeFormsSection clinicId={activeClinicId} /> : <NoteTemplatesSection clinicId={activeClinicId} />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* =============== INTAKE FORMS =============== */

function IntakeFormsSection({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IntakeForm | null>(null);

  const forms = useQuery({
    queryKey: ["intake-forms", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("id, title, description, kind, schema, is_active")
        .eq("clinic_id", clinicId)
        .order("title");
      if (error) throw error;
      return (data ?? []) as IntakeForm[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<IntakeForm> & { title: string; kind: IntakeFormKind; schema: { fields: FormField[] } }) => {
      if (payload.id) {
        const { error } = await supabase.from("intake_forms").update({
          title: payload.title,
          description: payload.description ?? null,
          kind: payload.kind,
          schema: payload.schema as never,
          is_active: payload.is_active ?? true,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("intake_forms").insert({
          clinic_id: clinicId,
          title: payload.title,
          description: payload.description ?? null,
          kind: payload.kind,
          schema: payload.schema as never,
          is_active: payload.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-forms", clinicId] });
      setOpen(false);
      setEditing(null);
      toast.success("Form saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("intake_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-forms", clinicId] });
      toast.success("Form deleted");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (f: IntakeForm) => {
      const { error } = await supabase.from("intake_forms").update({ is_active: !f.is_active }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["intake-forms", clinicId] }),
  });

  const duplicate = useMutation({
    mutationFn: async (f: IntakeForm) => {
      const { error } = await supabase.from("intake_forms").insert({
        clinic_id: clinicId,
        title: `${f.title} (copy)`,
        description: f.description,
        kind: f.kind,
        schema: f.schema as never,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-forms", clinicId] });
      toast.success("Form duplicated");
    },
  });

  const seedSamples = useMutation({
    mutationFn: async () => {
      const existing = new Set((forms.data ?? []).map((f) => f.title));
      const rows = SAMPLE_INTAKE_FORMS.filter((s) => !existing.has(s.title)).map((s) => ({
        clinic_id: clinicId,
        title: s.title,
        description: s.description,
        kind: s.kind,
        schema: { fields: s.fields } as never,
        is_active: true,
      }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("intake_forms").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["intake-forms", clinicId] });
      toast.success(n ? `Loaded ${n} sample form(s)` : "All samples already present");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importForms = useMutation({
    mutationFn: async (raw: unknown) => {
      const arr = Array.isArray(raw) ? raw : (raw as { forms?: unknown[] })?.forms;
      if (!Array.isArray(arr)) throw new Error("Invalid file: expected array of forms");
      const existing = new Set((forms.data ?? []).map((f) => f.title));
      const rows = arr
        .filter((s: any) => s && typeof s.title === "string" && s.schema && Array.isArray(s.schema.fields))
        .filter((s: any) => !existing.has(s.title))
        .map((s: any) => ({
          clinic_id: clinicId,
          title: s.title,
          description: s.description ?? null,
          kind: (s.kind ?? "intake") as IntakeFormKind,
          schema: s.schema as never,
          is_active: s.is_active ?? true,
        }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("intake_forms").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["intake-forms", clinicId] });
      toast.success(n ? `Imported ${n} form(s)` : "Nothing new to import");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportForms = () => {
    const data = (forms.data ?? []).map(({ id: _id, ...rest }) => rest);
    downloadJson(`intake-forms-${new Date().toISOString().slice(0, 10)}.json`, data);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-semibold">Forms</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportForms}
            disabled={(forms.data ?? []).length === 0}
            className="inline-flex items-center gap-2 bg-muted text-foreground rounded-full h-9 px-3 text-xs font-semibold hover:bg-muted/80 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            onClick={async () => {
              try { importForms.mutate(await pickJsonFile()); } catch (e: any) { toast.error(e.message ?? "Invalid JSON"); }
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
            <Plus className="w-4 h-4" /> New form
          </button>
        </div>
      </div>

      {forms.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (forms.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No forms yet. Create your first intake or consent form.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {(forms.data ?? []).map((f) => (
            <li key={f.id} className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-pill-green/10 text-pill-green">
                    {f.kind}
                  </span>
                  <p className="font-semibold text-sm mt-1">{f.title}</p>
                  {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{f.schema?.fields?.length ?? 0} field(s) · {f.is_active ? "Active" : "Inactive"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => toggleActive.mutate(f)} title={f.is_active ? "Deactivate" : "Activate"} className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${f.is_active ? "text-pill-green hover:bg-pill-green/10" : "text-muted-foreground hover:bg-background"}`}>
                    <Power className="w-3 h-3" />
                  </button>
                  <button onClick={() => duplicate.mutate(f)} title="Duplicate" className="text-xs px-2 py-1 hover:bg-background rounded inline-flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => { setEditing(f); setOpen(true); }} className="text-xs px-2 py-1 hover:bg-background rounded inline-flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => confirm(`Delete "${f.title}"?`) && remove.mutate(f.id)} className="text-xs px-2 py-1 hover:bg-destructive/10 text-destructive rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <IntakeFormBuilder
          editing={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSubmit={(p) => save.mutate(p)}
          pending={save.isPending}
        />
      )}
    </>
  );
}

function IntakeFormBuilder({
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

/* =============== NOTE TEMPLATES =============== */

const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  soap: "SOAP",
  follow_up: "Follow-up",
  couple: "Couple",
  family: "Family",
  general: "General",
};

function NoteTemplatesSection({ clinicId }: { clinicId: string }) {
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

function NoteTemplateDialog({
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
