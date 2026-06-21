import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { ClientDetail } from "@/components/clients-list/ClientDetail";
import { ClientFormDialog } from "@/components/clients-list/ClientFormDialog";
import type { ClientRow } from "@/components/clients-list/types";

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
