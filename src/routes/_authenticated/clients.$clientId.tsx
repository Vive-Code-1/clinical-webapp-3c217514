import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Plus,
  Upload,
  Download,
  Trash2,
  Lock,
  Unlock,
  FileText,
  ClipboardList,
  Heart,
  Users as UsersIcon,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const searchSchema = z.object({
  clinic: z.string().optional(),
  tab: z.enum(["overview", "notes", "documents", "intake", "history"]).optional(),
});

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Client profile — Helanthus" }] }),
  component: ClientProfilePage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Client not found.</div>,
});

type Tab = "overview" | "notes" | "documents" | "intake" | "history";

function ClientProfilePage() {
  const { clinics } = Route.useRouteContext();
  const { clientId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const tab: Tab = search.tab ?? "overview";

  const client = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_clients")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const setTab = (t: Tab) =>
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, tab: t === "overview" ? undefined : t }) });

  const c = client.data;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <Link
          to="/clients"
          search={{ clinic: activeClinicId }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to clients
        </Link>

        {client.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !c ? (
          <p className="text-sm text-muted-foreground">Client not found.</p>
        ) : (
          <>
            <header className="bg-card rounded-2xl ring-1 ring-border p-6 mb-4 flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-pill-green text-primary-foreground grid place-items-center font-bold text-2xl shrink-0">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">{c.full_name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                  {c.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {c.phone}
                    </span>
                  )}
                  {c.date_of_birth && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(c.date_of_birth).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </header>

            <div className="bg-card rounded-2xl ring-1 ring-border overflow-hidden">
              <div className="border-b border-border px-2 flex gap-1 overflow-x-auto">
                {[
                  { id: "overview" as Tab, label: "Overview", icon: Heart },
                  { id: "notes" as Tab, label: "Clinical notes", icon: FileText },
                  { id: "documents" as Tab, label: "Documents", icon: Upload },
                  { id: "intake" as Tab, label: "Intake & consent", icon: ClipboardList },
                  { id: "history" as Tab, label: "Appointments", icon: Calendar },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        active
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {tab === "overview" && <OverviewTab clinicId={activeClinicId} clientId={clientId} client={c} />}
                {tab === "notes" && <NotesTab clinicId={activeClinicId} clientId={clientId} />}
                {tab === "documents" && <DocumentsTab clinicId={activeClinicId} clientId={clientId} />}
                {tab === "intake" && <IntakeTab clinicId={activeClinicId} clientId={clientId} />}
                {tab === "history" && <HistoryTab clinicId={activeClinicId} client={c} />}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ============ OVERVIEW (contacts + medical) ============ */

type Contact = {
  id: string;
  relationship: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

function OverviewTab({
  clinicId,
  clientId,
  client,
}: {
  clinicId: string;
  clientId: string;
  client: { notes: string | null; tags: string[] };
}) {
  const queryClient = useQueryClient();

  const contacts = useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const medical = useQuery({
    queryKey: ["client-medical", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_medical_info")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [contactOpen, setContactOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const saveContact = useMutation({
    mutationFn: async (payload: Omit<Contact, "id"> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from("client_contacts").update({
          relationship: payload.relationship,
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email,
          notes: payload.notes,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_contacts").insert({
          clinic_id: clinicId,
          client_id: clientId,
          relationship: payload.relationship,
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email,
          notes: payload.notes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      setContactOpen(false);
      setEditing(null);
      toast.success("Contact saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast.success("Contact removed");
    },
  });

  const saveMedical = useMutation({
    mutationFn: async (payload: Record<string, string | number | null>) => {
      const { error } = await supabase.from("client_medical_info").upsert(
        {
          clinic_id: clinicId,
          client_id: clientId,
          ...payload,
        },
        { onConflict: "client_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-medical", clientId] });
      toast.success("Medical info saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleMedical = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMedical.mutate({
      allergies: String(fd.get("allergies") || "") || null,
      medications: String(fd.get("medications") || "") || null,
      conditions: String(fd.get("conditions") || "") || null,
      family_history: String(fd.get("family_history") || "") || null,
      lifestyle: String(fd.get("lifestyle") || "") || null,
      blood_type: String(fd.get("blood_type") || "") || null,
      height_cm: fd.get("height_cm") ? Number(fd.get("height_cm")) : null,
      weight_kg: fd.get("weight_kg") ? Number(fd.get("weight_kg")) : null,
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Contacts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UsersIcon className="w-4 h-4" /> Contacts
          </h3>
          <button
            onClick={() => {
              setEditing(null);
              setContactOpen(true);
            }}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add contact
          </button>
        </div>
        {contacts.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (contacts.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No contacts on record.</p>
        ) : (
          <ul className="space-y-2">
            {(contacts.data ?? []).map((ct) => (
              <li key={ct.id} className="bg-muted/40 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ct.full_name}</p>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {ct.relationship}
                    </p>
                    {(ct.phone || ct.email) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {[ct.phone, ct.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {ct.notes && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{ct.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditing(ct);
                        setContactOpen(true);
                      }}
                      className="text-xs px-2 py-1 hover:bg-background rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirm(`Remove ${ct.full_name}?`) && removeContact.mutate(ct.id)}
                      className="text-xs px-2 py-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Medical */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4" /> Medical info
        </h3>
        {medical.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={handleMedical} className="space-y-3 text-sm">
            <Field label="Allergies" name="allergies" defaultValue={medical.data?.allergies ?? ""} textarea />
            <Field label="Medications" name="medications" defaultValue={medical.data?.medications ?? ""} textarea />
            <Field label="Conditions" name="conditions" defaultValue={medical.data?.conditions ?? ""} textarea />
            <Field label="Family history" name="family_history" defaultValue={medical.data?.family_history ?? ""} textarea />
            <Field label="Lifestyle" name="lifestyle" defaultValue={medical.data?.lifestyle ?? ""} textarea />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Blood type" name="blood_type" defaultValue={medical.data?.blood_type ?? ""} />
              <Field label="Height (cm)" name="height_cm" type="number" defaultValue={medical.data?.height_cm ?? ""} />
              <Field label="Weight (kg)" name="weight_kg" type="number" defaultValue={medical.data?.weight_kg ?? ""} />
            </div>
            <button
              type="submit"
              disabled={saveMedical.isPending}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saveMedical.isPending ? "Saving…" : "Save medical info"}
            </button>
          </form>
        )}
      </section>

      {/* Internal notes */}
      {client.notes && (
        <section className="md:col-span-2">
          <h3 className="font-semibold mb-2">Internal notes</h3>
          <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{client.notes}</p>
        </section>
      )}

      <ContactDialog
        open={contactOpen}
        onOpenChange={(o) => {
          setContactOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSubmit={(payload) => saveContact.mutate(payload)}
        pending={saveContact.isPending}
      />
    </div>
  );
}

function Field({
  label,
  textarea,
  ...rest
}: {
  label: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted-foreground mb-1">{label}</span>
      {textarea ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </label>
  );
}

function ContactDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Contact | null;
  onSubmit: (payload: Omit<Contact, "id"> & { id?: string }) => void;
  pending: boolean;
}) {
  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") || "").trim();
    if (!full_name) return toast.error("Name required");
    onSubmit({
      id: editing?.id,
      relationship: String(fd.get("relationship") || "emergency"),
      full_name,
      phone: String(fd.get("phone") || "").trim() || null,
      email: String(fd.get("email") || "").trim() || null,
      notes: String(fd.get("notes") || "").trim() || null,
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <Field label="Full name *" name="full_name" defaultValue={editing?.full_name ?? ""} required />
          <Field label="Relationship" name="relationship" placeholder="emergency, parent, referrer…" defaultValue={editing?.relationship ?? "emergency"} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone" name="phone" defaultValue={editing?.phone ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={editing?.email ?? ""} />
          </div>
          <Field label="Notes" name="notes" textarea defaultValue={editing?.notes ?? ""} />
          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save contact"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============ CLINICAL NOTES ============ */

type ClinicalNote = {
  id: string;
  kind: "soap" | "follow_up" | "couple" | "family" | "general";
  title: string | null;
  content: Record<string, string>;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  appointment_id: string | null;
};

const KIND_LABELS: Record<ClinicalNote["kind"], string> = {
  soap: "SOAP",
  follow_up: "Follow-up",
  couple: "Couple",
  family: "Family",
  general: "General",
};

function NotesTab({ clinicId, clientId }: { clinicId: string; clientId: string }) {
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
          content: payload.content,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinical_notes").insert({
          clinic_id: clinicId,
          client_id: clientId,
          practitioner_id: userData.user?.id ?? null,
          kind: payload.kind,
          title: payload.title,
          content: payload.content,
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

  // reset when dialog opens/closes
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

          {kind === "soap" ? (
            <>
              {(["subjective", "objective", "assessment", "plan"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="block text-xs font-semibold text-muted-foreground mb-1 capitalize">{k}</span>
                  <textarea
                    value={content[k] ?? ""}
                    onChange={(e) => setContent((c) => ({ ...c, [k]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[70px]"
                  />
                </label>
              ))}
            </>
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

/* ============ DOCUMENTS ============ */

type Document = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string;
  description: string | null;
  created_at: string;
};

function DocumentsTab({ clinicId, clientId }: { clinicId: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const docs = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Document[];
    },
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is over 20MB`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${clinicId}/${clientId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file, {
          contentType: file.type || undefined,
        });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { error: insErr } = await supabase.from("client_documents").insert({
          clinic_id: clinicId,
          client_id: clientId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          category: "general",
          uploaded_by: userData.user?.id ?? null,
        });
        if (insErr) toast.error(insErr.message);
      }
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
      toast.success("Upload complete");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message || "Download failed");
    const a = window.document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    window.document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const remove = useMutation({
    mutationFn: async (d: Document) => {
      await supabase.storage.from("client-documents").remove([d.storage_path]);
      const { error } = await supabase.from("client_documents").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
      toast.success("Document removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Documents</h3>
        <label className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading…" : "Upload files"}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {docs.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (docs.data ?? []).length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drop files via the upload button (max 20MB each).</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {(docs.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-lg bg-accent grid place-items-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.mime_type || "file"} ·{" "}
                  {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB` : "—"} ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDownload(d.storage_path, d.file_name)}
                className="text-xs px-3 py-1.5 rounded-full bg-background ring-1 ring-border hover:bg-muted inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download
              </button>
              <button
                onClick={() => confirm(`Delete ${d.file_name}?`) && remove.mutate(d)}
                className="text-xs px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ INTAKE / CONSENT ============ */

type IntakeForm = {
  id: string;
  title: string;
  kind: "intake" | "consent" | "questionnaire";
  schema: { fields: Array<{ key: string; label: string; type: string; required?: boolean; options?: string[] }> };
};

type IntakeResponse = {
  id: string;
  form_id: string;
  answers: Record<string, unknown>;
  signed_at: string | null;
  created_at: string;
};

function IntakeTab({ clinicId, clientId }: { clinicId: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  const forms = useQuery({
    queryKey: ["intake-forms-active", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("id, title, kind, schema")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return (data ?? []) as IntakeForm[];
    },
  });

  const responses = useQuery({
    queryKey: ["intake-responses", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_responses")
        .select("id, form_id, answers, signed_at, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IntakeResponse[];
    },
  });

  const submit = useMutation({
    mutationFn: async ({ form, answers, signature }: { form: IntakeForm; answers: Record<string, unknown>; signature?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("intake_responses").insert({
        clinic_id: clinicId,
        form_id: form.id,
        client_id: clientId,
        answers: answers as never,
        signature: signature || null,
        signed_at: signature ? new Date().toISOString() : null,
        submitted_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-responses", clientId] });
      setOpenFormId(null);
      toast.success("Response saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeForm = (forms.data ?? []).find((f) => f.id === openFormId) ?? null;
  const formById = new Map((forms.data ?? []).map((f) => [f.id, f]));

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Available forms</h3>
          <Link
            to="/forms"
            search={{ clinic: clinicId }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage forms →
          </Link>
        </div>
        {forms.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (forms.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active forms. Create one in <strong>Forms</strong>.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(forms.data ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => setOpenFormId(f.id)}
                className="text-left bg-muted/40 hover:bg-muted rounded-xl p-4"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{f.kind}</p>
                <p className="font-semibold text-sm mt-1">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {f.schema?.fields?.length ?? 0} field(s)
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-3">Submitted responses</h3>
        {responses.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (responses.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          <ul className="space-y-3">
            {(responses.data ?? []).map((r) => {
              const f = formById.get(r.form_id);
              return (
                <li key={r.id} className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-pill-green/10 text-pill-green">
                      {f?.kind || "form"}
                    </span>
                    <p className="font-semibold text-sm">{f?.title || "(deleted form)"}</p>
                    {r.signed_at && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Signed {new Date(r.signed_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {f?.schema?.fields?.map((field) => (
                      <div key={field.key}>
                        <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{field.label}</dt>
                        <dd className="whitespace-pre-wrap">{String(r.answers?.[field.key] ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeForm && (
        <FillFormDialog
          form={activeForm}
          onClose={() => setOpenFormId(null)}
          onSubmit={(answers, signature) => submit.mutate({ form: activeForm, answers, signature })}
          pending={submit.isPending}
        />
      )}
    </div>
  );
}

function FillFormDialog({
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

/* ============ HISTORY ============ */

function HistoryTab({
  clinicId,
  client,
}: {
  clinicId: string;
  client: { id: string; user_id: string | null; email: string | null };
}) {
  const history = useQuery({
    queryKey: ["client-appointments-full", clinicId, client.id],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, notes, service:service_types(name, color)")
        .eq("clinic_id", clinicId)
        .order("starts_at", { ascending: false });
      if (client.user_id) q = q.eq("client_id", client.user_id);
      else if (client.email) q = q.eq("guest_email", client.email);
      else return [];
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (history.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const items = history.data ?? [];
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No appointments on record.</p>;

  return (
    <ul className="divide-y divide-border">
      {items.map((a) => {
        const d = new Date(a.starts_at);
        return (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <div
              className="w-1.5 h-12 rounded-full shrink-0"
              style={{ background: a.service?.color || "var(--pill-green)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{a.service?.name || "Appointment"}</p>
              <p className="text-xs text-muted-foreground">
                {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {a.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{a.notes}</p>}
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                a.status === "cancelled"
                  ? "bg-destructive/10 text-destructive"
                  : a.status === "completed"
                    ? "bg-muted text-muted-foreground"
                    : "bg-pill-green/10 text-pill-green"
              }`}
            >
              {a.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
