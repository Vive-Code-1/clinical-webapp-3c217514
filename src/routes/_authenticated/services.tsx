import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { ServiceDialog } from "@/components/services/ServiceDialog";
import type { ServiceRow } from "@/components/services/types";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/services")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Services — SANTÉ" }] }),
  component: ServicesPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function ServicesPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();

  const services = useQuery({
    queryKey: ["all-services", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, duration_minutes, price_cents, currency, color, is_active, online_bookable, is_telehealth")
        .eq("clinic_id", activeClinicId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service removed.");
      queryClient.invalidateQueries({ queryKey: ["all-services", activeClinicId] });
      queryClient.invalidateQueries({ queryKey: ["clinic-services", activeClinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-8 py-10 max-w-4xl">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Catalog</p>
            <h1 className="text-4xl font-extrabold tracking-tight">Services</h1>
            <p className="font-serif text-muted-foreground mt-2">Define what you offer, durations, and prices.</p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110"
          >
            + New service
          </button>
        </div>

        <div className="bg-card rounded-3xl ring-1 ring-border card-pop divide-y divide-border overflow-hidden">
          {services.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {services.data?.length === 0 && (
            <p className="p-6 font-serif text-muted-foreground text-sm">No services yet.</p>
          )}
          {services.data?.map((s) => (
            <div key={s.id} className="p-5 flex items-center gap-4">
              <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold">
                  {s.name}{" "}
                  {!s.is_active && <span className="text-xs font-semibold text-muted-foreground">(inactive)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} {s.currency}
                  {s.online_bookable ? " · online bookable" : " · staff only"}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing(s);
                  setOpen(true);
                }}
                className="text-sm font-bold text-primary hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.name}"?`)) del.mutate(s.id);
                }}
                className="text-sm font-bold text-destructive hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        clinicId={activeClinicId}
        existing={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["all-services", activeClinicId] });
          queryClient.invalidateQueries({ queryKey: ["clinic-services", activeClinicId] });
        }}
      />
    </AppShell>
  );
}
