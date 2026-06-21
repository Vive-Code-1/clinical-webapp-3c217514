import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Mail, Phone, Pencil, Trash2, X, Tag, NotebookPen, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const searchSchema = z.object({ clinic: z.string().optional(), id: z.string().optional() });

export const Route = createFileRoute("/_authenticated/clients")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Clients — Helanthus" }] }),
  component: ClientsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  notes: string | null;
  tags: string[];
  user_id: string | null;
  created_at: string;
};

type ApptRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service: { name: string; color: string } | null;
};

function ClientsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(search.id ?? null);

  const clients = useQuery({
    queryKey: ["clinic-clients", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_clients")
        .select("id, full_name, email, phone, date_of_birth, notes, tags, user_id, created_at")
        .eq("clinic_id", activeClinicId)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.data ?? [];
    return (clients.data ?? []).filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [clients.data, query]);

  const upsert = useMutation({
    mutationFn: async (payload: Partial<ClientRow> & { full_name: string }) => {
      const { user } = await supabase.auth.getUser().then((r) => ({ user: r.data.user }));
      if (editing) {
        const { error } = await supabase
          .from("clinic_clients")
          .update({
            full_name: payload.full_name,
            email: payload.email || null,
            phone: payload.phone || null,
            date_of_birth: payload.date_of_birth || null,
            notes: payload.notes || null,
            tags: payload.tags ?? [],
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinic_clients").insert({
          clinic_id: activeClinicId,
          created_by: user?.id ?? null,
          full_name: payload.full_name,
          email: payload.email || null,
          phone: payload.phone || null,
          date_of_birth: payload.date_of_birth || null,
          notes: payload.notes || null,
          tags: payload.tags ?? [],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-clients", activeClinicId] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Client updated" : "Client added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinic_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-clients", activeClinicId] });
      setDetailId(null);
      toast.success("Client removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detail = (clients.data ?? []).find((c) => c.id === detailId) ?? null;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1600px] mx-auto">
        <header className="flex flex-col gap-4 mb-6 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Patients &amp; Clients</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Clients</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-card rounded-full px-4 h-10 flex-1 sm:w-72 sm:flex-initial ring-1 ring-border min-w-0">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone, tag"
                className="bg-transparent text-sm outline-none flex-1 min-w-0"
              />
            </div>
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-10 px-4 text-sm font-semibold hover:brightness-110 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New client</span><span className="sm:hidden">New</span>
            </button>
          </div>
        </header>


        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
          <div className="bg-card rounded-2xl ring-1 ring-border card-pop overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">
                {filtered.length} {filtered.length === 1 ? "client" : "clients"}
              </h2>
            </div>
            {clients.isLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {query ? "No clients match your search." : "No clients yet."}
                </p>
                {!query && (
                  <button
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Add your first client
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((c) => {
                  const initial = c.full_name.charAt(0).toUpperCase();
                  const active = detailId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setDetailId(c.id)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                          active ? "bg-accent" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-accent grid place-items-center font-semibold text-foreground/80 shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.email || c.phone || "No contact info"}
                          </p>
                        </div>
                        {c.tags.length > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-pill-green/10 text-pill-green shrink-0">
                            {c.tags[0]}
                            {c.tags.length > 1 ? ` +${c.tags.length - 1}` : ""}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <ClientDetail
            client={detail}
            clinicId={activeClinicId}
            onEdit={() => {
              if (detail) {
                setEditing(detail);
                setOpen(true);
              }
            }}
            onRemove={() => detail && remove.mutate(detail.id)}
            onClose={() => setDetailId(null)}
          />
        </div>
      </div>

      <ClientFormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSubmit={(payload) => upsert.mutate(payload)}
        pending={upsert.isPending}
      />
    </AppShell>
  );
}

function ClientDetail({
  client,
  clinicId,
  onEdit,
  onRemove,
  onClose,
}: {
  client: ClientRow | null;
  clinicId: string;
  onEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const history = useQuery({
    enabled: !!client,
    queryKey: ["client-appointments", clinicId, client?.id, client?.user_id, client?.email],
    queryFn: async (): Promise<ApptRow[]> => {
      if (!client) return [];
      let q = supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, service:service_types(name, color)")
        .eq("clinic_id", clinicId)
        .order("starts_at", { ascending: false })
        .limit(30);
      if (client.user_id) {
        q = q.eq("client_id", client.user_id);
      } else if (client.email) {
        q = q.eq("guest_email", client.email);
      } else {
        return [];
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ApptRow[];
    },
  });

  if (!client) {
    return (
      <div className="bg-card rounded-2xl ring-1 ring-border card-pop p-8 text-sm text-muted-foreground text-center hidden xl:block">
        Select a client to view details and booking history.
      </div>
    );
  }

  const initials = client.full_name
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border card-pop p-5 max-h-[calc(100vh-160px)] overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-full bg-pill-green text-primary-foreground grid place-items-center font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg truncate">{client.full_name}</h3>
            {client.user_id && (
              <span className="text-[10px] uppercase tracking-widest text-pill-green font-bold">
                Online account
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground xl:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        {client.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${client.email}`} className="hover:text-foreground truncate">
              {client.email}
            </a>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <a href={`tel:${client.phone}`} className="hover:text-foreground">
              {client.phone}
            </a>
          </div>
        )}
        {client.date_of_birth && (
          <div className="text-muted-foreground text-xs">
            DOB: {new Date(client.date_of_birth).toLocaleDateString()}
          </div>
        )}
      </div>

      {client.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {client.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-accent text-foreground/80"
            >
              <Tag className="w-3 h-3" />
              {t}
            </span>
          ))}
        </div>
      )}

      {client.notes && (
        <div className="rounded-xl bg-muted/60 p-3 mb-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
            <NotebookPen className="w-3.5 h-3.5" /> Internal notes
          </div>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <Link
          to="/clients/$clientId"
          params={{ clientId: client.id }}
          search={{ clinic: clinicId }}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full h-9 text-sm font-semibold hover:brightness-110"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open profile
        </Link>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 bg-accent text-foreground rounded-full h-9 px-4 text-sm font-semibold hover:bg-accent/80"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Remove ${client.full_name}?`)) onRemove();
          }}
          className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-full h-9 px-4 text-sm font-semibold hover:bg-destructive/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <h4 className="font-semibold text-sm mb-3">Booking history</h4>
      {history.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (history.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No appointments on record.</p>
      ) : (
        <ul className="space-y-2">
          {(history.data ?? []).map((a) => {
            const d = new Date(a.starts_at);
            return (
              <li key={a.id} className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
                <div
                  className="w-1 h-10 rounded-full mt-0.5 shrink-0"
                  style={{ background: a.service?.color || "var(--pill-green)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.service?.name || "Appointment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
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
      )}
    </div>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClientRow | null;
  onSubmit: (payload: Partial<ClientRow> & { full_name: string }) => void;
  pending: boolean;
}) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") || "").trim();
    if (!full_name) {
      toast.error("Name is required");
      return;
    }
    const tagsRaw = String(fd.get("tags") || "");
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      full_name,
      email: String(fd.get("email") || "").trim() || null,
      phone: String(fd.get("phone") || "").trim() || null,
      date_of_birth: String(fd.get("date_of_birth") || "").trim() || null,
      notes: String(fd.get("notes") || "").trim() || null,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" required>
            <input
              name="full_name"
              required
              defaultValue={editing?.full_name ?? ""}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Phone">
              <input
                name="phone"
                defaultValue={editing?.phone ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <input
                name="date_of_birth"
                type="date"
                defaultValue={editing?.date_of_birth ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Tags (comma separated)">
              <input
                name="tags"
                defaultValue={editing?.tags.join(", ") ?? ""}
                placeholder="vip, follow-up"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>
          <Field label="Internal notes">
            <textarea
              name="notes"
              rows={4}
              defaultValue={editing?.notes ?? ""}
              placeholder="Allergies, preferences, history…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </Field>
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add client"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
